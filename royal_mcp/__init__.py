"""Royal EQ MCP - The most powerful, intelligent, and secure Model Context Protocol server.

A production-ready MCP server that connects GitHub Copilot directly to:
- Shopify GraphQL API
- BigQuery project
- Supabase project
- Royal Equips Orchestrator backend

Features:
- Fully autonomous, enterprise-grade operation
- Real-time queries and code analysis
- Maximum performance, security, and self-healing capabilities
- Built-in logging, rate limiting, circuit breakers
- Auto-reconnect & retry logic for APIs
"""

__version__ = "1.0.0"
__author__ = "Royal Equips Team"
__description__ = "Enterprise-grade MCP server for life-long heavy operations"

from .server import sync_main as main

__all__ = ["main"]
