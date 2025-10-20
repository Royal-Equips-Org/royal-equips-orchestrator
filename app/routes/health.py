"""Health and readiness endpoints for the orchestrator."""

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from flask import Blueprint, current_app, jsonify

from app.services.empire_service import get_empire_service
from app.services.health_service import get_health_service

health_bp = Blueprint("health", __name__)
logger = logging.getLogger(__name__)


async def _fetch_agent_snapshot() -> Optional[Dict[str, Any]]:
    """Collect active agent telemetry from the empire service."""

    try:
        service = await get_empire_service()
        metrics = await service.get_empire_metrics()
        degraded = max(metrics.total_agents - metrics.active_agents, 0)
        return {
            "active": metrics.active_agents,
            "total": metrics.total_agents,
            "degraded": degraded,
        }
    except Exception as exc:  # pragma: no cover - best-effort diagnostics
        logger.warning("Failed to gather agent snapshot: %s", exc)
        return None


def _run_async(coro):
    """Execute a coroutine safely from synchronous context."""

    try:
        return asyncio.run(coro)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()


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
          type: object
          properties:
            status:
              type: string
              example: "healthy"
    """
    return jsonify({"status": "healthy"}), 200


@health_bp.route("/readyz")
def readiness():
    """
    Readiness probe - checks if service is ready to handle requests.

    This endpoint checks critical dependencies and returns 200 only
    if the service can handle requests properly.
    """
    health_service_instance = get_health_service()

    try:
        result = health_service_instance.check_readiness()

        if result["ready"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 503

    except Exception as e:
        logger.error(f"Readiness check failed with error: {e}", exc_info=True)
        # Don't expose internal error details to external users
        return (
            jsonify(
                {
                    "ready": False,
                    "status": "error",
                    "error": "Service readiness check failed",
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            503,
        )


@health_bp.route("/validate")
def validate_production():
    """
    Production validation endpoint - checks all required credentials and configuration.
    
    This endpoint runs the full production validator and returns detailed results.
    Useful for deployment verification and troubleshooting.
    ---
    tags:
      - Health
    responses:
      200:
        description: All validations passed
        schema:
          type: object
          properties:
            passed:
              type: boolean
            total_checks:
              type: integer
            passed_checks:
              type: integer
            critical_failures:
              type: integer
            warnings:
              type: integer
            results:
              type: array
              items:
                type: object
      503:
        description: Validation failed
    """
    try:
        from core.production_validator import ProductionValidator
        
        # Run validator (non-strict mode for status endpoint)
        validator = ProductionValidator(strict_mode=False)
        validation_passed = validator.validate_all()
        
        # Get detailed report
        report = validator.get_validation_report()
        report['timestamp'] = datetime.now(timezone.utc).isoformat()
        
        # Return appropriate status code
        status_code = 200 if validation_passed else 503
        
        return jsonify(report), status_code
        
    except Exception as e:
        logger.error(f"Production validation endpoint failed: {e}", exc_info=True)
        # Don't expose internal error details to external users
        return jsonify({
            "passed": False,
            "error": "Validation service temporarily unavailable",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 500


@health_bp.route("/health")
def diagnostics():
    """Return structured health diagnostics for the orchestrator."""

    health_service_instance = get_health_service()
    try:
        readiness = health_service_instance.check_readiness()
        status = readiness.get("status", "healthy")
    except Exception as exc:  # pragma: no cover - defensive safeguard
        logger.exception("Diagnostics readiness check failed: %s", exc)
        readiness = {"checks": [], "ready": False, "status": "critical"}
        status = "critical"

    startup_time = getattr(current_app, "startup_time", None)
    now = datetime.now(timezone.utc)
    if startup_time is not None:
        uptime_seconds = (now - startup_time).total_seconds()
        started_at = startup_time.isoformat()
    else:
        uptime_seconds = 0.0
        started_at = None

    version = (
        current_app.config.get("SERVICE_VERSION")
        or current_app.config.get("RELEASE_VERSION")
        or os.getenv("SERVICE_VERSION")
        or os.getenv("RELEASE_VERSION")
        or "2.0.0"
    )

    agent_snapshot = _run_async(_fetch_agent_snapshot())
    agents = agent_snapshot or {"active": 0, "total": 0, "degraded": None}

    payload = {
        "status": status,
        "uptime": {
            "startedAt": started_at,
            "seconds": uptime_seconds,
        },
        "version": version,
        "agents": agents,
        "timestamp": now.isoformat(),
        "checks": readiness.get("checks", []),
    }

    http_status = 200 if status in {"healthy", "degraded"} else 503
    return jsonify(payload), http_status
