"""
Tests for the Flask Command Center endpoints and service contract.

Tests the core Flask functionality without orchestrator dependencies.
"""

import pytest
import json
from unittest.mock import patch


def test_flask_app_creation():
    """Test that Flask app can be created without errors."""
    from app import create_app
    app = create_app()
    assert app is not None
    assert app.name == 'app'


def test_service_contract_endpoints():
    """Test that all service contract endpoints exist and work."""
    from app import create_app
    app = create_app()
    
    with app.test_client() as client:
        # Test root endpoint returns service contract
        response = client.get('/')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['service'] == 'Royal Equips Orchestrator'
        assert data['status'] == 'ok'
        assert data['version'] == '2.0.0'
        assert data['backend'] == 'flask'
        
        # Check all required endpoints are listed
        endpoints = data['endpoints']
        assert endpoints['health'] == '/healthz'
        assert endpoints['readiness'] == '/readyz'
        assert endpoints['metrics'] == '/metrics'
        assert endpoints['command_center'] == '/command-center'
        assert endpoints['api_docs'] == '/docs'


def test_health_endpoint():
    """Test health endpoint."""
    from app import create_app
    app = create_app()
    
    with app.test_client() as client:
        response = client.get('/healthz')
        assert response.status_code == 200
        assert response.data == b'ok'


def test_readiness_endpoint():
    """Test readiness endpoint."""
    from app import create_app
    app = create_app()
    
    with app.test_client() as client:
        response = client.get('/readyz')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'ready' in data
        assert 'status' in data
        assert 'timestamp' in data


def test_metrics_endpoint():
    """Test metrics endpoint."""
    from app import create_app
    app = create_app()
    
    with app.test_client() as client:
        response = client.get('/metrics')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['ok'] is True
        assert data['backend'] == 'flask'
        assert data['version'] == '2.0.0'
        assert 'uptime_seconds' in data
        assert 'timestamp' in data


def test_control_endpoints():
    """Test control API endpoints."""
    from app import create_app
    app = create_app()
    
    with app.test_client() as client:
        # Test god-mode
        response = client.post('/api/control/god-mode',
                              data=json.dumps({'enabled': True}),
                              content_type='application/json')
        assert response.status_code == 202
        data = json.loads(response.data)
        assert data['god_mode'] is True
        
        # Test emergency-stop
        response = client.post('/api/control/emergency-stop',
                              data=json.dumps({'reason': 'Test'}),
                              content_type='application/json')
        assert response.status_code == 202
        data = json.loads(response.data)
        assert data['emergency_stop'] is True
        
        # Test control status
        response = client.get('/api/control/status')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert 'controls' in data


def test_command_center_endpoint():
    """Test command center serves HTML."""
    from app import create_app
    app = create_app()
    
    with app.test_client() as client:
        response = client.get('/command-center/')
        assert response.status_code == 200
        assert b'html' in response.data.lower()


if __name__ == "__main__":
    pytest.main([__file__, '-v'])