"""Shopify GraphQL connector for Royal EQ MCP.

Provides secure read and controlled write access to Shopify GraphQL API
with built-in rate limiting, circuit breakers, and retry logic.
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from mcp.types import TextContent, Tool
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ShopifyConfig(BaseModel):
    """Configuration for Shopify GraphQL connector."""

    endpoint: str = Field(..., description="Shopify GraphQL endpoint URL")
    token: str = Field(..., description="Shopify access token")
    rate_limit: int = Field(default=40, description="Max requests per minute")
    timeout: int = Field(default=30, description="Request timeout in seconds")


class CircuitBreaker:
    """Circuit breaker pattern for API resilience."""

    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN

    def can_execute(self) -> bool:
        """Check if execution is allowed."""
        if self.state == "CLOSED":
            return True
        elif self.state == "OPEN":
            if (
                self.last_failure_time
                and datetime.now() - self.last_failure_time
                > timedelta(seconds=self.timeout)
            ):
                self.state = "HALF_OPEN"
                return True
            return False
        else:  # HALF_OPEN
            return True

    def record_success(self) -> None:
        """Record a successful execution."""
        self.failure_count = 0
        self.state = "CLOSED"

    def record_failure(self) -> None:
        """Record a failed execution."""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"


class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, max_tokens: int, refill_rate: float):
        self.max_tokens = max_tokens
        self.tokens = max_tokens
        self.refill_rate = refill_rate
        self.last_refill = datetime.now()

    async def acquire(self) -> bool:
        """Acquire a token if available."""
        now = datetime.now()
        time_passed = (now - self.last_refill).total_seconds()
        self.tokens = min(self.max_tokens, self.tokens + time_passed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


class ShopifyConnector:
    """Enterprise-grade Shopify GraphQL connector with self-healing capabilities."""

    def __init__(self):
        """Initialize the Shopify connector."""
        self.config = ShopifyConfig(
            endpoint=os.environ["SHOPIFY_GRAPHQL_ENDPOINT"],
            token=os.environ["SHOPIFY_GRAPHQL_TOKEN"],
        )
        self.client = httpx.AsyncClient(timeout=self.config.timeout)
        self.circuit_breaker = CircuitBreaker()
        self.rate_limiter = RateLimiter(
            max_tokens=self.config.rate_limit,
            refill_rate=self.config.rate_limit / 60.0,  # per second
        )

        logger.info("Shopify connector initialized")

    def get_tools(self) -> List[Tool]:
        """Get all available Shopify tools."""
        return [
            Tool(
                name="shopify_query_products",
                description="Query Shopify products with GraphQL",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "GraphQL query for products",
                        },
                        "variables": {
                            "type": "object",
                            "description": "GraphQL variables",
                        },
                    },
                    "required": ["query"],
                },
            ),
            Tool(
                name="shopify_query_orders",
                description="Query Shopify orders with GraphQL",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "GraphQL query for orders",
                        },
                        "variables": {
                            "type": "object",
                            "description": "GraphQL variables",
                        },
                    },
                    "required": ["query"],
                },
            ),
            Tool(
                name="shopify_query_customers",
                description="Query Shopify customers with GraphQL",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "GraphQL query for customers",
                        },
                        "variables": {
                            "type": "object",
                            "description": "GraphQL variables",
                        },
                    },
                    "required": ["query"],
                },
            ),
            Tool(
                name="shopify_mutation",
                description="Execute Shopify GraphQL mutation (write operation)",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "mutation": {
                            "type": "string",
                            "description": "GraphQL mutation",
                        },
                        "variables": {
                            "type": "object",
                            "description": "GraphQL variables",
                        },
                    },
                    "required": ["mutation"],
                },
            ),
        ]

    async def _execute_graphql(
        self, query: str, variables: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute GraphQL query/mutation with resilience patterns."""
        if not self.circuit_breaker.can_execute():
            raise Exception(
                "Circuit breaker is OPEN - Shopify API temporarily unavailable"
            )

        if not await self.rate_limiter.acquire():
            await asyncio.sleep(1)  # Wait for rate limit
            if not await self.rate_limiter.acquire():
                raise Exception("Rate limit exceeded for Shopify API")

        payload = {"query": query, "variables": variables or {}}

        headers = {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": self.config.token,
        }

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = await self.client.post(
                    self.config.endpoint, json=payload, headers=headers
                )
                response.raise_for_status()

                data = response.json()

                if "errors" in data:
                    logger.error(f"GraphQL errors: {data['errors']}")
                    if attempt == max_retries - 1:
                        self.circuit_breaker.record_failure()
                        raise Exception(f"GraphQL errors: {data['errors']}")
                    continue

                self.circuit_breaker.record_success()
                return data

            except httpx.HTTPError as e:
                logger.error(f"HTTP error on attempt {attempt + 1}: {e}")
                if attempt == max_retries - 1:
                    self.circuit_breaker.record_failure()
                    raise
                await asyncio.sleep(2**attempt)  # Exponential backoff

        raise Exception("Max retries exceeded")

    async def handle_shopify_query_products(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle product queries."""
        try:
            query = arguments.get("query")
            variables = arguments.get("variables", {})

            result = await self._execute_graphql(query, variables)

            return [
                TextContent(
                    type="text", text=f"Shopify Products Query Result:\n{result}"
                )
            ]

        except Exception as e:
            logger.error(f"Error querying Shopify products: {e}")
            return [
                TextContent(
                    type="text", text=f"Error querying Shopify products: {str(e)}"
                )
            ]

    async def handle_shopify_query_orders(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle order queries."""
        try:
            query = arguments.get("query")
            variables = arguments.get("variables", {})

            result = await self._execute_graphql(query, variables)

            return [
                TextContent(type="text", text=f"Shopify Orders Query Result:\n{result}")
            ]

        except Exception as e:
            logger.error(f"Error querying Shopify orders: {e}")
            return [
                TextContent(
                    type="text", text=f"Error querying Shopify orders: {str(e)}"
                )
            ]

    async def handle_shopify_query_customers(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle customer queries."""
        try:
            query = arguments.get("query")
            variables = arguments.get("variables", {})

            result = await self._execute_graphql(query, variables)

            return [
                TextContent(
                    type="text", text=f"Shopify Customers Query Result:\n{result}"
                )
            ]

        except Exception as e:
            logger.error(f"Error querying Shopify customers: {e}")
            return [
                TextContent(
                    type="text", text=f"Error querying Shopify customers: {str(e)}"
                )
            ]

    async def handle_shopify_mutation(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle GraphQL mutations (write operations)."""
        try:
            mutation = arguments.get("mutation")
            variables = arguments.get("variables", {})

            # Additional safety check for mutations
            if not mutation.strip().lower().startswith("mutation"):
                raise Exception("Only mutation operations are allowed for write access")

            result = await self._execute_graphql(mutation, variables)

            return [
                TextContent(type="text", text=f"Shopify Mutation Result:\n{result}")
            ]

        except Exception as e:
            logger.error(f"Error executing Shopify mutation: {e}")
            return [
                TextContent(
                    type="text", text=f"Error executing Shopify mutation: {str(e)}"
                )
            ]

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.client.aclose()
