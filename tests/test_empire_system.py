"""
Test Empire System Scanner and Health Enhancements.

Tests for the E-Commerce Empire Architect functionality including
system scanning, vulnerability detection, and health monitoring.
"""

import pytest
import json
from datetime import datetime
from unittest.mock import patch, MagicMock

from app import create_app
from app.services.empire_scanner import EmpireSystemScanner, get_empire_scanner
from app.services.health_service import get_health_service


class TestEmpireSystemScanner:
    """Test the Empire System Scanner functionality."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        app = create_app('testing')
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    @pytest.fixture
    def scanner(self):
        """Create test scanner instance."""
        return EmpireSystemScanner()
    
    def test_scanner_initialization(self, scanner):
        """Test scanner initializes correctly."""
        assert scanner is not None
        assert scanner.project_root is not None
        assert scanner.security_patterns is not None
        assert scanner.legacy_patterns is not None
    
    def test_get_empire_scanner_singleton(self):
        """Test empire scanner singleton pattern."""
        scanner1 = get_empire_scanner()
        scanner2 = get_empire_scanner()
        assert scanner1 is scanner2
    
    def test_code_health_analysis(self, scanner):
        """Test code health analysis functionality."""
        health_metrics = scanner._analyze_code_health()
        
        assert 'files_analyzed' in health_metrics
        assert 'total_lines' in health_metrics
        assert 'code_quality_score' in health_metrics
        assert 'docstring_coverage' in health_metrics
        assert 'test_coverage_estimate' in health_metrics
        
        # Should find Python files in the project
        assert health_metrics['files_analyzed'] > 0
        assert health_metrics['total_lines'] > 0
    
    def test_security_vulnerability_scan(self, scanner):
        """Test security vulnerability scanning."""
        security_results = scanner._scan_security_vulnerabilities()
        
        assert 'vulnerabilities_found' in security_results
        assert 'risk_level' in security_results
        assert 'security_score' in security_results
        assert 'patterns_detected' in security_results
        
        # Risk level should be one of expected values
        assert security_results['risk_level'] in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        
        # Security score should be between 0 and 100
        assert 0 <= security_results['security_score'] <= 100
    
    def test_legacy_code_assessment(self, scanner):
        """Test legacy code pattern detection."""
        legacy_results = scanner._assess_legacy_code()
        
        assert 'legacy_patterns_found' in legacy_results
        assert 'technical_debt_score' in legacy_results
        assert 'modernization_priorities' in legacy_results
        assert 'patterns_detected' in legacy_results
        
        # Technical debt score should be between 0 and 100
        assert 0 <= legacy_results['technical_debt_score'] <= 100
    
    def test_dependencies_analysis(self, scanner):
        """Test dependency analysis."""
        deps_results = scanner._analyze_dependencies()
        
        assert 'total_dependencies' in deps_results
        assert 'dependency_health_score' in deps_results
        assert 'python_version_compatibility' in deps_results
        
        # Should find some dependencies
        assert deps_results['total_dependencies'] >= 0
        assert 0 <= deps_results['dependency_health_score'] <= 100
    
    def test_performance_analysis(self, scanner):
        """Test performance optimization analysis."""
        perf_results = scanner._analyze_performance_opportunities()
        
        assert 'performance_score' in perf_results
        assert 'optimization_opportunities' in perf_results
        assert 'bottleneck_indicators' in perf_results
        assert 'caching_opportunities' in perf_results
        
        # Performance score should be between 0 and 100
        assert 0 <= perf_results['performance_score'] <= 100
        
        # Should return lists
        assert isinstance(perf_results['optimization_opportunities'], list)
        assert isinstance(perf_results['bottleneck_indicators'], list)
        assert isinstance(perf_results['caching_opportunities'], list)
    
    def test_full_empire_scan(self, scanner):
        """Test full empire scan execution."""
        scan_results = scanner.run_full_empire_scan()
        
        # Check required top-level keys
        assert 'scan_id' in scan_results
        assert 'timestamp' in scan_results
        assert 'scanner_version' in scan_results
        assert 'phases' in scan_results
        assert 'recommendations' in scan_results
        assert 'summary' in scan_results
        
        # Check all phases are present
        phases = scan_results['phases']
        expected_phases = ['code_health', 'security', 'legacy_assessment', 'dependencies', 'performance']
        for phase in expected_phases:
            assert phase in phases
        
        # Check summary contains expected metrics
        summary = scan_results['summary']
        assert 'empire_readiness_score' in summary
        assert 'overall_empire_health' in summary
        assert 'scan_duration_seconds' in summary
        
        # Health should be one of expected values
        assert summary['overall_empire_health'] in ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']
        
        # Readiness score should be between 0 and 100
        assert 0 <= summary['empire_readiness_score'] <= 100
    
    def test_vulnerability_severity_assessment(self, scanner):
        """Test vulnerability severity assessment."""
        assert scanner._assess_vulnerability_severity('hardcoded_secrets') == 'HIGH'
        assert scanner._assess_vulnerability_severity('sql_injection_risk') == 'CRITICAL'
        assert scanner._assess_vulnerability_severity('unknown_category') == 'MEDIUM'
    
    def test_modernization_priority_assessment(self, scanner):
        """Test modernization priority assessment."""
        assert scanner._assess_modernization_priority('deprecated_imports') == 'HIGH'
        assert scanner._assess_modernization_priority('insecure_functions') == 'CRITICAL'
        assert scanner._assess_modernization_priority('unknown_category') == 'MEDIUM'


class TestEmpireHealthService:
    """Test enhanced health service with empire capabilities."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        app = create_app('testing')
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_health_service_empire_methods(self, app):
        """Test that health service has empire methods."""
        with app.app_context():
            health_service = get_health_service()
            
            # Check that empire methods exist
            assert hasattr(health_service, 'check_empire_health')
            assert hasattr(health_service, 'get_empire_recommendations')
            assert hasattr(health_service, 'get_empire_scan_results')
            assert hasattr(health_service, 'trigger_empire_evolution_check')
    
    @patch('app.services.empire_scanner.get_empire_scanner')
    def test_empire_health_check(self, mock_scanner, app):
        """Test empire health check functionality."""
        # Mock scanner results
        mock_scan_results = {
            'summary': {
                'empire_readiness_score': 85,
                'overall_empire_health': 'GOOD',
                'critical_issues': 2,
                'total_recommendations': 5
            },
            'phases': {
                'security': {'security_score': 88},
                'performance': {'performance_score': 82},
                'code_health': {'code_quality_score': 78}
            }
        }
        
        mock_scanner_instance = MagicMock()
        mock_scanner_instance.run_full_empire_scan.return_value = mock_scan_results
        mock_scanner.return_value = mock_scanner_instance
        
        with app.app_context():
            health_service = get_health_service()
            empire_health = health_service.check_empire_health(force_scan=True)
            
            assert empire_health['empire_status'] == 'OPERATIONAL'
            assert empire_health['empire_readiness_score'] == 85
            assert empire_health['overall_health'] == 'GOOD'
            assert empire_health['evolution_readiness'] == 'OPTIMIZATION_RECOMMENDED'
            assert empire_health['scan_available'] is True


class TestEmpireAPI:
    """Test Empire Management API endpoints."""
    
    @pytest.fixture
    def app(self):
        """Create test Flask app."""
        app = create_app('testing')
        return app
    
    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()
    
    def test_empire_health_endpoint(self, client):
        """Test /empire/health endpoint."""
        response = client.get('/empire/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'success' in data
        assert 'empire_health' in data
        assert 'timestamp' in data
        assert 'api_version' in data
    
    def test_empire_status_endpoint(self, client):
        """Test /empire/status endpoint."""
        response = client.get('/empire/status')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'success' in data
        assert 'empire_status' in data
        assert 'timestamp' in data
        
        empire_status = data['empire_status']
        assert 'empire_health' in empire_status
        assert 'system_capabilities' in empire_status
        assert 'uptime_info' in empire_status
        
        # Check system capabilities
        capabilities = empire_status['system_capabilities']
        expected_capabilities = [
            'vulnerability_scanning',
            'automated_health_monitoring', 
            'security_threat_detection',
            'performance_optimization',
            'evolution_readiness_assessment',
            'autonomous_recommendations'
        ]
        for capability in expected_capabilities:
            assert capability in capabilities
            assert capabilities[capability] is True
    
    def test_empire_scan_endpoint(self, client):
        """Test /empire/scan endpoint."""
        response = client.post('/empire/scan')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'success' in data
        assert 'scan_id' in data
        assert 'scan_summary' in data
        assert 'timestamp' in data
    
    def test_empire_recommendations_endpoint(self, client):
        """Test /empire/recommendations endpoint."""
        # First trigger a scan to ensure recommendations exist
        client.post('/empire/scan')
        
        response = client.get('/empire/recommendations')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'success' in data
        assert 'recommendations' in data
        assert 'total_count' in data
        assert 'available_filters' in data
        
        # Test priority filter
        response = client.get('/empire/recommendations?priority=HIGH')
        assert response.status_code == 200
        
        # Test category filter
        response = client.get('/empire/recommendations?category=SECURITY_CRITICAL')
        assert response.status_code == 200
    
    def test_empire_evolution_readiness_endpoint(self, client):
        """Test /empire/evolution/readiness endpoint."""
        response = client.get('/empire/evolution/readiness')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'success' in data
        assert 'evolution_status' in data
        assert 'timestamp' in data
        
        evolution_status = data['evolution_status']
        assert 'readiness_assessment' in evolution_status
        assert 'recommended_phase' in evolution_status
        assert 'phase_description' in evolution_status
    
    def test_empire_security_status_endpoint(self, client):
        """Test /empire/security/status endpoint."""
        # First trigger a scan to ensure security data exists
        client.post('/empire/scan')
        
        response = client.get('/empire/security/status')
        
        # Should succeed if scan data exists, or return 404 if not
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = json.loads(response.data)
            assert 'success' in data
            assert 'security_status' in data
            
            security_status = data['security_status']
            assert 'security_score' in security_status
            assert 'risk_level' in security_status
            assert 'vulnerabilities_found' in security_status
    
    def test_empire_performance_metrics_endpoint(self, client):
        """Test /empire/performance/metrics endpoint."""
        # First trigger a scan to ensure performance data exists
        client.post('/empire/scan')
        
        response = client.get('/empire/performance/metrics')
        
        # Should succeed if scan data exists, or return 404 if not
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = json.loads(response.data)
            assert 'success' in data
            assert 'performance_metrics' in data
            
            performance_metrics = data['performance_metrics']
            assert 'performance_score' in performance_metrics
            assert 'code_quality_score' in performance_metrics
            assert 'optimization_opportunities' in performance_metrics
    
    def test_empire_scan_results_endpoint(self, client):
        """Test /empire/scan/results endpoint."""
        # First trigger a scan
        client.post('/empire/scan')
        
        # Get full results
        response = client.get('/empire/scan/results')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'success' in data
        assert 'scan_results' in data
        
        # Get summary only
        response = client.get('/empire/scan/results?summary=true')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'success' in data
        assert 'scan_summary' in data
        assert 'scan_results' not in data
    
    def test_empire_endpoint_error_handling(self, client):
        """Test empire endpoint error handling."""
        # Test invalid endpoint
        response = client.get('/empire/invalid-endpoint')
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'success' in data
        assert data['success'] is False
        assert 'available_endpoints' in data


if __name__ == '__main__':
    pytest.main([__file__])