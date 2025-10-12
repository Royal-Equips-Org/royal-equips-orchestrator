"""Supabase connector for Royal EQ MCP.

Provides secure read-only access to Supabase project via RPC views
with connection pooling and comprehensive error handling.
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List

from mcp.types import TextContent, Tool
from pydantic import BaseModel, Field
from supabase import Client, create_client

logger = logging.getLogger(__name__)


class SupabaseConfig(BaseModel):
    """Configuration for Supabase connector."""

    url: str = Field(..., description="Supabase project URL")
    service_role_key: str = Field(..., description="Supabase service role key")
    timeout: int = Field(default=30, description="Request timeout in seconds")


class SupabaseConnector:
    """Enterprise-grade Supabase connector for read-only access via RPC views."""

    def __init__(self):
        """Initialize the Supabase connector."""
        self.config = SupabaseConfig(
            url=os.environ["SUPABASE_URL"],
            service_role_key=os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )

        try:
            self.client: Client = create_client(
                self.config.url, self.config.service_role_key
            )
            logger.info("Supabase connector initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise

    def get_tools(self) -> List[Tool]:
        """Get all available Supabase tools."""
        return [
            Tool(
                name="supabase_inventory_view",
                description="Query inventory data via Supabase RPC view",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "filters": {
                            "type": "object",
                            "description": "Optional filters for inventory query",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of records to return",
                            "default": 100,
                        },
                        "order_by": {
                            "type": "string",
                            "description": "Field to order results by",
                        },
                    },
                },
            ),
            Tool(
                name="supabase_orders_view",
                description="Query orders data via Supabase RPC view",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "filters": {
                            "type": "object",
                            "description": "Optional filters for orders query",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of records to return",
                            "default": 100,
                        },
                        "order_by": {
                            "type": "string",
                            "description": "Field to order results by",
                        },
                    },
                },
            ),
            Tool(
                name="supabase_customers_view",
                description="Query customers data via Supabase RPC view",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "filters": {
                            "type": "object",
                            "description": "Optional filters for customers query",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of records to return",
                            "default": 100,
                        },
                        "order_by": {
                            "type": "string",
                            "description": "Field to order results by",
                        },
                    },
                },
            ),
            Tool(
                name="supabase_analytics_query",
                description="Execute custom analytics query via Supabase RPC",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "function_name": {
                            "type": "string",
                            "description": "Name of the Supabase RPC function to call",
                        },
                        "parameters": {
                            "type": "object",
                            "description": "Parameters to pass to the RPC function",
                        },
                    },
                    "required": ["function_name"],
                },
            ),
        ]

    def _serialize_datetime(self, obj: Any) -> Any:
        """Serialize datetime objects to ISO format strings."""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {key: self._serialize_datetime(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._serialize_datetime(item) for item in obj]
        else:
            return obj

    async def handle_supabase_inventory_view(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle inventory view queries."""
        try:
            filters = arguments.get("filters", {})
            limit = arguments.get("limit", 100)
            order_by = arguments.get("order_by")

            # Build query
            query = self.client.rpc("inventory_view")

            # Apply filters if provided
            if filters:
                for key, value in filters.items():
                    query = query.filter(key, "eq", value)

            # Apply ordering
            if order_by:
                query = query.order(order_by)

            # Apply limit
            query = query.limit(limit)

            # Execute query
            logger.info(f"Executing Supabase inventory view query with limit {limit}")
            result = query.execute()

            # Serialize data
            serialized_data = self._serialize_datetime(result.data)

            response_data = {
                "data": serialized_data,
                "count": len(result.data) if result.data else 0,
                "query_type": "inventory_view",
                "filters_applied": filters,
                "limit": limit,
                "timestamp": datetime.now().isoformat(),
            }

            return [
                TextContent(
                    type="text",
                    text=f"Supabase Inventory View Result:\n{response_data}",
                )
            ]

        except Exception as e:
            logger.error(f"Error querying Supabase inventory view: {e}")
            return [
                TextContent(
                    type="text",
                    text=f"Error querying Supabase inventory view: {str(e)}",
                )
            ]

    async def handle_supabase_orders_view(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle orders view queries."""
        try:
            filters = arguments.get("filters", {})
            limit = arguments.get("limit", 100)
            order_by = arguments.get("order_by")

            # Build query
            query = self.client.rpc("orders_view")

            # Apply filters if provided
            if filters:
                for key, value in filters.items():
                    query = query.filter(key, "eq", value)

            # Apply ordering
            if order_by:
                query = query.order(order_by)

            # Apply limit
            query = query.limit(limit)

            # Execute query
            logger.info(f"Executing Supabase orders view query with limit {limit}")
            result = query.execute()

            # Serialize data
            serialized_data = self._serialize_datetime(result.data)

            response_data = {
                "data": serialized_data,
                "count": len(result.data) if result.data else 0,
                "query_type": "orders_view",
                "filters_applied": filters,
                "limit": limit,
                "timestamp": datetime.now().isoformat(),
            }

            return [
                TextContent(
                    type="text", text=f"Supabase Orders View Result:\n{response_data}"
                )
            ]

        except Exception as e:
            logger.error(f"Error querying Supabase orders view: {e}")
            return [
                TextContent(
                    type="text", text=f"Error querying Supabase orders view: {str(e)}"
                )
            ]

    async def handle_supabase_customers_view(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle customers view queries."""
        try:
            filters = arguments.get("filters", {})
            limit = arguments.get("limit", 100)
            order_by = arguments.get("order_by")

            # Build query
            query = self.client.rpc("customers_view")

            # Apply filters if provided
            if filters:
                for key, value in filters.items():
                    query = query.filter(key, "eq", value)

            # Apply ordering
            if order_by:
                query = query.order(order_by)

            # Apply limit
            query = query.limit(limit)

            # Execute query
            logger.info(f"Executing Supabase customers view query with limit {limit}")
            result = query.execute()

            # Serialize data
            serialized_data = self._serialize_datetime(result.data)

            response_data = {
                "data": serialized_data,
                "count": len(result.data) if result.data else 0,
                "query_type": "customers_view",
                "filters_applied": filters,
                "limit": limit,
                "timestamp": datetime.now().isoformat(),
            }

            return [
                TextContent(
                    type="text",
                    text=f"Supabase Customers View Result:\n{response_data}",
                )
            ]

        except Exception as e:
            logger.error(f"Error querying Supabase customers view: {e}")
            return [
                TextContent(
                    type="text",
                    text=f"Error querying Supabase customers view: {str(e)}",
                )
            ]

    async def handle_supabase_analytics_query(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle custom analytics RPC function calls."""
        try:
            function_name = arguments.get("function_name")
            parameters = arguments.get("parameters", {})

            if not function_name:
                return [
                    TextContent(type="text", text="Error: function_name is required")
                ]

            # Validate function name for security
            allowed_functions = [
                "inventory_analytics",
                "sales_analytics",
                "customer_analytics",
                "revenue_analytics",
                "performance_metrics",
                "inventory_turnover",
                "seasonal_analysis",
            ]

            if function_name not in allowed_functions:
                return [
                    TextContent(
                        type="text",
                        text=f"Error: Function '{function_name}' is not in the allowed list. Allowed functions: {allowed_functions}",
                    )
                ]

            # Execute RPC function
            logger.info(f"Executing Supabase RPC function: {function_name}")
            result = self.client.rpc(function_name, parameters).execute()

            # Serialize data
            serialized_data = self._serialize_datetime(result.data)

            response_data = {
                "data": serialized_data,
                "count": len(result.data) if result.data else 0,
                "function_name": function_name,
                "parameters": parameters,
                "timestamp": datetime.now().isoformat(),
            }

            return [
                TextContent(
                    type="text",
                    text=f"Supabase Analytics Query Result:\n{response_data}",
                )
            ]

        except Exception as e:
            logger.error(f"Error executing Supabase analytics query: {e}")
            return [
                TextContent(
                    type="text",
                    text=f"Error executing Supabase analytics query: {str(e)}",
                )
            ]

    def __del__(self):
        """Cleanup resources."""
        try:
            if hasattr(self, "client"):
                # Close any open connections if needed
                pass
        except Exception as e:
            logger.error(f"Error during Supabase connector cleanup: {e}")
