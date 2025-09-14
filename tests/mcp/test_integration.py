"""Integration test for Royal EQ MCP package structure."""

import os
import sys
from pathlib import Path
import pytest
from unittest.mock import patch, Mock, AsyncMock, MagicMock


def test_package_structure():
    """Test that all required package files exist."""
    repo_root = Path("/home/runner/work/royal-equips-orchestrator/royal-equips-orchestrator")
    
    # Check main package structure
    royal_mcp_dir = repo_root / "royal_mcp"
    assert royal_mcp_dir.exists(), "royal_mcp package directory should exist"
    assert (royal_mcp_dir / "__init__.py").exists(), "royal_mcp/__init__.py should exist"
    assert (royal_mcp_dir / "server.py").exists(), "royal_mcp/server.py should exist"
    
    # Check connectors package
    connectors_dir = royal_mcp_dir / "connectors"
    assert connectors_dir.exists(), "connectors package should exist"
    assert (connectors_dir / "__init__.py").exists(), "connectors/__init__.py should exist"
    
    # Check all connector files
    connector_files = [
        "bigquery.py",
        "orchestrator.py", 
        "repo.py",
        "shopify.py",
        "supabase.py"
    ]
    
    for connector_file in connector_files:
        connector_path = connectors_dir / connector_file
        assert connector_path.exists(), f"Connector {connector_file} should exist"
        
        # Basic syntax check
        with open(connector_path, 'r') as f:
            content = f.read()
            assert len(content) > 1000, f"Connector {connector_file} should have substantial content"
            assert "class" in content, f"Connector {connector_file} should contain class definitions"
            assert "def get_tools" in content, f"Connector {connector_file} should have get_tools method"


def test_test_structure():
    """Test that all test files exist."""
    repo_root = Path("/home/runner/work/royal-equips-orchestrator/royal-equips-orchestrator")
    tests_dir = repo_root / "tests" / "mcp"
    
    assert tests_dir.exists(), "MCP tests directory should exist"
    assert (tests_dir / "__init__.py").exists(), "tests/mcp/__init__.py should exist"
    assert (tests_dir / "conftest.py").exists(), "tests/mcp/conftest.py should exist"
    
    # Check all test files
    test_files = [
        "test_bigquery_connector.py",
        "test_orchestrator_connector.py",
        "test_repo_connector.py", 
        "test_server.py",
        "test_shopify_connector.py",
        "test_supabase_connector.py"
    ]
    
    for test_file in test_files:
        test_path = tests_dir / test_file
        assert test_path.exists(), f"Test file {test_file} should exist"


def test_pyproject_toml_updated():
    """Test that pyproject.toml has been updated with MCP dependencies."""
    repo_root = Path("/home/runner/work/royal-equips-orchestrator/royal-equips-orchestrator")
    pyproject_path = repo_root / "pyproject.toml"
    
    with open(pyproject_path, 'r') as f:
        content = f.read()
    
    # Check for MCP dependencies
    assert "modelcontextprotocol" in content, "modelcontextprotocol dependency should be added"
    assert "httpx" in content, "httpx dependency should be added"
    assert "pydantic" in content, "pydantic dependency should be added"
    assert "google-cloud-bigquery" in content, "google-cloud-bigquery dependency should be added"
    assert "supabase" in content, "supabase dependency should be added"
    assert "gitpython" in content, "gitpython dependency should be added"
    
    # Check for CLI entry point
    assert "royal-mcp = \"royal_mcp:main\"" in content, "CLI entry point should be configured"


def test_environment_validation():
    """Test that the validation function exists in server.py."""
    repo_root = Path("/home/runner/work/royal-equips-orchestrator/royal-equips-orchestrator")
    server_path = repo_root / "royal_mcp" / "server.py"
    
    with open(server_path, 'r') as f:
        content = f.read()
    
    assert "def validate_environment" in content, "validate_environment function should exist in server.py"
    assert "required_vars" in content, "Should check for required environment variables"


@pytest.mark.integration
class TestMCPServerIntegration:
    """Integration test cases for MCP server workflow."""
    
    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(), 
        'mcp.server.stdio': MagicMock(),
        'mcp.types': MagicMock(),
    })
    def test_server_initialization_with_all_connectors(self, mock_env_vars):
        """Test server initializes with all expected connectors."""
        with patch('royal_mcp.server.ShopifyConnector') as MockShopify, \
             patch('royal_mcp.server.BigQueryConnector') as MockBigQuery, \
             patch('royal_mcp.server.SupabaseConnector') as MockSupabase, \
             patch('royal_mcp.server.RepoConnector') as MockRepo, \
             patch('royal_mcp.server.OrchestratorConnector') as MockOrchestrator:
            
            from royal_mcp.server import RoyalMCPServer
            
            server = RoyalMCPServer()
            
            # Verify all connectors were instantiated
            MockShopify.assert_called_once()
            MockBigQuery.assert_called_once()
            MockSupabase.assert_called_once() 
            MockRepo.assert_called_once()
            MockOrchestrator.assert_called_once()
            
            # Verify server state
            assert len(server.connectors) == 5
            expected_connectors = ['shopify', 'bigquery', 'supabase', 'repo', 'orchestrator']
            for connector_name in expected_connectors:
                assert connector_name in server.connectors

    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(),
        'mcp.server.stdio': MagicMock(), 
        'mcp.types': MagicMock(),
    })
    def test_tool_discovery_workflow(self, mock_env_vars):
        """Test the complete tool discovery workflow."""
        # Mock tools from different connectors
        shopify_tool = Mock()
        shopify_tool.name = "query_products"
        shopify_tool.description = "Query Shopify products"
        
        bigquery_tool = Mock()
        bigquery_tool.name = "execute_query"
        bigquery_tool.description = "Execute BigQuery query"
        
        # Mock connectors
        mock_shopify = Mock()
        mock_shopify.get_tools.return_value = [shopify_tool]
        
        mock_bigquery = Mock()
        mock_bigquery.get_tools.return_value = [bigquery_tool]
        
        mock_supabase = Mock()
        mock_supabase.get_tools.return_value = []
        
        mock_repo = Mock()
        mock_repo.get_tools.return_value = []
        
        mock_orchestrator = Mock()
        mock_orchestrator.get_tools.return_value = []
        
        with patch('royal_mcp.server.ShopifyConnector', return_value=mock_shopify), \
             patch('royal_mcp.server.BigQueryConnector', return_value=mock_bigquery), \
             patch('royal_mcp.server.SupabaseConnector', return_value=mock_supabase), \
             patch('royal_mcp.server.RepoConnector', return_value=mock_repo), \
             patch('royal_mcp.server.OrchestratorConnector', return_value=mock_orchestrator):
            
            from royal_mcp.server import RoyalMCPServer
            
            server = RoyalMCPServer()
            
            # Verify tools were discovered from all connectors
            mock_shopify.get_tools.assert_called_once()
            mock_bigquery.get_tools.assert_called_once()
            mock_supabase.get_tools.assert_called_once()
            mock_repo.get_tools.assert_called_once() 
            mock_orchestrator.get_tools.assert_called_once()

    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(),
        'mcp.server.stdio': MagicMock(),
        'mcp.types': MagicMock(),
    })
    def test_partial_connector_failure_resilience(self, mock_env_vars):
        """Test server resilience when some connectors fail to initialize."""
        failure_connectors = ['bigquery', 'supabase']  # These will fail
        success_connectors = ['shopify', 'repo', 'orchestrator']  # These will succeed
        
        with patch('royal_mcp.server.ShopifyConnector') as MockShopify, \
             patch('royal_mcp.server.BigQueryConnector', side_effect=Exception("BigQuery init failed")), \
             patch('royal_mcp.server.SupabaseConnector', side_effect=Exception("Supabase init failed")), \
             patch('royal_mcp.server.RepoConnector') as MockRepo, \
             patch('royal_mcp.server.OrchestratorConnector') as MockOrchestrator:
            
            from royal_mcp.server import RoyalMCPServer
            
            server = RoyalMCPServer()
            
            # Should only have successful connectors
            assert len(server.connectors) == len(success_connectors)
            
            for connector_name in success_connectors:
                assert connector_name in server.connectors
                
            for connector_name in failure_connectors:
                assert connector_name not in server.connectors


@pytest.mark.integration  
class TestEnvironmentValidationIntegration:
    """Integration tests for environment validation scenarios."""
    
    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(),
        'mcp.server.stdio': MagicMock(),
        'mcp.types': MagicMock(),
    })
    def test_complete_environment_validation(self, mock_env_vars):
        """Test complete environment validation with all required variables."""
        from royal_mcp.server import validate_environment
        
        # All required variables are present in mock_env_vars fixture
        assert validate_environment() is True

    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(), 
        'mcp.server.stdio': MagicMock(),
        'mcp.types': MagicMock(),
    })
    def test_missing_critical_environment_variables(self):
        """Test validation fails appropriately with missing variables."""
        import os
        from royal_mcp.server import validate_environment
        
        # Test with completely empty environment
        with patch.dict(os.environ, {}, clear=True):
            assert validate_environment() is False
            
        # Test with partial environment (missing critical ones)
        partial_env = {
            "SHOPIFY_GRAPHQL_ENDPOINT": "https://test.myshopify.com/admin/api/graphql.json",
            # Missing SHOPIFY_GRAPHQL_TOKEN and others
        }
        with patch.dict(os.environ, partial_env, clear=True):
            assert validate_environment() is False


if __name__ == "__main__":
    test_package_structure()
    test_test_structure() 
    test_pyproject_toml_updated()
    test_environment_validation()
    print("All integration tests passed!")