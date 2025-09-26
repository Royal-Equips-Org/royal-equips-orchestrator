"""Production database models for Royal Equips Platform."""

from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
import uuid

from sqlalchemy import (
    Column, String, Integer, DateTime, Text, Boolean, 
    Numeric, JSON, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base


# Enums
class ProductStatus(str, Enum):
    ACTIVE = "active"
    DRAFT = "draft"
    ARCHIVED = "archived"


class OrderStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class WebhookStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"


# Core Models
class Product(Base):
    """Products table with comprehensive tracking."""
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shopify_id = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default=ProductStatus.DRAFT)
    vendor = Column(String(100))
    product_type = Column(String(100))
    tags = Column(Text)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    version = Column(Integer, default=1)
    
    # SEO and content
    handle = Column(String(255), unique=True)
    body_html = Column(Text)
    meta_title = Column(String(255))
    meta_description = Column(Text)
    
    # Relationships
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('ix_products_shopify_id', 'shopify_id'),
        Index('ix_products_updated_at', 'updated_at'),
        Index('ix_products_status', 'status'),
    )


class ProductVariant(Base):
    """Product variants with inventory tracking."""
    __tablename__ = "product_variants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    shopify_id = Column(String(50), unique=True, nullable=False, index=True)
    sku = Column(String(100), unique=True)
    barcode = Column(String(100))
    
    # Pricing
    price = Column(Numeric(10, 2), nullable=False)
    compare_at_price = Column(Numeric(10, 2))
    cost = Column(Numeric(10, 2))
    
    # Physical attributes
    weight = Column(Numeric(8, 2))
    weight_unit = Column(String(10), default="g")
    
    # Inventory
    inventory_item_id = Column(String(50), index=True)
    inventory_quantity = Column(Integer, default=0)
    inventory_policy = Column(String(20), default="deny")
    
    # Options (color, size, etc.)
    option1 = Column(String(100))
    option2 = Column(String(100))
    option3 = Column(String(100))
    
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="variants")
    
    __table_args__ = (
        Index('ix_variants_shopify_id', 'shopify_id'),
        Index('ix_variants_sku', 'sku'),
        Index('ix_variants_inventory_item_id', 'inventory_item_id'),
    )


class InventoryLevel(Base):
    """Inventory levels across locations."""
    __tablename__ = "inventory_levels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location_id = Column(String(50), nullable=False, index=True)
    inventory_item_id = Column(String(50), nullable=False, index=True)
    available = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    source = Column(String(50), default="shopify")
    
    __table_args__ = (
        UniqueConstraint('location_id', 'inventory_item_id'),
        Index('ix_inventory_levels_location_item', 'location_id', 'inventory_item_id'),
    )


class Customer(Base):
    """Customer information and segmentation."""
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shopify_id = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, index=True)
    phone = Column(String(50))
    
    # Personal info
    first_name = Column(String(100))
    last_name = Column(String(100))
    accepts_marketing = Column(Boolean, default=False)
    
    # Segmentation
    tags = Column(Text)
    total_spent = Column(Numeric(10, 2), default=0)
    orders_count = Column(Integer, default=0)
    
    # Analytics
    lifetime_value = Column(Numeric(10, 2), default=0)
    avg_order_value = Column(Numeric(10, 2), default=0)
    last_order_date = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    orders = relationship("Order", back_populates="customer")
    
    __table_args__ = (
        Index('ix_customers_shopify_id', 'shopify_id'),
        Index('ix_customers_email', 'email'),
        Index('ix_customers_total_spent', 'total_spent'),
    )


class Order(Base):
    """Orders with comprehensive tracking."""
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shopify_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(50), nullable=False)  # Order number like #1001
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"))
    
    # Financial
    currency = Column(String(3), default="EUR")
    total_price = Column(Numeric(10, 2), nullable=False)
    subtotal_price = Column(Numeric(10, 2), nullable=False)
    total_tax = Column(Numeric(10, 2), default=0)
    total_discounts = Column(Numeric(10, 2), default=0)
    
    # Status
    financial_status = Column(String(20), nullable=False)
    fulfillment_status = Column(String(20))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    processed_at = Column(DateTime(timezone=True))
    
    # Customer info snapshot
    email = Column(String(255))
    phone = Column(String(50))
    
    # Relationships
    customer = relationship("Customer", back_populates="orders")
    line_items = relationship("OrderLineItem", back_populates="order", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('ix_orders_shopify_id', 'shopify_id'),
        Index('ix_orders_created_at', 'created_at'),
        Index('ix_orders_financial_status', 'financial_status'),
        Index('ix_orders_customer_id', 'customer_id'),
    )


class OrderLineItem(Base):
    """Order line items with product details."""
    __tablename__ = "order_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    shopify_line_id = Column(String(50), nullable=False, index=True)
    
    # Product references (nullable for deleted products)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    variant_id = Column(UUID(as_uuid=True), ForeignKey("product_variants.id"))
    
    # Line item details
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    total_discount = Column(Numeric(10, 2), default=0)
    
    # Product snapshot (in case product is deleted)
    title = Column(String(255))
    variant_title = Column(String(255))
    sku = Column(String(100))
    
    # Relationships
    order = relationship("Order", back_populates="line_items")
    
    __table_args__ = (
        Index('ix_line_items_order_id', 'order_id'),
        Index('ix_line_items_shopify_line_id', 'shopify_line_id'),
        Index('ix_line_items_variant_id', 'variant_id'),
    )


class WebhookOutbox(Base):
    """Webhook events processing queue."""
    __tablename__ = "webhook_outbox"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic = Column(String(100), nullable=False, index=True)
    shopify_event_id = Column(String(100), unique=True, nullable=False, index=True)
    payload = Column(JSONB, nullable=False)
    
    # Processing
    status = Column(String(20), default=WebhookStatus.PENDING, index=True)
    received_at = Column(DateTime(timezone=True), default=func.now())
    processed_at = Column(DateTime(timezone=True))
    retry_count = Column(Integer, default=0)
    error_message = Column(Text)
    
    __table_args__ = (
        Index('ix_webhook_outbox_topic', 'topic'),
        Index('ix_webhook_outbox_status', 'status'),
        Index('ix_webhook_outbox_received_at', 'received_at'),
    )


class AgentMessage(Base):
    """Inter-agent message bus."""
    __tablename__ = "agent_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_agent = Column(String(100), nullable=False, index=True)
    to_agent = Column(String(100), nullable=False, index=True)
    topic = Column(String(100), nullable=False, index=True)
    
    # Message content
    payload = Column(JSONB, nullable=False)
    priority = Column(Integer, default=5)  # 1=highest, 10=lowest
    
    # Processing
    status = Column(String(20), default="pending", index=True)
    created_at = Column(DateTime(timezone=True), default=func.now())
    processed_at = Column(DateTime(timezone=True))
    retry_count = Column(Integer, default=0)
    
    __table_args__ = (
        Index('ix_agent_messages_from_to', 'from_agent', 'to_agent'),
        Index('ix_agent_messages_topic', 'topic'),
        Index('ix_agent_messages_status_priority', 'status', 'priority'),
    )


class ResearchHistory(Base):
    """Product research findings and trends."""
    __tablename__ = "research_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_keyword = Column(String(255), nullable=False, index=True)
    source = Column(String(50), nullable=False)  # 'google_trends', 'tiktok', 'amazon'
    
    # Research data
    trend_score = Column(Numeric(5, 2))
    competition_score = Column(Numeric(5, 2))
    profit_potential = Column(Numeric(10, 2))
    priority_score = Column(Numeric(5, 2))
    
    # Raw data
    raw_data = Column(JSONB)
    
    # Metadata
    researched_at = Column(DateTime(timezone=True), default=func.now())
    agent_version = Column(String(20))
    
    __table_args__ = (
        Index('ix_research_keyword', 'product_keyword'),
        Index('ix_research_source', 'source'),
        Index('ix_research_priority', 'priority_score'),
        Index('ix_research_date', 'researched_at'),
    )


class AgentRun(Base):
    """Agent execution tracking."""
    __tablename__ = "agent_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_name = Column(String(100), nullable=False, index=True)
    status = Column(String(20), default=AgentStatus.ACTIVE, index=True)
    
    # Execution details
    started_at = Column(DateTime(timezone=True), default=func.now())
    completed_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    
    # Results
    actions_taken = Column(Integer, default=0)
    items_processed = Column(Integer, default=0)
    errors_count = Column(Integer, default=0)
    
    # Logs and metadata
    logs = Column(JSONB)
    agent_metadata = Column(JSONB)  # Renamed to avoid SQLAlchemy conflict
    error_details = Column(Text)
    
    __table_args__ = (
        Index('ix_agent_runs_agent_status', 'agent_name', 'status'),
        Index('ix_agent_runs_started_at', 'started_at'),
    )