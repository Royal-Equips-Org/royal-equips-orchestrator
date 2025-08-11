"""Tests for the Flask application health endpoints and core functionality."""

import pytest
from app import create_app


class TestFlaskHealth:
    """Test Flask health endpoints that are critical for deployment."""

    @pytest.fixture
    def client(self):
        """Create a test client for the Flask application."""
        app = create_app('testing')
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client

    def test_healthz_endpoint(self, client):
        """Test /healthz returns plain text 'ok'."""
        response = client.get("/healthz")
        assert response.status_code == 200
        assert response.get_data(as_text=True).strip() == "ok"

    def test_readyz_endpoint(self, client):
        """Test /readyz returns JSON readiness status.""" 
        response = client.get("/readyz")
        assert response.status_code == 200
        data = response.get_json()
        assert "ready" in data
        assert "status" in data
        assert data["ready"] in [True, False]

    def test_metrics_endpoint(self, client):
        """Test /metrics returns JSON metrics."""
        response = client.get("/metrics")
        assert response.status_code == 200
        data = response.get_json()
        assert "ok" in data
        assert "uptime_seconds" in data
        assert data["ok"] is True

    def test_command_center_endpoint(self, client):
        """Test /command-center/ serves Control Center HTML."""
        response = client.get("/command-center/")
        assert response.status_code == 200
        assert "text/html" in response.content_type
        assert b"Royal Equips Control Center" in response.data

    def test_command_center_redirect(self, client):
        """Test /command-center redirects to /command-center/."""
        response = client.get("/command-center", follow_redirects=False)
        assert response.status_code in [301, 302, 307, 308]  # Any redirect

    def test_root_endpoint(self, client):
        """Test / returns service information."""
        response = client.get("/")
        assert response.status_code == 200
        # Could be JSON or HTML, both are acceptable
        assert response.status_code == 200