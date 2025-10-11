"""
Rate Limiter for API endpoints.

Provides simple in-memory rate limiting for Flask routes.
For production, use Redis-backed rate limiting.
"""

import logging
import time
from typing import Dict, Tuple, Optional
from functools import wraps
from flask import request, jsonify

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple in-memory rate limiter for API endpoints."""
    
    def __init__(self, default_limits: Optional[Dict[str, Tuple[int, int]]] = None):
        """Initialize rate limiter.
        
        Args:
            default_limits: Dict mapping endpoint names to (max_requests, window_seconds) tuples
        """
        self.default_limits = default_limits or {}
        self._requests: Dict[str, Dict[str, list]] = {}
    
    def limit(self, endpoint_name: str, max_requests: Optional[int] = None, 
              window_seconds: Optional[int] = None):
        """Decorator to rate limit an endpoint.
        
        Args:
            endpoint_name: Name of the endpoint
            max_requests: Maximum requests allowed in window (overrides default)
            window_seconds: Time window in seconds (overrides default)
        """
        # Get limits from defaults or parameters
        if max_requests is None or window_seconds is None:
            default = self.default_limits.get(endpoint_name, (100, 3600))
            max_requests = max_requests or default[0]
            window_seconds = window_seconds or default[1]
        
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                # Get client identifier (IP address)
                client_id = request.remote_addr or 'unknown'
                
                # Get current time
                current_time = time.time()
                
                # Initialize endpoint tracking
                if endpoint_name not in self._requests:
                    self._requests[endpoint_name] = {}
                
                # Initialize client tracking
                if client_id not in self._requests[endpoint_name]:
                    self._requests[endpoint_name][client_id] = []
                
                # Get client's request history
                request_times = self._requests[endpoint_name][client_id]
                
                # Remove old requests outside the window
                cutoff_time = current_time - window_seconds
                request_times = [t for t in request_times if t > cutoff_time]
                self._requests[endpoint_name][client_id] = request_times
                
                # Check if rate limit exceeded
                if len(request_times) >= max_requests:
                    logger.warning(f"Rate limit exceeded for {client_id} on {endpoint_name}")
                    return jsonify({
                        'error': 'Rate limit exceeded',
                        'message': f'Maximum {max_requests} requests per {window_seconds} seconds',
                        'retry_after': int(request_times[0] + window_seconds - current_time)
                    }), 429
                
                # Add current request
                request_times.append(current_time)
                
                # Call the actual endpoint
                return f(*args, **kwargs)
            
            return decorated_function
        return decorator
    
    def check_limit(self, endpoint_name: str, client_id: str) -> Dict[str, any]:
        """Check rate limit status for a client.
        
        Args:
            endpoint_name: Name of the endpoint
            client_id: Client identifier
            
        Returns:
            Dict with limit info
        """
        if endpoint_name not in self._requests:
            return {'allowed': True, 'remaining': 'unlimited'}
        
        if client_id not in self._requests[endpoint_name]:
            return {'allowed': True, 'remaining': 'unlimited'}
        
        # Get limits
        default = self.default_limits.get(endpoint_name, (100, 3600))
        max_requests, window_seconds = default
        
        # Get current time and request history
        current_time = time.time()
        request_times = self._requests[endpoint_name][client_id]
        
        # Remove old requests
        cutoff_time = current_time - window_seconds
        request_times = [t for t in request_times if t > cutoff_time]
        
        remaining = max_requests - len(request_times)
        
        return {
            'allowed': remaining > 0,
            'remaining': remaining,
            'limit': max_requests,
            'window_seconds': window_seconds,
            'reset_at': request_times[0] + window_seconds if request_times else None
        }
    
    def reset(self, endpoint_name: Optional[str] = None, client_id: Optional[str] = None):
        """Reset rate limit counters.
        
        Args:
            endpoint_name: Specific endpoint to reset (None = all)
            client_id: Specific client to reset (None = all)
        """
        if endpoint_name is None:
            self._requests.clear()
            logger.info("All rate limits reset")
        elif client_id is None:
            if endpoint_name in self._requests:
                self._requests[endpoint_name].clear()
                logger.info(f"Rate limits reset for endpoint: {endpoint_name}")
        else:
            if endpoint_name in self._requests and client_id in self._requests[endpoint_name]:
                del self._requests[endpoint_name][client_id]
                logger.info(f"Rate limit reset for {client_id} on {endpoint_name}")
