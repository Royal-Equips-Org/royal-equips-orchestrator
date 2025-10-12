"""Shopify integration components."""

from .client import ShopifyClient
from .graphql_client import ShopifyConfig, ShopifyGraphQLClient
from .rest_client import ShopifyRESTClient, ShopifyRESTConfig
from .types import (
    Customer,
    CustomerConnection,
    FinancialStatus,
    FulfillmentStatus,
    InventoryAdjustQuantitiesPayload,
    Order,
    OrderConnection,
    Product,
    ProductConnection,
    ProductCreatePayload,
    ProductStatus,
    ProductUpdatePayload,
    ProductVariant,
)

__all__ = [
    # Main client
    "ShopifyClient",

    # Specialized clients
    "ShopifyGraphQLClient",
    "ShopifyRESTClient",

    # Configuration
    "ShopifyConfig",
    "ShopifyRESTConfig",

    # Core types
    "Product",
    "ProductVariant",
    "Customer",
    "Order",

    # Connection types
    "ProductConnection",
    "CustomerConnection",
    "OrderConnection",

    # Mutation response types
    "ProductCreatePayload",
    "ProductUpdatePayload",
    "InventoryAdjustQuantitiesPayload",

    # Enums
    "ProductStatus",
    "FinancialStatus",
    "FulfillmentStatus",
]
