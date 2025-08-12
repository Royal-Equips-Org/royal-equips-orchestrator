"""Tests for Supabase connector."""

import pytest
from unittest.mock import patch, Mock
from royal_mcp.connectors.supabase import SupabaseConnector


@pytest.mark.asyncio
class TestSupabaseConnector:
    """Test cases for Supabase connector."""
    
    def test_initialization(self, mock_env_vars):
        """Test connector initialization."""
        with patch('supabase.create_client'):
            connector = SupabaseConnector()
            assert connector.config.url == mock_env_vars["SUPABASE_URL"]
            assert connector.config.service_role_key == mock_env_vars["SUPABASE_SERVICE_ROLE_KEY"]
    
    def test_get_tools(self, mock_env_vars):
        """Test tool registration."""
        with patch('supabase.create_client'):
            connector = SupabaseConnector()
            tools = connector.get_tools()
            
            assert len(tools) == 4
            tool_names = [tool.name for tool in tools]
            assert "supabase_inventory_view" in tool_names
            assert "supabase_orders_view" in tool_names
            assert "supabase_customers_view" in tool_names
            assert "supabase_analytics_query" in tool_names
    
    def test_serialize_datetime(self, mock_env_vars):
        """Test datetime serialization."""
        from datetime import datetime
        
        with patch('supabase.create_client'):
            connector = SupabaseConnector()
            
            test_data = {
                "created_at": datetime(2024, 1, 1, 12, 0, 0),
                "items": [
                    {"updated_at": datetime(2024, 1, 2, 10, 30, 0)},
                    {"name": "test"}
                ],
                "count": 5
            }
            
            serialized = connector._serialize_datetime(test_data)
            
            assert serialized["created_at"] == "2024-01-01T12:00:00"
            assert serialized["items"][0]["updated_at"] == "2024-01-02T10:30:00"
            assert serialized["items"][1]["name"] == "test"
            assert serialized["count"] == 5
    
    async def test_handle_supabase_inventory_view(self, mock_env_vars, mock_supabase_client):
        """Test inventory view query handling."""
        with patch('supabase.create_client', return_value=mock_supabase_client):
            connector = SupabaseConnector()
            
            arguments = {
                "filters": {"category": "electronics"},
                "limit": 50,
                "order_by": "name"
            }
            
            result = await connector.handle_supabase_inventory_view(arguments)
            
            assert len(result) == 1
            assert "Supabase Inventory View Result" in result[0].text
            mock_supabase_client.rpc.assert_called_once_with("inventory_view")
    
    async def test_handle_supabase_orders_view(self, mock_env_vars, mock_supabase_client):
        """Test orders view query handling."""
        with patch('supabase.create_client', return_value=mock_supabase_client):
            connector = SupabaseConnector()
            
            arguments = {
                "filters": {"status": "completed"},
                "limit": 25
            }
            
            result = await connector.handle_supabase_orders_view(arguments)
            
            assert len(result) == 1
            assert "Supabase Orders View Result" in result[0].text
            mock_supabase_client.rpc.assert_called_once_with("orders_view")
    
    async def test_handle_supabase_customers_view(self, mock_env_vars, mock_supabase_client):
        """Test customers view query handling."""
        with patch('supabase.create_client', return_value=mock_supabase_client):
            connector = SupabaseConnector()
            
            arguments = {
                "limit": 100,
                "order_by": "created_at"
            }
            
            result = await connector.handle_supabase_customers_view(arguments)
            
            assert len(result) == 1
            assert "Supabase Customers View Result" in result[0].text
            mock_supabase_client.rpc.assert_called_once_with("customers_view")
    
    async def test_handle_supabase_analytics_query_valid(self, mock_env_vars, mock_supabase_client):
        """Test valid analytics query handling."""
        with patch('supabase.create_client', return_value=mock_supabase_client):
            connector = SupabaseConnector()
            
            arguments = {
                "function_name": "sales_analytics",
                "parameters": {"period": "monthly"}
            }
            
            result = await connector.handle_supabase_analytics_query(arguments)
            
            assert len(result) == 1
            assert "Supabase Analytics Query Result" in result[0].text
            mock_supabase_client.rpc.assert_called_once_with("sales_analytics", {"period": "monthly"})
    
    async def test_handle_supabase_analytics_query_invalid_function(self, mock_env_vars):
        """Test invalid analytics function handling."""
        with patch('supabase.create_client'):
            connector = SupabaseConnector()
            
            arguments = {
                "function_name": "dangerous_function",
                "parameters": {}
            }
            
            result = await connector.handle_supabase_analytics_query(arguments)
            
            assert len(result) == 1
            assert "is not in the allowed list" in result[0].text
    
    async def test_handle_supabase_analytics_query_missing_function(self, mock_env_vars):
        """Test missing function name handling."""
        with patch('supabase.create_client'):
            connector = SupabaseConnector()
            
            arguments = {"parameters": {}}
            
            result = await connector.handle_supabase_analytics_query(arguments)
            
            assert len(result) == 1
            assert "function_name is required" in result[0].text
    
    async def test_error_handling(self, mock_env_vars):
        """Test error handling in tool handlers."""
        with patch('supabase.create_client') as mock_create:
            mock_client = Mock()
            mock_rpc = Mock()
            mock_rpc.execute.side_effect = Exception("Supabase error")
            mock_client.rpc.return_value = mock_rpc
            mock_create.return_value = mock_client
            
            connector = SupabaseConnector()
            arguments = {"limit": 10}
            result = await connector.handle_supabase_inventory_view(arguments)
            
            assert len(result) == 1
            assert "Error querying Supabase inventory view" in result[0].text
    
    async def test_filter_application(self, mock_env_vars, mock_supabase_client):
        """Test filter application in queries."""
        with patch('supabase.create_client', return_value=mock_supabase_client):
            connector = SupabaseConnector()
            
            arguments = {
                "filters": {"status": "active", "category": "books"},
                "limit": 20
            }
            
            await connector.handle_supabase_inventory_view(arguments)
            
            # Verify filters were applied
            mock_rpc = mock_supabase_client.rpc.return_value
            assert mock_rpc.filter.call_count == 2  # One for each filter