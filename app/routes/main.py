"""
Main application routes.

Provides landing page, command center access, and basic navigation.
"""

import logging
import uuid
from datetime import datetime

from flask import (
    Blueprint,
    current_app,
    jsonify,
    make_response,
    redirect,
    render_template,
    request,
)

main_bp = Blueprint("main", __name__)
logger = logging.getLogger(__name__)


@main_bp.route("/")
def root():
    """Root endpoint with landing page and command center access."""
    try:
        return render_template(
            "index.html",
            app_name=current_app.config.get("APP_NAME", "Royal Equips Orchestrator"),
        )
    except Exception as e:
        current_app.logger.warning(f"Template rendering failed: {e}")
        # JSON fallback when templates aren't available or fail
        return jsonify(
            {
                "service": "Royal Equips Orchestrator",
                "status": "ok",
                "version": "2.0.0",
                "backend": "flask",
                "endpoints": {
                    "health": "/healthz",
                    "readiness": "/readyz",
                    "metrics": "/metrics",
                    "command_center": "/command-center",
                    "api_docs": "/docs",
                },
            }
        )


@main_bp.route("/command-center-redirect")
def command_center_redirect():
    """Legacy redirect endpoint."""
    command_center_url = current_app.config.get("COMMAND_CENTER_URL", "/command-center")
    return redirect(command_center_url, code=307)


@main_bp.route("/control-center")
def control_center():
    """Alias for command center - redirects to /command-center."""

    return redirect(url_for("command_center.serve_spa"), code=307)

    return redirect("/command-center", code=307)



@main_bp.route("/dashboard")
def dashboard():
    """Alias for command center - redirects to /command-center."""

    try:
        return redirect(url_for("command_center.serve_spa"), code=307)
    except Exception:
        # Fallback to static path if endpoint does not exist
        return redirect("/command-center", code=307)

    return redirect("/command-center", code=307)



@main_bp.route("/favicon.ico")
def favicon():
    """Handle favicon requests to prevent 404 errors in browser logs."""
    response = make_response("", 204)
    response.headers["Content-Type"] = "image/x-icon"
    return response


@main_bp.route("/docs")
def docs():
    """API documentation placeholder."""
    return jsonify(
        {
            "message": "Royal Equips Orchestrator API Documentation",
            "version": "2.0.0",
            "backend": "flask",
            "endpoints": {
                "health": {
                    "path": "/healthz",
                    "method": "GET",
                    "description": "Lightweight liveness check",
                },
                "readiness": {
                    "path": "/readyz",
                    "method": "GET",
                    "description": "Readiness check with dependency verification",
                },
                "metrics": {
                    "path": "/metrics",
                    "method": "GET",
                    "description": "System metrics and statistics",
                },
                "agents": {
                    "session": {
                        "path": "/agents/session",
                        "method": "POST",
                        "description": "Create new agent session",
                    },
                    "message": {
                        "path": "/agents/message",
                        "method": "POST",
                        "description": "Send message to agent",
                    },
                    "stream": {
                        "path": "/agents/stream",
                        "method": "GET",
                        "description": "Stream agent responses via SSE",
                    },
                },
                "events": {
                    "path": "/events",
                    "method": "POST",
                    "description": "Accept event payloads",
                },
                "jobs": {
                    "path": "/jobs",
                    "method": "GET",
                    "description": "List background jobs",
                },
            },
        }
    )


@main_bp.route("/events", methods=["POST"])
def create_event():
    """Accept and validate event payloads."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        # Validate event payload
        event_type = data.get("event_type")
        event_data = data.get("data", {})

        if not event_type:
            return jsonify({"error": "event_type is required"}), 400

        # Add timestamp if not provided
        timestamp = data.get("timestamp", datetime.now().isoformat())

        # Log the event (TODO: Send to event processing system)
        logger.info(
            f"Received event: {event_type} at {timestamp} with data: {len(str(event_data))} chars"
        )

        # TODO: Process event in background with event_data
        # For now, just acknowledge the event was received

        return (
            jsonify(
                {
                    "status": "accepted",
                    "event_id": str(uuid.uuid4()),
                    "timestamp": timestamp,
                }
            ),
            201,
        )

    except Exception as e:
        logger.error(f"Failed to create event: {e}")
        return jsonify({"error": "Failed to create event", "message": str(e)}), 500


@main_bp.route("/jobs", methods=["GET"])
def get_jobs():
    """Get list of background jobs."""
    try:
        # TODO: Implement actual job queue integration
        jobs = [
            {
                "id": "job_001",
                "name": "Price Sync Agent",
                "status": "running",
                "last_run": datetime.now().isoformat(),
            },
            {
                "id": "job_002",
                "name": "Inventory Forecast",
                "status": "scheduled",
                "next_run": datetime.now().isoformat(),
            },
        ]

        return jsonify({"jobs": jobs, "total": len(jobs)}), 200

    except Exception as e:
        logger.error(f"Failed to get jobs: {e}")
        return jsonify({"error": "Failed to get jobs", "message": str(e)}), 500
