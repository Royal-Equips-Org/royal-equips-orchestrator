"""Tests for logging setup and health endpoint filtering."""

import logging
from api.utils.logging_setup import HealthLogFilter, setup_health_log_filter


class MockLogRecord:
    """Mock log record for testing."""
    
    def __init__(self, message: str):
        self.message = message
    
    def getMessage(self) -> str:
        return self.message


class TestHealthLogFilter:
    """Test cases for the HealthLogFilter class."""

    def test_filter_health_endpoints(self):
        """Test that health endpoints are filtered out."""
        filter_obj = HealthLogFilter()
        
        health_requests = [
            "GET /health HTTP/1.1 200",
            "POST /health HTTP/1.1 405", 
            "GET /healthz HTTP/1.1 200",
            "GET /livez HTTP/1.1 200",
            "GET /readyz HTTP/1.1 200",
            "127.0.0.1:8000 - GET /health 200",
            "INFO:uvicorn.access:127.0.0.1:8000 - GET /health 200"
        ]
        
        for request_log in health_requests:
            record = MockLogRecord(request_log)
            assert filter_obj.filter(record) is False, f"Should filter: {request_log}"

    def test_allow_other_endpoints(self):
        """Test that non-health endpoints pass through the filter."""
        filter_obj = HealthLogFilter()
        
        other_requests = [
            "GET / HTTP/1.1 200",
            "GET /docs HTTP/1.1 200", 
            "GET /command-center HTTP/1.1 307",
            "GET /control-center HTTP/1.1 307",
            "GET /dashboard HTTP/1.1 307",
            "POST /agents/session HTTP/1.1 200",
            "GET /metrics HTTP/1.1 200",
            "GET /jobs HTTP/1.1 200",
            "127.0.0.1:8000 - GET /docs 200"
        ]
        
        for request_log in other_requests:
            record = MockLogRecord(request_log)
            assert filter_obj.filter(record) is True, f"Should allow: {request_log}"

    def test_case_insensitive_filtering(self):
        """Test that filtering is case-insensitive."""
        filter_obj = HealthLogFilter()
        
        case_variations = [
            "GET /HEALTH HTTP/1.1 200",
            "GET /Health HTTP/1.1 200",
            "GET /HEALTHZ HTTP/1.1 200",
            "GET /Livez HTTP/1.1 200",
        ]
        
        for request_log in case_variations:
            record = MockLogRecord(request_log)
            assert filter_obj.filter(record) is False, f"Should filter: {request_log}"

    def test_custom_patterns(self):
        """Test that custom health patterns work."""
        custom_patterns = [r'GET\s+/status(?:\s|\?|$)', r'GET\s+/ping(?:\s|\?|$)']
        filter_obj = HealthLogFilter(health_patterns=custom_patterns)
        
        # Default health endpoints should now pass through
        record = MockLogRecord("GET /health HTTP/1.1 200")
        assert filter_obj.filter(record) is True
        
        # Custom patterns should be filtered
        custom_requests = [
            "GET /status HTTP/1.1 200",
            "GET /ping HTTP/1.1 200"
        ]
        
        for request_log in custom_requests:
            record = MockLogRecord(request_log)
            assert filter_obj.filter(record) is False, f"Should filter custom: {request_log}"

    def test_exact_path_matching(self):
        """Test that only exact health paths are filtered."""
        filter_obj = HealthLogFilter()
        
        # These should be filtered (exact health endpoints)
        health_requests = [
            "GET /health HTTP/1.1 200",
            "POST /health HTTP/1.1 405", 
            "GET /healthz HTTP/1.1 200",
            "GET /livez HTTP/1.1 200",
            "GET /readyz HTTP/1.1 200",
            "GET /health?check=true HTTP/1.1 200",  # with query params
        ]
        
        for request_log in health_requests:
            record = MockLogRecord(request_log)
            assert filter_obj.filter(record) is False, f"Should filter: {request_log}"
        
        # These should NOT be filtered (health is part of larger path)
        non_matching = [
            "GET /healthcheck HTTP/1.1 200",        # health is part of larger word
            "GET /unhealthy HTTP/1.1 200",          # health is part of larger word  
            "GET /app/healthz/status HTTP/1.1 200", # healthz is in middle of path
            "GET /api/health/detailed HTTP/1.1 200", # health is in middle of path
        ]
        
        for request_log in non_matching:
            record = MockLogRecord(request_log)
            assert filter_obj.filter(record) is True, f"Should NOT filter: {request_log}"


class TestLoggingSetup:
    """Test cases for logging setup functions."""

    def test_setup_health_log_filter(self):
        """Test that setup_health_log_filter applies the filter correctly."""
        # Create a test logger
        test_logger_name = "test.uvicorn.access"
        test_logger = logging.getLogger(test_logger_name)
        
        # Ensure it starts clean
        test_logger.filters.clear()
        
        # Apply the filter
        setup_health_log_filter(test_logger_name)
        
        # Check that exactly one HealthLogFilter was added
        health_filters = [f for f in test_logger.filters if isinstance(f, HealthLogFilter)]
        assert len(health_filters) == 1

    def test_no_duplicate_filters(self):
        """Test that applying the filter multiple times doesn't create duplicates."""
        test_logger_name = "test.uvicorn.access2"
        test_logger = logging.getLogger(test_logger_name)
        
        # Ensure it starts clean
        test_logger.filters.clear()
        
        # Apply the filter multiple times
        setup_health_log_filter(test_logger_name)
        setup_health_log_filter(test_logger_name)
        setup_health_log_filter(test_logger_name)
        
        # Should still have only one filter
        health_filters = [f for f in test_logger.filters if isinstance(f, HealthLogFilter)]
        assert len(health_filters) == 1