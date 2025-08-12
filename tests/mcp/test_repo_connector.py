"""Tests for Repository connector."""

import pytest
import tempfile
import os
from pathlib import Path
from unittest.mock import patch, Mock
from royal_mcp.connectors.repo import RepoConnector


@pytest.mark.asyncio
class TestRepoConnector:
    """Test cases for Repository connector."""
    
    @pytest.fixture
    def temp_repo(self):
        """Create a temporary repository for testing."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create test files
            repo_path = Path(temp_dir)
            
            # Create some test files
            (repo_path / "README.md").write_text("# Test Repository")
            (repo_path / "src").mkdir()
            (repo_path / "src" / "main.py").write_text("print('Hello World')")
            (repo_path / "tests").mkdir()
            (repo_path / "tests" / "test_main.py").write_text("def test_main(): pass")
            
            # Create a file to exclude
            (repo_path / "secret.env").write_text("SECRET_KEY=test")
            
            yield str(repo_path)
    
    def test_initialization(self, temp_repo):
        """Test connector initialization."""
        with patch.dict(os.environ, {"REPO_ROOT": temp_repo}), \
             patch('git.Repo'):
            connector = RepoConnector()
            assert str(connector.repo_path) == temp_repo
    
    def test_initialization_invalid_path(self):
        """Test initialization with invalid path."""
        with patch.dict(os.environ, {"REPO_ROOT": "/nonexistent/path"}):
            with pytest.raises(ValueError, match="Repository path does not exist"):
                RepoConnector()
    
    def test_get_tools(self, temp_repo):
        """Test tool registration."""
        with patch.dict(os.environ, {"REPO_ROOT": temp_repo}), \
             patch('git.Repo'):
            connector = RepoConnector()
            tools = connector.get_tools()
            
            assert len(tools) == 5
            tool_names = [tool.name for tool in tools]
            assert "repo_read_file" in tool_names
            assert "repo_search_files" in tool_names
            assert "repo_search_content" in tool_names
            assert "repo_list_directory" in tool_names
            assert "repo_git_info" in tool_names
    
    def test_is_excluded(self, temp_repo):
        """Test file exclusion logic."""
        with patch.dict(os.environ, {"REPO_ROOT": temp_repo}), \
             patch('git.Repo'):
            connector = RepoConnector()
            
            # Test excluded files
            assert connector._is_excluded(Path("test.pyc"))
            assert connector._is_excluded(Path("__pycache__/module.py"))
            assert connector._is_excluded(Path(".env"))
            
            # Test included files
            assert not connector._is_excluded(Path("main.py"))
            assert not connector._is_excluded(Path("README.md"))
    
    def test_safe_read_file(self, temp_repo):
        """Test safe file reading."""
        with patch.dict(os.environ, {"REPO_ROOT": temp_repo}), \
             patch('git.Repo'):
            connector = RepoConnector()
            
            test_file = Path(temp_repo) / "README.md"
            content = connector._safe_read_file(test_file)
            
            assert content == "# Test Repository"
    
    async def test_handle_repo_read_file_success(self, temp_repo):
        """Test successful file reading."""
        with patch.dict(os.environ, {"REPO_ROOT": temp_repo}), \
             patch('git.Repo'):
            connector = RepoConnector()
            
            arguments = {"file_path": "README.md"}
            result = await connector.handle_repo_read_file(arguments)
            
            assert len(result) == 1
            assert "Repository File Content" in result[0].text
            assert "# Test Repository" in result[0].text
    
    async def test_handle_repo_read_file_not_found(self, temp_repo):
        """Test file not found handling."""
        with patch.dict(os.environ, {"REPO_ROOT": temp_repo}), \
             patch('git.Repo'):
            connector = RepoConnector()
            
            arguments = {"file_path": "nonexistent.txt"}
            result = await connector.handle_repo_read_file(arguments)
            
            assert len(result) == 1
            assert "File not found" in result[0].text
    
    async def test_handle_repo_read_file_outside_bounds(self, temp_repo):
        """Test path traversal protection."""
        with patch.dict(os.environ, {"REPO_ROOT": temp_repo}), \
             patch('git.Repo'):
            connector = RepoConnector()
            
            arguments = {"file_path": "../../../etc/passwd"}
            result = await connector.handle_repo_read_file(arguments)
            
            assert len(result) == 1
            assert "outside repository bounds" in result[0].text
    
    async def test_handle_repo_search_files(self, temp_repo):
        """Test file search functionality."""
        with patch.dict(os.environ, {"REPO_ROOT": temp_repo}), \
             patch('git.Repo'):
            connector = RepoConnector()
            
            arguments = {"pattern": "*.py"}
            result = await connector.handle_repo_search_files(arguments)
            
            assert len(result) == 1
            assert "Repository File Search Results" in result[0].text
    
    async def test_handle_repo_search_content(self, temp_repo):
        """Test content search functionality."""
        with patch.dict(os.environ, {"REPO_ROOT": temp_repo}), \
             patch('git.Repo'):
            connector = RepoConnector()
            
            arguments = {
                "query": "Hello World",
                "file_patterns": ["*.py"]
            }
            result = await connector.handle_repo_search_content(arguments)
            
            assert len(result) == 1
            assert "Repository Content Search Results" in result[0].text
    
    async def test_handle_repo_list_directory(self, temp_repo):
        """Test directory listing functionality."""
        with patch.dict(os.environ, {"REPO_ROOT": temp_repo}), \
             patch('git.Repo'):
            connector = RepoConnector()
            
            arguments = {"directory": "", "recursive": False}
            result = await connector.handle_repo_list_directory(arguments)
            
            assert len(result) == 1
            assert "Repository Directory Listing" in result[0].text
    
    async def test_handle_repo_git_info_branch(self, temp_repo, mock_git_repo):
        """Test Git branch information."""
        with patch.dict(os.environ, {"REPO_ROOT": temp_repo}), \
             patch('git.Repo', return_value=mock_git_repo):
            connector = RepoConnector()
            
            arguments = {"info_type": "branch"}
            result = await connector.handle_repo_git_info(arguments)
            
            assert len(result) == 1
            assert "Repository Git Information (branch)" in result[0].text
    
    async def test_handle_repo_git_info_commits(self, temp_repo, mock_git_repo):
        """Test Git commit information."""
        with patch.dict(os.environ, {"REPO_ROOT": temp_repo}), \
             patch('git.Repo', return_value=mock_git_repo):
            connector = RepoConnector()
            
            arguments = {"info_type": "commits", "limit": 5}
            result = await connector.handle_repo_git_info(arguments)
            
            assert len(result) == 1
            assert "Repository Git Information (commits)" in result[0].text
    
    async def test_handle_repo_git_info_no_git(self, temp_repo):
        """Test Git info when no Git repository."""
        with patch.dict(os.environ, {"REPO_ROOT": temp_repo}), \
             patch('git.Repo', side_effect=Exception("Not a git repo")):
            connector = RepoConnector()
            
            arguments = {"info_type": "branch"}
            result = await connector.handle_repo_git_info(arguments)
            
            assert len(result) == 1
            assert "Git repository not available" in result[0].text
    
    async def test_error_handling(self, temp_repo):
        """Test error handling in tool handlers."""
        with patch.dict(os.environ, {"REPO_ROOT": temp_repo}), \
             patch('git.Repo'), \
             patch.object(RepoConnector, '_safe_read_file', side_effect=Exception("Read error")):
            
            connector = RepoConnector()
            arguments = {"file_path": "README.md"}
            result = await connector.handle_repo_read_file(arguments)
            
            assert len(result) == 1
            assert "Error reading repository file" in result[0].text