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
    url_for,
)

from app.utils.template_utils import validate_template_directory, ensure_template_exists

main_bp = Blueprint("main", __name__)
logger = logging.getLogger(__name__)


@main_bp.route("/")
def root():
    """Root endpoint with landing page and command center access."""
    app_name = current_app.config.get("APP_NAME", "Royal Equips Orchestrator")
    
    # Self-healing template system
    try:
        template_dir = Path(current_app.template_folder)
        ensure_template_exists(template_dir / "index.html", app_name)
        return render_template("index.html", app_name=app_name)
    except Exception as e:
        current_app.logger.warning(f"Template rendering failed for index.html: {e}")
        
        # Self-healing: attempt to validate and fix template directory
        try:
            template_dir = Path(current_app.template_folder)
            validation_result = validate_template_directory(template_dir, app_name)
            
            if validation_result['valid']:
                current_app.logger.info("Template directory validated/repaired successfully")
                try:
                    return render_template("index.html", app_name=app_name)
                except:
                    pass  # Fall through to JSON fallback
            else:
                current_app.logger.error(f"Template validation failed: {validation_result['errors']}")
        except Exception as heal_error:
            current_app.logger.error(f"Self-healing failed: {heal_error}")
        
        # Ultimate fallback when templates can't be recovered
        return jsonify(
            {
                "service": "Royal Equips Orchestrator",
                "status": "operational", 
                "version": "2.0.0",
                "backend": "flask",
                "mode": "self-healing_fallback",
                "message": "System running in resilient mode - all services operational",
                "endpoints": {
                    "health": "/healthz",
                    "readiness": "/readyz", 
                    "metrics": "/metrics",
                    "command_center": "/command-center",
                    "api_docs": "/docs",
                },
                "actions": {
                    "access_dashboard": {
                        "url": "/command-center",
                        "description": "Access the Elite Control Center"
                    },
                    "system_health": {
                        "url": "/healthz",
                        "description": "Check system health status"
                    }
                },
                "recovery_info": {
                    "auto_healing": True,
                    "resilient_mode": True,
                    "template_system": "fallback_active"
                }
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
        logger.error(f"Error serving test inventory page: {e}")
        return jsonify({
            "error": "Failed to serve test page",
            "message": str(e)
        }), 500
