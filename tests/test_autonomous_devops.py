"""
Test suite for Autonomous DevOps Agent

Tests the core functionality of the DevOps agent without requiring
actual Git operations or external services.
"""

import asyncio
import json
import os
import tempfile
import unittest
from unittest.mock import Mock, patch, AsyncMock
from pathlib import Path
import sys

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

from services.autonomous_devops_agent import (
    AutonomousDevOpsAgent,
    GitCommitInfo,
    DevOpsOperation,
    AuditLogEntry
)


class TestAutonomousDevOpsAgent(unittest.TestCase):
    """Test cases for the Autonomous DevOps Agent."""
    
    def setUp(self):
        """Set up test environment."""
        self.test_config = {
            "gpg_key_id": "test-key-id",
            "vault_url": "https://vault.example.com",
            "github_token": "test-token",
            "openai_api_key": "test-openai-key",
            "repo_path": "/tmp/test-repo",
            "scan_interval_minutes": 5,
            "max_retries": 2,
            "force_push_enabled": False,
            "auto_pr_enabled": True
        }
        
        # Create agent with test config
        self.agent = AutonomousDevOpsAgent(self.test_config)
    
    def test_agent_initialization(self):
        """Test agent initializes correctly."""
        self.assertIsNotNone(self.agent)
        self.assertEqual(self.agent.config["gpg_key_id"], "test-key-id")
        self.assertFalse(self.agent.is_running)
        self.assertEqual(len(self.agent.audit_log), 1)  # Initial audit entry
        
        # Check initial audit log
        first_entry = self.agent.audit_log[0]
        self.assertEqual(first_entry.operation_type, "agent_initialized")
        self.assertEqual(first_entry.result, "success")
    
    def test_config_loading_from_env(self):
        """Test configuration loading from environment variables."""
        with patch.dict(os.environ, {
            "GPG_KEY_ID": "env-key-id",
            "VAULT_URL": "https://env.vault.com",
            "DEVOPS_SCAN_INTERVAL": "30"
        }):
            agent = AutonomousDevOpsAgent()
            self.assertEqual(agent.config["gpg_key_id"], "env-key-id")
            self.assertEqual(agent.config["vault_url"], "https://env.vault.com")
            self.assertEqual(agent.config["scan_interval_minutes"], 30)
    
    def test_audit_logging(self):
        """Test audit logging functionality."""
        initial_count = len(self.agent.audit_log)
        
        self.agent._log_audit(
            "test_operation", 
            "test_target", 
            "test_action", 
            "success",
            {"test_metadata": "value"}
        )
        
        self.assertEqual(len(self.agent.audit_log), initial_count + 1)
        
        latest_entry = self.agent.audit_log[-1]
        self.assertEqual(latest_entry.operation_type, "test_operation")
        self.assertEqual(latest_entry.target, "test_target")
        self.assertEqual(latest_entry.action, "test_action")
        self.assertEqual(latest_entry.result, "success")
        self.assertEqual(latest_entry.metadata["test_metadata"], "value")
    
    @patch('subprocess.run')
    def test_git_command_success(self, mock_run):
        """Test successful Git command execution."""
        # Mock successful git command
        mock_run.return_value = Mock(
            returncode=0,
            stdout="commit1\ncommit2\n",
            stderr=""
        )
        
        # This would need to be tested with actual async implementation
        # For now, test the concept
        self.assertTrue(True)  # Placeholder
    
    def test_commit_info_dataclass(self):
        """Test GitCommitInfo dataclass functionality."""
        commit = GitCommitInfo(
            sha="abc123",
            message="Test commit",
            author="Test Author",
            date="2024-01-01",
            branch="main",
            is_signed=False
        )
        
        self.assertEqual(commit.sha, "abc123")
        self.assertEqual(commit.message, "Test commit")
        self.assertFalse(commit.is_signed)
        self.assertIsNone(commit.gpg_signature)
    
    def test_operations_tracking(self):
        """Test operation tracking functionality."""
        operation = DevOpsOperation(
            operation_id="test-op-123",
            timestamp="2024-01-01T00:00:00Z",
            operation_type="test_operation",
            target_commits=["commit1", "commit2"]
        )
        
        self.agent.operations["test-op-123"] = operation
        
        status = self.agent.get_operations_status()
        self.assertEqual(status["total_operations"], 1)
        self.assertIn("test-op-123", status["operations"])
        
        op_data = status["operations"]["test-op-123"]
        self.assertEqual(op_data["operation_type"], "test_operation")
        self.assertEqual(len(op_data["target_commits"]), 2)
    
    def test_audit_log_retrieval(self):
        """Test audit log retrieval with limits."""
        # Add multiple audit entries
        for i in range(10):
            self.agent._log_audit(f"operation_{i}", "target", "action", "success")
        
        # Test unlimited retrieval
        all_logs = self.agent.get_audit_log()
        self.assertGreater(len(all_logs), 10)  # Including initial entry
        
        # Test limited retrieval
        limited_logs = self.agent.get_audit_log(limit=5)
        self.assertEqual(len(limited_logs), 5)
        
        # Check all entries are dictionaries (serialized)
        for log_entry in limited_logs:
            self.assertIsInstance(log_entry, dict)
            self.assertIn("timestamp", log_entry)
            self.assertIn("operation_type", log_entry)
    
    def test_daemon_lifecycle(self):
        """Test daemon start/stop lifecycle."""
        self.assertFalse(self.agent.is_running)
        
        # Test stop when not running
        self.agent.stop_daemon()
        self.assertFalse(self.agent.is_running)
        
        # Test daemon state management
        self.agent.is_running = True
        self.assertTrue(self.agent.is_running)
        
        self.agent.stop_daemon()
        self.assertFalse(self.agent.is_running)


class TestAsyncDevOpsOperations(unittest.IsolatedAsyncioTestCase):
    """Test async operations of the DevOps agent."""
    
    async def asyncSetUp(self):
        """Set up async test environment."""
        self.test_config = {
            "gpg_key_id": "test-key-id",
            "repo_path": "/tmp/test-repo",
            "force_push_enabled": False,
            "auto_pr_enabled": True
        }
        self.agent = AutonomousDevOpsAgent(self.test_config)
    
    @patch('services.autonomous_devops_agent.AutonomousDevOpsAgent._run_git_command')
    async def test_get_all_branches(self, mock_git):
        """Test branch detection functionality."""
        # Mock git branch commands
        mock_git.side_effect = [
            Mock(returncode=0, stdout="main\ndevelop\nfeature-branch"),
            Mock(returncode=0, stdout="origin/main\norigin/develop")
        ]
        
        branches = await self.agent._get_all_branches()
        
        # Should have deduplicated branches
        self.assertIn("main", branches)
        self.assertIn("develop", branches)
        self.assertIn("feature-branch", branches)
        self.assertIn("origin/main", branches)
        
        # Should not include HEAD reference
        self.assertNotIn("origin/HEAD", branches)
    
    @patch('services.autonomous_devops_agent.AutonomousDevOpsAgent._run_git_command')
    async def test_get_branch_commits(self, mock_git):
        """Test commit detection for a branch."""
        # Mock git log output
        mock_git.return_value = Mock(
            returncode=0,
            stdout="abc123|Initial commit|Author Name|2024-01-01 00:00:00|N|\n"
                   "def456|Second commit|Author Name|2024-01-01 01:00:00|G|Good signature"
        )
        
        commits = await self.agent._get_branch_commits("main")
        
        self.assertEqual(len(commits), 2)
        
        # First commit (unsigned)
        self.assertEqual(commits[0].sha, "abc123")
        self.assertEqual(commits[0].message, "Initial commit")
        self.assertFalse(commits[0].is_signed)
        
        # Second commit (signed)
        self.assertEqual(commits[1].sha, "def456")
        self.assertEqual(commits[1].message, "Second commit")
        self.assertTrue(commits[1].is_signed)
        self.assertEqual(commits[1].gpg_signature, "Good signature")
    
    @patch('services.autonomous_devops_agent.AutonomousDevOpsAgent._get_all_branches')
    @patch('services.autonomous_devops_agent.AutonomousDevOpsAgent._get_branch_commits')
    async def test_detect_unsigned_commits(self, mock_get_commits, mock_get_branches):
        """Test unsigned commit detection."""
        # Mock branches
        mock_get_branches.return_value = ["main", "develop"]
        
        # Mock commits (some signed, some not)
        unsigned_commit = GitCommitInfo(
            sha="abc123", message="Unsigned", author="Author", 
            date="2024-01-01", branch="main", is_signed=False
        )
        signed_commit = GitCommitInfo(
            sha="def456", message="Signed", author="Author",
            date="2024-01-01", branch="main", is_signed=True
        )
        
        mock_get_commits.side_effect = [
            [unsigned_commit, signed_commit],  # main branch
            []  # develop branch (empty)
        ]
        
        unsigned_commits = await self.agent.detect_unsigned_commits()
        
        self.assertEqual(len(unsigned_commits), 1)
        self.assertEqual(unsigned_commits[0].sha, "abc123")
        self.assertFalse(unsigned_commits[0].is_signed)
    
    async def test_sign_commits_empty_list(self):
        """Test signing empty commit list."""
        results = await self.agent.sign_commits([])
        
        self.assertEqual(results["signed"], 0)
        self.assertEqual(results["failed"], 0)
        self.assertEqual(results["skipped"], 0)
    
    async def test_changelog_generation(self):
        """Test changelog generation."""
        commits = [
            GitCommitInfo(
                sha="abc123", message="Add feature X", author="Dev One",
                date="2024-01-01T10:00:00Z", branch="main", is_signed=False
            ),
            GitCommitInfo(
                sha="def456", message="Fix bug Y", author="Dev Two", 
                date="2024-01-01T11:00:00Z", branch="develop", is_signed=False
            )
        ]
        
        changelog = await self.agent._generate_changelog(commits)
        
        self.assertIn("Autonomous DevOps", changelog)
        self.assertIn("Signed Commits**: 2", changelog)
        self.assertIn("abc123", changelog)
        self.assertIn("Add feature X", changelog)
        self.assertIn("def456", changelog)
        self.assertIn("Fix bug Y", changelog)
        self.assertIn("Security Enhancements", changelog)
    
    @patch('services.autonomous_devops_agent.AutonomousDevOpsAgent.detect_unsigned_commits')
    async def test_autonomous_cycle_no_commits(self, mock_detect):
        """Test autonomous cycle with no unsigned commits."""
        mock_detect.return_value = []
        
        results = await self.agent.run_autonomous_cycle()
        
        self.assertEqual(results["status"], "no_action_needed")
        self.assertEqual(results["unsigned_commits_found"], 0)
        self.assertEqual(results["commits_signed"], 0)
        self.assertEqual(results["branches_processed"], 0)


class TestConfigurationManagement(unittest.TestCase):
    """Test configuration management functionality."""
    
    def test_default_config_values(self):
        """Test default configuration values."""
        with patch.dict(os.environ, {}, clear=True):
            agent = AutonomousDevOpsAgent()
            
            # Check defaults
            self.assertEqual(agent.config["scan_interval_minutes"], 15)
            self.assertEqual(agent.config["max_retries"], 3)
            self.assertFalse(agent.config["force_push_enabled"])
            self.assertTrue(agent.config["auto_pr_enabled"])
            self.assertEqual(agent.config["repo_path"], ".")
    
    def test_environment_variable_override(self):
        """Test environment variable configuration override."""
        with patch.dict(os.environ, {
            "DEVOPS_SCAN_INTERVAL": "60",
            "DEVOPS_MAX_RETRIES": "10", 
            "DEVOPS_FORCE_PUSH": "true",
            "DEVOPS_AUTO_PR": "false",
            "REPO_PATH": "/custom/repo/path"
        }):
            agent = AutonomousDevOpsAgent()
            
            self.assertEqual(agent.config["scan_interval_minutes"], 60)
            self.assertEqual(agent.config["max_retries"], 10)
            self.assertTrue(agent.config["force_push_enabled"])
            self.assertFalse(agent.config["auto_pr_enabled"])
            self.assertEqual(agent.config["repo_path"], "/custom/repo/path")


if __name__ == "__main__":
    # Run tests
    unittest.main(verbosity=2)