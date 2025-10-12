"""
System metrics endpoint.

Provides runtime metrics, performance data, and system statistics.
"""

import logging
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify

metrics_bp = Blueprint("metrics", __name__)
logger = logging.getLogger(__name__)

# In-memory storage for metrics (TODO: Replace with Redis/Database)
_metrics_storage = {
    "requests": 0,
    "errors": 0,
    "agent_sessions": 0,
    "agent_messages": 0,
}


@metrics_bp.route("/metrics")
def get_metrics():
    """Get system metrics and statistics."""
    if not current_app.config.get("ENABLE_METRICS", True):
        return jsonify({"error": "Metrics disabled"}), 503

    try:
        # Calculate uptime
        startup_time = getattr(current_app, "startup_time", datetime.now(timezone.utc))
        uptime = (datetime.now(timezone.utc) - startup_time).total_seconds()

        metrics = {
            "ok": True,
            "backend": "flask",
            "version": "2.0.0",
            "uptime_seconds": uptime,
            "active_sessions": _metrics_storage.get("agent_sessions", 0),
            "total_messages": _metrics_storage.get("agent_messages", 0),
            "total_requests": _metrics_storage.get("requests", 0),
            "total_errors": _metrics_storage.get("errors", 0),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "system": {
                "python_version": f"{current_app.config.get('PYTHON_VERSION', 'unknown')}",
                "flask_env": current_app.config.get("FLASK_ENV", "unknown"),
                "debug_mode": current_app.debug,
            },
        }

        return jsonify(metrics)

    except Exception as e:
        logger.error(f"Metrics collection failed: {e}")
        return (
            jsonify(
                {
                    "ok": False,
                    "error": "Metrics collection failed",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            ),
            500,
        )


def increment_metric(key: str, value: int = 1) -> None:
    """Increment a metric counter."""
    global _metrics_storage
    _metrics_storage[key] = _metrics_storage.get(key, 0) + value


def set_metric(key: str, value: int) -> None:
    """Set a metric value."""
    global _metrics_storage
    _metrics_storage[key] = value


# Request middleware to track metrics
@metrics_bp.before_app_request
def before_request():
    """Track incoming requests."""
    increment_metric("requests")


@metrics_bp.app_errorhandler(Exception)
def handle_error(error):
    """Track errors."""
    increment_metric("errors")
    return None  # Let other error handlers deal with the response
