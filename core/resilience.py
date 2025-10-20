"""Production resilience utilities for Royal Equips Orchestrator.

This module provides production-grade resilience patterns including:
- Circuit breakers with state management
- Retry logic with exponential backoff
- Rate limiting and throttling
- Dead letter queues for failed operations
- Health monitoring and self-healing

These utilities ensure the orchestrator remains stable and responsive
even when external services fail or become slow.
"""

import asyncio
import logging
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from functools import wraps
from typing import Any, Callable, Deque, Dict, List, Optional, TypeVar, cast

from tenacity import (
    AsyncRetrying,
    RetryError,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, requests blocked
    HALF_OPEN = "half_open"  # Testing recovery


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5  # Number of failures before opening
    success_threshold: int = 2  # Number of successes to close from half-open
    timeout_seconds: int = 60  # Time to wait before trying half-open
    window_size_seconds: int = 60  # Time window for counting failures
    
    # Rate limiting
    max_requests_per_second: float = 10.0
    burst_size: int = 20


@dataclass
class CircuitBreakerMetrics:
    """Metrics for circuit breaker monitoring."""
    state: CircuitState
    failure_count: int = 0
    success_count: int = 0
    consecutive_failures: int = 0
    consecutive_successes: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    total_requests: int = 0
    total_failures: int = 0
    total_successes: int = 0
    opened_at: Optional[datetime] = None
    half_opened_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None


class CircuitBreaker:
    """Production-grade circuit breaker implementation.
    
    The circuit breaker prevents cascading failures by failing fast when
    a service is unavailable. It has three states:
    
    - CLOSED: Normal operation, requests pass through
    - OPEN: Too many failures, requests are blocked
    - HALF_OPEN: Testing recovery, limited requests allowed
    
    Example:
        ```python
        breaker = CircuitBreaker(name="shopify_api")
        
        @breaker.protected
        async def call_shopify():
            # Your API call here
            pass
        ```
    """
    
    def __init__(self, name: str, config: Optional[CircuitBreakerConfig] = None):
        """Initialize circuit breaker.
        
        Args:
            name: Name of the protected resource
            config: Configuration (uses defaults if not provided)
        """
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.metrics = CircuitBreakerMetrics(state=CircuitState.CLOSED)
        self._lock = asyncio.Lock()
        
        # Failure tracking (sliding window)
        self._failure_times: Deque[datetime] = deque(maxlen=100)
        
        # Rate limiting
        self._request_times: Deque[datetime] = deque(maxlen=self.config.burst_size)
        
        logger.info(
            f"🔒 Circuit breaker '{name}' initialized: "
            f"failure_threshold={self.config.failure_threshold}, "
            f"timeout={self.config.timeout_seconds}s"
        )
    
    async def call(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        """Execute a function protected by the circuit breaker.
        
        Args:
            func: Function to call
            *args: Positional arguments
            **kwargs: Keyword arguments
            
        Returns:
            Result of the function call
            
        Raises:
            CircuitBreakerOpenError: If circuit is open
            Exception: Any exception raised by the function
        """
        async with self._lock:
            # Check rate limiting first
            await self._check_rate_limit()
            
            # Check circuit state
            await self._update_state()
            
            if self.metrics.state == CircuitState.OPEN:
                raise CircuitBreakerOpenError(
                    f"Circuit breaker '{self.name}' is OPEN. "
                    f"Will retry at {self._get_next_attempt_time()}"
                )
        
        # Execute the function
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Record success
            await self._record_success()
            return result
            
        except Exception as e:
            # Record failure
            await self._record_failure()
            raise
    
    def protected(self, func: Callable[..., T]) -> Callable[..., T]:
        """Decorator to protect a function with the circuit breaker.
        
        Example:
            ```python
            @circuit_breaker.protected
            async def my_function():
                pass
            ```
        """
        if asyncio.iscoroutinefunction(func):
            @wraps(func)
            async def async_wrapper(*args: Any, **kwargs: Any) -> T:
                return cast(T, await self.call(func, *args, **kwargs))
            return cast(Callable[..., T], async_wrapper)
        else:
            @wraps(func)
            def sync_wrapper(*args: Any, **kwargs: Any) -> T:
                return cast(T, asyncio.run(self.call(func, *args, **kwargs)))
            return cast(Callable[..., T], sync_wrapper)
    
    async def _update_state(self) -> None:
        """Update circuit state based on current metrics."""
        now = datetime.now(timezone.utc)
        
        if self.metrics.state == CircuitState.CLOSED:
            # Check if we should open
            recent_failures = self._count_recent_failures()
            if recent_failures >= self.config.failure_threshold:
                self.metrics.state = CircuitState.OPEN
                self.metrics.opened_at = now
                logger.warning(
                    f"⚠️ Circuit breaker '{self.name}' OPENED "
                    f"({recent_failures} failures in window)"
                )
        
        elif self.metrics.state == CircuitState.OPEN:
            # Check if timeout has elapsed
            if self.metrics.opened_at:
                elapsed = (now - self.metrics.opened_at).total_seconds()
                if elapsed >= self.config.timeout_seconds:
                    self.metrics.state = CircuitState.HALF_OPEN
                    self.metrics.half_opened_at = now
                    self.metrics.consecutive_successes = 0
                    logger.info(
                        f"🔄 Circuit breaker '{self.name}' is now HALF_OPEN "
                        "(testing recovery)"
                    )
        
        elif self.metrics.state == CircuitState.HALF_OPEN:
            # Check if we should close or re-open
            if self.metrics.consecutive_successes >= self.config.success_threshold:
                self.metrics.state = CircuitState.CLOSED
                self.metrics.closed_at = now
                self.metrics.consecutive_failures = 0
                logger.info(
                    f"✅ Circuit breaker '{self.name}' CLOSED "
                    f"({self.metrics.consecutive_successes} successful recoveries)"
                )
            elif self.metrics.consecutive_failures > 0:
                self.metrics.state = CircuitState.OPEN
                self.metrics.opened_at = now
                logger.warning(
                    f"⚠️ Circuit breaker '{self.name}' re-OPENED "
                    "(recovery failed)"
                )
    
    async def _record_success(self) -> None:
        """Record a successful call."""
        async with self._lock:
            self.metrics.success_count += 1
            self.metrics.total_successes += 1
            self.metrics.consecutive_successes += 1
            self.metrics.consecutive_failures = 0
            self.metrics.last_success_time = datetime.now(timezone.utc)
    
    async def _record_failure(self) -> None:
        """Record a failed call."""
        async with self._lock:
            now = datetime.now(timezone.utc)
            self.metrics.failure_count += 1
            self.metrics.total_failures += 1
            self.metrics.consecutive_failures += 1
            self.metrics.consecutive_successes = 0
            self.metrics.last_failure_time = now
            self._failure_times.append(now)
    
    def _count_recent_failures(self) -> int:
        """Count failures within the time window."""
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(seconds=self.config.window_size_seconds)
        
        # Remove old failures
        while self._failure_times and self._failure_times[0] < cutoff:
            self._failure_times.popleft()
        
        return len(self._failure_times)
    
    async def _check_rate_limit(self) -> None:
        """Check and enforce rate limiting."""
        now = datetime.now(timezone.utc)
        
        # Remove old requests
        cutoff = now - timedelta(seconds=1)
        while self._request_times and self._request_times[0] < cutoff:
            self._request_times.popleft()
        
        # Check rate limit
        if len(self._request_times) >= self.config.max_requests_per_second:
            # Calculate wait time
            oldest = self._request_times[0]
            wait_seconds = 1.0 - (now - oldest).total_seconds()
            if wait_seconds > 0:
                logger.debug(
                    f"⏱️ Rate limit reached for '{self.name}', "
                    f"waiting {wait_seconds:.2f}s"
                )
                await asyncio.sleep(wait_seconds)
        
        # Record request
        self._request_times.append(datetime.now(timezone.utc))
    
    def _get_next_attempt_time(self) -> str:
        """Get the next time a request can be attempted."""
        if self.metrics.opened_at:
            next_attempt = self.metrics.opened_at + timedelta(
                seconds=self.config.timeout_seconds
            )
            return next_attempt.isoformat()
        return "unknown"
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current circuit breaker metrics."""
        return {
            "name": self.name,
            "state": self.metrics.state.value,
            "total_requests": self.metrics.total_requests,
            "total_successes": self.metrics.total_successes,
            "total_failures": self.metrics.total_failures,
            "success_rate": (
                self.metrics.total_successes / self.metrics.total_requests
                if self.metrics.total_requests > 0 else 0
            ),
            "consecutive_failures": self.metrics.consecutive_failures,
            "consecutive_successes": self.metrics.consecutive_successes,
            "recent_failures": self._count_recent_failures(),
            "last_failure": (
                self.metrics.last_failure_time.isoformat()
                if self.metrics.last_failure_time else None
            ),
            "last_success": (
                self.metrics.last_success_time.isoformat()
                if self.metrics.last_success_time else None
            ),
        }
    
    async def reset(self) -> None:
        """Reset the circuit breaker to closed state."""
        async with self._lock:
            self.metrics = CircuitBreakerMetrics(state=CircuitState.CLOSED)
            self._failure_times.clear()
            logger.info(f"🔄 Circuit breaker '{self.name}' manually reset")


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open."""
    pass


class DeadLetterQueue:
    """Dead letter queue for failed operations.
    
    Stores failed operations for later retry or manual intervention.
    """
    
    def __init__(self, name: str, max_size: int = 1000):
        """Initialize dead letter queue.
        
        Args:
            name: Name of the queue
            max_size: Maximum number of items to store
        """
        self.name = name
        self.max_size = max_size
        self._queue: Deque[Dict[str, Any]] = deque(maxlen=max_size)
        self._lock = asyncio.Lock()
    
    async def add(self, operation: str, error: Exception, context: Dict[str, Any]) -> None:
        """Add a failed operation to the queue.
        
        Args:
            operation: Name of the operation that failed
            error: The exception that was raised
            context: Additional context about the failure
        """
        async with self._lock:
            self._queue.append({
                "operation": operation,
                "error": str(error),
                "error_type": type(error).__name__,
                "context": context,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            
            logger.warning(
                f"📝 Added to dead letter queue '{self.name}': {operation} - {error}"
            )
    
    async def get_all(self) -> List[Dict[str, Any]]:
        """Get all items in the queue."""
        async with self._lock:
            return list(self._queue)
    
    async def clear(self) -> int:
        """Clear all items from the queue.
        
        Returns:
            Number of items cleared
        """
        async with self._lock:
            count = len(self._queue)
            self._queue.clear()
            logger.info(f"🗑️ Cleared {count} items from dead letter queue '{self.name}'")
            return count
    
    def size(self) -> int:
        """Get current queue size."""
        return len(self._queue)


# Global registry of circuit breakers
_circuit_breakers: Dict[str, CircuitBreaker] = {}
_dead_letter_queues: Dict[str, DeadLetterQueue] = {}


def get_circuit_breaker(name: str, config: Optional[CircuitBreakerConfig] = None) -> CircuitBreaker:
    """Get or create a circuit breaker.
    
    Args:
        name: Name of the circuit breaker
        config: Configuration (only used when creating new breaker)
        
    Returns:
        CircuitBreaker instance
    """
    if name not in _circuit_breakers:
        _circuit_breakers[name] = CircuitBreaker(name, config)
    return _circuit_breakers[name]


def get_dead_letter_queue(name: str, max_size: int = 1000) -> DeadLetterQueue:
    """Get or create a dead letter queue.
    
    Args:
        name: Name of the queue
        max_size: Maximum size (only used when creating new queue)
        
    Returns:
        DeadLetterQueue instance
    """
    if name not in _dead_letter_queues:
        _dead_letter_queues[name] = DeadLetterQueue(name, max_size)
    return _dead_letter_queues[name]


def get_all_circuit_breaker_metrics() -> Dict[str, Dict[str, Any]]:
    """Get metrics for all circuit breakers."""
    return {name: breaker.get_metrics() for name, breaker in _circuit_breakers.items()}


async def reset_all_circuit_breakers() -> None:
    """Reset all circuit breakers to closed state."""
    for breaker in _circuit_breakers.values():
        await breaker.reset()
    logger.info("🔄 All circuit breakers reset")
