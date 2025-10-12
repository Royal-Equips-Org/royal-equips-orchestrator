"""
Enhanced AIRA Intelligence Routes

Flask routes for the AI-native consciousness and intelligence system.
Provides endpoints for consciousness status, digital twin management,
intelligent decision making, and business optimization.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from typing import Dict, Any, Optional

from orchestrator.intelligence.enhanced_aira import EnhancedAIRAAgent, AIRAIntelligenceConfig
from app.orchestrator_bridge import get_orchestrator

# Initialize blueprint
aira_intelligence_bp = Blueprint('aira_intelligence', __name__, url_prefix='/api/aira-intelligence')

# Global AIRA intelligence agent
_aira_intelligence: Optional[EnhancedAIRAAgent] = None

logger = logging.getLogger(__name__)


def get_aira_intelligence() -> Optional[EnhancedAIRAAgent]:
    """Get or create AIRA intelligence agent"""
    global _aira_intelligence
    
    if _aira_intelligence is None:
        try:
            config = AIRAIntelligenceConfig(
                consciousness_enabled=True,
                digital_twin_enabled=True,
                autonomous_mode=False,  # Start in manual mode
                decision_confidence_threshold=0.75
            )
            
            _aira_intelligence = EnhancedAIRAAgent(
                name="AIRA-Royal-Intelligence",
                config=config,
                empire_context={
                    'business_domain': 'e-commerce',
                    'risk_tolerance': 0.6,
                    'optimization_focus': ['revenue', 'customer_satisfaction', 'efficiency']
                }
            )
            
            # Register with orchestrator if available
            orchestrator = get_orchestrator()
            if orchestrator:
                orchestrator.register_agent(_aira_intelligence, interval=60.0)  # Run every minute
            
            logger.info("🧠 AIRA Intelligence agent created and registered")
            
        except Exception as e:
            logger.error(f"Failed to create AIRA intelligence: {e}")
            return None
    
    return _aira_intelligence


@aira_intelligence_bp.route('/status', methods=['GET'])
def get_intelligence_status():
    """Get comprehensive AIRA intelligence status"""
    try:
        aira = get_aira_intelligence()
        if not aira:
            return jsonify({'error': 'AIRA intelligence not available'}), 500
        
        # Run async status check
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            status = loop.run_until_complete(aira.get_intelligence_status())
            return jsonify({
                'status': 'success',
                'data': status,
                'timestamp': datetime.now().isoformat()
            })
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Intelligence status error: {e}")
        return jsonify({'error': str(e)}), 500


@aira_intelligence_bp.route('/consciousness/status', methods=['GET'])
def get_consciousness_status():
    """Get consciousness engine status"""
    try:
        aira = get_aira_intelligence()
        if not aira or not aira.consciousness:
            return jsonify({'error': 'Consciousness engine not available'}), 500
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            status = loop.run_until_complete(aira.consciousness.get_consciousness_status())
            return jsonify({
                'status': 'success',
                'consciousness': status,
                'timestamp': datetime.now().isoformat()
            })
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Consciousness status error: {e}")
        return jsonify({'error': str(e)}), 500


@aira_intelligence_bp.route('/digital-twin/status', methods=['GET'])
def get_digital_twin_status():
    """Get digital twin engine status"""
    try:
        aira = get_aira_intelligence()
        if not aira or not aira.digital_twin:
            return jsonify({'error': 'Digital twin engine not available'}), 500
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            status = loop.run_until_complete(aira.digital_twin.get_engine_status())
            return jsonify({
                'status': 'success',
                'digital_twin': status,
                'timestamp': datetime.now().isoformat()
            })
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Digital twin status error: {e}")
        return jsonify({'error': str(e)}), 500


@aira_intelligence_bp.route('/decision/make', methods=['POST'])
def make_intelligent_decision():
    """Make an intelligent business decision"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['situation', 'available_actions', 'objectives']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        aira = get_aira_intelligence()
        if not aira:
            return jsonify({'error': 'AIRA intelligence not available'}), 500
        
        # Extract decision parameters
        situation = data['situation']
        available_actions = data['available_actions']
        objectives = data['objectives']
        constraints = data.get('constraints', [])
        confidence_threshold = data.get('confidence_threshold', 0.75)
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            decision = loop.run_until_complete(
                aira.make_business_decision(
                    situation=situation,
                    available_actions=available_actions,
                    objectives=objectives,
                    constraints=constraints,
                    require_confidence=confidence_threshold
                )
            )
            
            if decision:
                return jsonify({
                    'status': 'success',
                    'decision': decision,
                    'timestamp': datetime.now().isoformat()
                })
            else:
                return jsonify({
                    'status': 'no_decision',
                    'message': 'No decision could be made with required confidence',
                    'timestamp': datetime.now().isoformat()
                })
                
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Decision making error: {e}")
        return jsonify({'error': str(e)}), 500


@aira_intelligence_bp.route('/market-intelligence', methods=['GET'])
def get_market_intelligence():
    """Get comprehensive market intelligence analysis"""
    try:
        aira = get_aira_intelligence()
        if not aira:
            return jsonify({'error': 'AIRA intelligence not available'}), 500
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            intelligence = loop.run_until_complete(aira.get_market_intelligence())
            return jsonify({
                'status': 'success',
                'market_intelligence': intelligence,
                'timestamp': datetime.now().isoformat()
            })
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Market intelligence error: {e}")
        return jsonify({'error': str(e)}), 500


@aira_intelligence_bp.route('/optimize/business', methods=['POST'])
def optimize_business_operations():
    """Optimize business operations using AI intelligence"""
    try:
        data = request.get_json() or {}
        focus_areas = data.get('focus_areas', ['revenue', 'efficiency', 'customer_satisfaction'])
        
        aira = get_aira_intelligence()
        if not aira:
            return jsonify({'error': 'AIRA intelligence not available'}), 500
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            optimization = loop.run_until_complete(
                aira.optimize_business_operations(focus_areas)
            )
            
            return jsonify({
                'status': 'success',
                'optimization': optimization,
                'timestamp': datetime.now().isoformat()
            })
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Business optimization error: {e}")
        return jsonify({'error': str(e)}), 500


@aira_intelligence_bp.route('/learn/outcome', methods=['POST'])
def learn_from_outcome():
    """Learn from business outcomes to improve intelligence"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['action_taken', 'expected_outcome', 'actual_outcome']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        aira = get_aira_intelligence()
        if not aira:
            return jsonify({'error': 'AIRA intelligence not available'}), 500
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            await_result = loop.run_until_complete(
                aira.learn_from_business_outcome(
                    action_taken=data['action_taken'],
                    expected_outcome=data['expected_outcome'],
                    actual_outcome=data['actual_outcome'],
                    context=data.get('context', {})
                )
            )
            
            return jsonify({
                'status': 'success',
                'message': 'Learning completed successfully',
                'timestamp': datetime.now().isoformat()
            })
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Learning from outcome error: {e}")
        return jsonify({'error': str(e)}), 500


@aira_intelligence_bp.route('/twin/create', methods=['POST'])
def create_digital_twin():
    """Create a new digital twin"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['twin_id', 'twin_type', 'name', 'description', 'data_sources', 'key_metrics']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        aira = get_aira_intelligence()
        if not aira or not aira.digital_twin:
            return jsonify({'error': 'Digital twin engine not available'}), 500
        
        # Map twin_type string to enum
        from orchestrator.intelligence.digital_twin import TwinType
        twin_type_map = {
            'business_process': TwinType.BUSINESS_PROCESS,
            'customer_behavior': TwinType.CUSTOMER_BEHAVIOR,
            'market_dynamics': TwinType.MARKET_DYNAMICS,
            'financial_model': TwinType.FINANCIAL_MODEL,
            'operational_system': TwinType.OPERATIONAL_SYSTEM,
            'product_lifecycle': TwinType.PRODUCT_LIFECYCLE
        }
        
        twin_type_str = data['twin_type']
        if twin_type_str not in twin_type_map:
            return jsonify({'error': f'Invalid twin_type: {twin_type_str}'}), 400
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            success = loop.run_until_complete(
                aira.digital_twin.create_business_twin(
                    twin_id=data['twin_id'],
                    twin_type=twin_type_map[twin_type_str],
                    name=data['name'],
                    description=data['description'],
                    data_sources=data['data_sources'],
                    key_metrics=data['key_metrics']
                )
            )
            
            if success:
                return jsonify({
                    'status': 'success',
                    'message': f'Digital twin {data["twin_id"]} created successfully',
                    'timestamp': datetime.now().isoformat()
                })
            else:
                return jsonify({'error': 'Failed to create digital twin'}), 500
                
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Digital twin creation error: {e}")
        return jsonify({'error': str(e)}), 500


@aira_intelligence_bp.route('/twin/prediction/<twin_id>/<metric>', methods=['GET'])
def get_twin_prediction(twin_id: str, metric: str):
    """Get prediction for a specific twin and metric"""
    try:
        # Get time horizon from query parameters
        hours = request.args.get('hours', 24, type=int)
        time_horizon = timedelta(hours=hours)
        
        aira = get_aira_intelligence()
        if not aira or not aira.digital_twin:
            return jsonify({'error': 'Digital twin engine not available'}), 500
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            prediction = loop.run_until_complete(
                aira.digital_twin.get_twin_prediction(twin_id, metric, time_horizon)
            )
            
            if prediction:
                return jsonify({
                    'status': 'success',
                    'prediction': prediction,
                    'timestamp': datetime.now().isoformat()
                })
            else:
                return jsonify({'error': f'No prediction available for {twin_id}.{metric}'}), 404
                
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Twin prediction error: {e}")
        return jsonify({'error': str(e)}), 500


@aira_intelligence_bp.route('/scenario/test', methods=['POST'])
def run_scenario_test():
    """Run a scenario test across multiple digital twins"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['scenario_id', 'name', 'description', 'parameters', 'twin_ids']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        aira = get_aira_intelligence()
        if not aira or not aira.digital_twin:
            return jsonify({'error': 'Digital twin engine not available'}), 500
        
        # Get duration (default 1 hour)
        duration_hours = data.get('duration_hours', 1)
        duration = timedelta(hours=duration_hours)
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            results = loop.run_until_complete(
                aira.digital_twin.run_scenario_test(
                    scenario_id=data['scenario_id'],
                    name=data['name'],
                    description=data['description'],
                    parameters=data['parameters'],
                    twin_ids=data['twin_ids'],
                    duration=duration
                )
            )
            
            if results:
                return jsonify({
                    'status': 'success',
                    'scenario_results': results,
                    'timestamp': datetime.now().isoformat()
                })
            else:
                return jsonify({'error': 'Scenario test failed'}), 500
                
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Scenario test error: {e}")
        return jsonify({'error': str(e)}), 500


@aira_intelligence_bp.route('/config/autonomous', methods=['POST'])
def configure_autonomous_mode():
    """Configure autonomous decision making mode"""
    try:
        data = request.get_json() or {}
        autonomous_enabled = data.get('enabled', False)
        confidence_threshold = data.get('confidence_threshold', 0.8)
        
        aira = get_aira_intelligence()
        if not aira:
            return jsonify({'error': 'AIRA intelligence not available'}), 500
        
        # Update configuration
        aira.config.autonomous_mode = autonomous_enabled
        aira.config.decision_confidence_threshold = confidence_threshold
        
        logger.info(f"🤖 Autonomous mode {'enabled' if autonomous_enabled else 'disabled'} with confidence threshold {confidence_threshold}")
        
        return jsonify({
            'status': 'success',
            'autonomous_mode': autonomous_enabled,
            'confidence_threshold': confidence_threshold,
            'message': f'Autonomous mode {"enabled" if autonomous_enabled else "disabled"}',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Autonomous configuration error: {e}")
        return jsonify({'error': str(e)}), 500


@aira_intelligence_bp.route('/metrics/intelligence', methods=['GET'])
def get_intelligence_metrics():
    """Get intelligence performance metrics"""
    try:
        aira = get_aira_intelligence()
        if not aira:
            return jsonify({'error': 'AIRA intelligence not available'}), 500
        
        metrics = {
            'aira_metrics': aira.intelligence_metrics.copy(),
            'consciousness_metrics': {},
            'digital_twin_metrics': {}
        }
        
        # Add consciousness metrics
        if aira.consciousness:
            metrics['consciousness_metrics'] = aira.consciousness.metrics.copy()
        
        # Add digital twin metrics  
        if aira.digital_twin:
            metrics['digital_twin_metrics'] = aira.digital_twin.metrics.copy()
        
        return jsonify({
            'status': 'success',
            'metrics': metrics,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Intelligence metrics error: {e}")
        return jsonify({'error': str(e)}), 500


@aira_intelligence_bp.route('/health', methods=['GET'])
def health_check():
    """Health check for AIRA intelligence system"""
    try:
        aira = get_aira_intelligence()
        
        health_status = {
            'aira_intelligence': 'healthy' if aira else 'unavailable',
            'consciousness_engine': 'healthy' if aira and aira.consciousness else 'unavailable',
            'digital_twin_engine': 'healthy' if aira and aira.digital_twin else 'unavailable',
            'autonomous_mode': aira.config.autonomous_mode if aira else False,
            'last_execution': aira.last_execution.isoformat() if aira and aira.last_execution else None
        }
        
        overall_status = 'healthy' if all(
            status == 'healthy' for status in health_status.values() 
            if isinstance(status, str)
        ) else 'degraded'
        
        return jsonify({
            'status': overall_status,
            'components': health_status,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


# Error handlers
@aira_intelligence_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@aira_intelligence_bp.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'error': 'Method not allowed'}), 405


@aira_intelligence_bp.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500