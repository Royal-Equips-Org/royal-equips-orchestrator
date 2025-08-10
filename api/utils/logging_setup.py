"""
Logging setup utilities for Royal Equips Orchestrator.

This module provides logging filters and setup functions to customize
application logging, particularly for suppressing health check noise.
"""

import logging
import re
from typing import List, Pattern


class HealthLogFilter(logging.Filter):
    """
    Filter that suppresses access log entries for health check endpoints.
    
    This filter removes log noise from health monitoring systems by
    suppressing requests to common health check endpoints:
    - /health
    - /healthz  
    - /livez
    - /readyz
    """
    
    def __init__(self, health_patterns: List[str] = None):
        """
        Initialize the health log filter.
        
        Args:
            health_patterns: List of URL patterns to filter. 
                           Defaults to common health check endpoints.
        """
        super().__init__()
        
        # Default health check patterns - match exact paths or paths with query params
        if health_patterns is None:
            health_patterns = [
                r'GET\s+/health(?:\s|\?|$)',   # /health at end of path or with query params
                r'POST\s+/health(?:\s|\?|$)',  # Handle different HTTP methods
                r'GET\s+/healthz(?:\s|\?|$)',  # /healthz
                r'POST\s+/healthz(?:\s|\?|$)',
                r'GET\s+/livez(?:\s|\?|$)',    # /livez
                r'POST\s+/livez(?:\s|\?|$)',
                r'GET\s+/readyz(?:\s|\?|$)',   # /readyz
                r'POST\s+/readyz(?:\s|\?|$)',
            ]
        
        # Compile patterns for efficient matching
        self.patterns: List[Pattern] = [
            re.compile(pattern, re.IGNORECASE) 
            for pattern in health_patterns
        ]
    
    def filter(self, record: logging.LogRecord) -> bool:
        """
        Filter log records to suppress health check requests.
        
        Args:
            record: The log record to check
            
        Returns:
            False if the record should be suppressed, True otherwise
        """
        # Check if this is an access log record
        if hasattr(record, 'getMessage'):
            message = record.getMessage()
            
            # Check if message matches any health check pattern
            for pattern in self.patterns:
                if pattern.search(message):
                    return False  # Suppress this log entry
        
        return True  # Allow other log entries


def setup_health_log_filter(logger_name: str = "uvicorn.access") -> None:
    """
    Set up the health log filter for the specified logger.
    
    This function should be called early in the application startup
    to ensure health check requests are filtered from the beginning.
    
    Args:
        logger_name: Name of the logger to apply the filter to.
                    Defaults to "uvicorn.access" for FastAPI access logs.
    """
    logger = logging.getLogger(logger_name)
    
    # Check if filter is already applied to avoid duplicates
    for filter_obj in logger.filters:
        if isinstance(filter_obj, HealthLogFilter):
            return  # Filter already applied
    
    # Add the health log filter
    health_filter = HealthLogFilter()
    logger.addFilter(health_filter)
    
    # Log that the filter has been applied (to a different logger to avoid recursion)
    setup_logger = logging.getLogger(__name__)
    setup_logger.info(f"Health log filter applied to {logger_name}")


def setup_logging() -> None:
    """
    Set up comprehensive logging configuration for the application.
    
    This function configures:
    1. Health log filtering for access logs
    2. General application logging levels
    """
    # Apply health log filter to uvicorn access logger
    setup_health_log_filter("uvicorn.access")
    
    # Ensure other loggers have appropriate levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    
    # Set application logger level  
    app_logger = logging.getLogger("api.main")
    app_logger.setLevel(logging.INFO)