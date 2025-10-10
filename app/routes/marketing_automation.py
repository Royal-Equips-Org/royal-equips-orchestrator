"""
Marketing Automation API Routes - Production Implementation
Real-time marketing automation with complete integrations
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, List

from flask import Blueprint, request, jsonify
from marshmallow import Schema, fields, ValidationError

from orchestrator.agents.production_marketing_automation import create_production_marketing_agent
from app.services.production_agent_executor import get_agent_executor
from core.secrets.secret_provider import UnifiedSecretResolver


logger = logging.getLogger(__name__)

marketing_bp = Blueprint('marketing', __name__, url_prefix='/api/marketing')


class CampaignCreateSchema(Schema):
    """Schema for creating marketing campaigns."""
    name = fields.Str(required=True, validate=lambda x: len(x) >= 3)
    campaign_type = fields.Str(required=True, validate=lambda x: x in ['email', 'sms', 'social_media', 'content_marketing'])
    target_audience = fields.Dict(required=True)
    content = fields.Dict(required=True)
    budget = fields.Float(required=True, validate=lambda x: x > 0)
    schedule = fields.Dict(load_default={})


class ContentGenerationSchema(Schema):
    """Schema for content generation requests."""
    content_type = fields.Str(required=True, validate=lambda x: x in ['email_subject', 'social_post', 'product_description', 'blog_post'])
    prompt = fields.Str(required=True, validate=lambda x: len(x) >= 10)
    tone = fields.Str(load_default='professional', validate=lambda x: x in ['professional', 'casual', 'luxury', 'friendly'])
    max_length = fields.Int(load_default=500, validate=lambda x: 10 <= x <= 2000)


@marketing_bp.route('/health', methods=['GET'])
async def marketing_health():
    """Get marketing agent health status."""
    try:
        agent = await create_production_marketing_agent()
        status = await agent.get_status()
        
        return jsonify({
            'status': 'healthy',
            'agent_status': status,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Marketing health check failed: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@marketing_bp.route('/execute', methods=['POST'])
async def execute_marketing_automation():
    """Execute full marketing automation cycle."""
    try:
        # Get execution parameters
        params = request.get_json() or {}
        
        # Create and execute marketing agent
        agent = await create_production_marketing_agent()
        result = await agent.run()
        
        # Store execution in database
        agent_executor = await get_agent_executor()
        execution_id = await agent_executor.execute_agent(
            agent_type='marketing_automation',
            agent_data={'execution_params': params},
            user_context={'api_request': True}
        )
        
        return jsonify({
            'status': 'success',
            'execution_id': execution_id,
            'result': result,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Marketing automation execution failed: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@marketing_bp.route('/performance/analysis', methods=['GET'])
async def get_performance_analysis():
    """Get detailed marketing performance analysis."""
    try:
        agent = await create_production_marketing_agent()
        
        # Run performance analysis only
        performance_data = await agent._analyze_marketing_performance()
        
        return jsonify({
            'status': 'success',
            'performance_analysis': performance_data,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Performance analysis failed: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@marketing_bp.route('/campaigns/recommendations', methods=['GET'])
async def get_campaign_recommendations():
    """Get AI-powered campaign recommendations."""
    try:
        agent = await create_production_marketing_agent()
        
        # Get performance data first
        performance_data = await agent._analyze_marketing_performance()
        
        # Generate recommendations based on performance
        recommendations = await agent._generate_campaign_recommendations(performance_data)
        
        return jsonify({
            'status': 'success',
            'recommendations': recommendations,
            'based_on_performance': performance_data,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Campaign recommendations failed: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@marketing_bp.route('/campaigns/create', methods=['POST'])
async def create_marketing_campaign():
    """Create and schedule a new marketing campaign."""
    try:
        # Validate input
        schema = CampaignCreateSchema()
        try:
            campaign_data = schema.load(request.get_json())
        except ValidationError as err:
            return jsonify({
                'status': 'error',
                'validation_errors': err.messages,
                'timestamp': datetime.now().isoformat()
            }), 400
        
        agent = await create_production_marketing_agent()
        
        # Execute campaign creation
        campaign_result = await agent._execute_single_campaign({
            'id': f"campaign_{int(datetime.now().timestamp())}",
            'type': campaign_data['campaign_type'],
            'name': campaign_data['name'],
            'target_audience': campaign_data['target_audience'],
            'content': campaign_data['content'],
            'budget': campaign_data['budget'],
            'schedule': campaign_data['schedule']
        })
        
        # Store campaign in database
        agent_executor = await get_agent_executor()
        execution_id = await agent_executor.execute_agent(
            agent_type='campaign_creation',
            agent_data={'campaign': campaign_data, 'result': campaign_result},
            user_context={'api_request': True}
        )
        
        return jsonify({
            'status': 'success',
            'campaign_result': campaign_result,
            'execution_id': execution_id,
            'timestamp': datetime.now().isoformat()
        }), 201
        
    except Exception as e:
        logger.error(f"Campaign creation failed: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@marketing_bp.route('/content/generate', methods=['POST'])
async def generate_marketing_content():
    """Generate marketing content using AI."""
    try:
        # Validate input
        schema = ContentGenerationSchema()
        try:
            content_request = schema.load(request.get_json())
        except ValidationError as err:
            return jsonify({
                'status': 'error',
                'validation_errors': err.messages,
                'timestamp': datetime.now().isoformat()
            }), 400
        
        agent = await create_production_marketing_agent()
        
        # Generate content
        content_result = await agent._generate_single_content({
            'type': content_request['content_type'],
            'prompt': f"{content_request['prompt']} (Tone: {content_request['tone']}, Max length: {content_request['max_length']} characters)"
        })
        
        # Store generation in database
        agent_executor = await get_agent_executor()
        execution_id = await agent_executor.execute_agent(
            agent_type='content_generation',
            agent_data={'request': content_request, 'result': content_result},
            user_context={'api_request': True}
        )
        
        return jsonify({
            'status': 'success',
            'content': content_result,
            'execution_id': execution_id,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Content generation failed: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@marketing_bp.route('/campaigns/active', methods=['GET'])
async def get_active_campaigns():
    """Get all currently active marketing campaigns."""
    try:
        agent = await create_production_marketing_agent()
        
        # Get email campaigns from Klaviyo
        email_data = await agent._get_email_marketing_data()
        active_campaigns = email_data.get('active_campaigns', [])
        
        # Get social campaigns (if implemented)
        social_data = await agent._get_social_media_data()
        
        return jsonify({
            'status': 'success',
            'active_campaigns': {
                'email': active_campaigns,
                'social': {
                    'platforms': social_data.get('social_platforms', []),
                    'engagement_rate': social_data.get('engagement_rate', 0)
                },
                'total_active': len(active_campaigns)
            },
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get active campaigns: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@marketing_bp.route('/metrics/real-time', methods=['GET'])
async def get_realtime_metrics():
    """Get real-time marketing metrics."""
    try:
        agent = await create_production_marketing_agent()
        
        # Get comprehensive marketing data
        performance_data = await agent._analyze_marketing_performance()
        email_data = await agent._get_email_marketing_data()
        social_data = await agent._get_social_media_data()
        
        # Calculate real-time KPIs
        metrics = {
            'revenue': {
                'email_attributed': performance_data.get('revenue_attribution', {}).get('email_marketing', 0),
                'social_attributed': performance_data.get('revenue_attribution', {}).get('social_media', 0),
                'total_attributed': sum(performance_data.get('revenue_attribution', {}).values())
            },
            'engagement': {
                'email_open_rate': email_data.get('avg_open_rate', 0),
                'email_click_rate': email_data.get('avg_click_rate', 0),
                'social_engagement_rate': social_data.get('engagement_rate', 0)
            },
            'campaigns': {
                'active_email': len(email_data.get('active_campaigns', [])),
                'total_sent': email_data.get('total_sent', 0),
                'social_impressions': social_data.get('impressions', 0)
            },
            'performance': {
                'roas': performance_data.get('campaign_performance', {}).get('roas', 0),
                'conversion_rate': performance_data.get('campaign_performance', {}).get('conversion_rate', 0)
            }
        }
        
        return jsonify({
            'status': 'success',
            'metrics': metrics,
            'timestamp': datetime.now().isoformat(),
            'refresh_rate': 30  # seconds
        }), 200
        
    except Exception as e:
        logger.error(f"Real-time metrics failed: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@marketing_bp.route('/integrations/test', methods=['GET'])
async def test_marketing_integrations():
    """Test all marketing service integrations."""
    try:
        agent = await create_production_marketing_agent()
        
        # Test all integrations
        integration_results = await agent._test_integrations()
        
        # Get detailed status
        agent_status = await agent.get_status()
        
        return jsonify({
            'status': 'success',
            'integrations': integration_results,
            'agent_status': agent_status,
            'recommendations': _get_integration_recommendations(integration_results),
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Integration test failed: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


def _get_integration_recommendations(integration_results: Dict[str, bool]) -> List[str]:
    """Get recommendations based on integration test results."""
    recommendations = []
    
    if not integration_results.get('openai', False):
        recommendations.append("Configure OPENAI_API_KEY for AI content generation")
    
    if not integration_results.get('klaviyo', False):
        recommendations.append("Configure KLAVIYO_API_KEY for email marketing automation")
    
    if not integration_results.get('sendgrid', False):
        recommendations.append("Configure SENDGRID_API_KEY for transactional emails")
    
    if not integration_results.get('facebook', False):
        recommendations.append("Configure FACEBOOK_ACCESS_TOKEN for social media management")
    
    if not recommendations:
        recommendations.append("All integrations are working correctly!")
    
    return recommendations


# WebSocket events for real-time updates
def register_marketing_websocket_events(socketio):
    """Register WebSocket events for real-time marketing updates."""
    
    @socketio.on('marketing_metrics_request', namespace='/ws/marketing')
    def handle_marketing_metrics_request():
        """Handle request for real-time marketing metrics."""
        try:
            # Get metrics asynchronously
            async def get_metrics():
                agent = await create_production_marketing_agent()
                performance_data = await agent._analyze_marketing_performance()
                return performance_data
            
            metrics = asyncio.run(get_metrics())
            socketio.emit('marketing_metrics_update', metrics, namespace='/ws/marketing')
            
        except Exception as e:
            logger.error(f"WebSocket marketing metrics failed: {e}")
            socketio.emit('marketing_metrics_error', {'error': str(e)}, namespace='/ws/marketing')
    
    @socketio.on('campaign_status_request', namespace='/ws/marketing')
    def handle_campaign_status_request():
        """Handle request for campaign status updates."""
        try:
            async def get_campaign_status():
                agent = await create_production_marketing_agent()
                email_data = await agent._get_email_marketing_data()
                return {
                    'active_campaigns': len(email_data.get('active_campaigns', [])),
                    'total_sent': email_data.get('total_sent', 0),
                    'engagement_score': email_data.get('engagement_score', 0)
                }
            
            status = asyncio.run(get_campaign_status())
            socketio.emit('campaign_status_update', status, namespace='/ws/marketing')
            
        except Exception as e:
            logger.error(f"WebSocket campaign status failed: {e}")
            socketio.emit('campaign_status_error', {'error': str(e)}, namespace='/ws/marketing')


# Background task for continuous marketing monitoring
async def start_marketing_monitoring():
    """Start continuous marketing performance monitoring."""
    try:
        logger.info("Starting marketing performance monitoring")
        
        while True:
            try:
                agent = await create_production_marketing_agent()
                
                # Run performance analysis
                performance_data = await agent._analyze_marketing_performance()
                
                # Check for optimization opportunities
                optimization_results = await agent._optimize_running_campaigns()
                
                # Log key metrics
                logger.info(f"Marketing monitoring: {performance_data.get('campaign_performance', {})}")
                
                # Sleep for 15 minutes
                await asyncio.sleep(900)
                
            except Exception as e:
                logger.error(f"Marketing monitoring cycle failed: {e}")
                await asyncio.sleep(300)  # 5 minutes on error
                
    except Exception as e:
        logger.error(f"Marketing monitoring startup failed: {e}")