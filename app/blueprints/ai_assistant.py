"""
ARIA Blueprint - AI Empire Operator for Royal Equips Control Center.

Provides API endpoints for:
- AI-powered executive assistant interactions
- Voice control with OpenAI Whisper and TTS
- Empire command execution and orchestration  
- Executive summary generation and strategic insights
- Context-aware system intelligence and monitoring
- Streaming conversation responses for real-time interaction
- Assistant configuration and conversation management
"""

import asyncio
import logging
from datetime import datetime

from flask import Blueprint, Response, jsonify, request

from app.services.ai_assistant import control_center_assistant

logger = logging.getLogger(__name__)

assistant_bp = Blueprint("assistant", __name__, url_prefix="/api/aria")

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

@assistant_bp.route("/voice/command", methods=["POST"])
def process_voice_command():
    """
    Process voice command using OpenAI Whisper.
    ---
    tags:
      - ARIA Voice Control
    parameters:
      - name: audio
        in: formData
        type: file
        required: true
        description: Audio file containing voice command
    responses:
      200:
        description: Voice command processed successfully
        schema:
          type: object
          properties:
            success:
              type: boolean
            transcription:
              type: string
            response:
              type: string
            model_used:
              type: string
            timestamp:
              type: string
      400:
        description: Invalid audio file
      503:
        description: ARIA not configured
    """
    if not control_center_assistant.is_enabled():
        return jsonify({
            "error": "ARIA not configured",
            "message": "OpenAI API key required for voice control"
        }), 503

    try:
        # Check for audio file in request
        if 'audio' not in request.files:
            return jsonify({
                "error": "No audio file provided",
                "message": "Please upload an audio file with your voice command"
            }), 400

        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({
                "error": "No audio file selected"
            }), 400

        # Read audio data
        audio_data = audio_file.read()
        
        # Process voice command asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            result = loop.run_until_complete(
                control_center_assistant.process_voice_command(audio_data)
            )
        finally:
            loop.close()

        if result['success']:
            return jsonify({
                "success": True,
                "transcription": result['transcription'],
                "response": result['response'],
                "model_used": result['model_used'],
                "tokens_used": result.get('tokens_used', 0),
                "timestamp": result['timestamp']
            })
        else:
            return jsonify({
                "success": False,
                "error": result['error'],
                "transcription": result.get('transcription', ''),
                "response": result['response']
            }), 500

    except Exception as e:
        logger.error(f"Voice command processing error: {e}")
        return jsonify({
            "error": "Voice command processing failed",
            "message": str(e)
        }), 500

@assistant_bp.route("/voice/synthesize", methods=["POST"])
def synthesize_speech():
    """
    Convert text to speech using OpenAI TTS.
    ---
    tags:
      - ARIA Voice Control
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            text:
              type: string
              description: Text to convert to speech
            voice:
              type: string
              default: onyx
              description: Voice to use (alloy, echo, fable, onyx, nova, shimmer)
          required:
            - text
    responses:
      200:
        description: Speech synthesized successfully
        schema:
          type: object
          properties:
            success:
              type: boolean
            audio_data:
              type: string
              description: Base64 encoded audio data
            audio_format:
              type: string
            text:
              type: string
            voice:
              type: string
            timestamp:
              type: string
      400:
        description: Invalid request body
      503:
        description: ARIA not configured
    """
    if not control_center_assistant.is_enabled():
        return jsonify({
            "error": "ARIA not configured",
            "message": "OpenAI API key required for voice synthesis"
        }), 503

    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({
                "error": "Missing required field 'text' in request body"
            }), 400

        text = data['text']
        if not text.strip():
            return jsonify({
                "error": "Text cannot be empty"
            }), 400

        # Generate voice response asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            result = loop.run_until_complete(
                control_center_assistant.generate_voice_response(text)
            )
        finally:
            loop.close()

        if result['success']:
            return jsonify({
                "success": True,
                "audio_data": result['audio_data'],
                "audio_format": result['audio_format'],
                "text": result['text'],
                "voice": result['voice'],
                "model": result['model'],
                "timestamp": result['timestamp']
            })
        else:
            return jsonify({
                "success": False,
                "error": result['error'],
                "text": result['text']
            }), 500

    except Exception as e:
        logger.error(f"Speech synthesis error: {e}")
        return jsonify({
            "error": "Speech synthesis failed",
            "message": str(e)
        }), 500

@assistant_bp.route("/empire/command", methods=["POST"])
def execute_empire_command():
    """
    Execute empire-level commands through ARIA.
    ---
    tags:
      - ARIA Empire Control
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            command:
              type: string
              description: Empire command to execute
            parameters:
              type: object
              description: Optional command parameters
          required:
            - command
    responses:
      200:
        description: Command executed successfully
      400:
        description: Invalid request body
      503:
        description: ARIA not configured
    """
    if not control_center_assistant.is_enabled():
        return jsonify({
            "error": "ARIA not configured",
            "message": "OpenAI API key required for empire commands"
        }), 503

    try:
        data = request.get_json()
        if not data or 'command' not in data:
            return jsonify({
                "error": "Missing required field 'command' in request body"
            }), 400

        command = data['command']
        parameters = data.get('parameters', {})

        # Execute empire command asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            result = loop.run_until_complete(
                control_center_assistant.execute_empire_command(command, parameters)
            )
        finally:
            loop.close()

        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 500

    except Exception as e:
        logger.error(f"Empire command execution error: {e}")
        return jsonify({
            "error": "Empire command execution failed",
            "message": str(e)
        }), 500

@assistant_bp.route("/empire/commands", methods=["GET"])
def list_empire_commands():
    """
    List available empire commands.
    ---
    tags:
      - ARIA Empire Control
    responses:
      200:
        description: Available empire commands
        schema:
          type: object
          properties:
            commands:
              type: array
              items:
                type: object
                properties:
                  command:
                    type: string
                  description:
                    type: string
                  parameters:
                    type: array
                    items:
                      type: string
    """
    commands = [
        {
            "command": "sync_shopify",
            "description": "Synchronize Shopify store data",
            "parameters": ["sync_type (products/orders/inventory/full)"]
        },
        {
            "command": "deploy_agents",
            "description": "Deploy AI agents to specified environment",
            "parameters": ["agents (array)", "environment (production/staging/development)"]
        },
        {
            "command": "emergency_stop",
            "description": "Execute emergency stop protocol",
            "parameters": ["scope (all/agents/shopify/webhooks)", "reason (string)"]
        },
        {
            "command": "system_health",
            "description": "Execute comprehensive health check",
            "parameters": []
        },
        {
            "command": "restart_agents",
            "description": "Restart specified agents",
            "parameters": ["agents (array)"]
        },
        {
            "command": "generate_report",
            "description": "Generate executive reports",
            "parameters": ["report_type (executive/technical/financial)", "timeframe (24h/7d/30d)"]
        },
        {
            "command": "optimize_performance",
            "description": "Execute performance optimization",
            "parameters": ["targets (array of system/agents/database)"]
        }
    ]

    return jsonify({
        "commands": commands,
        "total_commands": len(commands),
        "timestamp": datetime.utcnow().isoformat()
    })
