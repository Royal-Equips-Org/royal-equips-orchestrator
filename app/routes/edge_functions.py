"""
Enhanced Edge Functions integration for Command Center.

Provides real-time monitoring and control of all edge functions
with live VR-ready displays and comprehensive system oversight.
"""

import asyncio
import json
import logging
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

import aiohttp
import requests
from flask import Blueprint, jsonify, request, current_app
from flask_socketio import emit

logger = logging.getLogger(__name__)

edge_functions_bp = Blueprint('edge_functions', __name__, url_prefix='/api/edge-functions')

# Edge function configuration
EDGE_FUNCTIONS = {
    'auth-hook-react-email-resend': {
        'url': 'https://auth-hook.royalequips.workers.dev',
        'category': 'auth',
        'priority': 'high',
        'description': 'Authentication with branded emails'
    },
    'background-upload-storage': {
        'url': 'https://bg-upload.royalequips.workers.dev',
        'category': 'storage',
        'priority': 'medium',
        'description': 'Async media processing'
    },
    'connect-supabase': {
        'url': 'https://supabase-connect.royalequips.workers.dev',
        'category': 'database',
        'priority': 'critical',
        'description': 'Database connectivity hub'
    },
    'openai': {
        'url': 'https://openai-handler.royalequips.workers.dev',
        'category': 'ai',
        'priority': 'high',
        'description': 'AI processing engine'
    },
    'discord-bot': {
        'url': 'https://discord-bot.royalequips.workers.dev',
        'category': 'communication',
        'priority': 'medium',
        'description': 'Operations control bot'
    },
    'stripe-webhooks': {
        'url': 'https://stripe-webhooks.royalequips.workers.dev',
        'category': 'payments',
        'priority': 'critical',
        'description': 'Payment processing'
    },
    'cloudflare-turnstile': {
        'url': 'https://turnstile.royalequips.workers.dev',
        'category': 'security',
        'priority': 'medium',
        'description': 'CAPTCHA protection'
    },
    'elevenlabs-text-to-speech': {
        'url': 'https://tts.royalequips.workers.dev',
        'category': 'ai',
        'priority': 'low',
        'description': 'Text to speech conversion'
    },
    'elevenlabs-speech-to-text': {
        'url': 'https://stt.royalequips.workers.dev',
        'category': 'ai',
        'priority': 'low',
        'description': 'Speech to text conversion'
    },
    'image-manipulation': {
        'url': 'https://image-proc.royalequips.workers.dev',
        'category': 'media',
        'priority': 'medium',
        'description': 'Image processing pipeline'
    }
}

# Real-time monitoring state
edge_function_stats = {}
last_health_check = {}

@edge_functions_bp.route('/status')
def get_edge_functions_status():
    """Get comprehensive status of all edge functions."""
    try:
        # Trigger async health check
        asyncio.create_task(check_all_edge_functions_health())
        
        return jsonify({
            'functions': EDGE_FUNCTIONS,
            'stats': edge_function_stats,
            'last_health_check': last_health_check,
            'total_functions': len(EDGE_FUNCTIONS),
            'healthy_functions': len([f for f in last_health_check.values() if f.get('status') == 'healthy']),
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Edge functions status error: {e}")
        return jsonify({'error': str(e)}), 500

@edge_functions_bp.route('/health-check')
async def trigger_health_check():
    """Trigger immediate health check of all edge functions."""
    try:
        results = await check_all_edge_functions_health()
        
        # Emit real-time update (if socketio is available)
        try:
            from app.sockets import socketio
            if socketio:
                socketio.emit('edge_functions_health', {
                    'results': results,
                    'timestamp': datetime.utcnow().isoformat()
                }, namespace='/edge-functions')
        except ImportError:
            logger.debug("SocketIO not available for health check updates")
        
        return jsonify({
            'success': True,
            'results': results,
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({'error': str(e)}), 500

@edge_functions_bp.route('/metrics')
def get_edge_functions_metrics():
    """Get detailed metrics for all edge functions."""
    try:
        metrics = {
            'functions': {},
            'aggregate': {
                'total_requests': 0,
                'total_errors': 0,
                'avg_response_time': 0,
                'uptime_percentage': 0
            },
            'categories': {},
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Calculate metrics for each function
        for func_name, func_config in EDGE_FUNCTIONS.items():
            stats = edge_function_stats.get(func_name, {})
            health = last_health_check.get(func_name, {})
            
            metrics['functions'][func_name] = {
                'requests_24h': stats.get('requests_24h', 0),
                'errors_24h': stats.get('errors_24h', 0),
                'avg_response_time': stats.get('avg_response_time', 0),
                'uptime_percentage': health.get('uptime_percentage', 0),
                'last_error': stats.get('last_error'),
                'category': func_config['category'],
                'priority': func_config['priority'],
                'status': health.get('status', 'unknown')
            }
            
            # Aggregate metrics
            metrics['aggregate']['total_requests'] += stats.get('requests_24h', 0)
            metrics['aggregate']['total_errors'] += stats.get('errors_24h', 0)
        
        # Calculate category metrics
        for func_name, func_data in metrics['functions'].items():
            category = func_data['category']
            if category not in metrics['categories']:
                metrics['categories'][category] = {
                    'functions': 0,
                    'healthy': 0,
                    'total_requests': 0,
                    'total_errors': 0
                }
            
            metrics['categories'][category]['functions'] += 1
            if func_data['status'] == 'healthy':
                metrics['categories'][category]['healthy'] += 1
            metrics['categories'][category]['total_requests'] += func_data['requests_24h']
            metrics['categories'][category]['total_errors'] += func_data['errors_24h']
        
        return jsonify(metrics)
    except Exception as e:
        logger.error(f"Edge functions metrics error: {e}")
        return jsonify({'error': str(e)}), 500

@edge_functions_bp.route('/deploy')
def deploy_edge_function():
    """Deploy specific edge function."""
    try:
        func_name = request.args.get('function')
        environment = request.args.get('environment', 'production')
        
        if not func_name or func_name not in EDGE_FUNCTIONS:
            return jsonify({'error': 'Invalid function name'}), 400
        
        # Trigger deployment (this would integrate with Wrangler CLI or API)
        deployment_result = trigger_edge_function_deployment(func_name, environment)
        
        # Emit real-time update (if socketio is available)
        try:
            from app.sockets import socketio
            if socketio:
                socketio.emit('edge_function_deployed', {
                    'function': func_name,
                    'environment': environment,
                    'result': deployment_result,
                    'timestamp': datetime.utcnow().isoformat()
                }, namespace='/edge-functions')
        except ImportError:
            logger.debug("SocketIO not available for deployment updates")
        
        return jsonify({
            'success': True,
            'function': func_name,
            'environment': environment,
            'deployment_id': deployment_result.get('deployment_id'),
            'status': deployment_result.get('status')
        })
    except Exception as e:
        logger.error(f"Edge function deployment error: {e}")
        return jsonify({'error': str(e)}), 500

@edge_functions_bp.route('/logs')
def get_edge_function_logs():
    """Get logs for specific edge function."""
    try:
        func_name = request.args.get('function')
        limit = int(request.args.get('limit', 100))
        since = request.args.get('since', '1h')
        
        if not func_name or func_name not in EDGE_FUNCTIONS:
            return jsonify({'error': 'Invalid function name'}), 400
        
        # Fetch logs from Cloudflare Workers API
        logs = fetch_edge_function_logs(func_name, limit, since)
        
        return jsonify({
            'function': func_name,
            'logs': logs,
            'count': len(logs),
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Edge function logs error: {e}")
        return jsonify({'error': str(e)}), 500

async def check_all_edge_functions_health():
    """Asynchronously check health of all edge functions."""
    results = {}
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        
        for func_name, func_config in EDGE_FUNCTIONS.items():
            task = check_single_function_health(session, func_name, func_config)
            tasks.append(task)
        
        # Execute all health checks concurrently
        health_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, (func_name, _) in enumerate(EDGE_FUNCTIONS.items()):
            result = health_results[i]
            if isinstance(result, Exception):
                results[func_name] = {
                    'status': 'error',
                    'error': str(result),
                    'timestamp': datetime.utcnow().isoformat()
                }
            else:
                results[func_name] = result
    
    # Update global state
    last_health_check.update(results)
    
    return results

async def check_single_function_health(session, func_name, func_config):
    """Check health of a single edge function."""
    try:
        start_time = datetime.utcnow()
        
        # Make health check request
        async with session.get(
            f"{func_config['url']}/health",
            timeout=aiohttp.ClientTimeout(total=10)
        ) as response:
            end_time = datetime.utcnow()
            response_time = (end_time - start_time).total_seconds() * 1000
            
            if response.status == 200:
                health_data = await response.json()
                return {
                    'status': 'healthy',
                    'response_time': response_time,
                    'timestamp': end_time.isoformat(),
                    'data': health_data
                }
            else:
                return {
                    'status': 'unhealthy',
                    'response_time': response_time,
                    'status_code': response.status,
                    'timestamp': end_time.isoformat()
                }
    
    except asyncio.TimeoutError:
        return {
            'status': 'timeout',
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }

def trigger_edge_function_deployment(func_name, environment):
    """Trigger deployment of edge function."""
    try:
        # This would integrate with Wrangler CLI or Cloudflare API
        # For now, return a mock response
        deployment_id = f"deploy_{func_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        return {
            'deployment_id': deployment_id,
            'status': 'queued',
            'function': func_name,
            'environment': environment,
            'triggered_at': datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Deployment trigger error: {e}")
        return {
            'status': 'error',
            'error': str(e)
        }

def fetch_edge_function_logs(func_name, limit, since):
    """Fetch logs for edge function."""
    try:
        # This would integrate with Cloudflare Logs API
        # For now, return mock logs
        mock_logs = []
        
        for i in range(min(limit, 20)):  # Generate some mock logs
            timestamp = datetime.utcnow() - timedelta(minutes=i * 5)
            mock_logs.append({
                'timestamp': timestamp.isoformat(),
                'level': 'info' if i % 10 != 0 else 'error',
                'message': f"Function {func_name} executed successfully" if i % 10 != 0 else f"Error in {func_name}",
                'request_id': f"req_{timestamp.strftime('%Y%m%d_%H%M%S')}_{i}",
                'duration': 120 + (i * 10)
            })
        
        return mock_logs
    except Exception as e:
        logger.error(f"Log fetch error: {e}")
        return []

# Real-time monitoring task
def start_edge_functions_monitoring():
    """Start background monitoring of edge functions."""
    def monitoring_task():
        while True:
            try:
                # Check health every 30 seconds
                asyncio.run(check_all_edge_functions_health())
                
                # Emit updates to connected clients (if socketio is available)
                try:
                    from app.sockets import socketio
                    if socketio:
                        socketio.emit('edge_functions_update', {
                            'stats': edge_function_stats,
                            'health': last_health_check,
                            'timestamp': datetime.utcnow().isoformat()
                        }, namespace='/edge-functions')
                except ImportError:
                    logger.debug("SocketIO not available for edge functions updates")
                
                # Sleep for 30 seconds
                import time
                time.sleep(30)
                
            except Exception as e:
                logger.error(f"Monitoring task error: {e}")
                import time
                time.sleep(60)  # Wait longer on error
    
    # Start monitoring in background
    import threading
    thread = threading.Thread(target=monitoring_task)
    thread.daemon = True
    thread.start()

def register_edge_functions_websocket_handlers():
    """Register WebSocket handlers for edge functions namespace."""
    from app.sockets import socketio
    
    if socketio is None:
        logger.warning("SocketIO not initialized, skipping edge functions WebSocket handlers")
        return
    
    @socketio.on('connect', namespace='/edge-functions')
    def handle_edge_functions_connect():
        """Handle client connection to edge functions namespace."""
        emit('connected', {
            'message': 'Connected to edge functions monitoring',
            'functions': EDGE_FUNCTIONS,
            'timestamp': datetime.utcnow().isoformat()
        })

    @socketio.on('request_status', namespace='/edge-functions')
    def handle_status_request():
        """Handle status request from client."""
        emit('status_update', {
            'stats': edge_function_stats,
            'health': last_health_check,
            'timestamp': datetime.utcnow().isoformat()
        })

    @socketio.on('trigger_health_check', namespace='/edge-functions')
    def handle_health_check_trigger():
        """Handle health check trigger from client."""
        threading.Thread(target=check_all_edge_functions_health, daemon=True).start()
        emit('health_check_triggered', {
            'message': 'Health check initiated',
            'timestamp': datetime.utcnow().isoformat()
        })

# Initialize monitoring when module loads
try:
    start_edge_functions_monitoring()
except Exception as e:
    logger.error(f"Failed to start edge functions monitoring: {e}")