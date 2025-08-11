"""
Agent endpoints for Flask application.

Maintains compatibility with existing FastAPI agent functionality
including session management, messaging, and streaming responses.
"""

import json
import logging
import time
import uuid
from datetime import datetime
from typing import Dict, List

from flask import Blueprint, Response, current_app, jsonify, request

agents_bp = Blueprint("agents", __name__)
logger = logging.getLogger(__name__)

# In-memory storage (TODO: Replace with Redis/Database)
agent_sessions: Dict[str, Dict] = {}
agent_messages: Dict[str, List[Dict]] = {}


@agents_bp.route("/session", methods=["POST"])
def create_agent_session():
    """Create a new agent chat session."""
    try:
        session_id = str(uuid.uuid4())

        agent_sessions[session_id] = {
            "id": session_id,
            "created_at": datetime.now().isoformat(),
            "status": "active",
        }

        agent_messages[session_id] = []

        logger.info(f"Created agent session: {session_id}")

        # Update metrics
        from app.routes.metrics import increment_metric, set_metric

        increment_metric("agent_sessions")
        set_metric("agent_sessions", len(agent_sessions))

        return jsonify({"session_id": session_id}), 201

    except Exception as e:
        logger.error(f"Failed to create agent session: {e}")
        return jsonify({"error": "Failed to create session", "message": str(e)}), 500


@agents_bp.route("/message", methods=["POST"])
def send_agent_message():
    """Send a message to an agent session."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        # Validate required fields
        session_id = data.get("session_id")
        role = data.get("role")
        content = data.get("content")

        if not session_id:
            return jsonify({"error": "session_id is required"}), 400
        if not role or role not in ["user", "assistant"]:
            return jsonify({"error": "role must be 'user' or 'assistant'"}), 400
        if not content or len(content.strip()) == 0:
            return jsonify({"error": "content is required and cannot be empty"}), 400
        if len(content) > 4000:
            return jsonify({"error": "content must be 4000 characters or less"}), 400

        # Check if session exists
        if session_id not in agent_sessions:
            return jsonify({"error": "Session not found"}), 404

        # Store the message
        message_data = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
        }

        agent_messages[session_id].append(message_data)
        logger.info(f"Message added to session {session_id}: {role}")

        # Update metrics
        from app.routes.metrics import increment_metric

        increment_metric("agent_messages")

        return jsonify({"status": "received", "message_id": message_data["id"]}), 200

    except Exception as e:
        logger.error(f"Failed to send agent message: {e}")
        return jsonify({"error": "Failed to send message", "message": str(e)}), 500


@agents_bp.route("/stream")
def stream_agent_response():
    """Stream agent responses via Server-Sent Events."""
    session_id = request.args.get("session_id")

    if not session_id:
        return jsonify({"error": "session_id parameter is required"}), 400

    if session_id not in agent_sessions:
        return jsonify({"error": "Session not found"}), 404

    def generate_response():
        """Generate streaming response from agent."""
        logger.info(f"Starting stream for session: {session_id}")

        try:
            # Check if streaming is enabled
            if not current_app.config.get("ENABLE_STREAMING", True):
                yield f"data: {json.dumps({'type': 'error', 'message': 'Streaming disabled'})}\n\n"
                return

            # Check if we have OpenAI API key for real responses
            openai_key = current_app.config.get("OPENAI_API_KEY")

            if openai_key:
                # TODO: Implement actual OpenAI streaming
                # For now, simulate intelligent responses
                responses = [
                    "I understand you need assistance with your Royal Equips operations.",
                    " Let me analyze the current system status and provide you with actionable insights.",
                    " Based on the metrics, I recommend focusing on inventory optimization",
                    " and implementing the new pricing strategies we discussed.",
                    " Would you like me to initiate those processes for you?",
                ]
            else:
                # Canned responses for demo
                responses = [
                    "Welcome to the Royal Equips Flask Agent Interface.",
                    " I am your AI assistant, ready to help optimize your e-commerce empire.",
                    " Current status: All systems operational.",
                    " How may I assist you with your operations today?",
                ]

            # Stream response word by word with realistic delays
            for response_chunk in responses:
                for word in response_chunk.split():
                    try:
                        time.sleep(0.1)  # Simulate typing speed

                        data = json.dumps(
                            {
                                "type": "delta",
                                "content": word + " ",
                                "session_id": session_id,
                            }
                        )

                        yield f"event: message\ndata: {data}\n\n"

                    except Exception as stream_error:
                        logger.error(f"Stream error for word '{word}': {stream_error}")
                        # Continue with next word instead of failing completely
                        continue

            # Send completion signal
            completion_data = json.dumps({"type": "done", "session_id": session_id})
            yield f"event: message\ndata: {completion_data}\n\n"

        except Exception as e:
            logger.error(f"Error in stream generation: {e}")
            error_data = json.dumps(
                {
                    "type": "error",
                    "error": "Stream generation failed",
                    "details": str(e),
                    "session_id": session_id,
                }
            )
            yield f"event: error\ndata: {error_data}\n\n"

    return Response(
        generate_response(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )


@agents_bp.route("/sessions", methods=["GET"])
def list_agent_sessions():
    """List all active agent sessions."""
    try:
        return (
            jsonify(
                {
                    "sessions": list(agent_sessions.values()),
                    "total": len(agent_sessions),
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Failed to list sessions: {e}")
        return jsonify({"error": "Failed to list sessions", "message": str(e)}), 500


@agents_bp.route("/session/<session_id>/messages", methods=["GET"])
def get_session_messages(session_id: str):
    """Get messages for a specific session."""
    try:
        if session_id not in agent_sessions:
            return jsonify({"error": "Session not found"}), 404

        messages = agent_messages.get(session_id, [])
        return (
            jsonify(
                {"session_id": session_id, "messages": messages, "total": len(messages)}
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Failed to get session messages: {e}")
        return jsonify({"error": "Failed to get messages", "message": str(e)}), 500
