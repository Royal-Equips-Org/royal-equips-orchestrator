"""
Real Shopify GraphQL Service - Production Implementation
Replaces mock data with actual Shopify API integration
"""

import os
import logging
import asyncio
from typing import Dict, List, Any, Optional
import httpx
from datetime import datetime, timezone, timedelta

from core.secrets.secret_provider import UnifiedSecretResolver


logger = logging.getLogger(__name__)


class ShopifyGraphQLService:
    """Production Shopify GraphQL API integration."""
    
    def __init__(self):
        self.secrets = UnifiedSecretResolver()
        self._shop_name = None
        self._access_token = None
        self._api_version = "2024-07"
        self._base_url = None
        
    async def initialize(self):
        """Initialize Shopify connection with real credentials."""
        try:
            self._shop_name = await self.secrets.get_secret('SHOPIFY_SHOP_NAME')
            self._access_token = await self.secrets.get_secret('SHOPIFY_ACCESS_TOKEN')
            
            if not self._shop_name or not self._access_token:
                raise ValueError("Shopify credentials not configured")
                
            # Remove .myshopify.com if present
            if self._shop_name.endswith('.myshopify.com'):
                self._shop_name = self._shop_name.replace('.myshopify.com', '')
                
            self._base_url = f"https://{self._shop_name}.myshopify.com/admin/api/{self._api_version}/graphql.json"
            
            # Test connection
            await self._test_connection()
            logger.info(f"Shopify GraphQL service initialized for shop: {self._shop_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Shopify service: {e}")
            raise
    
    async def _test_connection(self):
        """Test Shopify API connection."""
        query = """
        query {
            shop {
                id
                name
                myshopifyDomain
                plan {
                    displayName
                }
            }
        }
        """
        
        result = await self._execute_query(query)
        if not result or 'shop' not in result:
            raise ConnectionError("Failed to connect to Shopify API")
            
        logger.info(f"Connected to Shopify shop: {result['shop']['name']}")
    
    async def _execute_query(self, query: str, variables: Dict = None) -> Dict[str, Any]:
        """Execute GraphQL query against Shopify API."""
        headers = {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': self._access_token
        }
        
        payload = {
            'query': query,
            'variables': variables or {}
        }
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(self._base_url, json=payload, headers=headers)
            
            if response.status_code != 200:
                logger.error(f"Shopify API error: {response.status_code} - {response.text}")
                raise Exception(f"Shopify API error: {response.status_code}")
            
            result = response.json()
            
            if 'errors' in result:
                logger.error(f"GraphQL errors: {result['errors']}")
                raise Exception(f"GraphQL errors: {result['errors']}")
            
            return result.get('data', {})
    
    async def get_orders_summary(self, days: int = 30) -> Dict[str, Any]:
        """Get real orders summary for the last N days."""
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        query = """
        query($first: Int!, $createdAtMin: DateTime) {
            orders(first: $first, query: $createdAtMin) {
                edges {
                    node {
                        id
                        name
                        processedAt
                        totalPriceSet {
                            shopMoney {
                                amount
                                currencyCode
                            }
                        }
                        financialStatus
                        fulfillmentStatus
                        lineItems(first: 10) {
                            edges {
                                node {
                                    quantity
                                    product {
                                        id
                                        title
                                    }
                                }
                            }
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
        """
        
        variables = {
            'first': 250,
            'createdAtMin': start_date.isoformat()
        }
        
        result = await self._execute_query(query, variables)
        orders = result.get('orders', {}).get('edges', [])
        
        # Calculate metrics
        total_orders = len(orders)
        total_revenue = 0
        pending_orders = 0
        fulfilled_orders = 0
        
        for edge in orders:
            order = edge['node']
            total_revenue += float(order['totalPriceSet']['shopMoney']['amount'])
            
            if order['fulfillmentStatus'] == 'fulfilled':
                fulfilled_orders += 1
            elif order['fulfillmentStatus'] in ['pending', 'partial']:
                pending_orders += 1
        
        return {
            'total_orders': total_orders,
            'total_revenue': total_revenue,
            'pending_orders': pending_orders,
            'fulfilled_orders': fulfilled_orders,
            'avg_order_value': total_revenue / total_orders if total_orders > 0 else 0,
            'fulfillment_rate': (fulfilled_orders / total_orders * 100) if total_orders > 0 else 0
        }
    
    async def get_products_summary(self) -> Dict[str, Any]:
        """Get real products summary from Shopify."""
        query = """
        query($first: Int!) {
            products(first: $first) {
                edges {
                    node {
                        id
                        title
                        status
                        totalInventory
                        createdAt
                        updatedAt
                        variants(first: 1) {
                            edges {
                                node {
                                    price
                                    compareAtPrice
                                }
                            }
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                }
            }
        }
        """
        
        variables = {'first': 250}
        result = await self._execute_query(query, variables)
        products = result.get('products', {}).get('edges', [])
        
        total_products = len(products)
        active_products = 0
        total_inventory = 0
        
        for edge in products:
            product = edge['node']
            if product['status'] == 'ACTIVE':
                active_products += 1
            total_inventory += product.get('totalInventory', 0)
        
        return {
            'total_products': total_products,
            'active_products': active_products,
            'draft_products': total_products - active_products,
            'total_inventory': total_inventory,
            'avg_inventory_per_product': total_inventory / total_products if total_products > 0 else 0
        }
    
    async def get_customers_summary(self) -> Dict[str, Any]:
        """Get real customers summary from Shopify."""
        query = """
        query($first: Int!) {
            customers(first: $first) {
                edges {
                    node {
                        id
                        email
                        createdAt
                        updatedAt
                        ordersCount
                        totalSpent
                        state
                    }
                }
            }
        }
        """
        
        variables = {'first': 250}
        result = await self._execute_query(query, variables)
        customers = result.get('customers', {}).get('edges', [])
        
        total_customers = len(customers)
        repeat_customers = 0
        total_spent = 0
        
        for edge in customers:
            customer = edge['node']
            orders_count = int(customer.get('ordersCount', 0))
            if orders_count > 1:
                repeat_customers += 1
            total_spent += float(customer.get('totalSpent', 0))
        
        return {
            'total_customers': total_customers,
            'repeat_customers': repeat_customers,
            'repeat_rate': (repeat_customers / total_customers * 100) if total_customers > 0 else 0,
            'customer_lifetime_value': total_spent / total_customers if total_customers > 0 else 0,
            'total_customer_value': total_spent
        }
    
    async def get_inventory_alerts(self) -> List[Dict[str, Any]]:
        """Get real low inventory alerts."""
        query = """
        query($first: Int!) {
            products(first: $first, query: "inventory_total:<10") {
                edges {
                    node {
                        id
                        title
                        totalInventory
                        variants(first: 5) {
                            edges {
                                node {
                                    id
                                    title
                                    inventoryQuantity
                                    price
                                }
                            }
                        }
                    }
                }
            }
        }
        """
        
        variables = {'first': 50}
        result = await self._execute_query(query, variables)
        products = result.get('products', {}).get('edges', [])
        
        alerts = []
        for edge in products:
            product = edge['node']
            alerts.append({
                'product_id': product['id'],
                'title': product['title'],
                'current_inventory': product['totalInventory'],
                'alert_level': 'critical' if product['totalInventory'] < 3 else 'warning',
                'variants_affected': len(product['variants']['edges'])
            })
        
        return alerts
    
    async def create_product(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new product in Shopify."""
        mutation = """
        mutation productCreate($input: ProductInput!) {
            productCreate(input: $input) {
                product {
                    id
                    title
                    status
                    createdAt
                }
                userErrors {
                    field
                    message
                }
            }
        }
        """
        
        variables = {
            'input': {
                'title': product_data['title'],
                'bodyHtml': product_data.get('description', ''),
                'productType': product_data.get('product_type', ''),
                'vendor': product_data.get('vendor', ''),
                'tags': product_data.get('tags', []),
                'status': 'DRAFT'  # Always create as draft for safety
            }
        }
        
        result = await self._execute_query(mutation, variables)
        create_result = result.get('productCreate', {})
        
        if create_result.get('userErrors'):
            raise Exception(f"Product creation failed: {create_result['userErrors']}")
        
        return create_result.get('product', {})


# Singleton instance
_shopify_service = None

async def get_shopify_service() -> ShopifyGraphQLService:
    """Get initialized Shopify service instance."""
    global _shopify_service
    if _shopify_service is None:
        _shopify_service = ShopifyGraphQLService()
        await _shopify_service.initialize()
    return _shopify_service