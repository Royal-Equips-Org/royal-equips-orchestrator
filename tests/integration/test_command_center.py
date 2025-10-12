"""
Integration tests for the Command Center functionality
"""


import pytest

from app import create_app


class TestCommandCenterIntegration:
    """Test command center integration functionality"""

    @pytest.fixture
    def app(self):
        """Create test app"""
        return create_app()

    @pytest.fixture
    def client(self, app):
        """Create test client"""
        return app.test_client()

    def test_full_command_center_workflow(self, client):
        """Test complete command center workflow"""
        # Test main dashboard access
        response = client.get('/command-center/')
        assert response.status_code == 200

        # Test health check
        response = client.get('/command-center/health')
        assert response.status_code in [200, 503]

        # Test API endpoints
        response = client.get('/command-center/api/integrations/status')
        assert response.status_code == 200

        response = client.get('/command-center/api/agents/status')
        assert response.status_code == 200

        response = client.get('/command-center/api/market-intelligence')
        assert response.status_code == 200

    def test_agent_trigger_functionality(self, client):
        """Test agent triggering functionality"""
        # Test valid agent trigger
        response = client.post('/command-center/api/agents/product_research/trigger')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['agent'] == 'product_research'

        # Test invalid agent trigger
        response = client.post('/command-center/api/agents/invalid_agent/trigger')
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False

    def test_real_time_metrics_api(self, client):
        """Test real-time metrics API"""
        response = client.get('/command-center/api/metrics/real-time')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'data' in data
        assert 'revenue' in data['data']
        assert 'orders' in data['data']

    def test_empire_status_api(self, client):
        """Test empire status API"""
        response = client.get('/command-center/api/empire-status')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'empire_dashboard' in data
