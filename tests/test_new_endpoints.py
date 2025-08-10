"""Tests for the new logging and routes functionality."""

import os
import sys

from fastapi.testclient import TestClient

# Ensure we can import from scripts
sys.path.insert(0, '/home/runner/work/royal-equips-orchestrator/royal-equips-orchestrator')


def test_root_endpoint():
    """Test that GET / returns service information."""
    # Import here to ensure logging filters are applied
    from scripts.run_orchestrator import app

    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200

        data = response.json()
        assert data["service"] == "orchestrator"
        assert data["status"] == "ok"
        assert "version" in data


def test_favicon_get_endpoint():
    """Test that GET /favicon.ico returns 204 No Content."""
    from scripts.run_orchestrator import app

    with TestClient(app) as client:
        response = client.get("/favicon.ico")
        assert response.status_code == 204
        assert response.content == b""


def test_favicon_head_endpoint():
    """Test that HEAD /favicon.ico returns 204 No Content."""
    from scripts.run_orchestrator import app

    with TestClient(app) as client:
        response = client.head("/favicon.ico")
        assert response.status_code == 204
        assert response.content == b""


def test_health_endpoint_still_works():
    """Test that /health endpoint continues to work as before."""
    from scripts.run_orchestrator import app

    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200

        data = response.json()
        # Should contain agent health information
        assert isinstance(data, dict)
        # Should have some agent entries
        assert len(data) > 0


def test_service_version_from_env():
    """Test that service version comes from SERVICE_VERSION env var."""
    # Set environment variable
    os.environ["SERVICE_VERSION"] = "test-1.0.0"

    try:
        from scripts.run_orchestrator import app

        with TestClient(app) as client:
            response = client.get("/")
            assert response.status_code == 200

            data = response.json()
            assert data["version"] == "test-1.0.0"
    finally:
        # Clean up
        os.environ.pop("SERVICE_VERSION", None)


if __name__ == "__main__":
    # Run tests manually
    print("Running tests manually...")

    test_functions = [
        test_root_endpoint,
        test_favicon_get_endpoint,
        test_favicon_head_endpoint,
        test_health_endpoint_still_works,
        test_service_version_from_env,
    ]

    for test_func in test_functions:
        try:
            print(f"Running {test_func.__name__}...")
            test_func()
            print(f"✓ {test_func.__name__}")
        except Exception as e:
            print(f"✗ {test_func.__name__}: {e}")
            sys.exit(1)

    print("All tests passed!")
