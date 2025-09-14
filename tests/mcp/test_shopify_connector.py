"""Tests for Shopify connector."""

import pytest
from unittest.mock import patch, AsyncMock
from royal_mcp.connectors.shopify import ShopifyConnector


@pytest.mark.asyncio
class TestShopifyConnector:
    """Test cases for Shopify connector."""
    
    def test_initialization(self, mock_env_vars):
        """Test connector initialization."""
        with patch('httpx.AsyncClient'):
            connector = ShopifyConnector()
            assert connector.config.endpoint == mock_env_vars["SHOPIFY_GRAPHQL_ENDPOINT"]
            assert connector.config.token == mock_env_vars["SHOPIFY_GRAPHQL_TOKEN"]
    
    def test_get_tools(self, mock_env_vars):
        """Test tool registration."""
        with patch('httpx.AsyncClient'):
            connector = ShopifyConnector()
            tools = connector.get_tools()
            
            assert len(tools) == 4
            tool_names = [tool.name for tool in tools]
            assert "shopify_query_products" in tool_names
            assert "shopify_query_orders" in tool_names
            assert "shopify_query_customers" in tool_names
            assert "shopify_mutation" in tool_names
    
    async def test_execute_graphql_success(self, mock_env_vars, mock_httpx_client):
        """Test successful GraphQL execution."""
        with patch('httpx.AsyncClient', return_value=mock_httpx_client):
            connector = ShopifyConnector()
            
            result = await connector._execute_graphql("query { products { id } }")
            
            assert result == {"data": "test-data"}
            mock_httpx_client.post.assert_called_once()
    
    async def test_execute_graphql_rate_limit(self, mock_env_vars):
        """Test rate limiting behavior."""
        with patch('httpx.AsyncClient'):
            connector = ShopifyConnector()
            
            # Exhaust rate limit
            for _ in range(connector.rate_limiter.max_tokens + 1):
                await connector.rate_limiter.acquire()
            
            # Should not be able to acquire more tokens immediately
            can_acquire = await connector.rate_limiter.acquire()
            assert not can_acquire
    
    async def test_handle_shopify_query_products(self, mock_env_vars):
        """Test product query handling."""
        with patch('httpx.AsyncClient'), \
             patch.object(ShopifyConnector, '_execute_graphql', new_callable=AsyncMock) as mock_execute:
            
            mock_execute.return_value = {"data": {"products": []}}
            connector = ShopifyConnector()
            
            arguments = {"query": "query { products { id } }"}
            result = await connector.handle_shopify_query_products(arguments)
            
            assert len(result) == 1
            assert "Shopify Products Query Result" in result[0].text
            mock_execute.assert_called_once()
    
    async def test_handle_shopify_mutation_validation(self, mock_env_vars):
        """Test mutation validation."""
        with patch('httpx.AsyncClient'):
            connector = ShopifyConnector()
            
            # Test invalid mutation (not starting with 'mutation')
            arguments = {"mutation": "query { products { id } }"}
            result = await connector.handle_shopify_mutation(arguments)
            
            assert len(result) == 1
            assert "Only mutation operations are allowed" in result[0].text
    
    async def test_circuit_breaker_behavior(self, mock_env_vars):
        """Test circuit breaker functionality."""
        with patch('httpx.AsyncClient'):
            connector = ShopifyConnector()
            
            # Simulate failures to trip circuit breaker
            for _ in range(connector.circuit_breaker.failure_threshold):
                connector.circuit_breaker.record_failure()
            
            assert not connector.circuit_breaker.can_execute()
    
    async def test_error_handling(self, mock_env_vars):
        """Test error handling in tool handlers."""
        with patch('httpx.AsyncClient'), \
             patch.object(ShopifyConnector, '_execute_graphql', side_effect=Exception("Test error")):
            
            connector = ShopifyConnector()
            arguments = {"query": "query { products { id } }"}
            result = await connector.handle_shopify_query_products(arguments)
            
            assert len(result) == 1
            assert "Error querying Shopify products" in result[0].text