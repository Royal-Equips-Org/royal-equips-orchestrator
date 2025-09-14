"""
Tests for control API endpoints.
"""

import pytest
import json
from app import create_app


@pytest.fixture
def client():
    """Create test client."""
    app = create_app('testing')
    with app.test_client() as client:
        with app.app_context():
            yield client


def test_god_mode_toggle_enable(client):
    """Test enabling God Mode."""
    response = client.post('/api/control/god-mode', 
                          json={'enabled': True},
                          content_type='application/json')
    
    assert response.status_code == 202
    data = json.loads(response.data)
    assert data['status'] == 'accepted'
    assert data['god_mode'] is True
    assert 'timestamp' in data


def test_god_mode_toggle_disable(client):
    """Test disabling God Mode."""
    response = client.post('/api/control/god-mode', 
                          json={'enabled': False},
                          content_type='application/json')
    
    assert response.status_code == 202
    data = json.loads(response.data)
    assert data['status'] == 'accepted'
    assert data['god_mode'] is False


def test_god_mode_missing_payload(client):
    """Test God Mode with missing payload."""
    response = client.post('/api/control/god-mode', 
                          json={},
                          content_type='application/json')
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data


def test_emergency_stop_trigger(client):
    """Test triggering emergency stop."""
    response = client.post('/api/control/emergency-stop',
                          json={'reason': 'Test emergency stop'},
                          content_type='application/json')
    
    assert response.status_code == 202
    data = json.loads(response.data)
    assert data['status'] == 'accepted'
    assert data['emergency_stop'] is True
    assert data['reason'] == 'Test emergency stop'


def test_emergency_stop_no_reason(client):
    """Test emergency stop without reason."""
    response = client.post('/api/control/emergency-stop',
                          json={},
                          content_type='application/json')
    
    assert response.status_code == 202
    data = json.loads(response.data)
    assert data['status'] == 'accepted'
    assert data['emergency_stop'] is True
    assert 'reason' in data


def test_emergency_reset_with_confirmation(client):
    """Test emergency reset with confirmation."""
    response = client.post('/api/control/reset-emergency',
                          json={'confirm': True, 'reason': 'Test reset'},
                          content_type='application/json')
    
    assert response.status_code == 202
    data = json.loads(response.data)
    assert data['status'] == 'accepted'
    assert data['emergency_stop'] is False


def test_emergency_reset_without_confirmation(client):
    """Test emergency reset without confirmation."""
    response = client.post('/api/control/reset-emergency',
                          json={},
                          content_type='application/json')
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data


def test_control_status(client):
    """Test control status endpoint."""
    response = client.get('/api/control/status')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'ok'
    assert 'controls' in data
    assert 'timestamp' in data