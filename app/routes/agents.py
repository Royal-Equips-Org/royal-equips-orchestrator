"""
Agent endpoints for Flask application.

Maintains compatibility with existing FastAPI agent functionality
including session management, messaging, and streaming responses.
"""

import importlib
import json
import logging
import time
import uuid
from datetime import datetime
from typing import Dict, List

from flask import Blueprint, Response, current_app, jsonify, request

agents_bp = Blueprint("agents", __name__)
logger = logging.getLogger(__name__)

# Production storage with Redis backend
import redis
from core.secrets.secret_provider import UnifiedSecretResolver

try:
    secrets = UnifiedSecretResolver()
    redis_url = secrets.get_secret('REDIS_URL') or 'redis://localhost:6379'
    redis_client = redis.from_url(redis_url, decode_responses=True)
    redis_client.ping()  # Test connection
    logger.info("Connected to Redis for agent session storage")
    USE_REDIS = True
except Exception as e:
    logger.warning(f"Redis not available, using in-memory storage: {e}")
    redis_client = None
    USE_REDIS = False
    # Fallback to in-memory for development
    agent_sessions: Dict[str, Dict] = {}
    agent_messages: Dict[str, List[Dict]] = {}


@agents_bp.route("/session", methods=["POST"])
def create_agent_session():
    """Create a new agent chat session with persistent storage."""
    try:
        data = request.get_json() or {}
        agent_type = data.get("agent_type", "general")
        user_id = data.get("user_id", "anonymous")
        
        session_id = str(uuid.uuid4())
        session_data = {
            "id": session_id,
            "agent_type": agent_type,
            "user_id": user_id,
            "created_at": datetime.now().isoformat(),
            "status": "active",
            "message_count": 0
        }

        if USE_REDIS:
            # Store in Redis with 1 hour expiry
            redis_client.hset(f"session:{session_id}", mapping=session_data)
            redis_client.expire(f"session:{session_id}", 3600)
            redis_client.delete(f"messages:{session_id}")  # Clear any existing messages
        else:
            # Fallback to in-memory
            agent_sessions[session_id] = session_data
            agent_messages[session_id] = []

        logger.info(f"Created agent session: {session_id} for type {agent_type}")

        # Update metrics
        from app.routes.metrics import increment_metric, set_metric

        increment_metric("agent_sessions")
        if USE_REDIS:
            active_sessions = len(redis_client.keys("session:*"))
        else:
            active_sessions = len(agent_sessions)
        set_metric("agent_sessions", active_sessions)

        return jsonify({"session_id": session_id, "session": session_data}), 201

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


@agents_bp.route("/status", methods=["GET"])
def get_agents_status():
    """Get status of all registered agents in the orchestrator."""
    try:
        # Try to import agents with graceful error handling
        available_agents = {}
        
        # Define agent configurations
        agent_configs = {
            "product_research": {
                "name": "Product Research Agent",
                "description": "News scraping and trend discovery",
                "module": "orchestrator.agents.product_research"
            },
            "inventory_forecasting": {
                "name": "Inventory Forecasting Agent", 
                "description": "Prophet + Shopify integration for demand prediction",
                "module": "orchestrator.agents.inventory_forecasting"
            },
            "pricing_optimizer": {
                "name": "Pricing Optimizer Agent",
                "description": "Competitor analysis and dynamic pricing",
                "module": "orchestrator.agents.pricing_optimizer"
            },
            "marketing_automation": {
                "name": "Marketing Automation Agent",
                "description": "Email campaigns and content generation",
                "module": "orchestrator.agents.marketing_automation"
            },
            "customer_support": {
                "name": "Customer Support Agent",
                "description": "OpenAI-powered chat responses",
                "module": "orchestrator.agents.customer_support"
            },
            "order_management": {
                "name": "Order Management Agent",
                "description": "Fulfillment and returns processing",
                "module": "orchestrator.agents.order_management"
            },
            "product_recommendation": {
                "name": "Product Recommendation Agent",
                "description": "AI-powered product suggestions",
                "module": "orchestrator.agents.recommendation"
            },
            "analytics": {
                "name": "Analytics Agent",
                "description": "Performance metrics and insights",
                "module": "orchestrator.agents.analytics"
            }
        }
        
        # Check each agent's availability
        for agent_id, config in agent_configs.items():
            try:
                # Try to import the agent module
                import importlib
                importlib.import_module(config["module"])
                
                # Determine status based on dependencies
                status = "operational"
                enabled = True
                
                # Special cases for agents with external dependencies
                if agent_id == "customer_support":
                    if not current_app.config.get("OPENAI_API_KEY"):
                        status = "needs_config"
                        enabled = False
                elif agent_id == "order_management":
                    if not current_app.config.get("SHOPIFY_API_KEY"):
                        status = "needs_config" 
                        enabled = False
                elif agent_id == "inventory_forecasting":
                    # Check if pandas/prophet are available
                    try:
                        import pandas
                        import prophet
                    except ImportError:
                        status = "missing_deps"
                        enabled = False
                        
            except ImportError as e:
                status = "import_error"
                enabled = False
                logger.warning(f"Failed to import agent {agent_id}: {e}")
                
            available_agents[agent_id] = {
                "name": config["name"],
                "status": status,
                "description": config["description"],
                "last_run": None,
                "next_run": None,
                "enabled": enabled,
                "execution_status": _get_execution_status(agent_id)
            }

        # Count statuses
        total_agents = len(available_agents)
        operational_count = sum(1 for agent in available_agents.values() if agent["status"] == "operational")
        needs_config_count = sum(1 for agent in available_agents.values() if agent["status"] == "needs_config")
        missing_deps_count = sum(1 for agent in available_agents.values() if agent["status"] == "missing_deps")
        import_error_count = sum(1 for agent in available_agents.values() if agent["status"] == "import_error")
        
        return jsonify({
            "agents": available_agents,
            "summary": {
                "total": total_agents,
                "operational": operational_count,
                "needs_configuration": needs_config_count,
                "missing_dependencies": missing_deps_count,
                "import_errors": import_error_count,
                "offline": 0,
                "last_updated": datetime.now().isoformat()
            }
        }), 200

    except Exception as e:
        logger.error(f"Failed to get agent status: {e}")
        return jsonify({"error": "Failed to get agent status", "message": str(e)}), 500


def _get_execution_status(agent_id: str) -> str:
    """Get current execution status of an agent."""
    try:
        from app.orchestrator_bridge import get_orchestrator
        orchestrator = get_orchestrator()
        return orchestrator.get_agent_status(agent_id)
    except Exception:
        return 'unknown'


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


@agents_bp.route("/run/<agent_id>", methods=["POST"])
def run_agent(agent_id: str):
    """Trigger a manual run of a specific agent."""
    try:
        # Validate agent_id
        valid_agents = [
            "product_research", "inventory_forecasting", "pricing_optimizer",
            "marketing_automation", "customer_support", "order_management", 
            "product_recommendation", "analytics"
        ]
        
        if agent_id not in valid_agents:
            return jsonify({"error": "Invalid agent ID", "valid_agents": valid_agents}), 400

        # Use orchestrator bridge to start the agent
        from app.orchestrator_bridge import get_orchestrator
        orchestrator = get_orchestrator()
        
        execution_record = orchestrator.start_agent(agent_id)

        return jsonify({
            "status": "started",
            "agent_id": agent_id,
            "execution_id": execution_record['execution_id'],
            "estimated_duration_seconds": execution_record['estimated_duration'],
            "message": f"Agent {agent_id} execution initiated",
            "timestamp": execution_record['started_at']
        }), 202

    except Exception as e:
        logger.error(f"Failed to run agent {agent_id}: {e}")
        return jsonify({"error": "Failed to run agent", "message": str(e)}), 500


@agents_bp.route("/stop/<agent_id>", methods=["POST"]) 
def stop_agent(agent_id: str):
    """Stop a running agent."""
    try:
        # Validate agent_id
        valid_agents = [
            "product_research", "inventory_forecasting", "pricing_optimizer", 
            "marketing_automation", "customer_support", "order_management",
            "product_recommendation", "analytics"
        ]
        
        if agent_id not in valid_agents:
            return jsonify({"error": "Invalid agent ID", "valid_agents": valid_agents}), 400

        # Use orchestrator bridge to stop the agent
        from app.orchestrator_bridge import get_orchestrator
        orchestrator = get_orchestrator()
        
        stopped = orchestrator.stop_agent(agent_id)

        return jsonify({
            "status": "stopped" if stopped else "not_running",
            "agent_id": agent_id,
            "message": f"Agent {agent_id} {'stopped successfully' if stopped else 'was not running'}",
            "timestamp": datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Failed to stop agent {agent_id}: {e}")
        return jsonify({"error": "Failed to stop agent", "message": str(e)}), 500


# Shopify-specific agent endpoints
@agents_bp.route("/shopify", methods=["GET"])
def get_shopify_agents():
    """Get all Shopify automation agents and their status from real orchestrator."""
    try:
        from app.orchestrator_bridge import get_orchestrator
        orchestrator = get_orchestrator()
        
        # Define agent metadata (descriptions and types)
        agent_metadata = {
            "shopify_inventory_sync": {
                "name": "Inventory Sync Agent",
                "type": "inventory",
                "description": "Automatically syncs inventory levels between Shopify and warehouse systems"
            },
            "shopify_order_processor": {
                "name": "Order Processing Agent",
                "type": "orders",
                "description": "Automates order processing, fulfillment routing, and customer notifications"
            },
            "shopify_pricing_optimizer": {
                "name": "Dynamic Pricing Agent",
                "type": "pricing",
                "description": "Optimizes product pricing based on market conditions and inventory levels"
            },
            "shopify_marketing_automation": {
                "name": "Marketing Automation Agent",
                "type": "marketing",
                "description": "Manages email campaigns, customer segmentation, and promotional activities"
            },
            "shopify_analytics_reporter": {
                "name": "Analytics & Reporting Agent",
                "type": "analytics",
                "description": "Generates business reports, analyzes performance, and provides insights"
            }
        }
        
        shopify_agents = []
        
        # Get real agent status from orchestrator
        for agent_id, metadata in agent_metadata.items():
            try:
                # Try to get real agent from orchestrator
                agent = orchestrator.get_agent(agent_id)
                
                if agent:
                    # Real agent found - use its actual data
                    agent_info = {
                        "id": agent_id,
                        "name": metadata["name"],
                        "type": metadata["type"],
                        "description": metadata["description"],
                        "status": orchestrator.get_agent_status(agent_id) or "inactive",
                        "lastRun": agent.last_run.isoformat() if hasattr(agent, 'last_run') and agent.last_run else None,
                        "tasksCompleted": agent.tasks_completed if hasattr(agent, 'tasks_completed') else 0,
                        "performance": agent.performance if hasattr(agent, 'performance') else 0
                    }
                else:
                    # Agent not registered yet - show as inactive
                    agent_info = {
                        "id": agent_id,
                        "name": metadata["name"],
                        "type": metadata["type"],
                        "description": metadata["description"],
                        "status": "inactive",
                        "lastRun": None,
                        "tasksCompleted": 0,
                        "performance": 0
                    }
                
                shopify_agents.append(agent_info)
                
            except Exception as e:
                logger.warning(f"Could not get agent {agent_id}: {e}")
                # Add agent with inactive status if there's an error
                shopify_agents.append({
                    "id": agent_id,
                    "name": metadata["name"],
                    "type": metadata["type"],
                    "description": metadata["description"],
                    "status": "error",
                    "lastRun": None,
                    "tasksCompleted": 0,
                    "performance": 0
                })
        
        return jsonify({
            "agents": shopify_agents,
            "summary": {
                "total": len(shopify_agents),
                "active": len([a for a in shopify_agents if a["status"] == "active"]),
                "processing": len([a for a in shopify_agents if a["status"] == "processing"]),
                "inactive": len([a for a in shopify_agents if a["status"] == "inactive"]),
                "error": len([a for a in shopify_agents if a["status"] == "error"]),
                "lastUpdated": datetime.now().isoformat()
            }
        }), 200
        
    except Exception as e:
        safe_error = str(e)[:100]  # Limit error message length
        logger.error(f"Failed to get Shopify agents: {safe_error}")
        return jsonify({"error": "Failed to get Shopify agents"}), 500


@agents_bp.route("/shopify/<agent_id>/toggle", methods=["POST"])
def toggle_shopify_agent(agent_id: str):
    """Toggle a Shopify automation agent on/off."""
    try:
        from app.orchestrator_bridge import get_orchestrator
        orchestrator = get_orchestrator()
        
        # Valid Shopify agent IDs
        valid_shopify_agents = [
            "shopify_inventory_sync",
            "shopify_order_processor", 
            "shopify_pricing_optimizer",
            "shopify_marketing_automation",
            "shopify_analytics_reporter"
        ]
        
        if agent_id not in valid_shopify_agents:
            return jsonify({
                "error": "Invalid Shopify agent ID", 
                "valid_agents": valid_shopify_agents
            }), 400
        
        # Try to get current status
        current_status = orchestrator.get_agent_status(agent_id) or "inactive"
        
        # Toggle the agent
        if current_status == "active":
            success = orchestrator.stop_agent(agent_id)
            new_status = "inactive" if success else current_status
        else:
            success = orchestrator.start_agent(agent_id)
            new_status = "active" if success else current_status
            
        return jsonify({
            "agent_id": agent_id,
            "status": new_status,
            "action": "started" if new_status == "active" else "stopped",
            "success": success,
            "timestamp": datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        # Sanitize agent_id for logging to prevent log injection
        safe_agent_id = agent_id.replace('\n', '').replace('\r', '')[:50]
        safe_error = str(e)[:100]
        logger.error(f"Failed to toggle Shopify agent {safe_agent_id}: {safe_error}")
        return jsonify({"error": "Failed to toggle agent"}), 500


@agents_bp.route("/shopify/<agent_id>/status", methods=["GET"])
def get_shopify_agent_status(agent_id: str):
    """Get detailed status of a specific Shopify agent."""
    try:
        from app.orchestrator_bridge import get_orchestrator
        orchestrator = get_orchestrator()
        
        # Get agent performance metrics
        agent_metrics = orchestrator.get_agent_metrics(agent_id)
        
        return jsonify({
            "agent_id": agent_id,
            "status": orchestrator.get_agent_status(agent_id) or "unknown",
            "metrics": agent_metrics or {
                "uptime": "0h 0m",
                "tasks_completed": 0,
                "success_rate": 0.0,
                "last_error": None,
                "performance_score": 0.0
            },
            "timestamp": datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        # Sanitize agent_id for logging to prevent log injection
        safe_agent_id = agent_id.replace('\n', '').replace('\r', '')[:50]
        safe_error = str(e)[:100]
        logger.error(f"Failed to get Shopify agent status for {safe_agent_id}: {safe_error}")
        return jsonify({"error": "Failed to get agent status"}), 500
