"""
Tests for Flask health endpoints.
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


def test_healthz_endpoint(client):
    """Test /healthz liveness endpoint."""
    response = client.get('/healthz')
    assert response.status_code == 200
    assert response.data == b'ok'
    assert response.content_type == 'text/plain; charset=utf-8'


def test_readyz_endpoint(client):
    """Test /readyz readiness endpoint."""
    response = client.get('/readyz')
    assert response.status_code in [200, 503]  # Can be either ready or not ready
    
    if response.status_code == 200:
        data = json.loads(response.data)
        assert data['ready'] is True
        assert 'timestamp' in data
    else:
        data = json.loads(response.data)
        assert data['ready'] is False


def test_legacy_health_endpoint(client):
    """Test legacy /health endpoint."""
    response = client.get('/health')
    assert response.status_code == 200
    assert response.data == b'ok'


def test_metrics_endpoint(client):
    """Test /metrics endpoint."""
    response = client.get('/metrics')
    assert response.status_code == 200
    
    data = json.loads(response.data)
    assert 'status' in data
    assert 'service' in data
    assert 'version' in data
    assert 'timestamp' in data