"""
Tests for Flask WebSocket functionality.

Tests the real-time data streaming and WebSocket integration.
"""

import pytest
import json
from unittest.mock import patch, MagicMock

def test_socketio_import():
    """Test that SocketIO can be imported without errors."""
    from app.sockets import init_socketio, get_system_metrics, get_mock_agent_status
    assert init_socketio is not None
    assert get_system_metrics is not None
    assert get_mock_agent_status is not None

def test_get_system_metrics():
    """Test system metrics collection."""
    from app.sockets import get_system_metrics
    
    with patch('app.sockets.psutil') as mock_psutil:
        # Mock psutil responses
        mock_psutil.cpu_percent.return_value = 25.5
        
        mock_memory = MagicMock()
        mock_memory.percent = 45.0
        mock_memory.used = 4 * (1024**3)  # 4GB
        mock_memory.total = 8 * (1024**3)  # 8GB
        mock_psutil.virtual_memory.return_value = mock_memory
        
        mock_disk = MagicMock()
        mock_disk.percent = 60.0
        mock_disk.used = 100 * (1024**3)  # 100GB
        mock_psutil.disk_usage.return_value = mock_disk
        
        metrics = get_system_metrics()
        
        assert metrics['cpu_percent'] == 25.5
        assert metrics['memory_percent'] == 45.0
        assert metrics['memory_used_gb'] == 4.0
        assert metrics['memory_total_gb'] == 8.0
        assert metrics['disk_percent'] == 60.0
        assert metrics['status'] == 'healthy'
        assert 'timestamp' in metrics

def test_get_mock_agent_status():
    """Test mock agent status generation."""
    from app.sockets import get_mock_agent_status
    
    status = get_mock_agent_status()
    
    assert 'timestamp' in status
    assert 'agents' in status
    assert 'total_active' in status
    assert 'average_cpu' in status
    
    # Check agent structure
    agents = status['agents']
    assert len(agents) == 3
    
    for agent in agents:
        assert 'id' in agent
        assert 'name' in agent
        assert 'status' in agent
        assert agent['status'] in ['active', 'idle', 'processing']
        assert isinstance(agent['cpu_percent'], float)
        assert isinstance(agent['success_rate'], float)
        assert agent['success_rate'] >= 0.8  # Should be reasonable success rate

def test_broadcast_control_event():
    """Test control event broadcasting."""
    from app.sockets import broadcast_control_event
    
    # This should not raise an error even without an active socketio instance
    try:
        broadcast_control_event("test_event", {"test": "data"})
        # If no exception, test passes
        assert True
    except Exception as e:
        pytest.fail(f"broadcast_control_event raised an exception: {e}")

if __name__ == "__main__":
    pytest.main([__file__])