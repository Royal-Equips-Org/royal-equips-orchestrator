"""GraphQL-first Shopify connector with production-grade resilience."""

import asyncio
import logging
import os
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from decimal import Decimal

import httpx
from pydantic import BaseModel, Field

from .types import (
    Product, ProductConnection, Customer, CustomerConnection, 
    Order, OrderConnection, ProductCreatePayload, ProductUpdatePayload,
    InventoryAdjustQuantitiesPayload, MutationError
)

logger = logging.getLogger(__name__)


class ShopifyConfig(BaseModel):
    """Configuration for Shopify GraphQL client."""
    
    shop_name: str = Field(..., description="Shopify shop name")
    access_token: str = Field(..., description="Shopify access token")
    api_version: str = Field(default="2024-10", description="GraphQL API version")
    timeout: int = Field(default=30, description="Request timeout in seconds")
    max_retries: int = Field(default=3, description="Maximum retry attempts")
    rate_limit_buffer: float = Field(default=0.1, description="Rate limit buffer (10%)")
    
    @property
    def graphql_endpoint(self) -> str:
        """Get GraphQL endpoint URL."""
        return f"https://{self.shop_name}.myshopify.com/admin/api/{self.api_version}/graphql.json"


class GraphQLCostTracker:
    """Track GraphQL query costs and manage rate limiting."""
    
    def __init__(self, max_cost_per_second: int = 50):
        self.max_cost_per_second = max_cost_per_second
        self.current_cost = 0
        self.restore_rate = 50  # Points restored per second
        self.last_update = time.time()
        self.bucket_capacity = 1000
        self.current_bucket = 1000
        
    def can_execute(self, estimated_cost: int) -> bool:
        """Check if query can be executed within cost limits."""
        self._update_bucket()
        return self.current_bucket >= estimated_cost
        
    def record_cost(self, actual_cost: int, throttle_status: Optional[Dict] = None) -> None:
        """Record actual query cost and update bucket."""
        self._update_bucket()
        self.current_bucket -= actual_cost
        
        # Update from throttle status if available
        if throttle_status:
            self.current_bucket = throttle_status.get("currently_available", self.current_bucket)
            self.bucket_capacity = throttle_status.get("maximum_available", self.bucket_capacity)
            self.restore_rate = throttle_status.get("restore_rate", self.restore_rate)
    
    def _update_bucket(self) -> None:
        """Update cost bucket based on time elapsed."""
        now = time.time()
        time_elapsed = now - self.last_update
        self.last_update = now
        
        # Restore points based on time elapsed
        restored_points = int(time_elapsed * self.restore_rate)
        self.current_bucket = min(self.bucket_capacity, self.current_bucket + restored_points)
    
    async def wait_for_capacity(self, required_cost: int) -> None:
        """Wait until enough capacity is available."""
        while not self.can_execute(required_cost):
            wait_time = (required_cost - self.current_bucket) / self.restore_rate
            logger.info(f"Rate limit reached, waiting {wait_time:.2f}s for capacity")
            await asyncio.sleep(min(wait_time, 1.0))


class CircuitBreaker:
    """Circuit breaker for API resilience."""
    
    def __init__(self, failure_threshold: int = 5, timeout_seconds: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout_seconds = timeout_seconds
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        
    def can_execute(self) -> bool:
        """Check if requests can be executed."""
        if self.state == "CLOSED":
            return True
        elif self.state == "OPEN":
            if (self.last_failure_time and 
                datetime.now() - self.last_failure_time > timedelta(seconds=self.timeout_seconds)):
                self.state = "HALF_OPEN"
                return True
            return False
        else:  # HALF_OPEN
            return True
    
    def record_success(self) -> None:
        """Record successful execution."""
        self.failure_count = 0
        self.state = "CLOSED"
        
    def record_failure(self) -> None:
        """Record failed execution."""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.warning(f"Circuit breaker opened after {self.failure_count} failures")


class ShopifyGraphQLClient:
    """Production-grade Shopify GraphQL client."""
    
    def __init__(self, config: Optional[ShopifyConfig] = None):
        """Initialize the GraphQL client."""
        if config is None:
            config = ShopifyConfig(
                shop_name=os.environ["SHOPIFY_SHOP_NAME"],
                access_token=os.environ["SHOPIFY_ACCESS_TOKEN"]
            )
        
        self.config = config
        self.client = httpx.AsyncClient(timeout=self.config.timeout)
        self.cost_tracker = GraphQLCostTracker()
        self.circuit_breaker = CircuitBreaker()
        
        logger.info(f"Shopify GraphQL client initialized for shop: {self.config.shop_name}")
    
    async def execute_query(
        self, 
        query: str, 
        variables: Optional[Dict[str, Any]] = None,
        estimated_cost: int = 10
    ) -> Dict[str, Any]:
        """Execute GraphQL query with resilience patterns."""
        
        if not self.circuit_breaker.can_execute():
            raise Exception("Circuit breaker is OPEN - Shopify API temporarily unavailable")
        
        # Wait for rate limit capacity
        await self.cost_tracker.wait_for_capacity(estimated_cost)
        
        payload = {
            "query": query,
            "variables": variables or {}
        }
        
        headers = {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": self.config.access_token,
        }
        
        max_retries = self.config.max_retries
        for attempt in range(max_retries):
            try:
                response = await self.client.post(
                    self.config.graphql_endpoint,
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                
                data = response.json()
                
                # Handle GraphQL errors
                if "errors" in data:
                    logger.error(f"GraphQL errors: {data['errors']}")
                    if attempt == max_retries - 1:
                        self.circuit_breaker.record_failure()
                        raise Exception(f"GraphQL errors: {data['errors']}")
                    continue
                
                # Record cost information
                extensions = data.get("extensions", {})
                cost_info = extensions.get("cost", {})
                if cost_info:
                    actual_cost = cost_info.get("actualQueryCost", estimated_cost)
                    throttle_status = cost_info.get("throttleStatus", {})
                    self.cost_tracker.record_cost(actual_cost, throttle_status)
                    
                    logger.debug(f"Query cost: {actual_cost}, bucket: {self.cost_tracker.current_bucket}")
                
                self.circuit_breaker.record_success()
                return data
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:  # Rate limited
                    retry_after = int(e.response.headers.get("Retry-After", 1))
                    logger.warning(f"Rate limited, waiting {retry_after}s")
                    await asyncio.sleep(retry_after)
                    continue
                    
                logger.error(f"HTTP error on attempt {attempt + 1}: {e}")
                if attempt == max_retries - 1:
                    self.circuit_breaker.record_failure()
                    raise
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
                
            except httpx.RequestError as e:
                logger.error(f"Request error on attempt {attempt + 1}: {e}")
                if attempt == max_retries - 1:
                    self.circuit_breaker.record_failure()
                    raise
                await asyncio.sleep(2 ** attempt)
        
        raise Exception("Max retries exceeded")
    
    async def execute_mutation(
        self,
        mutation: str,
        variables: Optional[Dict[str, Any]] = None,
        estimated_cost: int = 10
    ) -> Dict[str, Any]:
        """Execute GraphQL mutation with additional safety."""
        
        if not mutation.strip().lower().startswith("mutation"):
            raise ValueError("Only mutation operations are allowed")
        
        return await self.execute_query(mutation, variables, estimated_cost)
    
    # Product operations
    async def get_products(
        self,
        first: int = 50,
        after: Optional[str] = None,
        query_filter: Optional[str] = None
    ) -> ProductConnection:
        """Get products with pagination."""
        
        query = """
        query GetProducts($first: Int!, $after: String, $query: String) {
            products(first: $first, after: $after, query: $query) {
                edges {
                    cursor
                    node {
                        id
                        title
                        handle
                        description
                        descriptionHtml
                        vendor
                        productType
                        status
                        tags
                        createdAt
                        updatedAt
                        publishedAt
                        variants(first: 100) {
                            edges {
                                node {
                                    id
                                    sku
                                    barcode
                                    price
                                    compareAtPrice
                                    weight
                                    weightUnit
                                    inventoryQuantity
                                    inventoryItem {
                                        id
                                    }
                                    title
                                    availableForSale
                                    createdAt
                                    updatedAt
                                }
                            }
                        }
                        images(first: 10) {
                            edges {
                                node {
                                    id
                                    url
                                    altText
                                    width
                                    height
                                }
                            }
                        }
                        seo {
                            title
                            description
                        }
                        options {
                            id
                            name
                            values
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                }
            }
        }
        """
        
        variables = {
            "first": first,
            "after": after,
            "query": query_filter
        }
        
        response = await self.execute_query(query, variables, estimated_cost=50)
        
        # Transform the GraphQL response to match our Pydantic models
        products_data = response["data"]["products"]
        
        # Transform each product node
        for edge in products_data["edges"]:
            node = edge["node"]
            
            # Convert variants connection to list
            if "variants" in node and isinstance(node["variants"], dict):
                node["variants"] = self._extract_nodes_from_connection(node["variants"])
            
            # Convert images connection to list
            if "images" in node and isinstance(node["images"], dict):
                node["images"] = self._extract_nodes_from_connection(node["images"])
        

    @staticmethod
    def _extract_nodes_from_connection(connection: dict) -> list:
        """Extracts the list of nodes from a Shopify connection dict (edges/node pattern)."""
        if not isinstance(connection, dict) or "edges" not in connection:
            return []
        return [edge["node"] for edge in connection["edges"]]
        return ProductConnection.model_validate(products_data)
    
    async def get_product_by_id(self, product_id: str) -> Optional[Product]:
        """Get a single product by ID."""
        
        query = """
        query GetProduct($id: ID!) {
            product(id: $id) {
                id
                title
                handle
                description
                descriptionHtml
                vendor
                productType
                status
                tags
                createdAt
                updatedAt
                publishedAt
                variants(first: 100) {
                    edges {
                        node {
                            id
                            sku
                            barcode
                            price
                            compareAtPrice
                            weight
                            weightUnit
                            inventoryQuantity
                            inventoryItem {
                                id
                            }
                            title
                            availableForSale
                            createdAt
                            updatedAt
                        }
                    }
                }
            }
        }
        """
        
        response = await self.execute_query(query, {"id": product_id}, estimated_cost=20)
        product_data = response["data"]["product"]
        return Product.model_validate(product_data) if product_data else None
    
    async def create_product(self, product_input: Dict[str, Any]) -> ProductCreatePayload:
        """Create a new product."""
        
        mutation = """
        mutation ProductCreate($input: ProductInput!) {
            productCreate(input: $input) {
                product {
                    id
                    title
                    handle
                    status
                    createdAt
                }
                userErrors {
                    field
                    message
                    code
                }
            }
        }
        """
        
        response = await self.execute_mutation(
            mutation, 
            {"input": product_input}, 
            estimated_cost=20
        )
        return ProductCreatePayload.model_validate(response["data"]["productCreate"])
    
    async def update_product(self, product_id: str, product_input: Dict[str, Any]) -> ProductUpdatePayload:
        """Update an existing product."""
        
        mutation = """
        mutation ProductUpdate($input: ProductInput!) {
            productUpdate(input: $input) {
                product {
                    id
                    title
                    handle
                    status
                    updatedAt
                }
                userErrors {
                    field
                    message
                    code
                }
            }
        }
        """
        
        product_input["id"] = product_id
        response = await self.execute_mutation(
            mutation,
            {"input": product_input},
            estimated_cost=20
        )
        return ProductUpdatePayload.model_validate(response["data"]["productUpdate"])
    
    # Customer operations
    async def get_customers(
        self,
        first: int = 50,
        after: Optional[str] = None,
        query_filter: Optional[str] = None
    ) -> CustomerConnection:
        """Get customers with pagination."""
        
        query = """
        query GetCustomers($first: Int!, $after: String, $query: String) {
            customers(first: $first, after: $after, query: $query) {
                edges {
                    cursor
                    node {
                        id
                        email
                        phone
                        firstName
                        lastName
                        acceptsMarketing
                        createdAt
                        updatedAt
                        totalSpent
                        ordersCount
                        averageOrderAmount
                        defaultAddress {
                            id
                            firstName
                            lastName
                            company
                            address1
                            address2
                            city
                            province
                            country
                            zip
                            phone
                        }
                        tags
                        note
                    }
                }
                pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                }
            }
        }
        """
        
        variables = {
            "first": first,
            "after": after,
            "query": query_filter
        }
        
        response = await self.execute_query(query, variables, estimated_cost=30)
        return CustomerConnection.model_validate(response["data"]["customers"])
    
    # Order operations  
    async def get_orders(
        self,
        first: int = 50,
        after: Optional[str] = None,
        query_filter: Optional[str] = None
    ) -> OrderConnection:
        """Get orders with pagination."""
        
        query = """
        query GetOrders($first: Int!, $after: String, $query: String) {
            orders(first: $first, after: $after, query: $query) {
                edges {
                    cursor
                    node {
                        id
                        name
                        orderNumber
                        email
                        phone
                        currentTotalPrice
                        currentSubtotalPrice
                        currentTotalTax
                        currentTotalDiscounts
                        currencyCode
                        financialStatus
                        fulfillmentStatus
                        createdAt
                        updatedAt
                        processedAt
                        customer {
                            id
                            email
                            firstName
                            lastName
                        }
                        shippingAddress {
                            firstName
                            lastName
                            company
                            address1
                            address2
                            city
                            province
                            country
                            zip
                            phone
                        }
                        lineItems(first: 100) {
                            edges {
                                node {
                                    id
                                    title
                                    quantity
                                    currentQuantity
                                    fulfillableQuantity
                                    originalUnitPrice
                                    discountedUnitPrice
                                    sku
                                    variantTitle
                                    product {
                                        id
                                        title
                                    }
                                    variant {
                                        id
                                        sku
                                    }
                                }
                            }
                        }
                        tags
                        note
                    }
                }
                pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                }
            }
        }
        """
        
        variables = {
            "first": first,
            "after": after,
            "query": query_filter
        }
        
        response = await self.execute_query(query, variables, estimated_cost=60)
        return OrderConnection.model_validate(response["data"]["orders"])
    
    # Inventory operations
    async def adjust_inventory_quantities(
        self,
        inventory_adjustments: List[Dict[str, Any]]
    ) -> InventoryAdjustQuantitiesPayload:
        """Adjust inventory quantities for multiple items."""
        
        mutation = """
        mutation InventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
            inventoryAdjustQuantities(input: $input) {
                inventoryAdjustments {
                    item {
                        id
                    }
                    quantityAdjustment
                }
                userErrors {
                    field
                    message
                    code
                }
            }
        }
        """
        
        response = await self.execute_mutation(
            mutation,
            {"input": {"changes": inventory_adjustments}},
            estimated_cost=30
        )
        return InventoryAdjustQuantitiesPayload.model_validate(
            response["data"]["inventoryAdjustQuantities"]
        )
    
    async def close(self) -> None:
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()