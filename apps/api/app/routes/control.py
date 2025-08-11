"""
Control API endpoints for Royal Equips Orchestrator.

Provides control functions like:
- God Mode toggle
- Emergency Stop 
- System controls
"""

import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from app.sockets import broadcast_control_event

logger = logging.getLogger(__name__)

control_bp = Blueprint("control", __name__, url_prefix="/api/control")

# Global state for control settings
_control_state = {
    "god_mode": False,
    "emergency_stop": False,
    "last_updated": datetime.now().isoformat()
}

@control_bp.route("/god-mode", methods=["POST"])
def toggle_god_mode():
    """
    Toggle God Mode on/off.
    ---
    tags:
      - Control
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            enabled:
              type: boolean
              description: Whether to enable or disable God Mode
          required:
            - enabled
    responses:
      202:
        description: God Mode toggle accepted
        schema:
          type: object
          properties:
            status:
              type: string
              example: "accepted"
            god_mode:
              type: boolean
            message:
              type: string
            timestamp:
              type: string
      400:
        description: Invalid request body
    """
    try:
        data = request.get_json()
        if not data or "enabled" not in data:
            return jsonify({
                "error": "Missing 'enabled' field in request body"
            }), 400
        
        enabled = bool(data["enabled"])
        _control_state["god_mode"] = enabled
        _control_state["last_updated"] = datetime.now().isoformat()
        
        # Broadcast the change via WebSocket
        broadcast_control_event("god_mode", {
            "enabled": enabled,
            "message": f"God Mode {'activated' if enabled else 'deactivated'}",
            "user": "system"  # TODO: Get from auth context
        })
        
        logger.info(f"God Mode {'enabled' if enabled else 'disabled'}")
        
        return jsonify({
            "status": "accepted",
            "god_mode": enabled,
            "message": f"God Mode {'activated' if enabled else 'deactivated'}",
            "timestamp": _control_state["last_updated"]
        }), 202
        
    except Exception as e:
        logger.error(f"Failed to toggle god mode: {e}")
        return jsonify({
            "error": "Failed to toggle god mode",
            "message": str(e)
        }), 500

@control_bp.route("/emergency-stop", methods=["POST"])
def emergency_stop():
    """
    Trigger emergency stop.
    
    Optionally accepts JSON payload:
    {
        "reason": "string description of why emergency stop was triggered"
    }
    """
    try:
        data = request.get_json() or {}
        reason = data.get("reason", "Manual emergency stop triggered")
        
        _control_state["emergency_stop"] = True
        _control_state["last_updated"] = datetime.now().isoformat()
        
        # Broadcast emergency stop via WebSocket
        broadcast_control_event("emergency_stop", {
            "reason": reason,
            "message": "🚨 EMERGENCY STOP ACTIVATED",
            "user": "system",  # TODO: Get from auth context
            "actions": [
                "All agent operations halted",
                "System entering safe mode",
                "Manual intervention required"
            ]
        })
        
        logger.warning(f"Emergency stop triggered: {reason}")
        
        return jsonify({
            "status": "accepted", 
            "emergency_stop": True,
            "reason": reason,
            "message": "Emergency stop activated - all operations halted",
            "timestamp": _control_state["last_updated"]
        }), 202
        
    except Exception as e:
        logger.error(f"Failed to trigger emergency stop: {e}")
        return jsonify({
            "error": "Failed to trigger emergency stop",
            "message": str(e)
        }), 500

@control_bp.route("/reset-emergency", methods=["POST"])
def reset_emergency():
    """
    Reset emergency stop state.
    
    Optionally accepts JSON payload:
    {
        "confirm": true,
        "reason": "string description"
    }
    """
    try:
        data = request.get_json() or {}
        
        if not data.get("confirm", False):
            return jsonify({
                "error": "Emergency reset requires confirmation",
                "message": "Include 'confirm': true in request body"
            }), 400
        
        reason = data.get("reason", "Emergency state reset")
        
        _control_state["emergency_stop"] = False
        _control_state["last_updated"] = datetime.now().isoformat()
        
        # Broadcast reset via WebSocket
        broadcast_control_event("emergency_reset", {
            "reason": reason,
            "message": "Emergency stop deactivated - normal operations resuming",
            "user": "system"  # TODO: Get from auth context
        })
        
        logger.info(f"Emergency stop reset: {reason}")
        
        return jsonify({
            "status": "accepted",
            "emergency_stop": False,
            "reason": reason,
            "message": "Emergency stop deactivated",
            "timestamp": _control_state["last_updated"]
        }), 202
        
    except Exception as e:
        logger.error(f"Failed to reset emergency stop: {e}")
        return jsonify({
            "error": "Failed to reset emergency stop", 
            "message": str(e)
        }), 500

@control_bp.route("/status", methods=["GET"])
def get_control_status():
    """Get current control state."""
    return jsonify({
        "status": "ok",
        "controls": _control_state,
        "timestamp": datetime.now().isoformat()
    })