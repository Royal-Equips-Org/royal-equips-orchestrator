"""Unit tests for GitHub Service rate limit fixes."""

import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, patch


class TestGitHubService:
    """Test GitHub service rate limit handling."""
    
    def test_github_service_initialization(self):
        """Test that GitHub service initializes with rate limit tracking."""
        from app.services.github_service import GitHubService
        
        service = GitHubService()
        
        # Verify rate limit tracking is initialized
        assert hasattr(service, '_rate_limit_remaining')
        assert hasattr(service, '_rate_limit_reset_time')
        assert hasattr(service, '_cache')
        assert hasattr(service, '_cache_ttl')
        
        # Initial values should be None/empty
        assert service._rate_limit_remaining is None
        assert service._rate_limit_reset_time is None
        assert service._cache == {}
        assert service._cache_ttl == 300  # 5 minutes
        
    def test_rate_limit_check_with_low_quota(self):
        """Test that rate limit check blocks calls when quota is low."""
        from app.services.github_service import GitHubService
        
        service = GitHubService()
        
        # Set low rate limit remaining
        service._rate_limit_remaining = 5
        service._rate_limit_reset_time = datetime.now(timezone.utc).timestamp() + 300  # 5 minutes from now
        
        # Should return False (block the call)
        assert service._check_rate_limit() is False
        
    def test_rate_limit_check_after_reset(self):
        """Test that rate limit check allows calls after reset time."""
        from app.services.github_service import GitHubService
        
        service = GitHubService()
        
        # Set low rate limit but with past reset time
        service._rate_limit_remaining = 5
        service._rate_limit_reset_time = datetime.now(timezone.utc).timestamp() - 10  # 10 seconds ago
        
        # Should return True (allow the call) and reset tracking
        assert service._check_rate_limit() is True
        assert service._rate_limit_remaining is None
        assert service._rate_limit_reset_time is None
        
    def test_rate_limit_check_with_sufficient_quota(self):
        """Test that rate limit check allows calls with sufficient quota."""
        from app.services.github_service import GitHubService
        
        service = GitHubService()
        
        # Set sufficient rate limit remaining
        service._rate_limit_remaining = 100
        service._rate_limit_reset_time = datetime.now(timezone.utc).timestamp() + 300
        
        # Should return True (allow the call)
        assert service._check_rate_limit() is True
        
    def test_cache_get_and_set(self):
        """Test cache get and set operations."""
        from app.services.github_service import GitHubService
        
        service = GitHubService()
        
        # Initially, cache should be empty
        assert service._get_cached('test_key') is None
        
        # Set cache
        test_data = {'test': 'data'}
        service._set_cache('test_key', test_data)
        
        # Should retrieve cached data
        cached = service._get_cached('test_key')
        assert cached == test_data
        
    def test_cache_expiration(self):
        """Test that cache expires after TTL."""
        from app.services.github_service import GitHubService
        from datetime import timedelta
        
        service = GitHubService()
        
        # Set cache with expired timestamp
        expired_time = datetime.now(timezone.utc) - timedelta(seconds=service._cache_ttl + 1)
        service._cache['test_key'] = ({'test': 'data'}, expired_time)
        
        # Should return None for expired cache
        assert service._get_cached('test_key') is None
        
    @patch('app.services.github_service.requests.request')
    def test_rate_limit_headers_tracked(self, mock_request):
        """Test that rate limit headers from API responses are tracked."""
        from app.services.github_service import GitHubService
        
        service = GitHubService()
        service._authenticated = True
        service.token = "test_token"
        
        # Mock response with rate limit headers
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {
            'X-RateLimit-Remaining': '45',
            'X-RateLimit-Reset': str(int(datetime.now(timezone.utc).timestamp() + 3600))
        }
        mock_response.json.return_value = {'name': 'test-repo'}
        mock_request.return_value = mock_response
        
        # Make a request
        try:
            service._make_request('GET', '/repos/test/test')
        except Exception:
            pass  # We're only testing header tracking
        
        # Verify rate limit was tracked
        assert service._rate_limit_remaining == 45
        assert service._rate_limit_reset_time is not None
        
    def test_cached_methods_use_cache(self):
        """Test that methods use cache to reduce API calls."""
        from app.services.github_service import GitHubService
        
        service = GitHubService()
        
        # Pre-populate cache
        test_data = [{'sha': '12345678', 'message': 'Test commit'}]
        service._set_cache('commits_5', test_data)
        
        # Call method that should use cache
        result = service.get_recent_commits(5)
        
        # Should return cached data without making API call
        assert result == test_data
