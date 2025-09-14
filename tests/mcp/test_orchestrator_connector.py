"""Tests for Orchestrator connector."""

import pytest
from unittest.mock import patch, AsyncMock
from royal_mcp.connectors.orchestrator import OrchestratorConnector, HMACVerifier


@pytest.mark.asyncio
class TestOrchestratorConnector:
    """Test cases for Orchestrator connector."""
    
    def test_initialization(self, mock_env_vars):
        """Test connector initialization."""
        with patch('httpx.AsyncClient'):
            connector = OrchestratorConnector()
            assert connector.config.base_url == mock_env_vars["ORCHESTRATOR_BASE_URL"]
            assert connector.config.hmac_key == mock_env_vars["ORCHESTRATOR_HMAC_KEY"]
    
    def test_get_tools(self, mock_env_vars):
        """Test tool registration."""
        with patch('httpx.AsyncClient'):
            connector = OrchestratorConnector()
            tools = connector.get_tools()
            
            assert len(tools) == 5
            tool_names = [tool.name for tool in tools]
            assert "orchestrator_health" in tool_names
            assert "orchestrator_agent_status" in tool_names
            assert "orchestrator_run_agent" in tool_names
            assert "orchestrator_metrics" in tool_names
            assert "orchestrator_logs" in tool_names
    
    def test_hmac_verifier(self):
        """Test HMAC signature generation and verification."""
        verifier = HMACVerifier("test-secret-key")
        
        payload = '{"test": "data"}'
        timestamp = "1234567890"
        
        signature = verifier.generate_signature(payload, timestamp)
        assert len(signature) == 64  # SHA256 hex digest length
        
        # Test verification
        assert verifier.verify_signature(payload, timestamp, signature)
        
        # Test invalid signature
        assert not verifier.verify_signature(payload, timestamp, "invalid-signature")
        
        # Test tampered payload
        assert not verifier.verify_signature('{"test": "tampered"}', timestamp, signature)
    
    async def test_make_request_success(self, mock_env_vars, mock_httpx_client):
        """Test successful HTTP request."""
        with patch('httpx.AsyncClient', return_value=mock_httpx_client):
            connector = OrchestratorConnector()
            
            result = await connector._make_request("GET", "/health")
            
            assert result == {"data": "test-data"}
            mock_httpx_client.get.assert_called_once()
    
    async def test_make_request_with_hmac(self, mock_env_vars, mock_httpx_client):
        """Test request with HMAC verification."""
        with patch('httpx.AsyncClient', return_value=mock_httpx_client):
            connector = OrchestratorConnector()
            
            data = {"action": "test", "params": {}}
            result = await connector._make_request("POST", "/api/agents/test/run", data, require_hmac=True)
            
            assert result == {"data": "test-data"}
            
            # Verify HMAC headers were added
            call_args = mock_httpx_client.post.call_args
            headers = call_args.kwargs.get("headers", {})
            assert "X-Timestamp" in headers
            assert "X-Signature" in headers
            assert "X-Auth-Type" in headers
    
    async def test_handle_orchestrator_health(self, mock_env_vars, mock_httpx_client):
        """Test health check handling."""
        with patch('httpx.AsyncClient', return_value=mock_httpx_client):
            connector = OrchestratorConnector()
            
            arguments = {"detailed": False}
            result = await connector.handle_orchestrator_health(arguments)
            
            assert len(result) == 1
            assert "Orchestrator Health Status" in result[0].text
    
    async def test_handle_orchestrator_health_detailed(self, mock_env_vars, mock_httpx_client):
        """Test detailed health check handling."""
        # Mock multiple successful responses
        mock_httpx_client.get.side_effect = [
            mock_httpx_client.get.return_value,  # Health endpoint
            mock_httpx_client.get.return_value   # Metrics endpoint
        ]
        
        with patch('httpx.AsyncClient', return_value=mock_httpx_client):
            connector = OrchestratorConnector()
            
            arguments = {"detailed": True}
            result = await connector.handle_orchestrator_health(arguments)
            
            assert len(result) == 1
            assert "Orchestrator Health Status" in result[0].text
    
    async def test_handle_orchestrator_agent_status(self, mock_env_vars, mock_httpx_client):
        """Test agent status handling."""
        with patch('httpx.AsyncClient', return_value=mock_httpx_client):
            connector = OrchestratorConnector()
            
            # Test all agents status
            arguments = {}
            result = await connector.handle_orchestrator_agent_status(arguments)
            
            assert len(result) == 1
            assert "Orchestrator Agent Status" in result[0].text
            mock_httpx_client.get.assert_called_with(
                f"{connector.config.base_url}/api/agents/status",
                headers={}
            )
    
    async def test_handle_orchestrator_agent_status_specific(self, mock_env_vars, mock_httpx_client):
        """Test specific agent status handling."""
        with patch('httpx.AsyncClient', return_value=mock_httpx_client):
            connector = OrchestratorConnector()
            
            # Test specific agent status
            arguments = {"agent_id": "test-agent-123"}
            result = await connector.handle_orchestrator_agent_status(arguments)
            
            assert len(result) == 1
            assert "Orchestrator Agent Status" in result[0].text
            mock_httpx_client.get.assert_called_with(
                f"{connector.config.base_url}/api/agents/test-agent-123/status",
                headers={}
            )
    
    async def test_handle_orchestrator_run_agent(self, mock_env_vars, mock_httpx_client):
        """Test agent execution handling."""
        with patch('httpx.AsyncClient', return_value=mock_httpx_client):
            connector = OrchestratorConnector()
            
            arguments = {
                "agent_id": "test-agent",
                "action": "execute",
                "parameters": {"param1": "value1"}
            }
            
            result = await connector.handle_orchestrator_run_agent(arguments)
            
            assert len(result) == 1
            assert "Orchestrator Agent Execution Result" in result[0].text
            mock_httpx_client.post.assert_called_once()
    
    async def test_handle_orchestrator_run_agent_missing_params(self, mock_env_vars):
        """Test agent execution with missing parameters."""
        with patch('httpx.AsyncClient'):
            connector = OrchestratorConnector()
            
            arguments = {"agent_id": "test-agent"}  # Missing action
            result = await connector.handle_orchestrator_run_agent(arguments)
            
            assert len(result) == 1
            assert "agent_id and action are required" in result[0].text
    
    async def test_handle_orchestrator_metrics(self, mock_env_vars, mock_httpx_client):
        """Test metrics handling."""
        with patch('httpx.AsyncClient', return_value=mock_httpx_client):
            connector = OrchestratorConnector()
            
            arguments = {
                "metric_type": "performance",
                "time_range": "24h"
            }
            
            result = await connector.handle_orchestrator_metrics(arguments)
            
            assert len(result) == 1
            assert "Orchestrator Metrics" in result[0].text
    
    async def test_handle_orchestrator_logs(self, mock_env_vars, mock_httpx_client):
        """Test log retrieval handling."""
        with patch('httpx.AsyncClient', return_value=mock_httpx_client):
            connector = OrchestratorConnector()
            
            arguments = {
                "level": "ERROR",
                "limit": 50,
                "component": "agent-manager"
            }
            
            result = await connector.handle_orchestrator_logs(arguments)
            
            assert len(result) == 1
            assert "Orchestrator Logs" in result[0].text
    
    async def test_request_retry_logic(self, mock_env_vars):
        """Test request retry logic."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            
            # First two calls fail, third succeeds
            mock_client.get.side_effect = [
                Exception("Connection error"),
                Exception("Timeout error"),
                mock_client.get.return_value
            ]
            mock_client.get.return_value.json.return_value = {"data": "success"}
            mock_client.get.return_value.raise_for_status.return_value = None
            
            mock_client_class.return_value = mock_client
            
            connector = OrchestratorConnector()
            result = await connector._make_request("GET", "/health")
            
            assert result == {"data": "success"}
            assert mock_client.get.call_count == 3
    
    async def test_error_handling(self, mock_env_vars):
        """Test error handling in tool handlers."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get.side_effect = Exception("Connection error")
            mock_client_class.return_value = mock_client
            
            connector = OrchestratorConnector()
            arguments = {}
            result = await connector.handle_orchestrator_health(arguments)
            
            assert len(result) == 1
            assert "UNHEALTHY - All health endpoints failed" in result[0].text