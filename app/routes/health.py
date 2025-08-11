"""
Health and readiness check endpoints.

Provides liveness and readiness probes with dependency verification
and circuit breaker patterns.
"""

import logging
from datetime import datetime

from flask import Blueprint, jsonify

from app.services.health_service import HealthService

health_bp = Blueprint("health", __name__)
logger = logging.getLogger(__name__)


@health_bp.route("/healthz")
def liveness():
    """
    Liveness probe - lightweight check that service is running.
    ---
    tags:
      - Health
    responses:
      200:
        description: Service is alive
        schema:
          type: string
          example: "ok"
    """
    return "ok", 200, {"Content-Type": "text/plain"}


@health_bp.route("/readyz")
def readiness():
    """
    Readiness probe - checks if service is ready to handle requests.

    This endpoint checks critical dependencies and returns 200 only
    if the service can handle requests properly.
    """
    health_service = HealthService()

    try:
        result = health_service.check_readiness()

        if result["ready"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 503

    except Exception as e:
        logger.error(f"Readiness check failed with error: {e}")
        return (
            jsonify(
                {
                    "ready": False,
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            503,
        )


@health_bp.route("/health")
def legacy_health():
    """
    Legacy health endpoint for backwards compatibility.

    This maintains compatibility with existing monitoring that expects /health.
    """
    return "ok", 200, {"Content-Type": "text/plain"}
