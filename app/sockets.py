"""
WebSocket support using Flask-SocketIO for real-time data streams.

Provides real-time updates for:
- System heartbeat and metrics
- Agent status updates  
- Control events (god-mode, emergency-stop)
- Mock data for demonstration
"""

import logging
import threading
import time
from datetime import datetime
from typing import Dict, Any
import psutil

from flask_socketio import SocketIO, emit
from flask import current_app

logger = logging.getLogger(__name__)

# Global SocketIO instance
socketio = None

def init_socketio(app):
    """Initialize SocketIO with Flask app."""
    global socketio
    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        async_mode='eventlet',
        logger=False,
        engineio_logger=False
    )
    
    # Register event handlers
    register_handlers()
    
    # Start background tasks
    start_background_tasks()
    
    logger.info("SocketIO initialized with real-time data streams")
    return socketio

def register_handlers():
    """Register WebSocket event handlers."""
    
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection."""
        logger.info('Client connected to WebSocket')
        emit('connected', {
            'status': 'connected',
            'timestamp': datetime.now().isoformat(),
            'message': 'Welcome to Royal Equips Control Center'
        })
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection."""
        logger.info('Client disconnected from WebSocket')
    
    @socketio.on('request_status')
    def handle_status_request():
        """Handle manual status request."""
        emit('status_update', get_current_status())

def start_background_tasks():
    """Start background tasks for real-time data emission."""
    
    def emit_heartbeat():
        """Emit heartbeat data every 2 seconds."""
        while True:
            try:
                if socketio:
                    heartbeat_data = {
                        'timestamp': datetime.now().isoformat(),
                        'service': 'Royal Equips Orchestrator',
                        'status': 'active',
                        'uptime': get_uptime_seconds()
                    }
                    socketio.emit('heartbeat', heartbeat_data)
                time.sleep(2)
            except Exception as e:
                logger.error(f"Heartbeat emission failed: {e}")
                time.sleep(5)
    
    def emit_metrics():
        """Emit system metrics every 2 seconds."""
        while True:
            try:
                if socketio:
                    metrics_data = get_system_metrics()
                    socketio.emit('metrics_update', metrics_data)
                time.sleep(2)
            except Exception as e:
                logger.error(f"Metrics emission failed: {e}")
                time.sleep(5)
    
    def emit_agent_status():
        """Emit mock agent status every 3 seconds."""
        while True:
            try:
                if socketio:
                    agent_data = get_mock_agent_status()
                    socketio.emit('agent_status', agent_data)
                time.sleep(3)
            except Exception as e:
                logger.error(f"Agent status emission failed: {e}")
                time.sleep(5)
    
    # Start background threads
    threading.Thread(target=emit_heartbeat, daemon=True).start()
    threading.Thread(target=emit_metrics, daemon=True).start() 
    threading.Thread(target=emit_agent_status, daemon=True).start()
    
    logger.info("Background data emission tasks started")

def get_uptime_seconds() -> float:
    """Get application uptime in seconds."""
    try:
        from flask import current_app
        if hasattr(current_app, 'startup_time'):
            return (datetime.now() - current_app.startup_time).total_seconds()
    except:
        pass
    return 0.0

def get_system_metrics() -> Dict[str, Any]:
    """Get current system metrics."""
    try:
        cpu_percent = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            'timestamp': datetime.now().isoformat(),
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'memory_used_gb': round(memory.used / (1024**3), 2),
            'memory_total_gb': round(memory.total / (1024**3), 2),
            'disk_percent': disk.percent,
            'disk_used_gb': round(disk.used / (1024**3), 2),
            'uptime_seconds': get_uptime_seconds(),
            'status': 'healthy' if cpu_percent < 80 and memory.percent < 85 else 'warning'
        }
    except Exception as e:
        logger.error(f"Failed to get system metrics: {e}")
        return {
            'timestamp': datetime.now().isoformat(),
            'status': 'error',
            'error': str(e)
        }

def get_mock_agent_status() -> Dict[str, Any]:
    """Get mock agent status for demonstration."""
    import random
    
    agents = [
        {
            'id': 'product-research',
            'name': 'Product Research Agent',
            'status': random.choice(['active', 'idle', 'processing']),
            'cpu_percent': random.uniform(5, 30),
            'memory_mb': random.uniform(50, 200),
            'tasks_completed': random.randint(100, 500),
            'success_rate': random.uniform(0.85, 0.98),
            'last_activity': datetime.now().isoformat()
        },
        {
            'id': 'pricing-optimizer',
            'name': 'Pricing Optimizer Agent',
            'status': random.choice(['active', 'idle', 'processing']),
            'cpu_percent': random.uniform(10, 40),
            'memory_mb': random.uniform(80, 300),
            'tasks_completed': random.randint(50, 200),
            'success_rate': random.uniform(0.90, 0.99),
            'last_activity': datetime.now().isoformat()
        },
        {
            'id': 'inventory-forecast',
            'name': 'Inventory Forecasting Agent', 
            'status': random.choice(['active', 'idle', 'processing']),
            'cpu_percent': random.uniform(15, 50),
            'memory_mb': random.uniform(100, 400),
            'tasks_completed': random.randint(20, 100),
            'success_rate': random.uniform(0.88, 0.96),
            'last_activity': datetime.now().isoformat()
        }
    ]
    
    return {
        'timestamp': datetime.now().isoformat(),
        'agents': agents,
        'total_active': len([a for a in agents if a['status'] == 'active']),
        'average_cpu': sum(a['cpu_percent'] for a in agents) / len(agents)
    }

def broadcast_control_event(event_type: str, data: Dict[str, Any]):
    """Broadcast control events like god-mode or emergency-stop."""
    if socketio:
        socketio.emit('control_event', {
            'event_type': event_type,
            'data': data,
            'timestamp': datetime.now().isoformat()
        })

def get_current_status() -> Dict[str, Any]:
    """Get comprehensive current status."""
    return {
        'timestamp': datetime.now().isoformat(),
        'system': get_system_metrics(),
        'agents': get_mock_agent_status(),
        'service': {
            'name': 'Royal Equips Orchestrator',
            'version': '2.0.0',
            'backend': 'flask',
            'uptime': get_uptime_seconds()
        }
    }