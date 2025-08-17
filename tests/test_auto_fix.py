"""
Tests for the auto-fix functionality.
"""

import pytest
import sys
from unittest.mock import patch, MagicMock
from app.utils.auto_fix import AutoFixer, safe_import, resilient_import, health_check


class TestAutoFixer:
    
    def setup_method(self):
        """Setup for each test method."""
        self.auto_fixer = AutoFixer()
    
    def test_auto_fixer_initialization(self):
        """Test that AutoFixer initializes correctly."""
        assert self.auto_fixer.max_retries == 3
        assert 'aiohttp' in self.auto_fixer.dependency_map
        assert 'flask' in self.auto_fixer.dependency_map
        assert isinstance(self.auto_fixer.fix_attempts, dict)
    
    def test_safe_import_success(self):
        """Test successful import of existing module."""
        success, module = self.auto_fixer.safe_import('sys')
        assert success is True
        assert module is sys
    
    def test_safe_import_failure(self):
        """Test handling of failed import."""
        success, module = self.auto_fixer.safe_import('nonexistent_module_xyz123')
        assert success is False
        assert module is None
    
    def test_extract_missing_module(self):
        """Test extraction of module name from error message."""
        error_msg = "No module named 'aiohttp'"
        result = self.auto_fixer._extract_missing_module(error_msg)
        assert result == 'aiohttp'
        
        error_msg2 = "No module named test_module"
        result2 = self.auto_fixer._extract_missing_module(error_msg2)
        assert result2 == 'test_module'
    
    def test_resilient_blueprint_import_success(self):
        """Test resilient import of existing module."""
        result = self.auto_fixer.resilient_blueprint_import('sys')
        assert result is sys
    
    def test_resilient_blueprint_import_failure(self):
        """Test resilient import handles failures gracefully."""
        result = self.auto_fixer.resilient_blueprint_import('nonexistent_module_xyz123')
        assert result is None
    
    @patch('subprocess.run')
    def test_try_fix_import_error_success(self, mock_subprocess):
        """Test successful dependency installation."""
        mock_subprocess.return_value.returncode = 0
        mock_subprocess.return_value.stderr = ""
        
        result = self.auto_fixer._try_fix_import_error('aiohttp', "No module named 'aiohttp'")
        assert result is True
        assert 'aiohttp' in self.auto_fixer.fix_attempts
        
        # Check that subprocess was called correctly
        mock_subprocess.assert_called_once()
        args = mock_subprocess.call_args[0][0]
        assert 'pip' in args
        assert 'install' in args
        assert 'aiohttp>=3.8.0' in args
    
    @patch('subprocess.run')
    def test_try_fix_import_error_failure(self, mock_subprocess):
        """Test handling of failed dependency installation."""
        mock_subprocess.return_value.returncode = 1
        mock_subprocess.return_value.stderr = "Installation failed"
        
        result = self.auto_fixer._try_fix_import_error('aiohttp', "No module named 'aiohttp'")
        assert result is False
        assert 'aiohttp' in self.auto_fixer.fix_attempts
    
    def test_max_retries_enforcement(self):
        """Test that max retries are enforced."""
        # Simulate multiple failed attempts
        self.auto_fixer.fix_attempts['test_module'] = 5  # Exceed max_retries
        
        result = self.auto_fixer._try_fix_import_error('test_module', "No module named 'test_module'")
        assert result is False
    
    def test_health_check_basic(self):
        """Test basic health check functionality."""
        health_report = self.auto_fixer.check_and_fix_system_health()
        
        assert 'timestamp' in health_report
        assert 'checks_performed' in health_report
        assert 'fixes_applied' in health_report
        assert 'errors_detected' in health_report
        assert 'overall_status' in health_report
        
        # Should check critical dependencies
        assert any('dependency_flask' in check for check in health_report['checks_performed'])
        assert any('dependency_requests' in check for check in health_report['checks_performed'])
    
    def test_graceful_import_wrapper(self):
        """Test the graceful import wrapper functionality."""
        def test_import_func():
            import sys
            return sys
        
        wrapped_func = self.auto_fixer.create_graceful_import_wrapper(test_import_func)
        result = wrapped_func()
        assert result is sys
    
    def test_graceful_import_wrapper_with_error(self):
        """Test graceful import wrapper handles errors."""
        def failing_import_func():
            import nonexistent_module_xyz123
            return nonexistent_module_xyz123
        
        wrapped_func = self.auto_fixer.create_graceful_import_wrapper(failing_import_func)
        result = wrapped_func()
        assert result is None


class TestConvenienceFunctions:
    """Test the convenience functions."""
    
    def test_safe_import_function(self):
        """Test the global safe_import function."""
        success, module = safe_import('sys')
        assert success is True
        assert module is sys
    
    def test_resilient_import_function(self):
        """Test the global resilient_import function."""
        result = resilient_import('sys')
        assert result is sys
    
    def test_health_check_function(self):
        """Test the global health_check function."""
        result = health_check()
        assert isinstance(result, dict)
        assert 'overall_status' in result


class TestAutoFixWithFlaskApp:
    """Integration tests with Flask app."""
    
    @pytest.fixture
    def app(self):
        """Create test app."""
        from app import create_app
        app = create_app()
        app.config['TESTING'] = True
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_auto_fix_health_endpoint(self, client):
        """Test the auto-fix health endpoint."""
        response = client.get('/api/auto-fix/health')
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'overall_status' in data
        assert 'auto_fixer' in data
        assert 'available_fixes' in data['auto_fixer']
    
    def test_auto_fix_status_endpoint(self, client):
        """Test the auto-fix status endpoint."""
        response = client.get('/api/auto-fix/status')
        assert response.status_code == 200
        
        data = response.get_json()
        assert 'fix_attempts' in data
        assert 'max_retries' in data
        assert 'available_dependencies' in data
    
    def test_test_import_endpoint(self, client):
        """Test the test import endpoint."""
        response = client.get('/api/auto-fix/test-import?module=sys')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['module'] == 'sys'
        assert data['success'] is True
        assert data['available'] is True
    
    def test_test_import_endpoint_missing_module(self, client):
        """Test test import endpoint with missing module."""
        response = client.get('/api/auto-fix/test-import?module=nonexistent_module_xyz123')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['module'] == 'nonexistent_module_xyz123'
        assert data['success'] is False
        assert data['available'] is False
    
    def test_test_import_endpoint_no_module_param(self, client):
        """Test test import endpoint without module parameter."""
        response = client.get('/api/auto-fix/test-import')
        assert response.status_code == 400
        
        data = response.get_json()
        assert 'error' in data


if __name__ == '__main__':
    pytest.main([__file__])