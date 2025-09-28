"""
Customer Support API Routes - Production Implementation
Real-time support ticket management, AI responses, and customer service automation
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

from flask import Blueprint, request, jsonify, current_app
from marshmallow import Schema, fields, ValidationError

from orchestrator.agents.production_customer_support import (
    ProductionCustomerSupportAgent, 
    SupportTicket, 
    TicketPriority, 
    TicketStatus,
    create_production_customer_support_agent
)
from app.services.database_service import DatabaseService
from core.security.rate_limiter import RateLimiter
from app.utils.auth import require_auth, get_current_user
from app.utils.validation import validate_json


# Blueprint setup
customer_support_bp = Blueprint('customer_support', __name__, url_prefix='/api/customer-support')

# Rate limiting
rate_limiter = RateLimiter(
    default_limits={
        'create_ticket': (50, 3600),  # 50 tickets per hour
        'get_tickets': (500, 3600),   # 500 requests per hour
        'ai_response': (100, 3600),   # 100 AI responses per hour
        'analytics': (200, 3600)      # 200 analytics requests per hour
    }
)

# Global agent instance
customer_support_agent: Optional[ProductionCustomerSupportAgent] = None


# Validation schemas
class TicketCreateSchema(Schema):
    """Schema for creating new support tickets."""
    customer_email = fields.Email(required=True)
    subject = fields.Str(required=True, validate=lambda x: 5 <= len(x) <= 200)
    description = fields.Str(required=True, validate=lambda x: 10 <= len(x) <= 5000)
    priority = fields.Str(missing='medium', validate=lambda x: x in ['low', 'medium', 'high', 'critical', 'urgent'])
    category = fields.Str(missing='general', validate=lambda x: x in ['billing', 'shipping', 'product', 'technical', 'refund', 'general'])
    order_id = fields.Str(missing=None)
    customer_phone = fields.Str(missing=None)


class TicketUpdateSchema(Schema):
    """Schema for updating support tickets."""
    status = fields.Str(validate=lambda x: x in ['new', 'open', 'pending', 'resolved', 'closed', 'escalated'])
    priority = fields.Str(validate=lambda x: x in ['low', 'medium', 'high', 'critical', 'urgent'])
    agent_response = fields.Str(validate=lambda x: len(x) <= 2000)
    customer_satisfaction_rating = fields.Int(validate=lambda x: 1 <= x <= 5)
    internal_notes = fields.Str(validate=lambda x: len(x) <= 1000)


class AIResponseSchema(Schema):
    """Schema for AI response generation."""
    ticket_id = fields.Str(required=True)
    context = fields.Dict(missing={})
    response_tone = fields.Str(missing='professional', validate=lambda x: x in ['professional', 'friendly', 'empathetic', 'formal'])
    max_length = fields.Int(missing=500, validate=lambda x: 50 <= x <= 1000)


async def get_agent() -> ProductionCustomerSupportAgent:
    """Get or create customer support agent instance."""
    global customer_support_agent
    
    if customer_support_agent is None:
        customer_support_agent = await create_production_customer_support_agent()
    
    return customer_support_agent


@customer_support_bp.route('/tickets', methods=['GET'])
@rate_limiter.limit('get_tickets')
@require_auth
async def get_support_tickets():
    """
    Get support tickets with filtering and pagination.
    
    Query parameters:
    - status: Filter by ticket status
    - priority: Filter by priority level
    - customer_email: Filter by customer email
    - date_from: Start date (ISO format)
    - date_to: End date (ISO format)
    - page: Page number (default: 1)
    - limit: Items per page (default: 20, max: 100)
    """
    try:
        # Get query parameters
        status = request.args.get('status')
        priority = request.args.get('priority')
        customer_email = request.args.get('customer_email')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        
        # Build filters
        filters = {}
        if status:
            filters['status'] = status
        if priority:
            filters['priority'] = priority
        if customer_email:
            filters['customer_email'] = customer_email
        if date_from:
            filters['created_after'] = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
        if date_to:
            filters['created_before'] = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
        
        # Get tickets from database
        db_service = DatabaseService()
        tickets_result = await db_service.get_support_tickets(
            filters=filters,
            page=page,
            limit=limit
        )
        
        return jsonify({
            'success': True,
            'data': {
                'tickets': tickets_result['tickets'],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': tickets_result['total'],
                    'pages': (tickets_result['total'] - 1) // limit + 1
                },
                'filters_applied': filters
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        current_app.logger.error(f"Failed to get support tickets: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve support tickets',
            'details': str(e)
        }), 500


@customer_support_bp.route('/tickets', methods=['POST'])
@rate_limiter.limit('create_ticket')
@validate_json(TicketCreateSchema())
async def create_support_ticket():
    """
    Create a new support ticket.
    
    Request body should contain:
    - customer_email: Customer's email address
    - subject: Ticket subject
    - description: Detailed description
    - priority: Priority level (optional, default: medium)
    - category: Ticket category (optional, default: general)
    - order_id: Related order ID (optional)
    - customer_phone: Customer phone (optional)
    """
    try:
        data = request.get_json()
        
        # Get customer support agent
        agent = await get_agent()
        
        # Create ticket ID
        import uuid
        ticket_id = f"TK-{uuid.uuid4().hex[:8].upper()}"
        
        # Analyze ticket using AI
        ticket_analysis = await agent._analyze_ticket({
            'subject': data['subject'],
            'description': data['description']
        })
        
        # Create ticket record
        ticket_data = {
            'id': ticket_id,
            'customer_email': data['customer_email'],
            'subject': data['subject'],
            'description': data['description'],
            'priority': ticket_analysis.get('priority', data.get('priority', 'medium')),
            'status': 'new',
            'category': ticket_analysis.get('category', data.get('category', 'general')),
            'sentiment_score': ticket_analysis.get('sentiment', 0),
            'order_id': data.get('order_id'),
            'customer_phone': data.get('customer_phone'),
            'created_at': datetime.now(),
            'updated_at': datetime.now(),
            'ai_analysis': ticket_analysis
        }
        
        # Save to database
        db_service = DatabaseService()
        saved_ticket = await db_service.create_support_ticket(ticket_data)
        
        # Generate AI response if appropriate
        ai_response = None
        if ticket_analysis.get('auto_response_appropriate', False):
            ai_response = await agent._generate_ticket_response(
                ticket_data, 
                ticket_analysis
            )
            
            if ai_response:
                # Save AI response
                await db_service.add_ticket_response(
                    ticket_id,
                    ai_response,
                    'ai_agent'
                )
        
        # Trigger real-time update
        from app.sockets import socketio
        socketio.emit('ticket_created', {
            'ticket': saved_ticket,
            'ai_response_generated': ai_response is not None
        }, namespace='/customer-support')
        
        return jsonify({
            'success': True,
            'data': {
                'ticket': saved_ticket,
                'ai_analysis': ticket_analysis,
                'ai_response_generated': ai_response is not None,
                'ai_response': ai_response if ai_response else None
            },
            'message': 'Support ticket created successfully',
            'timestamp': datetime.now().isoformat()
        }), 201
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'error': 'Validation failed',
            'details': e.messages
        }), 400
        
    except Exception as e:
        current_app.logger.error(f"Failed to create support ticket: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to create support ticket',
            'details': str(e)
        }), 500


@customer_support_bp.route('/tickets/<ticket_id>', methods=['GET'])
@rate_limiter.limit('get_tickets')
@require_auth
async def get_support_ticket(ticket_id: str):
    """Get detailed information about a specific support ticket."""
    try:
        # Get ticket from database
        db_service = DatabaseService()
        ticket = await db_service.get_support_ticket_by_id(ticket_id)
        
        if not ticket:
            return jsonify({
                'success': False,
                'error': 'Ticket not found'
            }), 404
        
        # Get ticket responses/history
        ticket_history = await db_service.get_ticket_history(ticket_id)
        
        # Get customer context
        agent = await get_agent()
        customer_context = await agent._get_customer_context(
            ticket.get('customer_id')
        )
        
        return jsonify({
            'success': True,
            'data': {
                'ticket': ticket,
                'history': ticket_history,
                'customer_context': customer_context
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        current_app.logger.error(f"Failed to get support ticket {ticket_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve support ticket',
            'details': str(e)
        }), 500


@customer_support_bp.route('/tickets/<ticket_id>', methods=['PUT'])
@rate_limiter.limit('create_ticket')
@require_auth
@validate_json(TicketUpdateSchema())
async def update_support_ticket(ticket_id: str):
    """Update a support ticket."""
    try:
        data = request.get_json()
        user = get_current_user()
        
        # Get existing ticket
        db_service = DatabaseService()
        existing_ticket = await db_service.get_support_ticket_by_id(ticket_id)
        
        if not existing_ticket:
            return jsonify({
                'success': False,
                'error': 'Ticket not found'
            }), 404
        
        # Update ticket data
        update_data = {
            'updated_at': datetime.now(),
            'updated_by': user.get('id', 'unknown')
        }
        
        if 'status' in data:
            update_data['status'] = data['status']
            if data['status'] == 'resolved':
                update_data['resolved_at'] = datetime.now()
        
        if 'priority' in data:
            update_data['priority'] = data['priority']
        
        if 'agent_response' in data:
            update_data['agent_response'] = data['agent_response']
        
        if 'customer_satisfaction_rating' in data:
            update_data['customer_satisfaction_rating'] = data['customer_satisfaction_rating']
        
        # Save updates
        updated_ticket = await db_service.update_support_ticket(ticket_id, update_data)
        
        # Add to ticket history
        if 'agent_response' in data:
            await db_service.add_ticket_response(
                ticket_id,
                data['agent_response'],
                user.get('id', 'agent'),
                internal_notes=data.get('internal_notes')
            )
        
        # Trigger real-time update
        from app.sockets import socketio
        socketio.emit('ticket_updated', {
            'ticket_id': ticket_id,
            'updates': update_data,
            'updated_by': user.get('name', 'Agent')
        }, namespace='/customer-support')
        
        return jsonify({
            'success': True,
            'data': {
                'ticket': updated_ticket,
                'updates_applied': update_data
            },
            'message': 'Support ticket updated successfully',
            'timestamp': datetime.now().isoformat()
        })
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'error': 'Validation failed',
            'details': e.messages
        }), 400
        
    except Exception as e:
        current_app.logger.error(f"Failed to update support ticket {ticket_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to update support ticket',
            'details': str(e)
        }), 500


@customer_support_bp.route('/ai/generate-response', methods=['POST'])
@rate_limiter.limit('ai_response')
@require_auth
@validate_json(AIResponseSchema())
async def generate_ai_response():
    """
    Generate AI-powered response for a support ticket.
    
    Request body:
    - ticket_id: ID of the ticket to respond to
    - context: Additional context for response generation
    - response_tone: Tone of the response (professional, friendly, empathetic, formal)
    - max_length: Maximum response length
    """
    try:
        data = request.get_json()
        ticket_id = data['ticket_id']
        
        # Get ticket details
        db_service = DatabaseService()
        ticket = await db_service.get_support_ticket_by_id(ticket_id)
        
        if not ticket:
            return jsonify({
                'success': False,
                'error': 'Ticket not found'
            }), 404
        
        # Get customer support agent
        agent = await get_agent()
        
        # Analyze ticket for context
        ticket_analysis = await agent._analyze_ticket(ticket)
        
        # Add custom context
        if data.get('context'):
            ticket_analysis.update(data['context'])
        
        # Generate AI response
        ai_response = await agent._generate_ticket_response(
            ticket,
            ticket_analysis
        )
        
        if not ai_response:
            return jsonify({
                'success': False,
                'error': 'Failed to generate AI response'
            }), 500
        
        # Optionally save as draft response
        user = get_current_user()
        await db_service.add_ticket_response(
            ticket_id,
            ai_response,
            'ai_assistant',
            is_draft=True,
            generated_by=user.get('id')
        )
        
        return jsonify({
            'success': True,
            'data': {
                'ticket_id': ticket_id,
                'ai_response': ai_response,
                'analysis': ticket_analysis,
                'response_metadata': {
                    'tone': data.get('response_tone', 'professional'),
                    'length': len(ai_response),
                    'generated_at': datetime.now().isoformat()
                }
            },
            'message': 'AI response generated successfully'
        })
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'error': 'Validation failed',
            'details': e.messages
        }), 400
        
    except Exception as e:
        current_app.logger.error(f"Failed to generate AI response: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate AI response',
            'details': str(e)
        }), 500


@customer_support_bp.route('/analytics', methods=['GET'])
@rate_limiter.limit('analytics')
@require_auth
async def get_support_analytics():
    """
    Get customer support analytics and performance metrics.
    
    Query parameters:
    - period: Time period (24h, 7d, 30d, 90d, 1y)
    - breakdown: Breakdown type (status, priority, category, agent)
    """
    try:
        period = request.args.get('period', '7d')
        breakdown = request.args.get('breakdown', 'status')
        
        # Calculate date range
        period_map = {
            '24h': timedelta(hours=24),
            '7d': timedelta(days=7),
            '30d': timedelta(days=30),
            '90d': timedelta(days=90),
            '1y': timedelta(days=365)
        }
        
        if period not in period_map:
            return jsonify({
                'success': False,
                'error': 'Invalid period. Use: 24h, 7d, 30d, 90d, 1y'
            }), 400
        
        end_date = datetime.now()
        start_date = end_date - period_map[period]
        
        # Get analytics from database
        db_service = DatabaseService()
        analytics = await db_service.get_support_analytics(
            start_date=start_date,
            end_date=end_date,
            breakdown=breakdown
        )
        
        # Get agent performance metrics
        agent = await get_agent()
        agent_metrics = agent.performance_metrics
        
        # Calculate additional metrics
        response_metrics = await db_service.get_response_metrics(start_date, end_date)
        sentiment_trends = await db_service.get_sentiment_trends(start_date, end_date)
        
        return jsonify({
            'success': True,
            'data': {
                'period': period,
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'ticket_analytics': analytics,
                'agent_performance': agent_metrics,
                'response_metrics': response_metrics,
                'sentiment_trends': sentiment_trends,
                'breakdown': breakdown
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        current_app.logger.error(f"Failed to get support analytics: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve support analytics',
            'details': str(e)
        }), 500


@customer_support_bp.route('/escalate/<ticket_id>', methods=['POST'])
@rate_limiter.limit('create_ticket')
@require_auth
async def escalate_ticket(ticket_id: str):
    """
    Escalate a support ticket to higher priority or human agent.
    
    Request body (optional):
    - reason: Escalation reason
    - priority: New priority level
    - assign_to: Agent to assign to
    """
    try:
        data = request.get_json() or {}
        user = get_current_user()
        
        # Get ticket
        db_service = DatabaseService()
        ticket = await db_service.get_support_ticket_by_id(ticket_id)
        
        if not ticket:
            return jsonify({
                'success': False,
                'error': 'Ticket not found'
            }), 404
        
        # Update ticket to escalated status
        escalation_data = {
            'status': 'escalated',
            'priority': data.get('priority', 'high'),
            'escalated_at': datetime.now(),
            'escalated_by': user.get('id'),
            'escalation_reason': data.get('reason', 'Manual escalation'),
            'updated_at': datetime.now()
        }
        
        if 'assign_to' in data:
            escalation_data['assigned_to'] = data['assign_to']
        
        # Save escalation
        updated_ticket = await db_service.update_support_ticket(ticket_id, escalation_data)
        
        # Add escalation note
        await db_service.add_ticket_response(
            ticket_id,
            f"Ticket escalated by {user.get('name', 'Agent')}. Reason: {data.get('reason', 'Manual escalation')}",
            user.get('id', 'system'),
            is_internal=True
        )
        
        # Trigger notifications
        from app.sockets import socketio
        socketio.emit('ticket_escalated', {
            'ticket_id': ticket_id,
            'escalated_by': user.get('name', 'Agent'),
            'reason': data.get('reason'),
            'new_priority': escalation_data['priority']
        }, namespace='/customer-support')
        
        return jsonify({
            'success': True,
            'data': {
                'ticket': updated_ticket,
                'escalation_details': escalation_data
            },
            'message': 'Ticket escalated successfully'
        })
        
    except Exception as e:
        current_app.logger.error(f"Failed to escalate ticket {ticket_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to escalate ticket',
            'details': str(e)
        }), 500


@customer_support_bp.route('/status', methods=['GET'])
async def get_support_status():
    """Get customer support system status and health."""
    try:
        # Get agent status
        agent = await get_agent()
        agent_status = await agent.get_status()
        
        # Get system metrics
        db_service = DatabaseService()
        system_metrics = await db_service.get_system_metrics()
        
        return jsonify({
            'success': True,
            'data': {
                'system_status': 'healthy',
                'agent_status': agent_status,
                'system_metrics': system_metrics,
                'integrations': {
                    'zendesk': agent_status.get('integrations', {}).get('zendesk', False),
                    'openai': agent_status.get('integrations', {}).get('openai', False),
                    'twilio': agent_status.get('integrations', {}).get('twilio', False),
                    'shopify': agent_status.get('integrations', {}).get('shopify', False)
                }
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        current_app.logger.error(f"Failed to get support status: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get support status',
            'details': str(e)
        }), 500


# Error handlers
@customer_support_bp.errorhandler(429)
def handle_rate_limit(error):
    """Handle rate limit exceeded errors."""
    return jsonify({
        'success': False,
        'error': 'Rate limit exceeded',
        'message': 'Too many requests. Please try again later.',
        'retry_after': getattr(error, 'retry_after', 60)
    }), 429


@customer_support_bp.errorhandler(ValidationError)
def handle_validation_error(error):
    """Handle validation errors."""
    return jsonify({
        'success': False,
        'error': 'Validation failed',
        'details': error.messages
    }), 400