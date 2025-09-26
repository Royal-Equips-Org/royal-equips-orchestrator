"""Tests for the new GraphQL-first Shopify connector."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from royal_platform.connectors.shopify import ShopifyClient, ShopifyConfig
from royal_platform.connectors.shopify.types import Product, ProductConnection, PageInfo


class TestShopifyClient:
    """Test the unified Shopify client."""
    
    @pytest.fixture
    def mock_config(self):
        """Mock Shopify configuration."""
        return ShopifyConfig(
            shop_name="test-shop",
            access_token="test-token",
            api_version="2024-10",
            timeout=30
        )
    
    @pytest.fixture
    def mock_product_data(self):
        """Mock product response data."""
        return {
            "data": {
                "products": {
                    "edges": [
                        {
                            "cursor": "cursor1",
                            "node": {
                                "id": "gid://shopify/Product/123",
                                "title": "Test Product",
                                "handle": "test-product",
                                "description": "A test product",
                                "vendor": "Test Vendor",
                                "product_type": "Test Type",
                                "status": "ACTIVE",
                                "tags": ["test", "sample"],
                                "created_at": "2024-01-01T00:00:00Z",
                                "updated_at": "2024-01-01T00:00:00Z",
                                "published_at": "2024-01-01T00:00:00Z",
                                "variants": {"edges": []},
                                "images": {"edges": []}
                            }
                        }
                    ],
                    "page_info": {
                        "has_next_page": False,
                        "has_previous_page": False,
                        "start_cursor": "cursor1",
                        "end_cursor": "cursor1"
                    }
                }
            }
        }
    
    @pytest.mark.asyncio
    async def test_shopify_client_initialization(self, mock_config):
        """Test that ShopifyClient initializes correctly."""
        client = ShopifyClient(config=mock_config)
        
        assert client.config.shop_name == "test-shop"
        assert client.config.access_token == "test-token"
        assert client.graphql is not None
        assert client.rest is None  # Lazy initialization
        
        await client.close()
    
    @pytest.mark.asyncio
    async def test_get_products_graphql(self, mock_config, mock_product_data):
        """Test getting products via GraphQL."""
        client = ShopifyClient(config=mock_config)
        
        with patch.object(client.graphql, 'execute_query', new_callable=AsyncMock) as mock_execute:
            mock_execute.return_value = mock_product_data
            
            result = await client.get_products(limit=10)
            
            assert isinstance(result, ProductConnection)
            assert len(result.edges) == 1
            assert result.edges[0].node.title == "Test Product"
            assert result.edges[0].node.status.value == "ACTIVE"
            
            # Verify GraphQL was called with correct parameters
            mock_execute.assert_called_once()
            call_args = mock_execute.call_args
            assert "GetProducts" in call_args[0][0]  # Query contains GetProducts
            assert call_args[0][1]["first"] == 10  # Variables contain limit
        
        await client.close()
    
    @pytest.mark.asyncio
    async def test_capabilities_check(self, mock_config):
        """Test API capabilities checking."""
        client = ShopifyClient(config=mock_config)
        
        capabilities = await client.get_api_capabilities()
        
        assert "graphql_features" in capabilities
        assert capabilities["preferred_client"] == "GraphQL"
        assert capabilities["fallback_client"] == "REST (deprecated)"
        assert "migration_status" in capabilities
        
        # Check specific feature support
        assert client.capabilities.supports_graphql("products_read") is True
        assert client.capabilities.supports_graphql("webhooks_management") is False
        assert client.capabilities.requires_rest_fallback("webhooks_management") is True
        
        await client.close()
    
    @pytest.mark.asyncio
    async def test_rest_fallback_lazy_initialization(self, mock_config):
        """Test that REST client is only initialized when needed."""
        client = ShopifyClient(config=mock_config)
        
        # Initially, REST client should be None
        assert client.rest is None
        
        # Getting REST client should initialize it
        with patch('royal_platform.connectors.shopify.client.ShopifyRESTClient') as mock_rest_class:
            mock_rest_instance = AsyncMock()
            mock_rest_class.return_value = mock_rest_instance
            
            rest_client = client._get_rest_client()
            
            assert rest_client is not None
            assert client.rest is not None
            mock_rest_class.assert_called_once()
        
        await client.close()
    
    @pytest.mark.asyncio
    async def test_webhook_operations_use_rest_fallback(self, mock_config):
        """Test that webhook operations correctly use REST fallback."""
        client = ShopifyClient(config=mock_config)
        
        webhook_data = {
            "topic": "orders/create",
            "address": "https://example.com/webhook",
            "format": "json"
        }
        
        with patch.object(client, '_get_rest_client') as mock_get_rest:
            mock_rest_client = AsyncMock()
            mock_rest_client.create_webhook.return_value = {"id": "webhook123"}
            mock_get_rest.return_value = mock_rest_client
            
            result = await client.create_webhook(webhook_data)
            
            assert result["id"] == "webhook123"
            mock_rest_client.create_webhook.assert_called_once_with(webhook_data)
        
        await client.close()
    
    @pytest.mark.asyncio 
    async def test_connection_test(self, mock_config):
        """Test connection testing functionality."""
        client = ShopifyClient(config=mock_config)
        
        mock_shop_response = {
            "data": {
                "shop": {
                    "id": "gid://shopify/Shop/123",
                    "name": "Test Shop",
                    "email": "test@example.com",
                    "domain": "test-shop.myshopify.com",
                    "plan": {
                        "displayName": "Basic Shopify"
                    }
                }
            }
        }
        
        with patch.object(client.graphql, 'execute_query', new_callable=AsyncMock) as mock_execute:
            mock_execute.return_value = mock_shop_response
            
            result = await client.test_connection()
            
            assert result["status"] == "connected"
            assert result["shop_name"] == "Test Shop"
            assert result["shop_domain"] == "test-shop.myshopify.com"
            assert result["plan"] == "Basic Shopify"
            assert result["graphql_available"] is True
        
        await client.close()
    
    @pytest.mark.asyncio
    async def test_bulk_products_retrieval(self, mock_config):
        """Test bulk product retrieval with pagination."""
        client = ShopifyClient(config=mock_config)
        
        # Mock two pages of products
        page1_response = {
            "data": {
                "products": {
                    "edges": [
                        {
                            "cursor": "cursor1",
                            "node": {
                                "id": "gid://shopify/Product/1",
                                "title": "Product 1",
                                "handle": "product-1",
                                "status": "ACTIVE",
                                "created_at": "2024-01-01T00:00:00Z",
                                "updated_at": "2024-01-01T00:00:00Z",
                                "variants": {"edges": []},
                                "images": {"edges": []}
                            }
                        }
                    ],
                    "page_info": {
                        "has_next_page": True,
                        "has_previous_page": False,
                        "start_cursor": "cursor1",
                        "end_cursor": "cursor1"
                    }
                }
            }
        }
        
        page2_response = {
            "data": {
                "products": {
                    "edges": [
                        {
                            "cursor": "cursor2",
                            "node": {
                                "id": "gid://shopify/Product/2",
                                "title": "Product 2",
                                "handle": "product-2",
                                "status": "ACTIVE",
                                "created_at": "2024-01-01T00:00:00Z",
                                "updated_at": "2024-01-01T00:00:00Z",
                                "variants": {"edges": []},
                                "images": {"edges": []}
                            }
                        }
                    ],
                    "page_info": {
                        "has_next_page": False,
                        "has_previous_page": True,
                        "start_cursor": "cursor2",
                        "end_cursor": "cursor2"
                    }
                }
            }
        }
        
        with patch.object(client.graphql, 'execute_query', new_callable=AsyncMock) as mock_execute:
            mock_execute.side_effect = [page1_response, page2_response]
            
            # Mock asyncio.sleep to speed up test
            with patch('asyncio.sleep', new_callable=AsyncMock):
                products = await client.get_all_products(batch_size=1)
            
            assert len(products) == 2
            assert products[0].title == "Product 1"
            assert products[1].title == "Product 2"
            
            # Should have made two GraphQL calls
            assert mock_execute.call_count == 2
        
        await client.close()


class TestShopifyTypes:
    """Test Pydantic type validation."""
    
    def test_product_type_validation(self):
        """Test Product type validation."""
        product_data = {
            "id": "gid://shopify/Product/123",
            "title": "Test Product",
            "handle": "test-product",
            "status": "ACTIVE",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
        
        product = Product.model_validate(product_data)
        
        assert product.id == "gid://shopify/Product/123"
        assert product.title == "Test Product"
        assert product.status.value == "ACTIVE"
        assert product.variants == []  # Default empty list
        
    def test_product_connection_validation(self):
        """Test ProductConnection type validation."""
        connection_data = {
            "edges": [
                {
                    "cursor": "cursor1",
                    "node": {
                        "id": "gid://shopify/Product/123",
                        "title": "Test Product",
                        "handle": "test-product",
                        "status": "ACTIVE",
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T00:00:00Z"
                    }
                }
            ],
            "page_info": {
                "has_next_page": False,
                "has_previous_page": False,
                "start_cursor": "cursor1",
                "end_cursor": "cursor1"
            }
        }
        
        connection = ProductConnection.model_validate(connection_data)
        
        assert len(connection.edges) == 1
        assert connection.edges[0].node.title == "Test Product"
        assert connection.page_info.has_next_page is False