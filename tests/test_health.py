"""Test health endpoint functionality."""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add the repository root to the Python path
repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))


def test_health_endpoint():
    """Test that /health endpoint returns 200 with 'ok' body."""
    from api.main import app
    
    with TestClient(app) as client:
        response = client.get("/health")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.text == "ok", f"Expected 'ok', got '{response.text}'"
        assert response.headers["content-type"] == "text/plain; charset=utf-8"


def test_health_endpoint_head_request():
    """Test that /health endpoint works with HEAD requests."""
    from api.main import app
    
    with TestClient(app) as client:
        response = client.head("/health")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        # HEAD request should have no body
        assert response.text == "", "HEAD request should have empty body"


def test_root_endpoint_does_not_crash():
    """Test that root endpoint doesn't crash (may return HTML or JSON)."""
    from api.main import app
    
    with TestClient(app) as client:
        response = client.get("/")
        
        # Should not crash - can be 200 regardless of template availability
        assert response.status_code == 200, f"Root endpoint crashed with status {response.status_code}"
        assert len(response.content) > 0, "Root endpoint should return some content"


if __name__ == "__main__":
    # Allow running this test directly
    test_health_endpoint()
    test_health_endpoint_head_request()  
    test_root_endpoint_does_not_crash()
    print("✅ All health tests passed!")