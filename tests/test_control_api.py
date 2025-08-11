"""
Tests for Flask Control API endpoints.

Tests the god-mode and emergency-stop control functionality.
"""

import pytest
import json
from unittest.mock import patch

@pytest.fixture
def app():
    """Create a test Flask application."""
    from app import create_app
    app = create_app('testing')
    app.config['TESTING'] = True
    return app

@pytest.fixture
def client(app):
    """Create a test client."""
    return app.test_client()

def test_god_mode_toggle_enable(client):
    """Test enabling god mode."""
    response = client.post('/api/control/god-mode',
                          data=json.dumps({'enabled': True}),
                          content_type='application/json')
    
    assert response.status_code == 202
    data = json.loads(response.data)
    assert data['status'] == 'accepted'
    assert data['god_mode'] is True
    assert 'activated' in data['message']
    assert 'timestamp' in data

def test_god_mode_toggle_disable(client):
    """Test disabling god mode."""
    response = client.post('/api/control/god-mode',
                          data=json.dumps({'enabled': False}),
                          content_type='application/json')
    
    assert response.status_code == 202
    data = json.loads(response.data)
    assert data['status'] == 'accepted'
    assert data['god_mode'] is False
    assert 'deactivated' in data['message']

def test_god_mode_missing_enabled_field(client):
    """Test god mode with missing enabled field."""
    response = client.post('/api/control/god-mode',
                          data=json.dumps({}),
                          content_type='application/json')
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data
    assert 'enabled' in data['error']

def test_god_mode_invalid_json(client):
    """Test god mode with invalid JSON."""
    response = client.post('/api/control/god-mode',
                          data='invalid json',
                          content_type='application/json')
    
    assert response.status_code == 400

def test_emergency_stop_basic(client):
    """Test basic emergency stop."""
    response = client.post('/api/control/emergency-stop',
                          content_type='application/json')
    
    assert response.status_code == 202
    data = json.loads(response.data)
    assert data['status'] == 'accepted'
    assert data['emergency_stop'] is True
    assert 'EMERGENCY STOP ACTIVATED' in data['message']
    assert data['reason'] == 'Manual emergency stop triggered'

def test_emergency_stop_with_reason(client):
    """Test emergency stop with custom reason."""
    custom_reason = "Test emergency condition"
    response = client.post('/api/control/emergency-stop',
                          data=json.dumps({'reason': custom_reason}),
                          content_type='application/json')
    
    assert response.status_code == 202
    data = json.loads(response.data)
    assert data['reason'] == custom_reason
    assert data['emergency_stop'] is True

def test_emergency_reset_with_confirmation(client):
    """Test emergency reset with confirmation."""
    response = client.post('/api/control/reset-emergency',
                          data=json.dumps({'confirm': True, 'reason': 'Test reset'}),
                          content_type='application/json')
    
    assert response.status_code == 202
    data = json.loads(response.data)
    assert data['status'] == 'accepted'
    assert data['emergency_stop'] is False
    assert 'deactivated' in data['message']

def test_emergency_reset_without_confirmation(client):
    """Test emergency reset without confirmation."""
    response = client.post('/api/control/reset-emergency',
                          data=json.dumps({'confirm': False}),
                          content_type='application/json')
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'confirmation' in data['error']

def test_control_status_endpoint(client):
    """Test control status endpoint."""
    response = client.get('/api/control/status')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'ok'
    assert 'controls' in data
    assert 'timestamp' in data
    
    # Check control state structure
    controls = data['controls']
    assert 'god_mode' in controls
    assert 'emergency_stop' in controls
    assert 'last_updated' in controls

if __name__ == "__main__":
    pytest.main([__file__])