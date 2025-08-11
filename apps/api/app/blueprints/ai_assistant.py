"""
AI Assistant Blueprint for Royal Equips Control Center.

Provides API endpoints for:
- AI-powered assistant interactions
- Executive summary generation
- Context-aware system insights
- Streaming conversation responses
- Assistant configuration management
"""

import logging
import asyncio
from datetime import datetime
from flask import Blueprint, request, jsonify, Response, stream_template
from app.services.ai_assistant import control_center_assistant

logger = logging.getLogger(__name__)

assistant_bp = Blueprint("assistant", __name__, url_prefix="/api/assistant")

@assistant_bp.route("/status", methods=["GET"])
def get_assistant_status():
    """
    Get AI assistant service status.
    ---
    tags:
      - AI Assistant
    responses:
      200:
        description: AI assistant status
        schema:
          type: object
          properties:
            enabled:
              type: boolean
            model:
              type: string
            conversation_length:
              type: integer
            status:
              type: string
            timestamp:
              type: string
    """
    stats = control_center_assistant.get_conversation_stats()
    
    return jsonify({
        "enabled": stats['enabled'],
        "model": stats['model'],
        "conversation_length": stats['conversation_length'],
        "status": "operational" if stats['enabled'] else "not_configured",
        "timestamp": datetime.utcnow().isoformat()
    })

@assistant_bp.route("/chat", methods=["POST"])
def chat_with_assistant():
    """
    Chat with the AI assistant.
    ---
    tags:
      - AI Assistant
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            message:
              type: string
              description: User message to the assistant
            include_system_status:
              type: boolean
              default: true
              description: Whether to include current system status in context
          required:
            - message
    responses:
      200:
        description: Assistant response
      400:
        description: Invalid request body
      503:
        description: AI assistant not configured
    """
    if not control_center_assistant.is_enabled():
        return jsonify({
            "error": "AI Assistant not configured",
            "message": "OpenAI API key required to enable AI assistant",
            "response": "AI Assistant is currently unavailable. Please configure OpenAI API key."
        }), 503
    
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({
                "error": "Missing required field 'message' in request body"
            }), 400
        
        user_message = data['message']
        include_status = data.get('include_system_status', True)
        
        # Get response asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            response = loop.run_until_complete(
                control_center_assistant.get_response(user_message, include_status)
            )
        finally:
            loop.close()
        
        if response['success']:
            return jsonify({
                "success": True,
                "message": user_message,
                "response": response['response'],
                "model_used": response['model_used'],
                "tokens_used": response['tokens_used'],
                "conversation_length": response['conversation_length'],
                "timestamp": response['timestamp']
            })
        else:
            return jsonify({
                "success": False,
                "error": response['error'],
                "response": response['response']
            }), 500
            
    except Exception as e:
        logger.error(f"Error in assistant chat: {e}")
        return jsonify({
            "error": "Assistant chat failed",
            "message": str(e),
            "response": "I apologize, but I encountered an error. Please try again."
        }), 500

@assistant_bp.route("/chat/stream", methods=["POST"])
def stream_chat():
    """
    Stream chat response from the AI assistant.
    ---
    tags:
      - AI Assistant
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            message:
              type: string
              description: User message to the assistant
            include_system_status:
              type: boolean
              default: true
              description: Whether to include current system status in context
          required:
            - message
    responses:
      200:
        description: Streaming assistant response
        headers:
          Content-Type:
            type: string
            default: text/event-stream
      400:
        description: Invalid request body
      503:
        description: AI assistant not configured
    """
    if not control_center_assistant.is_enabled():
        return jsonify({
            "error": "AI Assistant not configured"
        }), 503
    
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({
                "error": "Missing required field 'message' in request body"
            }), 400
        
        user_message = data['message']
        include_status = data.get('include_system_status', True)
        
        def generate():
            """Generate streaming response."""
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                async def stream():
                    async for chunk in control_center_assistant.get_streaming_response(user_message, include_status):
                        yield f"data: {jsonify(chunk).get_data(as_text=True)}\n\n"
                
                # Run the async generator
                async_gen = stream()
                while True:
                    try:
                        chunk = loop.run_until_complete(async_gen.__anext__())
                        yield chunk
                    except StopAsyncIteration:
                        break
                        
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                yield f"data: {jsonify({'type': 'error', 'data': str(e)}).get_data(as_text=True)}\n\n"
            finally:
                loop.close()
        
        return Response(generate(), mimetype='text/event-stream')
        
    except Exception as e:
        logger.error(f"Error setting up streaming chat: {e}")
        return jsonify({
            "error": "Failed to setup streaming chat",
            "message": str(e)
        }), 500

@assistant_bp.route("/executive-summary", methods=["GET"])
def get_executive_summary():
    """
    Get AI-generated executive summary of platform status.
    ---
    tags:
      - AI Assistant
    responses:
      200:
        description: Executive summary
      503:
        description: AI assistant not configured
    """
    if not control_center_assistant.is_enabled():
        return jsonify({
            "error": "AI Assistant not configured",
            "summary": "Executive summary unavailable - AI assistant requires OpenAI API key"
        }), 503
    
    try:
        # Get executive summary asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            summary_data = loop.run_until_complete(
                control_center_assistant.get_executive_summary()
            )
        finally:
            loop.close()
        
        if summary_data['success']:
            return jsonify({
                "success": True,
                "executive_summary": summary_data['executive_summary'],
                "generated_at": summary_data['generated_at'],
                "system_status": summary_data['system_status']
            })
        else:
            return jsonify({
                "success": False,
                "error": summary_data['error'],
                "summary": "Executive summary could not be generated at this time."
            }), 500
            
    except Exception as e:
        logger.error(f"Error generating executive summary: {e}")
        return jsonify({
            "error": "Failed to generate executive summary",
            "message": str(e),
            "summary": "Executive summary temporarily unavailable."
        }), 500

@assistant_bp.route("/conversation/clear", methods=["POST"])
def clear_conversation():
    """
    Clear the assistant's conversation history.
    ---
    tags:
      - AI Assistant
    responses:
      200:
        description: Conversation cleared
      503:
        description: AI assistant not configured
    """
    if not control_center_assistant.is_enabled():
        return jsonify({
            "error": "AI Assistant not configured"
        }), 503
    
    try:
        result = control_center_assistant.clear_conversation()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error clearing conversation: {e}")
        return jsonify({
            "error": "Failed to clear conversation",
            "message": str(e)
        }), 500

@assistant_bp.route("/conversation/stats", methods=["GET"])
def get_conversation_stats():
    """
    Get conversation statistics and history metrics.
    ---
    tags:
      - AI Assistant
    responses:
      200:
        description: Conversation statistics
    """
    try:
        stats = control_center_assistant.get_conversation_stats()
        return jsonify({
            "stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting conversation stats: {e}")
        return jsonify({
            "error": "Failed to get conversation stats",
            "message": str(e)
        }), 500

@assistant_bp.route("/quick-insights", methods=["GET"])
def get_quick_insights():
    """
    Get quick AI-powered insights about the current system state.
    ---
    tags:
      - AI Assistant
    responses:
      200:
        description: Quick system insights
      503:
        description: AI assistant not configured
    """
    if not control_center_assistant.is_enabled():
        return jsonify({
            "error": "AI Assistant not configured",
            "insights": []
        }), 503
    
    try:
        # Request quick insights from the assistant
        quick_prompt = """Provide 3-5 quick, actionable insights about the current Royal Equips platform status. 
        Focus on:
        1. System health highlights
        2. Key operational metrics
        3. Any immediate attention items
        4. Performance observations
        
        Format as bullet points, keep each insight under 100 characters."""
        
        # Get response asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            response = loop.run_until_complete(
                control_center_assistant.get_response(quick_prompt, include_system_status=True)
            )
        finally:
            loop.close()
        
        if response['success']:
            # Parse insights from response
            insights = []
            for line in response['response'].split('\n'):
                line = line.strip()
                if line.startswith('•') or line.startswith('-') or line.startswith('*'):
                    insights.append(line[1:].strip())
                elif line and not line.startswith('#'):
                    insights.append(line)
            
            return jsonify({
                "success": True,
                "insights": insights[:5],  # Limit to 5 insights
                "generated_at": response['timestamp']
            })
        else:
            return jsonify({
                "success": False,
                "error": response['error'],
                "insights": []
            }), 500
            
    except Exception as e:
        logger.error(f"Error getting quick insights: {e}")
        return jsonify({
            "error": "Failed to get quick insights",
            "message": str(e),
            "insights": []
        }), 500