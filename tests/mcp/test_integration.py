"""Integration test for Royal EQ MCP package structure."""

import os
import sys
from pathlib import Path


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


if __name__ == "__main__":
    test_package_structure()
    test_test_structure() 
    test_pyproject_toml_updated()
    test_environment_validation()
    print("All integration tests passed!")