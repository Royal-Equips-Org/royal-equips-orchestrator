"""
WebSocket support using Flask-SocketIO for real-time data streams.

Provides real-time updates across namespaces:
- /ws/system: System heartbeat, metrics, service status
- /ws/shopify: Shopify jobs, sync progress, rate limits, webhooks
- /ws/logs: Live log streaming with ring buffer
"""

import logging
import threading
import time
from datetime import datetime
from typing import Dict, Any, List
from collections import deque
import psutil

from flask_socketio import SocketIO, emit, disconnect
from flask import current_app

logger = logging.getLogger(__name__)

# Global SocketIO instance
socketio = None

# In-memory ring buffer for logs
_log_buffer = deque(maxlen=1000)
_log_buffer_lock = threading.Lock()

def init_socketio(app):
    """Initialize SocketIO with Flask app and namespaces."""
    global socketio
    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        async_mode='eventlet',
        logger=False,
        engineio_logger=False
    )
    
    # Register namespace handlers
    register_system_handlers()
    register_shopify_handlers()
    register_logs_handlers()
    
    # Start background tasks
    start_background_tasks()
    
    logger.info("SocketIO initialized with namespaced real-time data streams")
    return socketio


# System namespace (/ws/system) handlers
def register_system_handlers():
    """Register system namespace event handlers."""
    
    @socketio.on('connect', namespace='/ws/system')
    def handle_system_connect():
        """Handle client connection to system namespace."""
        logger.info('Client connected to /ws/system')
        emit('connected', {
            'namespace': '/ws/system',
            'status': 'connected',
            'timestamp': datetime.now().isoformat(),
            'message': 'Connected to Royal Equips System Monitor'
        })
        
        # Send initial status
        emit('service_up', get_service_status())
        emit('heartbeat', get_heartbeat_data())
        emit('metrics', get_system_metrics())
    
    @socketio.on('disconnect', namespace='/ws/system')
    def handle_system_disconnect():
        """Handle client disconnection from system namespace."""
        logger.info('Client disconnected from /ws/system')
    
    @socketio.on('request_status', namespace='/ws/system')
    def handle_system_status_request():
        """Handle manual system status request."""
        emit('service_up', get_service_status())
        emit('metrics', get_system_metrics())


# Shopify namespace (/ws/shopify) handlers
def register_shopify_handlers():
    """Register Shopify namespace event handlers."""
    
    @socketio.on('connect', namespace='/ws/shopify')
    def handle_shopify_connect():
        """Handle client connection to Shopify namespace."""
        logger.info('Client connected to /ws/shopify')
        emit('connected', {
            'namespace': '/ws/shopify',
            'status': 'connected',
            'timestamp': datetime.now().isoformat(),
            'message': 'Connected to Royal Equips Shopify Monitor'
        })
        
        # Send initial Shopify status
        emit('rate_limit', get_shopify_rate_limit_status())
    
    @socketio.on('disconnect', namespace='/ws/shopify')
    def handle_shopify_disconnect():
        """Handle client disconnection from Shopify namespace."""
        logger.info('Client disconnected from /ws/shopify')
    
    @socketio.on('request_jobs', namespace='/ws/shopify')
    def handle_jobs_request():
        """Handle request for active jobs."""
        try:
            from app.jobs.shopify_jobs import get_active_jobs
            jobs = get_active_jobs()
            emit('jobs_status', {
                'jobs': jobs,
                'count': len(jobs),
                'timestamp': datetime.now().isoformat()
            })
        except ImportError:
            logger.warning("Shopify jobs module not available")


# Logs namespace (/ws/logs) handlers  
def register_logs_handlers():
    """Register logs namespace event handlers."""
    
    @socketio.on('connect', namespace='/ws/logs')
    def handle_logs_connect():
        """Handle client connection to logs namespace."""
        logger.info('Client connected to /ws/logs')
        emit('connected', {
            'namespace': '/ws/logs',
            'status': 'connected',
            'timestamp': datetime.now().isoformat(),
            'message': 'Connected to Royal Equips Live Logs'
        })
        
        # Send recent log history
        with _log_buffer_lock:
            history = list(_log_buffer)[-50:]  # Send last 50 log entries
            
        for log_entry in history:
            emit('log_line', log_entry)
    
    @socketio.on('disconnect', namespace='/ws/logs')
    def handle_logs_disconnect():
        """Handle client disconnection from logs namespace."""
        logger.info('Client disconnected from /ws/logs')
    
    @socketio.on('request_history', namespace='/ws/logs')
    def handle_logs_history_request(data=None):
        """Handle request for log history."""
        limit = 100
        if data and isinstance(data, dict):
            limit = min(data.get('limit', 100), 500)
            
        with _log_buffer_lock:
            history = list(_log_buffer)[-limit:]
            
        for log_entry in history:
            emit('log_line', log_entry)


def start_background_tasks():
    """Start background tasks for real-time data emission across namespaces."""
    
    def emit_system_heartbeat():
        """Emit system heartbeat every 2 seconds to /ws/system."""
        while True:
            try:
                if socketio:
                    heartbeat_data = get_heartbeat_data()
                    socketio.emit('heartbeat', heartbeat_data, namespace='/ws/system')
                time.sleep(2)
            except Exception as e:
                logger.error(f"System heartbeat emission failed: {e}")
                time.sleep(5)
    
    def emit_system_metrics():
        """Emit system metrics every 3 seconds to /ws/system."""
        while True:
            try:
                if socketio:
                    metrics_data = get_system_metrics()
                    socketio.emit('metrics', metrics_data, namespace='/ws/system')
                    
                    # Also emit service status periodically
                    service_status = get_service_status()
                    socketio.emit('service_up', service_status, namespace='/ws/system')
                time.sleep(3)
            except Exception as e:
                logger.error(f"System metrics emission failed: {e}")
                time.sleep(5)
    
    def emit_shopify_rate_limits():
        """Emit Shopify rate limits every 10 seconds to /ws/shopify."""
        while True:
            try:
                if socketio:
                    rate_limit_data = get_shopify_rate_limit_status()
                    socketio.emit('rate_limit', rate_limit_data, namespace='/ws/shopify')
                time.sleep(10)
            except Exception as e:
                logger.error(f"Shopify rate limit emission failed: {e}")
                time.sleep(10)
    
    # Start background threads
    threading.Thread(target=emit_system_heartbeat, daemon=True).start()
    threading.Thread(target=emit_system_metrics, daemon=True).start() 
    threading.Thread(target=emit_shopify_rate_limits, daemon=True).start()
    
    logger.info("Background data emission tasks started for all namespaces")


def get_heartbeat_data() -> Dict[str, Any]:
    """Get system heartbeat data."""
    return {
        'seq': int(time.time()),
        'timestamp': datetime.now().isoformat(),
        'service': 'Royal Equips Orchestrator',
        'status': 'active',
        'uptime_seconds': get_uptime_seconds()
    }


def get_service_status() -> Dict[str, Any]:
    """Get service component status."""
    components = {
        'api': 'ok',
        'socket': 'ok' if socketio else 'error',
        'shopify': 'ok'  # Will be updated by Shopify service
    }
    
    # Check if Shopify is configured
    try:
        from app.services.shopify_service import ShopifyService
        service = ShopifyService()
        if not service.is_configured():
            components['shopify'] = 'not_configured'
        # Could add auth check here but might be expensive
    except Exception:
        components['shopify'] = 'error'
    
    return {
        'components': components,
        'overall_status': 'ok' if all(status in ['ok', 'not_configured'] for status in components.values()) else 'degraded',
        'timestamp': datetime.now().isoformat()
    }


def get_shopify_rate_limit_status() -> Dict[str, Any]:
    """Get Shopify rate limit status."""
    try:
        from app.services.shopify_service import ShopifyService
        service = ShopifyService()
        if service.is_configured():
            return service.get_rate_limit_status()
    except Exception:
        pass
    
    return {
        'used': 0,
        'bucket': 40,
        'remaining': 40,
        'usage_percent': 0,
        'last_check': datetime.now().isoformat(),
        'configured': False
    }


def add_log_entry(level: str, message: str, context: Dict[str, Any] = None):
    """Add log entry to ring buffer and emit to /ws/logs namespace."""
    log_entry = {
        'level': level.upper(),
        'timestamp': datetime.now().isoformat(),
        'message': message,
        'context': context or {}
    }
    
    with _log_buffer_lock:
        _log_buffer.append(log_entry)
    
    # Emit to logs namespace
    if socketio:
        try:
            socketio.emit('log_line', log_entry, namespace='/ws/logs')
        except Exception as e:
            logger.error(f"Failed to emit log entry: {e}")


def broadcast_control_event(event_type: str, data: Dict[str, Any]):
    """Broadcast control events to /ws/system namespace."""
    if socketio:
        try:
            socketio.emit('control_event', {
                'event_type': event_type,
                'data': data,
                'timestamp': datetime.now().isoformat()
            }, namespace='/ws/system')
            
            # Also log the event
            add_log_entry('INFO', f"Control event: {event_type}", data)
        except Exception as e:
            logger.error(f"Failed to broadcast control event: {e}")


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
            'cpu': {
                'percent': cpu_percent,
                'status': 'healthy' if cpu_percent < 80 else 'warning'
            },
            'memory': {
                'percent': memory.percent,
                'used_gb': round(memory.used / (1024**3), 2),
                'total_gb': round(memory.total / (1024**3), 2),
                'status': 'healthy' if memory.percent < 85 else 'warning'
            },
            'disk': {
                'percent': disk.percent,
                'used_gb': round(disk.used / (1024**3), 2),
                'total_gb': round(disk.total / (1024**3), 2),
                'status': 'healthy' if disk.percent < 90 else 'warning'
            },
            'uptime_seconds': get_uptime_seconds(),
            'overall_status': 'healthy' if cpu_percent < 80 and memory.percent < 85 else 'warning'
        }
    except Exception as e:
        logger.error(f"Failed to get system metrics: {e}")
        return {
            'timestamp': datetime.now().isoformat(),
            'status': 'error',
            'error': str(e)
        }

# Legacy functions for backwards compatibility
def get_mock_agent_status() -> Dict[str, Any]:
    """Get mock agent status for demonstration (legacy)."""
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


def get_current_status() -> Dict[str, Any]:
    """Get comprehensive current status (legacy)."""
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