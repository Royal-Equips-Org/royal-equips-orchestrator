"""
Tests for Flask Command Center serving functionality.

Tests that the React SPA is served correctly at /command-center.
"""

import pytest
from pathlib import Path

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

def test_command_center_root(client):
    """Test command center serves index.html at root."""
    response = client.get('/command-center/')
    
    # Should serve some HTML content (either index.html or fallback)
    assert response.status_code == 200
    assert b'html' in response.data.lower()

def test_command_center_no_trailing_slash(client):
    """Test command center works without trailing slash."""
    response = client.get('/command-center')
    
    # Should serve some HTML content
    assert response.status_code == 200
    assert b'html' in response.data.lower()

def test_command_center_spa_routing(client):
    """Test that SPA routing works (unknown paths serve index.html)."""
    response = client.get('/command-center/some/unknown/path')
    
    # Should serve index.html for client-side routing
    assert response.status_code == 200
    assert b'html' in response.data.lower()

def test_command_center_health(client):
    """Test command center health endpoint."""
    response = client.get('/command-center/health')
    
    assert response.status_code in [200, 503]  # 503 if no build exists
    
    data = response.get_json()
    assert data['service'] == 'Command Center'
    assert 'status' in data
    assert 'build_exists' in data

def test_asset_path_mapping(client):
    """Test that admin/assets paths are mapped correctly."""
    # This tests the path mapping logic even if the actual file doesn't exist
    response = client.get('/command-center/admin/assets/nonexistent.js')
    
    # Should return 404 for non-existent files but not 500 (server error)
    assert response.status_code in [200, 404]

if __name__ == "__main__":
    pytest.main([__file__])