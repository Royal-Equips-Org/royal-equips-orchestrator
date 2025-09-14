"""Enhanced pricing API endpoints.

Provides REST API endpoints for the enhanced pricing system including:
- AI pricing recommendations
- Price alert management
- Automated rules configuration
- Pricing approval workflow
"""

from flask import Blueprint, request, jsonify, render_template
from typing import Dict, List, Any
import logging
import os
from datetime import datetime

from orchestrator.agents.pricing_optimizer import PricingOptimizerAgent
from orchestrator.services.price_alert_system import AlertRule
from orchestrator.services.pricing_rules_engine import PricingRule, RuleAction

# Create blueprint
pricing_bp = Blueprint('pricing', __name__, url_prefix='/api/pricing')
dashboard_bp = Blueprint('pricing_dashboard', __name__, url_prefix='/pricing')
logger = logging.getLogger(__name__)

# Global pricing agent instance (in production, this would be managed differently)
_pricing_agent: PricingOptimizerAgent = None


def get_pricing_agent() -> PricingOptimizerAgent:
    """Get the global pricing agent instance."""
    global _pricing_agent
    if _pricing_agent is None:
        _pricing_agent = PricingOptimizerAgent()
    return _pricing_agent


@pricing_bp.route('/status', methods=['GET'])
def get_pricing_status():
    """Get pricing system status and configuration."""
    try:
        agent = get_pricing_agent()
        
        status = {
            "pricing_system": "enhanced",
            "ai_enabled": agent.ai_service is not None,
            "rules_engine_enabled": agent.pricing_engine is not None,
            "alert_system_enabled": True,
            "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
            "alert_channels": {
                "email": os.getenv("PRICE_ALERT_EMAIL_ENABLED", "false").lower() == "true",
                "webhook": os.getenv("PRICE_ALERT_WEBHOOK_ENABLED", "false").lower() == "true"
            },
            "last_run": getattr(agent, '_last_run', None)
        }
        
        return jsonify(status)
        
    except Exception as e:
        logger.error(f"Error getting pricing status: {e}")
        return jsonify({"error": str(e)}), 500


@pricing_bp.route('/recommendations/<product_id>', methods=['GET'])
async def get_ai_recommendation(product_id: str):
    """Get AI pricing recommendation for a specific product."""
    try:
        current_price = request.args.get('current_price', type=float)
        if not current_price:
            return jsonify({"error": "current_price parameter required"}), 400
        
        agent = get_pricing_agent()
        if not agent.ai_service:
            return jsonify({"error": "AI service not available"}), 503
        
        recommendation = await agent.get_ai_recommendation(product_id, current_price)
        
        if not recommendation:
            return jsonify({"error": "Unable to generate recommendation"}), 404
        
        return jsonify({
            "product_id": recommendation.product_id,
            "current_price": recommendation.current_price,
            "recommended_price": recommendation.recommended_price,
            "confidence": recommendation.confidence,
            "reasoning": recommendation.reasoning,
            "market_positioning": recommendation.market_positioning,
            "expected_impact": recommendation.expected_impact,
            "risk_level": recommendation.risk_level,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting AI recommendation for {product_id}: {e}")
        return jsonify({"error": str(e)}), 500


@pricing_bp.route('/approvals', methods=['GET'])
def get_pending_approvals():
    """Get all pricing changes pending approval."""
    try:
        agent = get_pricing_agent()
        pending_requests = agent.get_pending_approvals()
        
        approvals = []
        for request in pending_requests:
            approvals.append({
                "request_id": request.request_id,
                "product_id": request.product_id,
                "current_price": request.current_price,
                "recommended_price": request.recommended_price,
                "confidence": request.recommendation.confidence,
                "reasoning": request.recommendation.reasoning,
                "created_at": request.created_at.isoformat(),
                "expires_at": request.expires_at.isoformat() if request.expires_at else None,
                "applied_by_rule": request.applied_by_rule,
                "approval_reason": request.approval_reason
            })
        
        return jsonify({
            "pending_approvals": approvals,
            "count": len(approvals)
        })
        
    except Exception as e:
        logger.error(f"Error getting pending approvals: {e}")
        return jsonify({"error": str(e)}), 500


@pricing_bp.route('/approvals/<request_id>', methods=['POST'])
async def approve_price_change(request_id: str):
    """Approve or reject a price change request."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON payload required"}), 400
        
        approved = data.get('approved')
        if approved is None:
            return jsonify({"error": "approved field required (true/false)"}), 400
        
        approver = data.get('approver', 'api_user')
        
        agent = get_pricing_agent()
        success = await agent.approve_price_change(request_id, approved, approver)
        
        if not success:
            return jsonify({"error": "Request not found or already processed"}), 404
        
        return jsonify({
            "success": True,
            "request_id": request_id,
            "approved": approved,
            "approver": approver,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error approving price change {request_id}: {e}")
        return jsonify({"error": str(e)}), 500


@pricing_bp.route('/alerts/summary', methods=['GET'])
def get_alert_summary():
    """Get summary of recent price alerts."""
    try:
        hours = request.args.get('hours', 24, type=int)
        
        agent = get_pricing_agent()
        summary = agent.get_alert_summary(hours)
        
        return jsonify(summary)
        
    except Exception as e:
        logger.error(f"Error getting alert summary: {e}")
        return jsonify({"error": str(e)}), 500


@pricing_bp.route('/history/<product_id>', methods=['GET'])
def get_pricing_history(product_id: str):
    """Get pricing history for a product."""
    try:
        days = request.args.get('days', 30, type=int)
        
        agent = get_pricing_agent()
        history = agent.get_pricing_history(product_id, days)
        
        return jsonify({
            "product_id": product_id,
            "history": history,
            "period_days": days
        })
        
    except Exception as e:
        logger.error(f"Error getting pricing history for {product_id}: {e}")
        return jsonify({"error": str(e)}), 500


@pricing_bp.route('/rules', methods=['GET'])
def get_pricing_rules():
    """Get configured pricing rules."""
    try:
        agent = get_pricing_agent()
        if not agent.pricing_engine:
            return jsonify({"error": "Pricing engine not available"}), 503
        
        rules_data = []
        for rule_id, rule in agent.pricing_engine.rules.items():
            rules_data.append({
                "rule_id": rule.rule_id,
                "name": rule.name,
                "description": rule.description,
                "min_confidence": rule.min_confidence,
                "max_confidence": rule.max_confidence,
                "max_price_increase": rule.max_price_increase,
                "max_price_decrease": rule.max_price_decrease,
                "action": rule.action.value,
                "enabled": rule.enabled,
                "priority": rule.priority
            })
        
        return jsonify({
            "rules": rules_data,
            "count": len(rules_data)
        })
        
    except Exception as e:
        logger.error(f"Error getting pricing rules: {e}")
        return jsonify({"error": str(e)}), 500


@pricing_bp.route('/rules', methods=['POST'])
def create_pricing_rule():
    """Create a new pricing rule."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON payload required"}), 400
        
        agent = get_pricing_agent()
        if not agent.pricing_engine:
            return jsonify({"error": "Pricing engine not available"}), 503
        
        # Validate required fields
        required_fields = ['rule_id', 'name', 'description', 'min_confidence', 'action']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Parse action
        try:
            action = RuleAction(data['action'])
        except ValueError:
            return jsonify({"error": "Invalid action value"}), 400
        
        # Create rule
        rule = PricingRule(
            rule_id=data['rule_id'],
            name=data['name'],
            description=data['description'],
            min_confidence=data['min_confidence'],
            max_confidence=data.get('max_confidence', 1.0),
            product_categories=data.get('product_categories', []),
            excluded_products=data.get('excluded_products', []),
            max_price_increase=data.get('max_price_increase', 0.20),
            max_price_decrease=data.get('max_price_decrease', 0.30),
            max_changes_per_day=data.get('max_changes_per_day', 3),
            cooldown_hours=data.get('cooldown_hours', 6),
            action=action,
            min_profit_margin=data.get('min_profit_margin', 0.15),
            enabled=data.get('enabled', True),
            priority=data.get('priority', 100)
        )
        
        agent.pricing_engine.add_rule(rule)
        
        return jsonify({
            "success": True,
            "rule_id": rule.rule_id,
            "message": "Pricing rule created successfully"
        })
        
    except Exception as e:
        logger.error(f"Error creating pricing rule: {e}")
        return jsonify({"error": str(e)}), 500


@pricing_bp.route('/test', methods=['POST'])
async def test_pricing_system():
    """Test the pricing system with sample data."""
    try:
        data = request.get_json() or {}
        
        # Test parameters
        product_id = data.get('product_id', 'test_product')
        current_price = data.get('current_price', 50.0)
        competitor_prices = data.get('competitor_prices', {'amazon': 45.0, 'ebay': 48.0})
        
        agent = get_pricing_agent()
        
        # Test AI recommendation if available
        ai_recommendation = None
        if agent.ai_service:
            try:
                ai_recommendation = await agent.get_ai_recommendation(product_id, current_price)
            except Exception as e:
                logger.warning(f"AI recommendation test failed: {e}")
        
        # Test alert system
        test_price_changes = {product_id: competitor_prices}
        alerts = await agent.alert_system.check_price_changes(test_price_changes)
        
        return jsonify({
            "test_results": {
                "product_id": product_id,
                "current_price": current_price,
                "competitor_prices": competitor_prices,
                "ai_recommendation": {
                    "available": ai_recommendation is not None,
                    "recommended_price": ai_recommendation.recommended_price if ai_recommendation else None,
                    "confidence": ai_recommendation.confidence if ai_recommendation else None
                } if agent.ai_service else {"available": False, "reason": "AI service not configured"},
                "alerts_triggered": len(alerts),
                "alert_details": [
                    {
                        "type": alert.alert_type,
                        "severity": alert.severity,
                        "change_percentage": alert.change_percentage
                    } for alert in alerts
                ]
            },
            "system_status": {
                "ai_enabled": agent.ai_service is not None,
                "rules_engine_enabled": agent.pricing_engine is not None,
                "alert_system_enabled": True
            }
        })
        
    except Exception as e:
        logger.error(f"Error testing pricing system: {e}")
        return jsonify({"error": str(e)}), 500


# Error handlers
@pricing_bp.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@pricing_bp.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500


# Dashboard routes
@dashboard_bp.route('/')
def pricing_dashboard():
    """Render the pricing dashboard."""
    return render_template('pricing/dashboard.html')


@dashboard_bp.route('/status')
def dashboard_status():
    """Dashboard status page with system overview."""
    return render_template('pricing/dashboard.html')