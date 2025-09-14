"""Mock MCP types and server for testing purposes."""

from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass


@dataclass
class Tool:
    """Mock MCP Tool."""
    name: str
    description: str
    inputSchema: Dict[str, Any]


@dataclass
class TextContent:
    """Mock MCP TextContent."""
    type: str
    text: str


class Server:
    """Mock MCP Server."""
    
    def __init__(self, name: str):
        self.name = name
        self._tools: List[Tool] = []
        self._tool_handlers: Dict[str, Callable] = {}
        self._list_tools_handler: Optional[Callable] = None
        self._call_tool_handler: Optional[Callable] = None
    
    def list_tools(self):
        """Decorator for list_tools handler."""
        def decorator(func: Callable):
            self._list_tools_handler = func
            return func
        return decorator
    
    def call_tool(self):
        """Decorator for call_tool handler."""
        def decorator(func: Callable):
            self._call_tool_handler = func
            return func
        return decorator
    
    async def run(self, read_stream, write_stream, init_options):
        """Mock run method."""
        pass
    
    def create_initialization_options(self):
        """Mock initialization options."""
        return {}


def stdio_server():
    """Mock stdio server context manager."""
    class MockStdioServer:
        async def __aenter__(self):
            return (None, None)  # Mock read_stream, write_stream
        
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass
    
    return MockStdioServer()