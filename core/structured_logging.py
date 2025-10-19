"""Structured JSON logging for production Royal Equips Orchestrator.

This module provides production-grade structured logging with:
- JSON formatted logs for easy parsing
- Contextual information (request ID, user ID, agent name)
- Audit trails for compliance
- Integration with log aggregation systems (ELK, Datadog, CloudWatch)
- Performance metrics logging
- Error tracking with stack traces

All production logs should be structured for machine readability and
correlation across distributed services.
"""

import json
import logging
import sys
import traceback
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Dict, Optional

# Context variables for request tracking
request_id_ctx: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
user_id_ctx: ContextVar[Optional[str]] = ContextVar('user_id', default=None)
agent_name_ctx: ContextVar[Optional[str]] = ContextVar('agent_name', default=None)


class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured logging.
    
    Outputs logs as JSON objects with consistent schema for parsing
    and analysis by log aggregation tools.
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON.
        
        Args:
            record: Log record to format
            
        Returns:
            JSON string with structured log data
        """
        # Base log structure
        log_obj = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add context variables if present
        request_id = request_id_ctx.get()
        if request_id:
            log_obj["request_id"] = request_id
        
        user_id = user_id_ctx.get()
        if user_id:
            log_obj["user_id"] = user_id
        
        agent_name = agent_name_ctx.get()
        if agent_name:
            log_obj["agent_name"] = agent_name
        
        # Add exception info if present
        if record.exc_info:
            log_obj["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": traceback.format_exception(*record.exc_info),
            }
        
        # Add extra fields from record
        if hasattr(record, 'extra_fields'):
            log_obj.update(record.extra_fields)
        
        return json.dumps(log_obj)


class StructuredLogger:
    """Wrapper for structured logging with contextual information.
    
    Provides convenient methods for logging with additional context
    and automatic JSON formatting.
    
    Example:
        ```python
        logger = StructuredLogger("my_agent")
        logger.info("Processing order", order_id="12345", amount=99.99)
        ```
    """
    
    def __init__(self, name: str):
        """Initialize structured logger.
        
        Args:
            name: Logger name (typically module or agent name)
        """
        self.logger = logging.getLogger(name)
        self.name = name
    
    def _log(self, level: int, message: str, **kwargs: Any) -> None:
        """Internal logging method with extra fields.
        
        Args:
            level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            message: Log message
            **kwargs: Additional fields to include in log
        """
        # Create log record with extra fields
        extra = {'extra_fields': kwargs} if kwargs else {}
        self.logger.log(level, message, extra=extra)
    
    def debug(self, message: str, **kwargs: Any) -> None:
        """Log debug message with structured data."""
        self._log(logging.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs: Any) -> None:
        """Log info message with structured data."""
        self._log(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs: Any) -> None:
        """Log warning message with structured data."""
        self._log(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, exc_info: bool = False, **kwargs: Any) -> None:
        """Log error message with structured data.
        
        Args:
            message: Error message
            exc_info: Include exception traceback if True
            **kwargs: Additional fields
        """
        if exc_info:
            self.logger.error(message, exc_info=True, extra={'extra_fields': kwargs} if kwargs else {})
        else:
            self._log(logging.ERROR, message, **kwargs)
    
    def critical(self, message: str, exc_info: bool = False, **kwargs: Any) -> None:
        """Log critical message with structured data.
        
        Args:
            message: Critical message
            exc_info: Include exception traceback if True
            **kwargs: Additional fields
        """
        if exc_info:
            self.logger.critical(message, exc_info=True, extra={'extra_fields': kwargs} if kwargs else {})
        else:
            self._log(logging.CRITICAL, message, **kwargs)
    
    def audit(self, action: str, resource: str, outcome: str, **kwargs: Any) -> None:
        """Log audit trail event.
        
        Used for compliance and security auditing.
        
        Args:
            action: Action performed (create, update, delete, access, etc.)
            resource: Resource affected (order, product, customer, etc.)
            outcome: Outcome (success, failure, denied, etc.)
            **kwargs: Additional audit data
        """
        self._log(
            logging.INFO,
            f"AUDIT: {action} {resource} - {outcome}",
            action=action,
            resource=resource,
            outcome=outcome,
            **kwargs
        )
    
    def performance(self, operation: str, duration_ms: float, **kwargs: Any) -> None:
        """Log performance metric.
        
        Args:
            operation: Operation name
            duration_ms: Duration in milliseconds
            **kwargs: Additional performance data
        """
        self._log(
            logging.INFO,
            f"PERFORMANCE: {operation} completed in {duration_ms:.2f}ms",
            operation=operation,
            duration_ms=duration_ms,
            **kwargs
        )


def setup_structured_logging(
    level: str = "INFO",
    format_json: bool = True,
    include_console: bool = True,
    log_file: Optional[str] = None
) -> None:
    """Configure structured logging for the application.
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        format_json: Use JSON formatting (True) or human-readable (False)
        include_console: Log to console/stdout
        log_file: Optional file path for file logging
    """
    # Convert level string to constant
    log_level = getattr(logging, level.upper(), logging.INFO)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers
    root_logger.handlers.clear()
    
    # Create formatter
    if format_json:
        formatter = StructuredFormatter()
    else:
        # Human-readable format for development
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    
    # Console handler
    if include_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)
    
    # File handler
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    # Log initial message
    root_logger.info(
        f"Structured logging initialized: level={level}, "
        f"format={'JSON' if format_json else 'text'}, "
        f"console={include_console}, file={log_file or 'None'}"
    )


def set_request_context(request_id: Optional[str] = None, user_id: Optional[str] = None) -> None:
    """Set context variables for request tracking.
    
    Args:
        request_id: Unique request identifier
        user_id: User identifier
    """
    if request_id:
        request_id_ctx.set(request_id)
    if user_id:
        user_id_ctx.set(user_id)


def set_agent_context(agent_name: str) -> None:
    """Set agent context for logging.
    
    Args:
        agent_name: Name of the agent
    """
    agent_name_ctx.set(agent_name)


def clear_context() -> None:
    """Clear all context variables."""
    request_id_ctx.set(None)
    user_id_ctx.set(None)
    agent_name_ctx.set(None)


def get_structured_logger(name: str) -> StructuredLogger:
    """Get a structured logger instance.
    
    Args:
        name: Logger name
        
    Returns:
        StructuredLogger instance
    """
    return StructuredLogger(name)


# Example usage for documentation
if __name__ == "__main__":
    # Set up structured logging
    setup_structured_logging(level="INFO", format_json=True)
    
    # Create logger
    logger = get_structured_logger("example")
    
    # Set context
    set_request_context(request_id="req-12345", user_id="user-67890")
    set_agent_context("product_research")
    
    # Log various events
    logger.info("Agent started", agent_type="product_research", version="2.0")
    logger.audit("fetch", "products", "success", count=50, source="AutoDS")
    logger.performance("api_call", 123.45, endpoint="/products", status=200)
    logger.warning("Rate limit approaching", current=95, limit=100)
    
    try:
        raise ValueError("Example error")
    except Exception:
        logger.error("Operation failed", exc_info=True, operation="example")
    
    # Clear context
    clear_context()
