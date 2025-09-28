"""Security and Fraud Detection API Routes.

This module provides REST API endpoints for the production security agent,
enabling real-time security monitoring, fraud detection, and compliance management.
No mock data - all endpoints connect to real security agent business logic.
"""

import asyncio
from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging

from orchestrator.core.orchestrator import get_orchestrator
from core.security.rate_limiter import RateLimiter
from core.security.auth import require_auth, require_admin


# Initialize rate limiter
limiter = Limiter(
    app=None,  # Will be initialized by app factory
    key_func=get_remote_address,
    default_limits=["100 per hour"]
)

security_bp = Blueprint('security', __name__, url_prefix='/api/security')
logger = logging.getLogger(__name__)


@security_bp.route('/status', methods=['GET'])
@limiter.limit("30 per minute")
@require_auth
async def get_security_status():
    """Get real-time security agent status and key metrics."""
    try:
        orchestrator = get_orchestrator()
        security_agent = orchestrator.get_agent('security_fraud')
        
        if not security_agent:
            return jsonify({
                'success': False,
                'error': 'Security agent not available'
            }), 503
        
        # Get real agent health and status
        health_status = await security_agent.health_check()
        
        # Get current security metrics
        security_metrics = {
            'fraud_alerts_24h': len(security_agent.fraud_alerts),
            'security_events_24h': len(security_agent.security_events),
            'risk_threshold': security_agent.risk_threshold,
            'last_scan_time': health_status.get('last_run'),
            'agent_status': health_status.get('status'),
            'systems_status': health_status.get('systems_status', 'operational')
        }
        
        return jsonify({
            'success': True,
            'data': {
                'agent_health': health_status,
                'security_metrics': security_metrics,
                'timestamp': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting security status: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve security status'
        }), 500


@security_bp.route('/fraud-detection/run', methods=['POST'])
@limiter.limit("10 per minute")
@require_admin
async def run_fraud_detection():
    """Trigger immediate fraud detection scan on recent transactions."""
    try:
        orchestrator = get_orchestrator()
        security_agent = orchestrator.get_agent('security_fraud')
        
        if not security_agent:
            return jsonify({
                'success': False,
                'error': 'Security agent not available'
            }), 503
        
        # Run fraud detection
        suspicious_transactions = await security_agent._detect_fraudulent_transactions()
        
        # Process high-risk alerts
        high_risk_count = 0
        for transaction in suspicious_transactions:
            if transaction.get('risk_score', 0) >= security_agent.risk_threshold:
                high_risk_count += 1
                await security_agent._handle_fraud_alert(transaction)
        
        return jsonify({
            'success': True,
            'data': {
                'scan_completed': True,
                'transactions_analyzed': len(suspicious_transactions),
                'high_risk_detected': high_risk_count,
                'alerts_generated': high_risk_count,
                'timestamp': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error running fraud detection: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to run fraud detection'
        }), 500


@security_bp.route('/security-scan', methods=['POST'])
@limiter.limit("5 per minute")
@require_admin
async def run_security_scan():
    """Run comprehensive security monitoring scan."""
    try:
        orchestrator = get_orchestrator()
        security_agent = orchestrator.get_agent('security_fraud')
        
        if not security_agent:
            return jsonify({
                'success': False,
                'error': 'Security agent not available'
            }), 503
        
        # Run comprehensive security scan
        security_events = await security_agent._monitor_security_events()
        access_violations = await security_agent._monitor_access_violations()
        compliance_issues = await security_agent._check_compliance_status()
        
        # Process critical events
        critical_events = 0
        for event in security_events:
            if event.get('severity') == 'critical':
                critical_events += 1
                await security_agent._handle_security_event(event)
        
        # Process access violations
        for violation in access_violations:
            await security_agent._handle_access_violation(violation)
        
        # Process compliance issues
        for issue in compliance_issues:
            if issue.get('severity') in ['critical', 'high']:
                await security_agent._handle_compliance_issue(issue)
        
        return jsonify({
            'success': True,
            'data': {
                'scan_completed': True,
                'security_events': len(security_events),
                'critical_events': critical_events,
                'access_violations': len(access_violations),
                'compliance_issues': len(compliance_issues),
                'timestamp': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error running security scan: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to run security scan'
        }), 500


@security_bp.route('/alerts', methods=['GET'])
@limiter.limit("50 per minute")
@require_auth
async def get_security_alerts():
    """Get recent security alerts and fraud detections."""
    try:
        orchestrator = get_orchestrator()
        security_agent = orchestrator.get_agent('security_fraud')
        
        if not security_agent:
            return jsonify({
                'success': False,
                'error': 'Security agent not available'
            }), 503
        
        # Get query parameters
        limit = min(int(request.args.get('limit', 50)), 100)
        severity_filter = request.args.get('severity')
        alert_type = request.args.get('type')  # fraud, security, access, compliance
        
        # Combine all alerts
        all_alerts = []
        
        # Add fraud alerts
        if not alert_type or alert_type == 'fraud':
            for alert in security_agent.fraud_alerts[-limit:]:
                alert['alert_type'] = 'fraud'
                all_alerts.append(alert)
        
        # Add security events
        if not alert_type or alert_type == 'security':
            for event in security_agent.security_events[-limit:]:
                event['alert_type'] = 'security'
                all_alerts.append(event)
        
        # Filter by severity if specified
        if severity_filter:
            all_alerts = [alert for alert in all_alerts 
                         if alert.get('severity') == severity_filter]
        
        # Sort by timestamp (most recent first)
        all_alerts.sort(key=lambda x: x.get('detected_at', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'data': {
                'alerts': all_alerts[:limit],
                'total_count': len(all_alerts),
                'filters_applied': {
                    'severity': severity_filter,
                    'type': alert_type,
                    'limit': limit
                },
                'timestamp': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting security alerts: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve security alerts'
        }), 500


@security_bp.route('/compliance/status', methods=['GET'])
@limiter.limit("20 per minute")
@require_auth
async def get_compliance_status():
    """Get current compliance status across all standards."""
    try:
        orchestrator = get_orchestrator()
        security_agent = orchestrator.get_agent('security_fraud')
        
        if not security_agent:
            return jsonify({
                'success': False,
                'error': 'Security agent not available'
            }), 503
        
        # Run compliance checks
        compliance_issues = await security_agent._check_compliance_status()
        
        # Organize issues by compliance type
        compliance_summary = {
            'GDPR': {'issues': 0, 'critical': 0, 'high': 0},
            'PCI_DSS': {'issues': 0, 'critical': 0, 'high': 0},
            'SOC2': {'issues': 0, 'critical': 0, 'high': 0},
            'CCPA': {'issues': 0, 'critical': 0, 'high': 0},
            'DATA_SECURITY': {'issues': 0, 'critical': 0, 'high': 0}
        }
        
        for issue in compliance_issues:
            comp_type = issue.get('compliance_type', 'OTHER')
            severity = issue.get('severity', 'medium')
            
            if comp_type in compliance_summary:
                compliance_summary[comp_type]['issues'] += 1
                if severity == 'critical':
                    compliance_summary[comp_type]['critical'] += 1
                elif severity == 'high':
                    compliance_summary[comp_type]['high'] += 1
        
        # Calculate overall compliance score
        total_issues = len(compliance_issues)
        critical_issues = sum(1 for issue in compliance_issues if issue.get('severity') == 'critical')
        compliance_score = max(0, 100 - (critical_issues * 20 + total_issues * 5))
        
        return jsonify({
            'success': True,
            'data': {
                'overall_score': compliance_score,
                'total_issues': total_issues,
                'critical_issues': critical_issues,
                'compliance_summary': compliance_summary,
                'recent_issues': compliance_issues[-10:],  # Last 10 issues
                'last_check': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting compliance status: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve compliance status'
        }), 500


@security_bp.route('/risk-assessment', methods=['POST'])
@limiter.limit("20 per minute")
@require_auth
async def assess_transaction_risk():
    """Assess risk score for a specific transaction or customer."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body required'
            }), 400
        
        orchestrator = get_orchestrator()
        security_agent = orchestrator.get_agent('security_fraud')
        
        if not security_agent:
            return jsonify({
                'success': False,
                'error': 'Security agent not available'
            }), 503
        
        # Mock order data for risk assessment
        order_data = {
            'id': data.get('order_id'),
            'customer': {'id': data.get('customer_id'), 'email': data.get('email')},
            'total_price': data.get('amount', 0),
            'shipping_address': data.get('shipping_address', {}),
            'billing_address': data.get('billing_address', {}),
            'browser_ip': data.get('ip_address'),
            'payment_gateway_names': [data.get('payment_method', 'unknown')]
        }
        
        # Run ML fraud detection
        ml_prediction = await security_agent._run_ml_fraud_detection(order_data)
        
        # Calculate overall risk score
        risk_score = ml_prediction.get('fraud_probability', 0.0)
        
        # Determine risk level
        if risk_score >= 0.8:
            risk_level = 'high'
        elif risk_score >= 0.5:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        # Generate recommendations
        recommendations = []
        if risk_score >= security_agent.risk_threshold:
            recommendations.append('Manual review required')
            if risk_score >= 0.9:
                recommendations.append('Consider blocking transaction')
        
        return jsonify({
            'success': True,
            'data': {
                'risk_score': round(risk_score, 3),
                'risk_level': risk_level,
                'ml_prediction': ml_prediction,
                'recommendations': recommendations,
                'requires_review': risk_score >= security_agent.risk_threshold,
                'assessment_timestamp': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error assessing transaction risk: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to assess transaction risk'
        }), 500


@security_bp.route('/configuration', methods=['GET'])
@limiter.limit("10 per minute")
@require_admin
async def get_security_configuration():
    """Get current security agent configuration."""
    try:
        orchestrator = get_orchestrator()
        security_agent = orchestrator.get_agent('security_fraud')
        
        if not security_agent:
            return jsonify({
                'success': False,
                'error': 'Security agent not available'
            }), 503
        
        config = {
            'risk_threshold': security_agent.risk_threshold,
            'agent_type': security_agent.agent_type,
            'agent_name': security_agent.name,
            'fraud_detection_enabled': True,
            'security_monitoring_enabled': True,
            'compliance_monitoring_enabled': True,
            'real_time_blocking_enabled': True
        }
        
        return jsonify({
            'success': True,
            'data': {
                'configuration': config,
                'timestamp': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting security configuration: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve security configuration'
        }), 500


@security_bp.route('/configuration', methods=['PUT'])
@limiter.limit("5 per minute")
@require_admin
async def update_security_configuration():
    """Update security agent configuration."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body required'
            }), 400
        
        orchestrator = get_orchestrator()
        security_agent = orchestrator.get_agent('security_fraud')
        
        if not security_agent:
            return jsonify({
                'success': False,
                'error': 'Security agent not available'
            }), 503
        
        # Update risk threshold if provided
        if 'risk_threshold' in data:
            new_threshold = float(data['risk_threshold'])
            if 0.0 <= new_threshold <= 1.0:
                security_agent.risk_threshold = new_threshold
                logger.info(f"Risk threshold updated to {new_threshold}")
            else:
                return jsonify({
                    'success': False,
                    'error': 'Risk threshold must be between 0.0 and 1.0'
                }), 400
        
        return jsonify({
            'success': True,
            'data': {
                'message': 'Security configuration updated successfully',
                'new_risk_threshold': security_agent.risk_threshold,
                'timestamp': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error updating security configuration: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to update security configuration'
        }), 500


@security_bp.errorhandler(429)
def handle_rate_limit_exceeded(e):
    """Handle rate limit exceeded errors."""
    return jsonify({
        'success': False,
        'error': 'Rate limit exceeded',
        'retry_after': e.retry_after
    }), 429


def init_security_routes(app):
    """Initialize security routes with the Flask app."""
    limiter.init_app(app)
    app.register_blueprint(security_bp)
    logger.info("Security API routes initialized successfully")