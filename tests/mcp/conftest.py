"""Test configuration and fixtures for Royal EQ MCP tests."""

import os
import pytest
from unittest.mock import Mock, AsyncMock, patch


@pytest.fixture
def mock_env_vars():
    """Mock environment variables for testing."""
    env_vars = {
        "SHOPIFY_GRAPHQL_ENDPOINT": "https://test-shop.myshopify.com/admin/api/2024-01/graphql.json",
        "SHOPIFY_GRAPHQL_TOKEN": "test-token-12345",
        "BIGQUERY_PROJECT_ID": "royal-commerce-ai-test",
        "SUPABASE_URL": "https://test-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "test-supabase-key-12345",
        "ORCHESTRATOR_BASE_URL": "http://localhost:5000",
        "ORCHESTRATOR_HMAC_KEY": "test-hmac-key-12345",
        "REPO_ROOT": "/tmp/test-repo"
    }
    
    with patch.dict(os.environ, env_vars):
        yield env_vars


@pytest.fixture
def mock_httpx_client():
    """Mock httpx client for testing."""
    mock_client = AsyncMock()
    mock_response = Mock()
    mock_response.json.return_value = {"data": "test-data"}
    mock_response.raise_for_status.return_value = None
    mock_client.post.return_value = mock_response
    mock_client.get.return_value = mock_response
    return mock_client


@pytest.fixture  
def mock_bigquery_client():
    """Mock BigQuery client for testing."""
    mock_client = Mock()
    mock_job = Mock()
    mock_result = Mock()
    mock_result.__iter__ = Mock(return_value=iter([{"test_field": "test_value"}]))
    mock_result.total_rows = 1
    mock_result.schema = [Mock(name="test_field", field_type="STRING")]
    mock_job.result.return_value = mock_result
    mock_job.job_id = "test-job-123"
    mock_job.total_bytes_processed = 1024
    mock_job.slot_millis = 100
    mock_client.query.return_value = mock_job
    return mock_client


@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client for testing."""
    mock_client = Mock()
    mock_rpc = Mock()
    mock_result = Mock()
    mock_result.data = [{"test_field": "test_value"}]
    mock_rpc.execute.return_value = mock_result
    mock_rpc.filter.return_value = mock_rpc
    mock_rpc.order.return_value = mock_rpc  
    mock_rpc.limit.return_value = mock_rpc
    mock_client.rpc.return_value = mock_rpc
    return mock_client


@pytest.fixture
def mock_git_repo():
    """Mock Git repository for testing."""
    mock_repo = Mock()
    mock_branch = Mock()
    mock_branch.name = "main"
    mock_repo.active_branch = mock_branch
    mock_repo.branches = [mock_branch]
    
    mock_commit = Mock()
    mock_commit.hexsha = "abcd1234567890"
    mock_commit.message = "Test commit message"
    mock_commit.author = "Test Author"
    mock_commit.committed_datetime.isoformat.return_value = "2024-01-01T00:00:00"
    mock_repo.iter_commits.return_value = [mock_commit]
    
    mock_repo.index.diff.return_value = []
    mock_repo.untracked_files = []
    mock_repo.remotes = []
    mock_repo.tags = []
    
    return mock_repo