"""
Empire Management API - E-Commerce Empire Architect endpoints.

Provides comprehensive empire-level system management including:
- System vulnerability scanning and analysis
- Empire health monitoring and evolution tracking
- Autonomous system upgrades and optimization
- Security threat detection and response
- Performance optimization and scaling recommendations
"""

import logging
import time
from datetime import datetime
from flask import Blueprint, jsonify, request, current_app
from typing import Dict, Any, Optional

from app.services.health_service import get_health_service
from app.services.empire_scanner import get_empire_scanner
from app.services.empire_auto_healer import get_empire_auto_healer
from app.services.autonomous_empire_agent import get_autonomous_empire_agent, start_autonomous_empire

logger = logging.getLogger(__name__)

# Create empire blueprint
empire_bp = Blueprint('empire', __name__, url_prefix='/empire')

# Create API empire blueprint for frontend integration
api_empire_bp = Blueprint('api_empire', __name__, url_prefix='/api/empire')


@empire_bp.route('/health', methods=['GET'])
def get_empire_health():
    """
    Get comprehensive empire health status.
    
    Returns empire-level health metrics including security scores,
    performance metrics, code quality, and evolution readiness.
    """
    try:
        force_scan = request.args.get('force', 'false').lower() == 'true'
        
        health_service = get_health_service()
        empire_health = health_service.check_empire_health(force_scan=force_scan)
        
        return jsonify({
            'success': True,
            'empire_health': empire_health,
            'timestamp': datetime.now().isoformat(),
            'api_version': '1.0.0'
        })
        
    except Exception as e:
        logger.error(f"Empire health check failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@empire_bp.route('/scan', methods=['POST'])
def trigger_empire_scan():
    """
    Trigger comprehensive empire system scan.
    
    Performs full vulnerability assessment, code health analysis,
    security gap detection, and performance optimization review.
    """
    try:
        scanner = get_empire_scanner()
        scan_results = scanner.run_full_empire_scan()
        
        return jsonify({
            'success': True,
            'scan_id': scan_results.get('scan_id'),
            'scan_summary': scan_results.get('summary'),
            'timestamp': datetime.now().isoformat(),
            'full_results_available': '/empire/scan/results'
        })
        
    except Exception as e:
        logger.error(f"Empire scan failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@empire_bp.route('/scan/results', methods=['GET'])
def get_scan_results():
    """
    Get latest empire scan results.
    
    Returns detailed scan results including vulnerabilities,
    code health metrics, and optimization recommendations.
    """
    try:
        health_service = get_health_service()
        scan_results = health_service.get_empire_scan_results()
        
        if not scan_results:
            return jsonify({
                'success': False,
                'message': 'No scan results available. Run /empire/scan first.',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Option to get summary only
        summary_only = request.args.get('summary', 'false').lower() == 'true'
        
        if summary_only:
            response_data = {
                'success': True,
                'scan_summary': scan_results.get('summary'),
                'timestamp': datetime.now().isoformat()
            }
        else:
            response_data = {
                'success': True,
                'scan_results': scan_results,
                'timestamp': datetime.now().isoformat()
            }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Failed to get scan results: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@empire_bp.route('/recommendations', methods=['GET'])
def get_empire_recommendations():
    """
    Get empire evolution and optimization recommendations.
    
    Returns prioritized recommendations for security improvements,
    performance optimizations, and system evolution steps.
    """
    try:
        health_service = get_health_service()
        recommendations = health_service.get_empire_recommendations()
        
        # Filter by priority if requested
        priority_filter = request.args.get('priority')
        if priority_filter:
            recommendations = [
                rec for rec in recommendations 
                if rec.get('priority', '').upper() == priority_filter.upper()
            ]
        
        # Filter by category if requested
        category_filter = request.args.get('category')
        if category_filter:
            recommendations = [
                rec for rec in recommendations 
                if rec.get('category', '').upper() == category_filter.upper()
            ]
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'total_count': len(recommendations),
            'timestamp': datetime.now().isoformat(),
            'available_filters': {
                'priority': ['IMMEDIATE', 'HIGH', 'MEDIUM', 'STRATEGIC'],
                'category': ['SECURITY_CRITICAL', 'TECHNICAL_DEBT', 'PERFORMANCE', 'CODE_QUALITY', 'EMPIRE_EVOLUTION']
            }
        })
        
    except Exception as e:
        logger.error(f"Failed to get recommendations: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@empire_bp.route('/evolution/readiness', methods=['GET'])
def check_evolution_readiness():
    """
    Check empire evolution readiness status.
    
    Assesses whether the empire is ready for autonomous evolution,
    scaling, or requires stabilization first.
    """
    try:
        health_service = get_health_service()
        evolution_status = health_service.trigger_empire_evolution_check()
        
        return jsonify({
            'success': True,
            'evolution_status': evolution_status,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Evolution readiness check failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@empire_bp.route('/security/status', methods=['GET'])
def get_security_status():
    """
    Get detailed empire security status.
    
    Returns security metrics, threat assessments, and
    vulnerability status with remediation guidance.
    """
    try:
        health_service = get_health_service()
        scan_results = health_service.get_empire_scan_results()
        
        if not scan_results:
            return jsonify({
                'success': False,
                'message': 'No security scan data available. Run /empire/scan first.',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        security_data = scan_results.get('phases', {}).get('security', {})
        
        security_status = {
            'security_score': security_data.get('security_score', 0),
            'risk_level': security_data.get('risk_level', 'UNKNOWN'),
            'vulnerabilities_found': len(security_data.get('vulnerabilities_found', [])),
            'patterns_detected': security_data.get('patterns_detected', {}),
            'critical_vulnerabilities': [
                vuln for vuln in security_data.get('vulnerabilities_found', [])
                if vuln.get('severity') in ['CRITICAL', 'HIGH']
            ],
            'security_recommendations': [
                rec for rec in health_service.get_empire_recommendations()
                if rec.get('category') == 'SECURITY_CRITICAL'
            ]
        }
        
        return jsonify({
            'success': True,
            'security_status': security_status,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Security status check failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@empire_bp.route('/performance/metrics', methods=['GET'])
def get_performance_metrics():
    """
    Get empire performance metrics and optimization opportunities.
    
    Returns performance scores, bottleneck identification,
    and optimization recommendations.
    """
    try:
        health_service = get_health_service()
        scan_results = health_service.get_empire_scan_results()
        
        if not scan_results:
            return jsonify({
                'success': False,
                'message': 'No performance data available. Run /empire/scan first.',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        performance_data = scan_results.get('phases', {}).get('performance', {})
        code_health_data = scan_results.get('phases', {}).get('code_health', {})
        
        performance_metrics = {
            'performance_score': performance_data.get('performance_score', 0),
            'code_quality_score': code_health_data.get('code_quality_score', 0),
            'optimization_opportunities': performance_data.get('optimization_opportunities', []),
            'bottleneck_indicators': performance_data.get('bottleneck_indicators', []),
            'caching_opportunities': performance_data.get('caching_opportunities', []),
            'files_analyzed': code_health_data.get('files_analyzed', 0),
            'total_lines': code_health_data.get('total_lines', 0),
            'test_coverage_estimate': code_health_data.get('test_coverage_estimate', 0),
            'performance_recommendations': [
                rec for rec in health_service.get_empire_recommendations()
                if rec.get('category') == 'PERFORMANCE'
            ]
        }
        
        return jsonify({
            'success': True,
            'performance_metrics': performance_metrics,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Performance metrics check failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@empire_bp.route('/status', methods=['GET'])
def get_empire_status():
    """
    Get overall empire status dashboard.
    
    Returns consolidated view of empire health, security,
    performance, and evolution readiness.
    """
    try:
        health_service = get_health_service()
        
        # Get empire health (will use cache if available)
        empire_health = health_service.check_empire_health()
        
        # Get recent recommendations
        recommendations = health_service.get_empire_recommendations()
        critical_recommendations = [
            rec for rec in recommendations 
            if rec.get('priority') in ['IMMEDIATE', 'HIGH']
        ]
        
        # Get auto-healing status
        auto_healer = get_empire_auto_healer()
        healing_status = auto_healer.get_healing_status()
        
        empire_status = {
            'empire_health': empire_health,
            'critical_recommendations_count': len(critical_recommendations),
            'total_recommendations_count': len(recommendations),
            'auto_healing_status': healing_status,
            'system_capabilities': {
                'vulnerability_scanning': True,
                'automated_health_monitoring': True,
                'security_threat_detection': True,
                'performance_optimization': True,
                'evolution_readiness_assessment': True,
                'autonomous_recommendations': True,
                'self_healing': True,
                'automated_fixes': True
            },
            'uptime_info': {
                'startup_time': getattr(current_app, 'startup_time', datetime.now()).isoformat(),
                'current_time': datetime.now().isoformat()
            }
        }
        
        return jsonify({
            'success': True,
            'empire_status': empire_status,
            'timestamp': datetime.now().isoformat(),
            'api_version': '1.0.0'
        })
        
    except Exception as e:
        logger.error(f"Empire status check failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@empire_bp.route('/healing/trigger', methods=['POST'])
def trigger_auto_healing():
    """
    Trigger autonomous system healing session.
    
    Performs safe automated fixes for detected issues including
    legacy code modernization, security hardening, and performance optimization.
    """
    try:
        force_healing = request.json.get('force', False) if request.is_json else False
        
        auto_healer = get_empire_auto_healer()
        healing_results = auto_healer.run_auto_healing_session(force=force_healing)
        
        return jsonify({
            'success': True,
            'healing_session': {
                'session_id': healing_results.get('session_id'),
                'summary': healing_results.get('summary'),
                'fixes_applied_count': len(healing_results.get('fixes_applied', [])),
                'recommendations_count': len(healing_results.get('recommendations', []))
            },
            'timestamp': datetime.now().isoformat(),
            'full_results_available': '/empire/healing/results'
        })
        
    except Exception as e:
        logger.error(f"Auto-healing session failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@empire_bp.route('/healing/results', methods=['GET'])
def get_healing_results():
    """
    Get latest auto-healing session results.
    
    Returns detailed results of the last healing session including
    fixes applied, files modified, and manual recommendations.
    """
    try:
        auto_healer = get_empire_auto_healer()
        healing_results = auto_healer.get_latest_healing_results()
        
        if not healing_results:
            return jsonify({
                'success': False,
                'message': 'No healing session results available. Run /empire/healing/trigger first.',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Option to get summary only
        summary_only = request.args.get('summary', 'false').lower() == 'true'
        
        if summary_only:
            response_data = {
                'success': True,
                'healing_summary': healing_results.get('summary'),
                'timestamp': datetime.now().isoformat()
            }
        else:
            response_data = {
                'success': True,
                'healing_results': healing_results,
                'timestamp': datetime.now().isoformat()
            }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Failed to get healing results: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@empire_bp.route('/healing/status', methods=['GET'])
def get_healing_status():
    """
    Get auto-healing system status and capabilities.
    
    Returns current healing system configuration, last session info,
    and available healing capabilities.
    """
    try:
        auto_healer = get_empire_auto_healer()
        healing_status = auto_healer.get_healing_status()
        
        return jsonify({
            'success': True,
            'healing_status': healing_status,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Healing status check failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


# Error handlers for the empire blueprint
@empire_bp.errorhandler(404)
def not_found(error):
    """Handle 404 errors for empire endpoints."""
    return jsonify({
        'success': False,
        'error': 'Empire endpoint not found',
        'available_endpoints': [
            '/empire/health',
            '/empire/scan',
            '/empire/scan/results', 
            '/empire/recommendations',
            '/empire/evolution/readiness',
            '/empire/security/status',
            '/empire/performance/metrics',
            '/empire/status',
            '/empire/healing/trigger',
            '/empire/healing/results',
            '/empire/healing/status',
            '/empire/autonomous/start',
            '/empire/autonomous/status', 
            '/empire/autonomous/stop',
            '/empire/autonomous/decisions'
        ],
        'timestamp': datetime.now().isoformat()
    }), 404


@empire_bp.route('/autonomous/start', methods=['POST'])
def start_autonomous_agent():
    """
    Start the autonomous empire management agent.
    
    Initiates continuous autonomous scanning, decision-making, and improvement.
    """
    try:
        import asyncio
        
        # Start autonomous empire in background
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def start_agent():
            agent = await start_autonomous_empire()
            return agent.get_current_status()
        
        # Run in thread to avoid blocking
        def run_async():
            return loop.run_until_complete(start_agent())
        
        import threading
        thread = threading.Thread(target=run_async, daemon=True)
        thread.start()
        
        # Give it a moment to start
        time.sleep(2)
        
        agent = get_autonomous_empire_agent()
        status = agent.get_current_status()
        
        return jsonify({
            'success': True,
            'message': 'Autonomous Empire Agent started successfully',
            'agent_status': status,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to start autonomous agent: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@empire_bp.route('/autonomous/status', methods=['GET'])
def get_autonomous_status():
    """
    Get current status of the autonomous empire agent.
    
    Returns agent metrics, recent decisions, and operational status.
    """
    try:
        agent = get_autonomous_empire_agent()
        status = agent.get_current_status()
        
        return jsonify({
            'success': True,
            'autonomous_status': status,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to get autonomous status: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@empire_bp.route('/autonomous/stop', methods=['POST'])
def stop_autonomous_agent():
    """
    Stop the autonomous empire management agent.
    
    Gracefully stops autonomous operations.
    """
    try:
        agent = get_autonomous_empire_agent()
        agent.stop_autonomous_operation()
        
        return jsonify({
            'success': True,
            'message': 'Autonomous Empire Agent stopped successfully',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to stop autonomous agent: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@empire_bp.route('/autonomous/decisions', methods=['GET'])
def get_autonomous_decisions():
    """
    Get recent autonomous decisions made by the empire agent.
    
    Returns detailed decision history and outcomes.
    """
    try:
        agent = get_autonomous_empire_agent()
        status = agent.get_current_status()
        
        return jsonify({
            'success': True,
            'total_decisions': status.get('decisions_made', 0),
            'recent_decisions': status.get('recent_decisions', []),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to get autonomous decisions: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now().isoformat()
        }), 500


@empire_bp.errorhandler(500)
def internal_error(error):
    """Handle 500 errors for empire endpoints."""
    return jsonify({
        'success': False,
        'error': 'Internal empire system error',
        'message': 'An unexpected error occurred in the empire management system',
        'timestamp': datetime.now().isoformat()
    }), 500


# ==========================================
# API EMPIRE ENDPOINTS FOR FRONTEND
# ==========================================

@api_empire_bp.route('/metrics', methods=['GET'])
def api_get_empire_metrics():
    """Get empire metrics for the command center UI."""
    try:
        health_service = get_health_service()
        empire_health = health_service.check_empire_health()
        
        # Format metrics for the frontend
        metrics = {
            'totalRevenue': empire_health.get('total_revenue', current_app.config.get('DEFAULT_TOTAL_REVENUE', '$0.00')),
            'activeAgents': empire_health.get('active_agents', current_app.config.get('DEFAULT_ACTIVE_AGENTS', 0)),
            'systemHealth': empire_health.get('overall_health', 'UNKNOWN'),
            'securityScore': empire_health.get('security_score', 0),
            'performanceScore': empire_health.get('performance_score', 0),
            'ordersProcessed': empire_health.get('orders_processed', current_app.config.get('DEFAULT_ORDERS_PROCESSED', 0)),
            'conversionRate': empire_health.get('conversion_rate', current_app.config.get('DEFAULT_CONVERSION_RATE', 0.0)),
            'uptime': empire_health.get('uptime', current_app.config.get('DEFAULT_UPTIME', '0%'))
        }
        
        return jsonify({
            'success': True,
            'data': metrics,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"API empire metrics failed: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'timestamp': datetime.now().isoformat()
        }), 500


@api_empire_bp.route('/agents', methods=['GET'])
def api_get_empire_agents():
    """Get active agents for the command center UI."""
    try:
        # Query real agent data from the autonomous agent service
        agent_service = get_autonomous_empire_agent()
        agents_raw = agent_service.list_agents()  # Assumes this returns a list of agent dicts
        agents = []
        for agent in agents_raw:
            agents.append({
                'id': agent.get('id', ''),
                'name': agent.get('name', ''),
                'type': agent.get('type', ''),
                'status': agent.get('status', 'unknown'),
                'lastRun': agent.get('last_run', datetime.now().isoformat()),
                'performance': agent.get('performance', 0.0),
                'description': agent.get('description', '')
            })
        
        return jsonify({
            'success': True,
            'data': agents,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.exception("API empire agents failed")
        return jsonify({
            'success': False,
            'error': 'Internal error. Unable to fetch empire agents.',
            'timestamp': datetime.now().isoformat()
        }), 500


@api_empire_bp.route('/opportunities', methods=['GET'])
def api_get_product_opportunities():
    """Get product opportunities for the command center UI."""
    try:
        # Mock product opportunities data
        opportunities = [
            {
                'id': 'opp-001',
                'title': 'Smart Home Security Kit',
                'category': 'Electronics',
                'profit_margin': 45.2,
                'demand_score': 87,
                'competition_level': 'Medium',
                'estimated_revenue': '$25,000',
                'source': 'Market Analysis',
                'status': 'pending',
                'discovered_at': datetime.now().isoformat()
            },
            {
                'id': 'opp-002',  
                'title': 'Wireless Gaming Headset',
                'category': 'Gaming',
                'profit_margin': 38.7,
                'demand_score': 92,
                'competition_level': 'High',
                'estimated_revenue': '$18,500',
                'source': 'Trend Analysis',
                'status': 'pending',
                'discovered_at': datetime.now().isoformat()
            },
            {
                'id': 'opp-003',
                'title': 'Eco-friendly Water Bottle',
                'category': 'Lifestyle',
                'profit_margin': 52.1,
                'demand_score': 78,
                'competition_level': 'Low',
                'estimated_revenue': '$12,300',
                'source': 'Sustainability Trends',
                'status': 'approved',
                'discovered_at': datetime.now().isoformat()
            }
        ]
        
        return jsonify({
            'success': True,
            'data': opportunities,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"API product opportunities failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@api_empire_bp.route('/campaigns', methods=['GET'])
def api_get_marketing_campaigns():
    """Get marketing campaigns for the command center UI."""
    try:
        # Mock campaign data
        campaigns = [
            {
                'id': 'camp-001',
                'name': 'Holiday Electronics Promo',
                'platform': 'Facebook Ads',
                'status': 'active',
                'budget': '$5,000',
                'spent': '$3,240',
                'impressions': 245800,
                'clicks': 9432,
                'conversions': 187,
                'roas': 4.2,
                'start_date': '2024-01-01',
                'end_date': '2024-01-31'
            },
            {
                'id': 'camp-002',
                'name': 'Gaming Gear Showcase',
                'platform': 'Google Ads',
                'status': 'active',
                'budget': '$3,500',
                'spent': '$2,890',
                'impressions': 178500,
                'clicks': 7234,
                'conversions': 156,
                'roas': 3.8,
                'start_date': '2024-01-05',
                'end_date': '2024-01-28'
            },
            {
                'id': 'camp-003',
                'name': 'Eco-Lifestyle Campaign',
                'platform': 'Instagram',
                'status': 'paused',
                'budget': '$2,000',
                'spent': '$1,450',
                'impressions': 95600,
                'clicks': 3821,
                'conversions': 89,
                'roas': 2.9,
                'start_date': '2024-01-10',
                'end_date': '2024-01-25'
            }
        ]
        
        return jsonify({
            'success': True,
            'data': campaigns,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"API marketing campaigns failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@api_empire_bp.route('/opportunities/<product_id>/approve', methods=['POST'])
def api_approve_product(product_id):
    """Approve a product opportunity."""
    try:
        logger.info(f'Approving product opportunity: {product_id}')
        
        # In real implementation, this would update the product status
        return jsonify({
            'success': True,
            'message': f'Product {product_id} approved successfully',
            'product_id': product_id,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"API approve product failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@api_empire_bp.route('/opportunities/<product_id>/reject', methods=['POST'])
def api_reject_product(product_id):
    """Reject a product opportunity."""
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'No reason provided')
        
        logger.info(f'Rejecting product opportunity: {product_id}, reason: {reason}')
        
        # In real implementation, this would update the product status
        return jsonify({
            'success': True,
            'message': f'Product {product_id} rejected',
            'product_id': product_id,
            'reason': reason,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"API reject product failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@api_empire_bp.route('/chat', methods=['POST'])
def api_empire_chat():
    """Handle chat messages with ARIA assistant."""
    try:
        data = request.get_json()
        if not data or 'content' not in data:
            return jsonify({
                'success': False,
                'error': 'Message content is required'
            }), 400
        
        content = data['content']
        logger.info(f'Processing chat message: {content[:100]}...')
        
        # Connect to ARIA agent infrastructure to get genuine response
        agent = get_autonomous_empire_agent()
        agent_response = agent.chat(content)  # Assumes agent has a .chat() method
        response = {
            'id': agent_response.get('id', f'msg-{int(datetime.now().timestamp())}'),
            'content': agent_response.get('content', ''),
            'type': agent_response.get('type', 'response'),
            'timestamp': agent_response.get('timestamp', datetime.now().isoformat()),
            'context': agent_response.get('context', {})
        }
        
        return jsonify({
            'success': True,
            'data': response,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"API empire chat failed: {e}")
        return jsonify({
            'success': False,
            'error': 'An internal error has occurred.',
            'timestamp': datetime.now().isoformat()
        }), 500