"""
Tests for FASE 1-3 implementation: API routing fixes and RoyalGPT orchestration.

This test suite validates:
- FASE 1: API routing and 404 handling
- FASE 2: RoyalGPT authentication and authorization
- FASE 3: Health monitoring and heartbeat verification
"""

from unittest.mock import Mock, patch

import pytest

from app import create_app
from core.security.auth import is_royalgpt_authorized
from orchestrator.core.agent_heartbeat import verify_heartbeats
from orchestrator.core.agent_registry import get_agent_registry, register_autogen_agents


class TestFase1APIRouting:
    """Test FASE 1: API routing fixes and 404 handling."""

    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        test_app = create_app('testing')
        test_app.config['TESTING'] = True
        return test_app

    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()

    def test_healthz_returns_json(self, client):
        """Test that /healthz returns JSON, not HTML."""
        response = client.get('/healthz')
        assert response.status_code == 200
        assert response.content_type.startswith('application/json')
        data = response.get_json()
        assert 'status' in data

    def test_readyz_returns_json(self, client):
        """Test that /readyz returns JSON with health checks."""
        response = client.get('/readyz')
        assert response.status_code == 200
        assert response.content_type.startswith('application/json')
        data = response.get_json()
        assert 'checks' in data
        assert 'ready' in data

    def test_api_404_returns_json_not_html(self, client):
        """Test that API routes return JSON 404, not HTML fallback."""
        response = client.get('/api/nonexistent/route')
        assert response.status_code == 404
        assert response.content_type.startswith('application/json')
        data = response.get_json()
        assert data['error'] == 'Not Found'
        assert data['path'] == '/api/nonexistent/route'

    def test_health_endpoint_404_returns_json(self, client):
        """Test that non-existent health endpoints return JSON."""
        response = client.get('/health/nonexistent')
        assert response.status_code == 404
        assert response.content_type.startswith('application/json')
        data = response.get_json()
        assert data['error'] == 'Not Found'


class TestFase2RoyalGPTAuth:
    """Test FASE 2: RoyalGPT authentication and authorization."""

    def test_is_royalgpt_authorized_no_api_key(self):
        """Test authorization when no API key is configured (dev mode)."""
        with patch('os.getenv', return_value=''):
            # No API key configured - should allow all requests
            mock_request = Mock()
            mock_request.headers.get.return_value = ''
            result = is_royalgpt_authorized(mock_request)
            assert result is True

    def test_is_royalgpt_authorized_with_valid_key(self):
        """Test authorization with valid API key."""
        with patch('os.getenv', return_value='test_secret_key'):
            mock_request = Mock()
            mock_request.headers.get.return_value = 'Bearer test_secret_key'
            result = is_royalgpt_authorized(mock_request)
            assert result is True

    def test_is_royalgpt_authorized_with_invalid_key(self):
        """Test authorization with invalid API key."""
        with patch('os.getenv', return_value='test_secret_key'):
            mock_request = Mock()
            mock_request.headers.get.return_value = 'Bearer wrong_key'
            result = is_royalgpt_authorized(mock_request)
            assert result is False

    def test_is_royalgpt_authorized_plain_token(self):
        """Test authorization with plain token (no Bearer prefix)."""
        with patch('os.getenv', return_value='test_secret_key'):
            mock_request = Mock()
            mock_request.headers.get.return_value = 'test_secret_key'
            result = is_royalgpt_authorized(mock_request)
            assert result is True

    @pytest.mark.asyncio
    async def test_register_autogen_agents(self):
        """Test dynamic agent generation for 100+ agents."""
        registry = get_agent_registry()

        # Register a small batch for testing
        result = await register_autogen_agents(registry, count=5)

        assert result['success'] is True
        assert result['registered'] >= 0  # May vary depending on existing state
        assert result['total'] == 5


class TestFase3Monitoring:
    """Test FASE 3: Health monitoring and heartbeat verification."""

    def test_verify_heartbeats(self):
        """Test heartbeat verification function."""
        result = verify_heartbeats(max_age_seconds=120)

        assert 'timestamp' in result
        assert 'total_agents' in result
        assert 'healthy' in result
        assert 'stale' in result
        assert 'error' in result
        assert 'overall_status' in result

        # Should have counts for each category
        assert isinstance(result['healthy']['count'], int)
        assert isinstance(result['stale']['count'], int)
        assert isinstance(result['error']['count'], int)

    def test_verify_heartbeats_returns_agent_lists(self):
        """Test that heartbeat verification returns agent details."""
        result = verify_heartbeats()

        # Should have agent lists
        assert 'agents' in result['healthy']
        assert 'agents' in result['stale']
        assert 'agents' in result['error']

        # Lists should be lists
        assert isinstance(result['healthy']['agents'], list)
        assert isinstance(result['stale']['agents'], list)
        assert isinstance(result['error']['agents'], list)


class TestConfigurationEnhancements:
    """Test configuration enhancements for RoyalGPT."""

    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        test_app = create_app('testing')
        return test_app

    def test_royalgpt_config_exists(self, app):
        """Test that RoyalGPT configuration options exist."""
        from app.config import Config

        assert hasattr(Config, 'ROYALGPT_ENABLED')
        assert hasattr(Config, 'API_KEY_ROYALGPT')
        assert hasattr(Config, 'AUTHORIZED_AGENTS_SCOPE')

    def test_royalgpt_config_defaults(self):
        """Test default values for RoyalGPT configuration."""
        from app.config import Config

        # Should have sensible defaults
        assert isinstance(Config.ROYALGPT_ENABLED, bool)
        assert isinstance(Config.AUTHORIZED_AGENTS_SCOPE, str)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
