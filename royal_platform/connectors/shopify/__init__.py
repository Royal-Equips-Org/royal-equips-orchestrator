"""Shopify integration components."""

from .client import ShopifyClient
from .graphql_client import ShopifyGraphQLClient, ShopifyConfig
from .rest_client import ShopifyRESTClient, ShopifyRESTConfig
from .types import (
    Product, ProductVariant, Customer, Order,
    ProductConnection, CustomerConnection, OrderConnection,
    ProductCreatePayload, ProductUpdatePayload, InventoryAdjustQuantitiesPayload,
    ProductStatus, FinancialStatus, FulfillmentStatus
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