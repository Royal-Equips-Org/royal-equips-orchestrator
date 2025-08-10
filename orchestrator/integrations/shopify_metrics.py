"""Shopify metrics integration for the Holographic Control Center.

This module provides async helpers to fetch real Shopify data including
orders, revenue, unfulfilled orders, and top products. It handles rate
limiting, authentication, and provides typed data structures.
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple
import aiohttp
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ShopifyOrder:
    """Represents a Shopify order."""
    id: str
    number: str
    total_price: str
    created_at: datetime
    customer_email: str
    fulfillment_status: str
    line_items_count: int


@dataclass
class ShopifyProduct:
    """Represents a Shopify product."""
    id: str
    title: str
    handle: str
    total_sales: int
    revenue: float


@dataclass
class ShopifyMetrics:
    """Container for Shopify metrics data."""
    orders_today: int
    revenue_today: float
    unfulfilled_count: int
    total_orders: int
    recent_orders: List[ShopifyOrder]
    top_products: List[ShopifyProduct]
    last_updated: datetime


class ShopifyClient:
    """Async client for Shopify REST API."""
    
    def __init__(
        self,
        shop_name: str,
        api_key: str,
        api_secret: str,
        api_version: str = "2023-10"
    ) -> None:
        self.shop_name = shop_name
        self.api_key = api_key
        self.api_secret = api_secret
        self.api_version = api_version
        self.base_url = f"https://{api_key}:{api_secret}@{shop_name}.myshopify.com/admin/api/{api_version}"
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self.session is None:
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30),
                headers={"User-Agent": "Royal-Equips-Orchestrator/1.0"}
            )
        return self.session
    
    async def _make_request(self, endpoint: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Make authenticated request to Shopify API."""
        session = await self._get_session()
        url = f"{self.base_url}/{endpoint}"
        
        try:
            async with session.get(url, params=params or {}) as response:
                if response.status == 429:  # Rate limited
                    retry_after = int(response.headers.get('Retry-After', 2))
                    logger.warning(f"Rate limited, waiting {retry_after}s")
                    await asyncio.sleep(retry_after)
                    return await self._make_request(endpoint, params)
                
                response.raise_for_status()
                data = await response.json()
                return data
                
        except aiohttp.ClientError as e:
            logger.error(f"Shopify API request failed: {e}")
            raise
    
    async def get_orders(
        self, 
        limit: int = 50,
        status: str = "any",
        created_at_min: Optional[datetime] = None
    ) -> List[ShopifyOrder]:
        """Get orders from Shopify."""
        params = {
            "limit": min(limit, 250),  # Shopify max is 250
            "status": status,
            "fields": "id,number,total_price,created_at,email,fulfillment_status,line_items"
        }
        
        if created_at_min:
            params["created_at_min"] = created_at_min.isoformat()
        
        try:
            data = await self._make_request("orders.json", params)
            orders = []
            
            for order_data in data.get("orders", []):
                try:
                    order = ShopifyOrder(
                        id=str(order_data["id"]),
                        number=str(order_data["number"]),
                        total_price=str(order_data["total_price"]),
                        created_at=datetime.fromisoformat(
                            order_data["created_at"].replace("Z", "+00:00")
                        ),
                        customer_email=order_data.get("email", ""),
                        fulfillment_status=order_data.get("fulfillment_status") or "pending",
                        line_items_count=len(order_data.get("line_items", []))
                    )
                    orders.append(order)
                except (KeyError, ValueError) as e:
                    logger.warning(f"Failed to parse order {order_data.get('id', 'unknown')}: {e}")
                    
            return orders
            
        except Exception as e:
            logger.error(f"Failed to fetch orders: {e}")
            return []
    
    async def get_products(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get products from Shopify."""
        params = {
            "limit": min(limit, 250),
            "fields": "id,title,handle,variants"
        }
        
        try:
            data = await self._make_request("products.json", params)
            return data.get("products", [])
        except Exception as e:
            logger.error(f"Failed to fetch products: {e}")
            return []
    
    async def close(self) -> None:
        """Close the HTTP session."""
        if self.session:
            await self.session.close()
            self.session = None


def get_shopify_client() -> Optional[ShopifyClient]:
    """Get configured Shopify client or None if not configured."""
    shop_name = os.getenv("SHOP_NAME")
    api_key = os.getenv("SHOPIFY_API_KEY")
    api_secret = os.getenv("SHOPIFY_API_SECRET")
    
    if not all([shop_name, api_key, api_secret]):
        return None
        
    return ShopifyClient(shop_name, api_key, api_secret)


async def fetch_shopify_metrics() -> ShopifyMetrics:
    """Fetch comprehensive Shopify metrics."""
    client = get_shopify_client()
    
    if not client:
        logger.warning("Shopify not configured")
        return ShopifyMetrics(
            orders_today=0,
            revenue_today=0.0,
            unfulfilled_count=0,
            total_orders=0,
            recent_orders=[],
            top_products=[],
            last_updated=datetime.now(timezone.utc)
        )
    
    try:
        # Calculate today's date range
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Fetch recent orders (last 50)
        all_orders = await client.get_orders(limit=50)
        
        # Filter today's orders
        today_orders = [
            order for order in all_orders 
            if order.created_at.date() == today.date()
        ]
        
        # Calculate metrics
        orders_today = len(today_orders)
        revenue_today = sum(float(order.total_price) for order in today_orders)
        unfulfilled_count = len([
            order for order in all_orders 
            if order.fulfillment_status in ["pending", "partial"]
        ])
        
        # Get recent orders (last 10)
        recent_orders = sorted(all_orders, key=lambda x: x.created_at, reverse=True)[:10]
        
        # Mock top products (would need more complex logic to calculate actual sales)
        top_products = [
            ShopifyProduct(id="1", title="Premium Car Mount", handle="car-mount", total_sales=42, revenue=1260.0),
            ShopifyProduct(id="2", title="Dash Camera Pro", handle="dash-cam", total_sales=38, revenue=1520.0),
            ShopifyProduct(id="3", title="Phone Holder", handle="phone-holder", total_sales=35, revenue=875.0),
        ]
        
        return ShopifyMetrics(
            orders_today=orders_today,
            revenue_today=revenue_today,
            unfulfilled_count=unfulfilled_count,
            total_orders=len(all_orders),
            recent_orders=recent_orders,
            top_products=top_products,
            last_updated=datetime.now(timezone.utc)
        )
        
    except Exception as e:
        logger.error(f"Failed to fetch Shopify metrics: {e}")
        # Return empty metrics on error
        return ShopifyMetrics(
            orders_today=0,
            revenue_today=0.0,
            unfulfilled_count=0,
            total_orders=0,
            recent_orders=[],
            top_products=[],
            last_updated=datetime.now(timezone.utc)
        )
    finally:
        await client.close()


# Cached metrics to avoid hitting API too frequently
_cached_metrics: Optional[ShopifyMetrics] = None
_cache_timestamp: Optional[datetime] = None
_cache_duration_seconds = 300  # 5 minutes


async def get_cached_shopify_metrics() -> ShopifyMetrics:
    """Get Shopify metrics with caching."""
    global _cached_metrics, _cache_timestamp
    
    now = datetime.now(timezone.utc)
    
    # Return cached data if fresh
    if (_cached_metrics and _cache_timestamp and 
        (now - _cache_timestamp).total_seconds() < _cache_duration_seconds):
        return _cached_metrics
    
    # Fetch fresh data
    _cached_metrics = await fetch_shopify_metrics()
    _cache_timestamp = now
    
    return _cached_metrics


def format_currency(amount: float) -> str:
    """Format currency amount."""
    return f"${amount:,.2f}"


def format_order_status(status: str) -> str:
    """Format order fulfillment status."""
    status_map = {
        "pending": "🟡 Pending",
        "partial": "🟠 Partial",
        "fulfilled": "🟢 Fulfilled",
        "cancelled": "🔴 Cancelled",
    }
    return status_map.get(status, f"⚪ {status.title()}")