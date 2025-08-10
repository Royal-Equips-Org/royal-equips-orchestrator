"""Logging filters for the Royal Equips Orchestrator.

This module provides logging filters to reduce noise in access logs,
particularly for health check endpoints and other routine requests
that don't provide useful diagnostic information.
"""

import logging
import os
import re
from typing import List


class HealthCheckLogFilter(logging.Filter):
    """Filter to suppress access log entries for health check endpoints.
    
    This filter removes log records that match specific patterns like:
    - GET /health HTTP/1.1
    - HEAD / HTTP/1.1
    
    It only affects the uvicorn.access logger and leaves error logs untouched.
    """
    
    def __init__(self, patterns: List[str] = None):
        """Initialize the filter with suppression patterns.
        
        Args:
            patterns: List of regex patterns to match against log messages.
                     If None, uses default health check patterns.
        """
        super().__init__()
        if patterns is None:
            patterns = [
                r'"GET /health HTTP/',
                r'"HEAD / HTTP/',
                r'"GET /favicon\.ico HTTP/',
            ]
        self.compiled_patterns = [re.compile(pattern) for pattern in patterns]
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Filter log records based on configured patterns.
        
        Args:
            record: The log record to evaluate
            
        Returns:
            False if the record should be suppressed, True otherwise
        """
        message = record.getMessage()
        for pattern in self.compiled_patterns:
            if pattern.search(message):
                return False
        return True


def install_log_filters() -> None:
    """Install logging filters based on environment configuration.
    
    This function reads environment variables to configure logging behavior:
    - SUPPRESS_HEALTH_LOGS (default: true): Enable/disable health check filter
    - DISABLE_ACCESS_LOG (default: false): Completely disable access logging
    - LOG_LEVEL (default: info): Set logging level for uvicorn loggers
    """
    # Read environment configuration
    suppress_health_logs = os.getenv("SUPPRESS_HEALTH_LOGS", "true").lower() in ("true", "1", "yes")
    disable_access_log = os.getenv("DISABLE_ACCESS_LOG", "false").lower() in ("true", "1", "yes")
    log_level = os.getenv("LOG_LEVEL", "info").upper()
    
    # Validate log level
    if log_level not in ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"):
        log_level = "INFO"
    
    # Configure uvicorn access logger
    access_logger = logging.getLogger("uvicorn.access")
    
    if disable_access_log:
        # Completely disable access logging
        access_logger.disabled = True
    elif suppress_health_logs:
        # Install health check filter
        health_filter = HealthCheckLogFilter()
        access_logger.addFilter(health_filter)
    
    # Set log levels (but don't suppress uvicorn.error)
    uvicorn_logger = logging.getLogger("uvicorn")
    uvicorn_logger.setLevel(getattr(logging, log_level))
    
    error_logger = logging.getLogger("uvicorn.error")
    # Keep error logger at INFO or lower to ensure errors are visible
    error_level = min(getattr(logging, log_level), logging.INFO)
    error_logger.setLevel(error_level)