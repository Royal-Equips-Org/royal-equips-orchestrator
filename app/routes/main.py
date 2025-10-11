"""
Main application routes.

Provides landing page, command center access, and basic navigation.
Self-healing template system ensures robust operation.
"""

import logging
import uuid
from datetime import datetime
from pathlib import Path

from flask import (
    Blueprint,
    current_app,
    jsonify,
    make_response,
    redirect,
    render_template,
    request,
    send_from_directory,
    url_for,
)

from app.utils.template_utils import validate_template_directory, ensure_template_exists

main_bp = Blueprint("main", __name__)
logger = logging.getLogger(__name__)


@main_bp.route("/")
def root():
    """
    Root endpoint - serves the React Command Center SPA.
    Redirect to /command-center for proper SPA routing.
    """
    try:
        return redirect(url_for("command_center.serve_spa"), code=302)
    except Exception:
        # Fallback to static path if endpoint does not exist
        return redirect("/command-center", code=302)


@main_bp.route("/command-center-redirect")
def command_center_redirect():
    """Legacy redirect endpoint."""
    command_center_url = current_app.config.get("COMMAND_CENTER_URL", "/command-center")
    return redirect(command_center_url, code=307)


@main_bp.route("/control-center")
def control_center():
    """Alias for command center - redirects to /command-center."""
    try:
        return redirect(url_for("command_center.serve_spa"), code=307)
    except Exception:
        # Fallback to static path if endpoint does not exist
        return redirect("/command-center", code=307)



@main_bp.route("/dashboard")
def dashboard():
    """Alias for command center - redirects to /command-center."""
    try:
        return redirect(url_for("command_center.serve_spa"), code=307)
    except Exception:
        # Fallback to static path if endpoint does not exist
        return redirect("/command-center", code=307)



@main_bp.route("/favicon.ico")
def favicon():
    """Handle favicon requests to prevent 404 errors in browser logs."""
    response = make_response("", 204)
    response.headers["Content-Type"] = "image/x-icon"
    return response


@main_bp.route("/assets/<path:filename>")
def serve_assets(filename):
    """Serve static assets for command center React app."""
    try:
        static_dir = Path(__file__).parent.parent.parent / "static"
        assets_dir = static_dir / "assets"
        if assets_dir.exists():
            return send_from_directory(assets_dir, filename)
        logger.warning(f"Asset not found: {filename}")
        return "Asset not found", 404
    except Exception as e:
        logger.error(f"Error serving asset {filename}: {e}")
        return "Error serving asset", 500


# Removed duplicate /docs route - using Swagger docs instead


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
        # Optionally: logger.exception("Failed to create event") for full stack trace
        return jsonify({"error": "Failed to create event"}), 500


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
        # Optionally: logger.exception("Failed to get jobs") for full stack trace
        return jsonify({"error": "Failed to get jobs"}), 500


@main_bp.route("/test-inventory")
def test_inventory():
    """Serve inventory API test page for development and debugging."""
    try:
        # Read the test HTML file
        from pathlib import Path
        test_file = Path(__file__).parent.parent.parent / "test_inventory_page.html"
        
        if test_file.exists():
            with open(test_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            response = make_response(content)
            response.headers['Content-Type'] = 'text/html; charset=utf-8'
            return response
        else:
            return jsonify({
                "error": "Test page not found",
                "message": "test_inventory_page.html is missing"
            }), 404
            
    except Exception as e:
        logger.exception(f"Error serving test inventory page")
        return jsonify({
            "error": "Failed to serve test page"
        }), 500
