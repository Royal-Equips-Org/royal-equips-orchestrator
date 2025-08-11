"""Tests for the Flask application endpoints and functionality."""

import os
import sys
import pytest

# Ensure we can import from the app
sys.path.insert(0, '/home/runner/work/royal-equips-orchestrator/royal-equips-orchestrator')


@pytest.fixture
def client():
    """Create a test client for the Flask application."""
    from app import create_app
    app = create_app('testing')
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_root_endpoint(client):
    """Test that GET / returns service information."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.get_json()
    assert "message" in data or "service" in data


def test_health_endpoint(client):
    """Test health endpoint functionality."""
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.get_data(as_text=True).strip() == "ok"


def test_metrics_endpoint(client):
    """Test metrics endpoint returns valid data."""
    response = client.get("/metrics")
    assert response.status_code == 200
    data = response.get_json()
    assert "ok" in data
    assert data["ok"] is True
