"""
Royal Equips Empire API Routes - Real Business Logic Implementation

Provides comprehensive empire management with real integrations:
- Real agent performance monitoring and control
- Live product opportunity tracking
- Actual marketing campaign management  
- Real-time metrics and KPIs
- Business intelligence and analytics

This replaces all mock/demo endpoints with real business functionality.
"""

import logging
import asyncio
from datetime import datetime
from flask import Blueprint, jsonify, request
from typing import Dict, Any, List

from app.services.empire_service import get_empire_service

logger = logging.getLogger(__name__)

# Create empire API blueprint
empire_bp = Blueprint('empire', __name__, url_prefix='/api/empire')

@empire_bp.route('/agents', methods=['GET'])
async def get_agents():
    """Get all agents with real performance data."""
    try:
        empire_service = await get_empire_service()
        agents = await empire_service.get_agents()
        
        # Convert agents to dict format for JSON response
        agents_data = []
        for agent in agents:
            agents_data.append({
                'id': agent.id,
                'name': agent.name,
                'type': agent.type.value,
                'status': agent.status.value,
                'health': agent.health,
                'last_activity': agent.last_activity.isoformat(),
                'total_tasks': agent.total_tasks,
                'completed_tasks': agent.completed_tasks,
                'error_count': agent.error_count,
                'performance': {
                    'avg_response_time': agent.avg_response_time,
                    'success_rate': agent.success_rate,
                    'throughput': agent.throughput
                },
                'capabilities': agent.capabilities
            })
        
        return jsonify({
            'agents': agents_data,
            'total': len(agents_data),
            'active': len([a for a in agents if a.status.value == 'active']),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to get agents: {e}")
        return jsonify({'error': 'Failed to retrieve agent data'}), 500

@empire_bp.route('/agents/status', methods=['GET'])
async def get_agents_status():
    """Get agents status summary."""
    try:
        empire_service = await get_empire_service()
        agents = await empire_service.get_agents()
        
        status_summary = {
            'total_agents': len(agents),
            'active': len([a for a in agents if a.status.value == 'active']),
            'idle': len([a for a in agents if a.status.value == 'idle']),
            'error': len([a for a in agents if a.status.value == 'error']),
            'stopped': len([a for a in agents if a.status.value == 'stopped']),
            'average_health': sum(a.health for a in agents) / len(agents) if agents else 0,
            'total_tasks_completed': sum(a.completed_tasks for a in agents),
            'overall_success_rate': sum(a.success_rate for a in agents) / len(agents) if agents else 0,
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(status_summary)
        
    except Exception as e:
        logger.error(f"Failed to get agent status: {e}")
        return jsonify({'error': 'Failed to retrieve agent status'}), 500

@empire_bp.route('/agents/<agent_id>', methods=['GET'])
async def get_agent_details(agent_id: str):
    """Get detailed information about a specific agent."""
    try:
        empire_service = await get_empire_service()
        agent = await empire_service.get_agent(agent_id)
        
        if not agent:
            return jsonify({'error': 'Agent not found'}), 404
        
        agent_data = {
            'id': agent.id,
            'name': agent.name,
            'type': agent.type.value,
            'status': agent.status.value,
            'health': agent.health,
            'last_activity': agent.last_activity.isoformat(),
            'total_tasks': agent.total_tasks,
            'completed_tasks': agent.completed_tasks,
            'error_count': agent.error_count,
            'performance': {
                'avg_response_time': agent.avg_response_time,
                'success_rate': agent.success_rate,
                'throughput': agent.throughput
            },
            'capabilities': agent.capabilities,
            'metadata': {
                'uptime_percentage': max(0, min(100, 100 - (agent.error_count / max(agent.total_tasks, 1) * 100))),
                'efficiency_score': agent.success_rate * (agent.health / 100),
                'last_error': agent.last_activity if agent.error_count > 0 else None
            }
        }
        
        return jsonify(agent_data)
        
    except Exception as e:
        logger.error(f"Failed to get agent {agent_id}: {e}")
        return jsonify({'error': 'Failed to retrieve agent details'}), 500

@empire_bp.route('/agents/<agent_id>/run', methods=['POST'])
async def create_agent_session(agent_id: str):
    """Create a new agent execution session."""
    try:
        empire_service = await get_empire_service()
        request_data = request.get_json() or {}
        
        session_result = await empire_service.create_agent_session(
            agent_id=agent_id,
            parameters=request_data.get('parameters', {})
        )
        
        return jsonify(session_result), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Failed to create agent session for {agent_id}: {e}")
        return jsonify({'error': 'Failed to create agent session'}), 500

@empire_bp.route('/metrics', methods=['GET'])
async def get_empire_metrics():
    """Get comprehensive empire metrics and KPIs."""
    try:
        empire_service = await get_empire_service()
        metrics = await empire_service.get_empire_metrics()
        
        metrics_data = {
            'total_agents': metrics.total_agents,
            'active_agents': metrics.active_agents,
            'total_opportunities': metrics.total_opportunities,
            'approved_products': metrics.approved_products,
            'revenue_progress': metrics.revenue_progress,
            'target_revenue': metrics.target_revenue,
            'automation_level': metrics.automation_level,
            'system_uptime': metrics.system_uptime,
            'daily_discoveries': metrics.daily_discoveries,
            'profit_margin_avg': metrics.profit_margin_avg,
            'timestamp': metrics.timestamp.isoformat(),
            'performance': {
                'revenue_completion': (metrics.revenue_progress / metrics.target_revenue) * 100,
                'agent_efficiency': (metrics.active_agents / metrics.total_agents) * 100 if metrics.total_agents > 0 else 0,
                'discovery_rate': metrics.daily_discoveries / 24,  # Per hour
                'system_health': metrics.system_uptime
            }
        }
        
        return jsonify(metrics_data)
        
    except Exception as e:
        logger.error(f"Failed to get empire metrics: {e}")
        return jsonify({'error': 'Failed to retrieve empire metrics'}), 500

@empire_bp.route('/opportunities', methods=['GET'])
async def get_product_opportunities():
    """Get product opportunities discovered by research agents."""
    try:
        empire_service = await get_empire_service()
        opportunities = await empire_service.get_opportunities()
        
        # Convert opportunities to dict format
        opportunities_data = []
        for opp in opportunities:
            opportunities_data.append({
                'id': opp.id,
                'title': opp.title,
                'description': opp.description,
                'price_range': opp.price_range,
                'trend_score': opp.trend_score,
                'profit_potential': opp.profit_potential,
                'platform': opp.platform,
                'supplier_leads': opp.supplier_leads,
                'market_insights': opp.market_insights,
                'search_volume': opp.search_volume,
                'competition_level': opp.competition_level,
                'seasonal_factor': opp.seasonal_factor,
                'confidence_score': opp.confidence_score,
                'profit_margin': opp.profit_margin,
                'monthly_searches': opp.monthly_searches,
                'discovered_at': opp.discovered_at.isoformat(),
                'agent_source': opp.agent_source
            })
        
        return jsonify({
            'opportunities': opportunities_data,
            'total': len(opportunities_data),
            'high_potential': len([o for o in opportunities if o.profit_potential == 'High']),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to get opportunities: {e}")
        return jsonify({'error': 'Failed to retrieve opportunities'}), 500

@empire_bp.route('/campaigns', methods=['GET'])
async def get_marketing_campaigns():
    """Get marketing campaigns and their performance."""
    try:
        empire_service = await get_empire_service()
        campaigns = await empire_service.get_campaigns()
        
        # Convert campaigns to dict format
        campaigns_data = []
        for campaign in campaigns:
            campaigns_data.append({
                'id': campaign.id,
                'product_id': campaign.product_id,
                'product_title': campaign.product_title,
                'platform': campaign.platform,
                'format': campaign.format,
                'status': campaign.status,
                'budget': campaign.budget,
                'spent': campaign.spent,
                'reach': campaign.reach,
                'clicks': campaign.clicks,
                'conversions': campaign.conversions,
                'roas': campaign.roas,
                'created_at': campaign.created_at.isoformat(),
                'content': campaign.content,
                'performance': {
                    'ctr': (campaign.clicks / campaign.reach * 100) if campaign.reach > 0 else 0,
                    'conversion_rate': (campaign.conversions / campaign.clicks * 100) if campaign.clicks > 0 else 0,
                    'cost_per_conversion': (campaign.spent / campaign.conversions) if campaign.conversions > 0 else 0,
                    'budget_utilization': (campaign.spent / campaign.budget * 100) if campaign.budget > 0 else 0
                }
            })
        
        return jsonify({
            'campaigns': campaigns_data,
            'total': len(campaigns_data),
            'active': len([c for c in campaigns if c.status == 'active']),
            'total_budget': sum(c.budget for c in campaigns),
            'total_spent': sum(c.spent for c in campaigns),
            'total_conversions': sum(c.conversions for c in campaigns),
            'average_roas': sum(c.roas for c in campaigns) / len(campaigns) if campaigns else 0,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to get campaigns: {e}")
        return jsonify({'error': 'Failed to retrieve campaigns'}), 500

@empire_bp.route('/health', methods=['GET'])
async def get_empire_health():
    """Get overall empire system health."""
    try:
        empire_service = await get_empire_service()
        agents = await empire_service.get_agents()
        metrics = await empire_service.get_empire_metrics()
        
        # Calculate comprehensive health metrics
        agent_health = sum(a.health for a in agents) / len(agents) if agents else 0
        active_ratio = (metrics.active_agents / metrics.total_agents * 100) if metrics.total_agents > 0 else 0
        
        health_data = {
            'overall_health': (agent_health + active_ratio + metrics.system_uptime) / 3,
            'components': {
                'agents': {
                    'health': agent_health,
                    'active_percentage': active_ratio,
                    'total': metrics.total_agents,
                    'status': 'healthy' if agent_health > 80 else 'warning' if agent_health > 60 else 'critical'
                },
                'system': {
                    'uptime': metrics.system_uptime,
                    'automation_level': metrics.automation_level,
                    'status': 'healthy' if metrics.system_uptime > 99 else 'warning' if metrics.system_uptime > 95 else 'critical'
                },
                'business': {
                    'revenue_progress': (metrics.revenue_progress / metrics.target_revenue * 100),
                    'profit_margin': metrics.profit_margin_avg,
                    'daily_discoveries': metrics.daily_discoveries,
                    'status': 'healthy' if metrics.profit_margin_avg > 30 else 'warning' if metrics.profit_margin_avg > 20 else 'critical'
                }
            },
            'recommendations': [],
            'timestamp': datetime.now().isoformat()
        }
        
        # Add health recommendations
        if agent_health < 80:
            health_data['recommendations'].append('Consider restarting underperforming agents')
        if metrics.system_uptime < 99:
            health_data['recommendations'].append('Investigate system stability issues')
        if metrics.automation_level < 80:
            health_data['recommendations'].append('Optimize agent automation workflows')
        if not health_data['recommendations']:
            health_data['recommendations'].append('Empire systems operating optimally')
        
        return jsonify(health_data)
        
    except Exception as e:
        logger.error(f"Failed to get empire health: {e}")
        return jsonify({'error': 'Failed to retrieve empire health'}), 500

# Health endpoints for monitoring
@empire_bp.route('/healthz', methods=['GET'])
def health_check():
    """Basic health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'royal-equips-empire',
        'timestamp': datetime.now().isoformat()
    })

@empire_bp.route('/readyz', methods=['GET'])
async def readiness_check():
    """Readiness check - verifies service can handle requests."""
    try:
        empire_service = await get_empire_service()
        # Quick validation that service is ready
        agents = await empire_service.get_agents()
        
        return jsonify({
            'status': 'ready',
            'agents_available': len(agents),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return jsonify({
            'status': 'not_ready',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 503

@empire_bp.route('/chat', methods=['POST'])
async def empire_chat():
    """
    AIRA chat endpoint for intelligent conversations.
    Integrates with OpenAI for real AI-powered responses.
    """
    try:
        request_data = request.get_json()
        if not request_data or 'content' not in request_data:
            return jsonify({
                'error': 'Invalid request: "content" field is required',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        content = request_data['content']
        if not isinstance(content, str) or not content.strip():
            return jsonify({
                'error': 'Invalid request: "content" must be a non-empty string',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Import OpenAI service
        try:
            from core.secrets.secret_provider import UnifiedSecretResolver
            import openai
            
            # Get OpenAI API key from secrets
            secrets = UnifiedSecretResolver()
            try:
                openai_key = secrets.get_secret('OPENAI_API_KEY')
                api_key = openai_key.value if openai_key else None
            except Exception:
                api_key = None
            
            if not api_key:
                logger.error("OpenAI API key not configured")
                return jsonify({
                    'error': 'AIRA AI service is not configured. Please configure OPENAI_API_KEY environment variable to enable AI-powered responses.',
                    'content': 'I apologize, but I am currently unable to process your request. The AI service is not configured. Please contact your administrator to set up the OpenAI API key.',
                    'timestamp': datetime.now().isoformat(),
                    'configured': False
                }), 503
            
            # Initialize OpenAI client
            client = openai.OpenAI(api_key=api_key)
            
            # System prompt for AIRA
            system_prompt = """You are AIRA (Autonomous Intelligence for Royal Automation), 
the AI assistant for the Royal Equips e-commerce empire. You have deep knowledge of:
- E-commerce operations and automation
- Product research and market trends
- Inventory management and pricing strategies
- Marketing campaigns and customer engagement
- Order fulfillment and logistics
- Financial metrics and business intelligence

Your role is to provide intelligent, actionable insights and assist with operational decisions.
Be concise, professional, and data-driven in your responses. When discussing metrics or 
performance, reference real business KPIs and best practices."""
            
            # Make OpenAI API call
            completion = client.chat.completions.create(
                model='gpt-4-turbo-preview',
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': content}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            response_content = completion.choices[0].message.content
            
            if not response_content:
                raise ValueError("Empty response from OpenAI")
            
            return jsonify({
                'content': response_content,
                'timestamp': datetime.now().isoformat(),
                'model': 'gpt-4-turbo-preview',
                'configured': True
            })
            
        except ImportError as e:
            logger.error(f"OpenAI library not available: {e}")
            return jsonify({
                'error': 'OpenAI library not installed',
                'content': 'I apologize, but the AI service library is not properly installed. Please install the openai package.',
                'timestamp': datetime.now().isoformat(),
                'configured': False
            }), 503
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return jsonify({
                'error': f'Failed to generate AI response: {str(e)}',
                'content': 'I apologize, but I encountered an error processing your request. This could be due to an invalid API key or a temporary service issue. Please try again or contact support.',
                'timestamp': datetime.now().isoformat(),
                'configured': False
            }), 500
            
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        return jsonify({
            'error': f'Internal server error: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500