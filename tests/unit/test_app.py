"""
Unit tests for the main Flask application
"""

import pytest
import os
from app import create_app


class TestAppCreation:
    """Test app creation and basic functionality"""
    
    def test_app_creation(self):
        """Test that the app can be created successfully"""
        app = create_app()
        assert app is not None
    
    def test_app_with_testing_config(self):
        """Test app creation with testing configuration"""
        os.environ['TESTING'] = 'true'
        app = create_app()
        assert app is not None
        # Clean up
        if 'TESTING' in os.environ:
            del os.environ['TESTING']
    
    def test_health_endpoint(self):
        """Test the health check endpoint"""
        app = create_app()
        with app.test_client() as client:
            response = client.get('/healthz')
            assert response.status_code == 200
            data = response.get_json()
            assert data['status'] == 'healthy'
    
    def test_command_center_health(self):
        """Test the command center health endpoint"""
        app = create_app()
        with app.test_client() as client:
            response = client.get('/command-center/health')
            assert response.status_code in [200, 503]  # May be 503 if no build exists
    
    def test_command_center_api_integrations(self):
        """Test the command center integrations API"""
        app = create_app()
        with app.test_client() as client:
            response = client.get('/command-center/api/integrations/status')
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True
            assert 'data' in data
    
    def test_command_center_api_agents(self):
        """Test the command center agents API"""
        app = create_app()
        with app.test_client() as client:
            response = client.get('/command-center/api/agents/status')
            assert response.status_code == 200
            data = response.get_json()
            assert data['success'] is True