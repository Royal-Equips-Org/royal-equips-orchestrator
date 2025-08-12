"""Orchestrator connector for Royal EQ MCP.

Provides secure access to the Royal Equips Orchestrator backend with
HMAC verification for write operations and comprehensive health monitoring.
"""

import asyncio
import hashlib
import hmac
import json
import logging
import os
from typing import Any, Dict, List, Optional
from datetime import datetime

import httpx
from mcp.types import Tool, TextContent
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class OrchestratorConfig(BaseModel):
    """Configuration for Orchestrator connector."""
    base_url: str = Field(..., description="Orchestrator backend base URL")
    hmac_key: str = Field(..., description="HMAC key for write operation verification")
    timeout: int = Field(default=30, description="Request timeout in seconds")
    max_retries: int = Field(default=3, description="Maximum request retries")


class HMACVerifier:
    """HMAC signature generator and verifier for secure operations."""
    
    def __init__(self, secret_key: str):
        self.secret_key = secret_key.encode('utf-8')
    
    def generate_signature(self, payload: str, timestamp: str) -> str:
        """Generate HMAC signature for payload."""
        message = f"{timestamp}:{payload}"
        signature = hmac.new(
            self.secret_key,
            message.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    def verify_signature(self, payload: str, timestamp: str, signature: str) -> bool:
        """Verify HMAC signature."""
        expected_signature = self.generate_signature(payload, timestamp)
        return hmac.compare_digest(expected_signature, signature)


class OrchestratorConnector:
    """Enterprise-grade Orchestrator connector with HMAC security."""
    
    def __init__(self):
        """Initialize the Orchestrator connector."""
        self.config = OrchestratorConfig(
            base_url=os.environ["ORCHESTRATOR_BASE_URL"].rstrip('/'),
            hmac_key=os.environ["ORCHESTRATOR_HMAC_KEY"]
        )
        
        self.client = httpx.AsyncClient(
            timeout=self.config.timeout,
            headers={
                "User-Agent": "Royal-EQ-MCP/1.0",
                "Content-Type": "application/json"
            }
        )
        
        self.hmac_verifier = HMACVerifier(self.config.hmac_key)
        
        logger.info(f"Orchestrator connector initialized for: {self.config.base_url}")
    
    def get_tools(self) -> List[Tool]:
        """Get all available Orchestrator tools."""
        return [
            Tool(
                name="orchestrator_health",
                description="Check Orchestrator backend health and status",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "detailed": {
                            "type": "boolean",
                            "description": "Whether to return detailed health information",
                            "default": False
                        }
                    }
                }
            ),
            Tool(
                name="orchestrator_agent_status",
                description="Get status of all orchestrator agents",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "agent_id": {
                            "type": "string",
                            "description": "Optional specific agent ID to check"
                        }
                    }
                }
            ),
            Tool(
                name="orchestrator_run_agent",
                description="Execute an orchestrator agent action (requires HMAC verification)",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "agent_id": {
                            "type": "string",
                            "description": "Agent ID to execute"
                        },
                        "action": {
                            "type": "string",
                            "description": "Action to perform"
                        },
                        "parameters": {
                            "type": "object",
                            "description": "Action parameters"
                        }
                    },
                    "required": ["agent_id", "action"]
                }
            ),
            Tool(
                name="orchestrator_metrics",
                description="Get orchestrator performance metrics",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "metric_type": {
                            "type": "string",
                            "enum": ["performance", "system", "agents", "all"],
                            "description": "Type of metrics to retrieve",
                            "default": "all"
                        },
                        "time_range": {
                            "type": "string",
                            "enum": ["1h", "24h", "7d", "30d"],
                            "description": "Time range for metrics",
                            "default": "1h"
                        }
                    }
                }
            ),
            Tool(
                name="orchestrator_logs",
                description="Retrieve orchestrator system logs",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "level": {
                            "type": "string",
                            "enum": ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
                            "description": "Minimum log level to retrieve",
                            "default": "INFO"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of log entries",
                            "default": 100
                        },
                        "component": {
                            "type": "string",
                            "description": "Optional component to filter logs"
                        }
                    }
                }
            )
        ]
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        require_hmac: bool = False
    ) -> Dict[str, Any]:
        """Make HTTP request with optional HMAC verification."""
        url = f"{self.config.base_url}{endpoint}"
        headers = {}
        
        if require_hmac and data:
            # Generate HMAC signature for write operations
            timestamp = str(int(datetime.now().timestamp()))
            payload = json.dumps(data, sort_keys=True, separators=(',', ':'))
            signature = self.hmac_verifier.generate_signature(payload, timestamp)
            
            headers.update({
                "X-Timestamp": timestamp,
                "X-Signature": signature,
                "X-Auth-Type": "HMAC-SHA256"
            })
        
        # Retry logic
        for attempt in range(self.config.max_retries):
            try:
                if method.upper() == "GET":
                    response = await self.client.get(url, headers=headers)
                elif method.upper() == "POST":
                    response = await self.client.post(url, json=data, headers=headers)
                elif method.upper() == "PUT":
                    response = await self.client.put(url, json=data, headers=headers)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                response.raise_for_status()
                return response.json()
                
            except httpx.HTTPError as e:
                logger.error(f"HTTP error on attempt {attempt + 1}: {e}")
                if attempt == self.config.max_retries - 1:
                    raise
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        raise Exception("Max retries exceeded")
    
    async def handle_orchestrator_health(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """Handle health check requests."""
        try:
            detailed = arguments.get("detailed", False)
            
            # Try multiple health endpoints
            endpoints_to_check = ["/health", "/healthz", "/api/health"]
            
            for endpoint in endpoints_to_check:
                try:
                    result = await self._make_request("GET", endpoint)
                    
                    if detailed:
                        # Get additional system information
                        try:
                            metrics = await self._make_request("GET", "/metrics")
                            result["system_metrics"] = metrics
                        except Exception:
                            pass  # Metrics endpoint might not be available
                    
                    response_data = {
                        "status": "healthy",
                        "endpoint": endpoint,
                        "timestamp": datetime.now().isoformat(),
                        "details": result
                    }
                    
                    return [TextContent(
                        type="text",
                        text=f"Orchestrator Health Status:\n{response_data}"
                    )]
                
                except Exception:
                    continue  # Try next endpoint
            
            # If all endpoints failed
            return [TextContent(
                type="text",
                text="Orchestrator Health Status: UNHEALTHY - All health endpoints failed"
            )]
            
        except Exception as e:
            logger.error(f"Error checking orchestrator health: {e}")
            return [TextContent(
                type="text",
                text=f"Error checking orchestrator health: {str(e)}"
            )]
    
    async def handle_orchestrator_agent_status(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """Handle agent status requests."""
        try:
            agent_id = arguments.get("agent_id")
            
            if agent_id:
                endpoint = f"/api/agents/{agent_id}/status"
            else:
                endpoint = "/api/agents/status"
            
            result = await self._make_request("GET", endpoint)
            
            response_data = {
                "timestamp": datetime.now().isoformat(),
                "agent_status": result
            }
            
            return [TextContent(
                type="text",
                text=f"Orchestrator Agent Status:\n{response_data}"
            )]
            
        except Exception as e:
            logger.error(f"Error getting orchestrator agent status: {e}")
            return [TextContent(
                type="text",
                text=f"Error getting orchestrator agent status: {str(e)}"
            )]
    
    async def handle_orchestrator_run_agent(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """Handle agent execution requests with HMAC verification."""
        try:
            agent_id = arguments.get("agent_id")
            action = arguments.get("action")
            parameters = arguments.get("parameters", {})
            
            if not agent_id or not action:
                return [TextContent(
                    type="text",
                    text="Error: agent_id and action are required"
                )]
            
            # Prepare request payload
            payload = {
                "agent_id": agent_id,
                "action": action,
                "parameters": parameters,
                "timestamp": datetime.now().isoformat(),
                "source": "royal-eq-mcp"
            }
            
            # Make secured request with HMAC verification
            endpoint = f"/api/agents/{agent_id}/run"
            result = await self._make_request("POST", endpoint, payload, require_hmac=True)
            
            response_data = {
                "agent_id": agent_id,
                "action": action,
                "result": result,
                "timestamp": datetime.now().isoformat()
            }
            
            return [TextContent(
                type="text",
                text=f"Orchestrator Agent Execution Result:\n{response_data}"
            )]
            
        except Exception as e:
            logger.error(f"Error running orchestrator agent: {e}")
            return [TextContent(
                type="text",
                text=f"Error running orchestrator agent: {str(e)}"
            )]
    
    async def handle_orchestrator_metrics(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """Handle metrics requests."""
        try:
            metric_type = arguments.get("metric_type", "all")
            time_range = arguments.get("time_range", "1h")
            
            endpoint = f"/api/metrics?type={metric_type}&range={time_range}"
            result = await self._make_request("GET", endpoint)
            
            response_data = {
                "metric_type": metric_type,
                "time_range": time_range,
                "timestamp": datetime.now().isoformat(),
                "metrics": result
            }
            
            return [TextContent(
                type="text",
                text=f"Orchestrator Metrics:\n{response_data}"
            )]
            
        except Exception as e:
            logger.error(f"Error getting orchestrator metrics: {e}")
            return [TextContent(
                type="text",
                text=f"Error getting orchestrator metrics: {str(e)}"
            )]
    
    async def handle_orchestrator_logs(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """Handle log retrieval requests."""
        try:
            level = arguments.get("level", "INFO")
            limit = arguments.get("limit", 100)
            component = arguments.get("component")
            
            endpoint = f"/api/logs?level={level}&limit={limit}"
            if component:
                endpoint += f"&component={component}"
            
            result = await self._make_request("GET", endpoint)
            
            response_data = {
                "level": level,
                "limit": limit,
                "component": component,
                "timestamp": datetime.now().isoformat(),
                "logs": result
            }
            
            return [TextContent(
                type="text",
                text=f"Orchestrator Logs:\n{response_data}"
            )]
            
        except Exception as e:
            logger.error(f"Error getting orchestrator logs: {e}")
            return [TextContent(
                type="text",
                text=f"Error getting orchestrator logs: {str(e)}"
            )]
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.client.aclose()