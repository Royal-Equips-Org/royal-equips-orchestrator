"""Main MCP server implementation for Royal EQ MCP.

This module provides the core MCP server with auto-registration of all connectors
and comprehensive error handling, logging, and performance monitoring.
"""

import asyncio
import logging
import os
import sys
from typing import Any, Dict, List, Optional

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool

from .connectors.bigquery import BigQueryConnector
from .connectors.orchestrator import OrchestratorConnector
from .connectors.repo import RepoConnector
from .connectors.shopify import ShopifyConnector
from .connectors.supabase import SupabaseConnector

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stderr),
        (
            logging.FileHandler("royal_mcp.log")
            if os.environ.get("MCP_LOG_FILE")
            else logging.NullHandler()
        ),
    ],
)

logger = logging.getLogger("royal_mcp")


class RoyalMCPServer:
    """Enterprise-grade MCP server with self-healing capabilities."""

    def __init__(self) -> None:
        """Initialize the Royal MCP server with all connectors."""
        self.server = Server("royal-eq-mcp")
        self.connectors: Dict[str, Any] = {}
        self._initialize_connectors()
        self._register_tools()

    def _initialize_connectors(self) -> None:
        """Initialize all data connectors with error handling."""
        connector_classes = {
            "shopify": ShopifyConnector,
            "bigquery": BigQueryConnector,
            "supabase": SupabaseConnector,
            "repo": RepoConnector,
            "orchestrator": OrchestratorConnector,
        }

        for name, connector_class in connector_classes.items():
            try:
                self.connectors[name] = connector_class()
                logger.info(f"Successfully initialized {name} connector")
            except Exception as e:
                logger.error(f"Failed to initialize {name} connector: {e}")
                # Continue with other connectors even if one fails

    def _register_tools(self) -> None:
        """Auto-register all MCP tools from connectors."""
        all_tools = []
        tool_handlers = {}

        for connector_name, connector in self.connectors.items():
            if hasattr(connector, "get_tools"):
                tools = connector.get_tools()
                all_tools.extend(tools)

                for tool in tools:
                    tool_name = tool.name
                    if hasattr(connector, f"handle_{tool_name}"):
                        handler = getattr(connector, f"handle_{tool_name}")
                        tool_handlers[tool_name] = handler
                        logger.info(
                            f"Registered tool: {tool_name} from {connector_name}"
                        )

        # Register the list_tools handler to return all tools
        @self.server.list_tools()
        async def list_available_tools() -> List[Tool]:
            return all_tools

        # Register the call_tool handler to route tool calls
        @self.server.call_tool()
        async def handle_tool_call(
            name: str, arguments: Optional[Dict[str, Any]] = None
        ) -> List[Any]:
            if name in tool_handlers:
                return await tool_handlers[name](arguments or {})
            else:
                raise ValueError(f"Unknown tool: {name}")

    async def run(self) -> None:
        """Run the MCP server with stdio transport."""
        logger.info("Starting Royal EQ MCP server...")
        try:
            async with stdio_server() as (read_stream, write_stream):
                await self.server.run(
                    read_stream,
                    write_stream,
                    self.server.create_initialization_options(),
                )
        except Exception as e:
            logger.error(f"Server error: {e}")
            raise


def validate_environment() -> bool:
    """Validate that all required environment variables are set."""
    required_vars = [
        "SHOPIFY_GRAPHQL_ENDPOINT",
        "SHOPIFY_GRAPHQL_TOKEN",
        "BIGQUERY_PROJECT_ID",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "ORCHESTRATOR_BASE_URL",
        "ORCHESTRATOR_HMAC_KEY",
        "REPO_ROOT",
    ]

    missing_vars = [var for var in required_vars if not os.environ.get(var)]

    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        return False

    logger.info("All required environment variables are set")
    return True


async def main() -> None:
    """Main entry point for the Royal EQ MCP server."""
    if not validate_environment():
        sys.exit(1)

    server = RoyalMCPServer()
    await server.run()


def sync_main() -> None:
    """Synchronous wrapper for the main function."""
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server shutdown requested")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    sync_main()
