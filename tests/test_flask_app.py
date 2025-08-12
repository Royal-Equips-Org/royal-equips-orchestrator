"""
Tests for Flask application health and core routes.

Validates that the Flask migration maintains compatibility with
existing FastAPI functionality.
"""

import pytest
import json
from app import create_app


class TestFlaskHealthAndRoutes:
    """Test Flask application health and routing functionality."""

    @pytest.fixture
    def app(self):
        """Create Flask test application."""
        app = create_app('testing')
        return app

    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()

    def test_healthz_returns_plain_ok(self, client):
        """Test that /healthz returns plain text 'ok'."""
        response = client.get('/healthz')
        
        assert response.status_code == 200
        assert response.get_data(as_text=True) == "ok"
        assert "text/plain" in response.headers["content-type"]

    def test_legacy_health_endpoint(self, client):
        """Test that /health still works for compatibility."""
        response = client.get('/health')
        
        assert response.status_code == 200
        assert response.get_data(as_text=True) == "ok"
        assert "text/plain" in response.headers["content-type"]

    def test_readiness_endpoint(self, client):
        """Test readiness endpoint returns proper JSON."""
        response = client.get('/readyz')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['ready'] is True
        assert data['status'] == 'healthy'
        assert 'checks' in data
        assert 'timestamp' in data

    def test_metrics_endpoint(self, client):
        """Test metrics endpoint returns proper data."""
        response = client.get('/metrics')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['ok'] is True
        assert data['backend'] == 'flask'
        assert 'uptime_seconds' in data
        assert 'version' in data

    def test_root_endpoint_html_response(self, client):
        """Test root endpoint returns HTML when templates are available."""
        response = client.get('/')
        
        assert response.status_code == 200
        assert 'text/html' in response.content_type
        assert b'Royal Equips Orchestrator' in response.data
        assert b'Command Center' in response.data

    def test_command_center_redirect(self, client):
        """Test command center redirect functionality."""
        response = client.get('/command-center', follow_redirects=False)
        
        assert response.status_code == 308  # Permanent redirect to add trailing slash
        assert '/command-center/' in response.location

    def test_control_center_alias(self, client):
        """Test control center alias redirects properly."""
        response = client.get('/control-center', follow_redirects=False)
        
        assert response.status_code == 307
        assert 'command-center' in response.location

    def test_dashboard_alias(self, client):
        """Test dashboard alias redirects properly."""
        response = client.get('/dashboard', follow_redirects=False)
        
        assert response.status_code == 307
        assert 'command-center' in response.location

    def test_favicon_endpoint(self, client):
        """Test favicon endpoint returns 204."""
        response = client.get('/favicon.ico')
        
        assert response.status_code == 204

    def test_404_error_handling(self, client):
        """Test 404 error returns JSON for API requests."""
        response = client.get('/nonexistent', headers={'Accept': 'application/json'})
        
        assert response.status_code == 404
        data = response.get_json()
        assert data['error'] == 'Not Found'
        assert data['status_code'] == 404

    def test_docs_endpoint(self, client):
        """Test API documentation endpoint."""
        response = client.get('/docs')
        
        assert response.status_code == 200
        assert 'text/html' in response.content_type
        assert b'Flasgger' in response.data or b'swagger' in response.data.lower()


class TestFlaskAgentEndpoints:
    """Test Flask agent endpoints."""

    @pytest.fixture
    def app(self):
        """Create Flask test application."""
        return create_app('testing')

    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()

    def test_create_agent_session(self, client):
        """Test agent session creation."""
        response = client.post('/agents/session')
        
        assert response.status_code == 201
        data = response.get_json()
        assert 'session_id' in data
        assert isinstance(data['session_id'], str)

    def test_send_agent_message(self, client):
        """Test sending message to agent session."""
        # First create a session
        session_response = client.post('/agents/session')
        session_id = session_response.get_json()['session_id']
        
        # Send a message
        message_data = {
            'session_id': session_id,
            'role': 'user',
            'content': 'Hello, agent!'
        }
        
        response = client.post('/agents/message',
                             data=json.dumps(message_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'received'
        assert 'message_id' in data

    def test_send_message_validation(self, client):
        """Test message validation."""
        # Test missing session_id
        message_data = {
            'role': 'user',
            'content': 'Hello!'
        }
        
        response = client.post('/agents/message',
                             data=json.dumps(message_data),
                             content_type='application/json')
        
        assert response.status_code == 400
        assert 'session_id is required' in response.get_json()['error']

    def test_list_agent_sessions(self, client):
        """Test listing agent sessions."""
        # Create a session first
        client.post('/agents/session')
        
        response = client.get('/agents/sessions')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'sessions' in data
        assert 'total' in data
        assert data['total'] >= 1

    def test_stream_agent_response_session_required(self, client):
        """Test streaming requires valid session."""
        response = client.get('/agents/stream')
        
        assert response.status_code == 400
        assert 'session_id parameter is required' in response.get_json()['error']


class TestFlaskEventAndJobEndpoints:
    """Test Flask event and job endpoints."""

    @pytest.fixture
    def app(self):
        """Create Flask test application."""
        return create_app('testing')

    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()

    def test_create_event(self, client):
        """Test event creation endpoint."""
        event_data = {
            'event_type': 'test_event',
            'data': {'key': 'value'}
        }
        
        response = client.post('/events',
                             data=json.dumps(event_data),
                             content_type='application/json')
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'accepted'
        assert 'event_id' in data
        assert 'timestamp' in data

    def test_get_jobs(self, client):
        """Test jobs listing endpoint."""
        response = client.get('/jobs')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'jobs' in data
        assert 'total' in data
        assert isinstance(data['jobs'], list)