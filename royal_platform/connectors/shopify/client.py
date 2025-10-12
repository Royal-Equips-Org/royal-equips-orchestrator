"""Main Shopify client facade with GraphQL-first approach and REST fallback."""

import asyncio
import logging
import os
from typing import Any, Dict, List, Optional

from .graphql_client import ShopifyConfig, ShopifyGraphQLClient
from .rest_client import ShopifyRESTClient, ShopifyRESTConfig
from .types import (
    Customer,
    CustomerConnection,
    InventoryAdjustQuantitiesPayload,
    Order,
    OrderConnection,
    Product,
    ProductConnection,
    ProductCreatePayload,
    ProductUpdatePayload,
)

logger = logging.getLogger(__name__)


class ShopifyClientCapabilities:
    """Track Shopify API capabilities and feature availability."""

    def __init__(self):
        self.graphql_features = {
            # Core entities - fully supported
            "products_read": True,
            "products_write": True,
            "customers_read": True,
            "customers_write": True,
            "orders_read": True,
            "orders_write": True,
            "inventory_read": True,
            "inventory_write": True,

            # Advanced features - check support
            "webhooks_management": False,  # Not in GraphQL yet
            "script_tags": False,  # Deprecated, use App Blocks
            "discount_codes": True,   # Partial GraphQL support
            "transactions": False,    # Limited GraphQL support
            "fulfillment_services": False,  # Partial GraphQL support
            "themes": False,          # REST only
            "apps": False,            # REST only
            "carrier_services": False,  # REST only
        }

    def supports_graphql(self, feature: str) -> bool:
        """Check if feature is supported in GraphQL."""
        return self.graphql_features.get(feature, False)

    def requires_rest_fallback(self, feature: str) -> bool:
        """Check if feature requires REST fallback."""
        return not self.supports_graphql(feature)


class ShopifyClient:
    """
    Unified Shopify client with GraphQL-first approach and REST fallback.
    
    This facade provides a single interface to Shopify's APIs, preferring GraphQL
    for all operations and falling back to REST only when necessary.
    """

    def __init__(
        self,
        shop_name: Optional[str] = None,
        access_token: Optional[str] = None,
        config: Optional[ShopifyConfig] = None
    ):
        """Initialize the unified Shopify client."""

        if config is None:
            config = ShopifyConfig(
                shop_name=shop_name or os.environ["SHOPIFY_SHOP_NAME"],
                access_token=access_token or os.environ["SHOPIFY_ACCESS_TOKEN"]
            )

        self.config = config
        self.capabilities = ShopifyClientCapabilities()

        # Initialize clients
        self.graphql = ShopifyGraphQLClient(config)
        self.rest = None  # Lazy initialize to avoid deprecation warnings

        logger.info(f"Shopify client initialized for shop: {config.shop_name}")

    def _get_rest_client(self) -> ShopifyRESTClient:
        """Lazy initialize REST client only when needed."""
        if self.rest is None:
            rest_config = ShopifyRESTConfig(
                shop_name=self.config.shop_name,
                access_token=self.config.access_token,
                api_version=self.config.api_version,
                timeout=self.config.timeout
            )
            self.rest = ShopifyRESTClient(rest_config)
        return self.rest

    # Product operations (GraphQL-first)
    async def get_products(
        self,
        limit: int = 50,
        cursor: Optional[str] = None,
        query_filter: Optional[str] = None
    ) -> ProductConnection:
        """Get products using GraphQL."""
        return await self.graphql.get_products(
            first=limit,
            after=cursor,
            query_filter=query_filter
        )

    async def get_product_by_id(self, product_id: str) -> Optional[Product]:
        """Get a single product by ID using GraphQL."""
        return await self.graphql.get_product_by_id(product_id)

    async def create_product(self, product_data: Dict[str, Any]) -> ProductCreatePayload:
        """Create a new product using GraphQL."""
        return await self.graphql.create_product(product_data)

    async def update_product(self, product_id: str, product_data: Dict[str, Any]) -> ProductUpdatePayload:
        """Update an existing product using GraphQL."""
        return await self.graphql.update_product(product_id, product_data)

    # Customer operations (GraphQL-first)
    async def get_customers(
        self,
        limit: int = 50,
        cursor: Optional[str] = None,
        query_filter: Optional[str] = None
    ) -> CustomerConnection:
        """Get customers using GraphQL."""
        return await self.graphql.get_customers(
            first=limit,
            after=cursor,
            query_filter=query_filter
        )

    # Order operations (GraphQL-first)
    async def get_orders(
        self,
        limit: int = 50,
        cursor: Optional[str] = None,
        query_filter: Optional[str] = None
    ) -> OrderConnection:
        """Get orders using GraphQL."""
        return await self.graphql.get_orders(
            first=limit,
            after=cursor,
            query_filter=query_filter
        )

    # Inventory operations (GraphQL-first)
    async def adjust_inventory_quantities(
        self,
        adjustments: List[Dict[str, Any]]
    ) -> InventoryAdjustQuantitiesPayload:
        """Adjust inventory quantities using GraphQL."""
        return await self.graphql.adjust_inventory_quantities(adjustments)

    # Webhook operations (REST fallback required)
    async def create_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create webhook using REST API (GraphQL not available).
        
        This operation requires REST fallback as GraphQL doesn't support webhook management yet.
        """
        if self.capabilities.supports_graphql("webhooks_management"):
            # Future: Use GraphQL when available
            raise NotImplementedError("GraphQL webhook management not yet available")
        else:
            logger.info("Using REST fallback for webhook creation")
            rest_client = self._get_rest_client()
            return await rest_client.create_webhook(webhook_data)

    async def list_webhooks(self) -> List[Dict[str, Any]]:
        """
        List webhooks using REST API (GraphQL not available).
        
        This operation requires REST fallback as GraphQL doesn't support webhook management yet.
        """
        if self.capabilities.supports_graphql("webhooks_management"):
            # Future: Use GraphQL when available
            raise NotImplementedError("GraphQL webhook management not yet available")
        else:
            logger.info("Using REST fallback for webhook listing")
            rest_client = self._get_rest_client()
            return await rest_client.list_webhooks()

    async def delete_webhook(self, webhook_id: str) -> bool:
        """
        Delete webhook using REST API (GraphQL not available).
        
        This operation requires REST fallback as GraphQL doesn't support webhook management yet.
        """
        if self.capabilities.supports_graphql("webhooks_management"):
            # Future: Use GraphQL when available
            raise NotImplementedError("GraphQL webhook management not yet available")
        else:
            logger.info("Using REST fallback for webhook deletion")
            rest_client = self._get_rest_client()
            return await rest_client.delete_webhook(webhook_id)

    # Bulk operations with GraphQL efficiency
    async def get_all_products(
        self,
        query_filter: Optional[str] = None,
        batch_size: int = 50
    ) -> List[Product]:
        """Get all products using efficient GraphQL pagination."""
        all_products = []
        cursor = None

        while True:
            connection = await self.get_products(
                limit=batch_size,
                cursor=cursor,
                query_filter=query_filter
            )

            # Extract products from edges
            products = [edge.node for edge in connection.edges]
            all_products.extend(products)

            # Check if there are more pages
            if not connection.page_info.has_next_page:
                break

            cursor = connection.page_info.end_cursor

            # Rate limiting pause
            await asyncio.sleep(0.1)

        logger.info(f"Retrieved {len(all_products)} products using GraphQL")
        return all_products

    async def get_all_customers(
        self,
        query_filter: Optional[str] = None,
        batch_size: int = 50
    ) -> List[Customer]:
        """Get all customers using efficient GraphQL pagination."""
        all_customers = []
        cursor = None

        while True:
            connection = await self.get_customers(
                limit=batch_size,
                cursor=cursor,
                query_filter=query_filter
            )

            # Extract customers from edges
            customers = [edge.node for edge in connection.edges]
            all_customers.extend(customers)

            # Check if there are more pages
            if not connection.page_info.has_next_page:
                break

            cursor = connection.page_info.end_cursor

            # Rate limiting pause
            await asyncio.sleep(0.1)

        logger.info(f"Retrieved {len(all_customers)} customers using GraphQL")
        return all_customers

    async def get_all_orders(
        self,
        query_filter: Optional[str] = None,
        batch_size: int = 50
    ) -> List[Order]:
        """Get all orders using efficient GraphQL pagination."""
        all_orders = []
        cursor = None

        while True:
            connection = await self.get_orders(
                limit=batch_size,
                cursor=cursor,
                query_filter=query_filter
            )

            # Extract orders from edges
            orders = [edge.node for edge in connection.edges]
            all_orders.extend(orders)

            # Check if there are more pages
            if not connection.page_info.has_next_page:
                break

            cursor = connection.page_info.end_cursor

            # Rate limiting pause
            await asyncio.sleep(0.1)

        logger.info(f"Retrieved {len(all_orders)} orders using GraphQL")
        return all_orders

    # Health and introspection
    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to Shopify APIs."""
        try:
            # Test GraphQL with a simple shop query
            query = """
            query {
                shop {
                    id
                    name
                    email
                    domain
                    plan {
                        displayName
                    }
                }
            }
            """

            response = await self.graphql.execute_query(query, estimated_cost=1)
            shop_data = response["data"]["shop"]

            return {
                "status": "connected",
                "shop_name": shop_data["name"],
                "shop_domain": shop_data["domain"],
                "plan": shop_data["plan"]["displayName"],
                "graphql_available": True,
                "rest_available": True,  # Assume available if GraphQL works
            }

        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "graphql_available": False,
                "rest_available": False,
            }

    async def get_api_capabilities(self) -> Dict[str, Any]:
        """Get current API capabilities and feature support."""
        return {
            "graphql_features": self.capabilities.graphql_features,
            "preferred_client": "GraphQL",
            "fallback_client": "REST (deprecated)",
            "migration_status": {
                "webhooks": "REST fallback required",
                "script_tags": "Deprecated - use App Blocks",
                "discount_codes": "Partial GraphQL support",
                "transactions": "Limited GraphQL support",
            }
        }

    async def close(self) -> None:
        """Close all HTTP clients."""
        await self.graphql.close()
        if self.rest is not None:
            await self.rest.close()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
