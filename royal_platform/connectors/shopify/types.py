"""Pydantic models for Shopify GraphQL API responses."""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field


# Enums
class ProductStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"
    DRAFT = "DRAFT"


class FinancialStatus(str, Enum):
    AUTHORIZED = "AUTHORIZED"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
    REFUNDED = "REFUNDED"
    VOIDED = "VOIDED"
    PENDING = "PENDING"


class FulfillmentStatus(str, Enum):
    FULFILLED = "FULFILLED"
    NULL = "NULL"
    PARTIAL = "PARTIAL"
    RESTOCKED = "RESTOCKED"
    UNFULFILLED = "UNFULFILLED"


# Base models
class ShopifyNode(BaseModel):
    """Base class for Shopify GraphQL nodes."""
    id: str
    

class ShopifyEdge(BaseModel):
    """Base class for Shopify GraphQL edges."""
    cursor: str
    node: ShopifyNode


class ShopifyConnection(BaseModel):
    """Base class for Shopify GraphQL connections."""
    edges: List[ShopifyEdge]
    page_info: "PageInfo"


class PageInfo(BaseModel):
    """GraphQL page info for pagination."""
    has_next_page: bool
    has_previous_page: bool
    start_cursor: Optional[str] = None
    end_cursor: Optional[str] = None


# Product models
class ProductVariant(ShopifyNode):
    """Product variant from GraphQL API."""
    sku: Optional[str] = None
    barcode: Optional[str] = None
    price: Decimal
    compare_at_price: Optional[Decimal] = None
    weight: Optional[float] = None
    weight_unit: Optional[str] = None
    inventory_quantity: Optional[int] = None
    inventory_item_id: Optional[str] = None
    title: Optional[str] = None
    available_for_sale: bool = True
    created_at: datetime
    updated_at: datetime


class ProductImage(ShopifyNode):
    """Product image from GraphQL API."""
    url: str
    alt_text: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None


class Product(ShopifyNode):
    """Product from GraphQL API."""
    title: str
    handle: str
    description: Optional[str] = None
    description_html: Optional[str] = None
    vendor: Optional[str] = None
    product_type: Optional[str] = None
    status: ProductStatus
    tags: List[str] = []
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    
    # Relationships
    variants: List[ProductVariant] = []
    images: List[ProductImage] = []
    
    # SEO
    seo: Optional[Dict[str, Any]] = None
    
    # Options (size, color, etc.)
    options: List[Dict[str, Any]] = []


class ProductConnection(ShopifyConnection):
    """Product connection with typed edges."""
    edges: List["ProductEdge"]


class ProductEdge(ShopifyEdge):
    """Product edge."""
    node: Product


# Customer models  
class Customer(ShopifyNode):
    """Customer from GraphQL API."""
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    accepts_marketing: bool = False
    created_at: datetime
    updated_at: datetime
    
    # Analytics
    total_spent: Decimal = Decimal("0")
    orders_count: int = 0
    average_order_amount: Optional[Decimal] = None
    
    # Addresses
    default_address: Optional[Dict[str, Any]] = None
    addresses: List[Dict[str, Any]] = []
    
    # Tags and notes
    tags: List[str] = []
    note: Optional[str] = None


class CustomerConnection(ShopifyConnection):
    """Customer connection with typed edges."""
    edges: List["CustomerEdge"]


class CustomerEdge(ShopifyEdge):
    """Customer edge."""
    node: Customer


# Order models
class OrderLineItem(ShopifyNode):
    """Order line item from GraphQL API."""
    title: str
    quantity: int
    current_quantity: int
    fulfillable_quantity: int
    
    # Pricing
    original_unit_price: Decimal
    discounted_unit_price: Decimal
    original_total_set: Dict[str, Any]
    discounted_total_set: Dict[str, Any]
    
    # Product references
    product: Optional[Product] = None
    variant: Optional[ProductVariant] = None
    sku: Optional[str] = None
    variant_title: Optional[str] = None
    
    # Fulfillment
    fulfillment_service: Optional[str] = None
    fulfillment_status: Optional[FulfillmentStatus] = None


class ShippingAddress(BaseModel):
    """Shipping address for orders."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company: Optional[str] = None
    address1: Optional[str] = None
    address2: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    country: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None


class Order(ShopifyNode):
    """Order from GraphQL API."""
    name: str  # Order number like #1001
    order_number: int
    email: Optional[str] = None
    phone: Optional[str] = None
    
    # Financial
    current_total_price: Decimal
    current_subtotal_price: Decimal
    current_total_tax: Decimal
    current_total_discounts: Decimal
    currency_code: str = "EUR"
    
    # Status
    financial_status: FinancialStatus
    fulfillment_status: FulfillmentStatus
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    processed_at: Optional[datetime] = None
    
    # Customer and shipping
    customer: Optional[Customer] = None
    shipping_address: Optional[ShippingAddress] = None
    billing_address: Optional[ShippingAddress] = None
    
    # Line items
    line_items: List[OrderLineItem] = []
    
    # Tags and notes
    tags: List[str] = []
    note: Optional[str] = None
    
    # Risk assessment
    risks: List[Dict[str, Any]] = []
    
    # Fulfillments
    fulfillments: List[Dict[str, Any]] = []


class OrderConnection(ShopifyConnection):
    """Order connection with typed edges."""  
    edges: List["OrderEdge"]


class OrderEdge(ShopifyEdge):
    """Order edge."""
    node: Order


# Inventory models
class InventoryLevel(BaseModel):
    """Inventory level from GraphQL API."""
    available: int
    location: Dict[str, Any]  # Location details
    updated_at: datetime


class InventoryItem(ShopifyNode):
    """Inventory item from GraphQL API."""
    sku: Optional[str] = None
    tracked: bool = True
    country_code_of_origin: Optional[str] = None
    harmonized_system_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Cost and measurement
    cost: Optional[Decimal] = None
    unit_cost: Optional[Dict[str, Any]] = None
    measurement: Optional[Dict[str, Any]] = None
    
    # Inventory levels across locations
    inventory_levels: List[InventoryLevel] = []


# Webhook models
class WebhookPayload(BaseModel):
    """Base webhook payload."""
    id: str
    created_at: datetime
    updated_at: datetime
    

class ProductWebhookPayload(WebhookPayload):
    """Product webhook payload."""
    title: str
    handle: str
    status: str
    vendor: Optional[str] = None
    product_type: Optional[str] = None
    tags: str = ""  # Comma-separated string
    variants: List[Dict[str, Any]] = []


class OrderWebhookPayload(WebhookPayload):
    """Order webhook payload."""
    name: str
    order_number: int
    email: Optional[str] = None
    financial_status: str
    fulfillment_status: Optional[str] = None
    currency: str = "EUR"
    current_total_price: str  # String representation of decimal
    line_items: List[Dict[str, Any]] = []
    customer: Optional[Dict[str, Any]] = None


# Mutation response models
class MutationError(BaseModel):
    """GraphQL mutation error."""
    field: Optional[List[str]] = None
    message: str
    code: Optional[str] = None


class ProductCreatePayload(BaseModel):
    """Product create mutation response."""
    product: Optional[Product] = None
    user_errors: List[MutationError] = []


class ProductUpdatePayload(BaseModel):
    """Product update mutation response."""
    product: Optional[Product] = None  
    user_errors: List[MutationError] = []


class InventoryAdjustQuantitiesPayload(BaseModel):
    """Inventory adjust quantities mutation response."""
    inventory_adjustments: List[Dict[str, Any]] = []
    user_errors: List[MutationError] = []


# Update forward references