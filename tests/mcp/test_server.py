"""Tests for Royal MCP server."""

import pytest
import os
import sys
from unittest.mock import patch, Mock, AsyncMock, MagicMock


class TestRoyalMCPServer:
    """Test cases for Royal MCP server."""
    
    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(),
        'mcp.server.stdio': MagicMock(),
        'mcp.types': MagicMock(),
    })
    def test_initialization(self, mock_env_vars):
        """Test server initialization."""
        with patch('royal_mcp.server.ShopifyConnector') as MockShopify, \
             patch('royal_mcp.server.BigQueryConnector') as MockBigQuery, \
             patch('royal_mcp.server.SupabaseConnector') as MockSupabase, \
             patch('royal_mcp.server.RepoConnector') as MockRepo, \
             patch('royal_mcp.server.OrchestratorConnector') as MockOrchestrator:
            
            from royal_mcp.server import RoyalMCPServer
            
            server = RoyalMCPServer()
            assert len(server.connectors) == 5
            assert 'shopify' in server.connectors
            assert 'bigquery' in server.connectors
            assert 'supabase' in server.connectors
            assert 'repo' in server.connectors
            assert 'orchestrator' in server.connectors
    
    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(),
        'mcp.server.stdio': MagicMock(),
        'mcp.types': MagicMock(),
    })
    def test_initialization_with_connector_failure(self, mock_env_vars):
        """Test server initialization with connector failure."""
        with patch('royal_mcp.server.ShopifyConnector', side_effect=Exception("Shopify init failed")), \
             patch('royal_mcp.server.BigQueryConnector') as MockBigQuery, \
             patch('royal_mcp.server.SupabaseConnector') as MockSupabase, \
             patch('royal_mcp.server.RepoConnector') as MockRepo, \
             patch('royal_mcp.server.OrchestratorConnector') as MockOrchestrator:
            
            from royal_mcp.server import RoyalMCPServer
            
            server = RoyalMCPServer()
            # Should continue with other connectors even if one fails
            assert len(server.connectors) == 4
            assert 'shopify' not in server.connectors
            assert 'bigquery' in server.connectors
    
    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(),
        'mcp.server.stdio': MagicMock(),
        'mcp.types': MagicMock(),
    })
    def test_register_tools(self, mock_env_vars):
        """Test tool registration."""
        # Mock connector with tools
        mock_connector = Mock()
        mock_tool = Mock()
        mock_tool.name = "test_tool"
        mock_connector.get_tools.return_value = [mock_tool]
        mock_connector.handle_test_tool = AsyncMock()
        
        with patch('royal_mcp.server.ShopifyConnector', return_value=mock_connector), \
             patch('royal_mcp.server.BigQueryConnector') as MockBigQuery, \
             patch('royal_mcp.server.SupabaseConnector') as MockSupabase, \
             patch('royal_mcp.server.RepoConnector') as MockRepo, \
             patch('royal_mcp.server.OrchestratorConnector') as MockOrchestrator:
            
            from royal_mcp.server import RoyalMCPServer
            
            server = RoyalMCPServer()
            # Verify connector was added and tools were attempted to be registered
            assert 'shopify' in server.connectors
            mock_connector.get_tools.assert_called_once()


class TestEnvironmentValidation:
    """Test cases for environment validation."""
    
    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(),
        'mcp.server.stdio': MagicMock(),
        'mcp.types': MagicMock(),
    })
    def test_validate_environment_all_present(self, mock_env_vars):
        """Test validation with all required variables present."""
        from royal_mcp.server import validate_environment
        assert validate_environment() is True
    
    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(),
        'mcp.server.stdio': MagicMock(),
        'mcp.types': MagicMock(),
    })
    def test_validate_environment_missing_vars(self):
        """Test validation with missing variables."""
        with patch.dict(os.environ, {}, clear=True):
            from royal_mcp.server import validate_environment
            assert validate_environment() is False
    
    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(),
        'mcp.server.stdio': MagicMock(),
        'mcp.types': MagicMock(),
    })
    def test_validate_environment_partial_vars(self, mock_env_vars):
        """Test validation with some missing variables."""
        partial_vars = dict(mock_env_vars)
        del partial_vars["SHOPIFY_GRAPHQL_TOKEN"]
        
        with patch.dict(os.environ, partial_vars, clear=True):
            from royal_mcp.server import validate_environment
            assert validate_environment() is False


class TestMainFunction:
    """Test cases for main functions."""
    
    @pytest.mark.asyncio
    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(),
        'mcp.server.stdio': MagicMock(),
        'mcp.types': MagicMock(),
    })
    async def test_main_success(self, mock_env_vars):
        """Test successful main function execution."""
        with patch('royal_mcp.server.validate_environment', return_value=True), \
             patch('royal_mcp.server.RoyalMCPServer') as mock_server_class:
            
            mock_server = AsyncMock()
            mock_server_class.return_value = mock_server
            
            from royal_mcp.server import main
            await main()
            
            mock_server.run.assert_called_once()
    
    @pytest.mark.asyncio
    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(),
        'mcp.server.stdio': MagicMock(),
        'mcp.types': MagicMock(),
    })
    async def test_main_invalid_environment(self):
        """Test main function with invalid environment."""
        with patch('royal_mcp.server.validate_environment', return_value=False):
            from royal_mcp.server import main
            
            with pytest.raises(SystemExit):
                await main()
    
    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(),
        'mcp.server.stdio': MagicMock(),
        'mcp.types': MagicMock(),
    })
    def test_sync_main_success(self, mock_env_vars):
        """Test synchronous main wrapper."""
        with patch('royal_mcp.server.main', new_callable=AsyncMock) as mock_main, \
             patch('asyncio.run') as mock_asyncio_run:
            
            from royal_mcp.server import sync_main
            sync_main()
            
            mock_asyncio_run.assert_called_once_with(mock_main())
    
    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(),
        'mcp.server.stdio': MagicMock(),
        'mcp.types': MagicMock(),
    })
    def test_sync_main_keyboard_interrupt(self, mock_env_vars):
        """Test synchronous main wrapper with KeyboardInterrupt."""
        with patch('royal_mcp.server.main', side_effect=KeyboardInterrupt), \
             patch('asyncio.run', side_effect=KeyboardInterrupt):
            
            from royal_mcp.server import sync_main
            # Should not raise, just log and exit gracefully
            sync_main()
    
    @patch.dict('sys.modules', {
        'mcp': MagicMock(),
        'mcp.server': MagicMock(),
        'mcp.server.stdio': MagicMock(),
        'mcp.types': MagicMock(),
    })
    def test_sync_main_exception(self, mock_env_vars):
        """Test synchronous main wrapper with exception."""
        with patch('royal_mcp.server.main', side_effect=Exception("Test error")), \
             patch('asyncio.run', side_effect=Exception("Test error")):
            
            from royal_mcp.server import sync_main
            
            with pytest.raises(SystemExit):
                sync_main()