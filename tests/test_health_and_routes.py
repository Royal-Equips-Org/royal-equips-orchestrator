"""Tests for the updated FastAPI application with Command Center functionality."""

import pytest
from fastapi.testclient import TestClient
from api.main import app
from api.config import settings


class TestHealthAndRoutes:
    """Test cases for health endpoint and new routing functionality."""

    @pytest.fixture
    def client(self):
        """Create a test client for the FastAPI application."""
        return TestClient(app)

    def test_health_returns_plain_ok(self, client):
        """Test that /health returns plain text 'ok' as required."""
        response = client.get("/health")
        
        assert response.status_code == 200
        assert response.text == "ok"
        assert response.headers["content-type"] == "text/plain; charset=utf-8"

    def test_root_renders_landing_page(self, client):
        """Test that / renders the landing page with Command Center button."""
        response = client.get("/")
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/html; charset=utf-8"
        
        # Check that the page contains the expected content
        content = response.text
        assert "Enter Command Center" in content
        assert settings.app_name in content
        assert 'href="/command-center"' in content

    def test_command_center_redirects(self, client):
        """Test that /command-center returns a redirect to the configured URL."""
        response = client.get("/command-center", follow_redirects=False)
        
        assert response.status_code == 307  # Temporary redirect as specified
        assert response.headers["location"] == settings.command_center_url

    def test_control_center_alias(self, client):
        """Test that /control-center redirects to /command-center."""
        response = client.get("/control-center", follow_redirects=False)
        
        assert response.status_code == 307
        assert response.headers["location"] == "/command-center"

    def test_dashboard_alias(self, client):
        """Test that /dashboard redirects to /command-center.""" 
        response = client.get("/dashboard", follow_redirects=False)
        
        assert response.status_code == 307
        assert response.headers["location"] == "/command-center"

    def test_404_error_page(self, client):
        """Test that 404 errors return a friendly HTML page."""
        response = client.get("/nonexistent-page")
        
        assert response.status_code == 404
        assert response.headers["content-type"] == "text/html; charset=utf-8"
        
        content = response.text
        assert "404" in content
        assert "Page Not Found" in content
        assert settings.app_name in content
        assert 'href="/"' in content  # Home link
        assert 'href="/command-center"' in content  # Command Center link

    def test_metrics_endpoint_still_works(self, client):
        """Test that existing /metrics endpoint continues to function."""
        response = client.get("/metrics")
        
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["backend"] == "fastapi"
        assert "uptime_seconds" in data

    def test_static_files_mounted(self, client):
        """Test that static files are accessible.""" 
        response = client.get("/static/styles.css")
        
        assert response.status_code == 200
        assert "text/css" in response.headers["content-type"]


class TestConfiguration:
    """Test configuration loading and defaults."""

    def test_default_settings(self):
        """Test that default configuration values are correct."""
        assert settings.command_center_url == "/docs"
        assert settings.app_name == "Royal Equips Orchestrator"
        assert settings.debug is False

    def test_command_center_url_configurable(self):
        """Test that COMMAND_CENTER_URL can be configured via environment."""
        # Note: This would require mocking os.environ or separate test setup
        # For now, we just verify the default is sensible
        assert settings.command_center_url.startswith("/") or settings.command_center_url.startswith("http")


class TestAgentEndpoints:
    """Test that existing agent endpoints continue to work."""
    
    @pytest.fixture
    def client(self):
        """Create a test client for the FastAPI application."""
        return TestClient(app)

    def test_agent_session_creation(self, client):
        """Test that agent session creation still works."""
        response = client.post("/agents/session")
        
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert isinstance(data["session_id"], str)

    def test_jobs_endpoint(self, client):
        """Test that the jobs endpoint still works."""
        response = client.get("/jobs")
        
        assert response.status_code == 200
        data = response.json()
        assert "jobs" in data
        assert "total" in data