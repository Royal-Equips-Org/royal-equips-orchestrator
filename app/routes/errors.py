"""
Error handling for Flask application.

Provides friendly error pages and JSON fallbacks for different error types.
"""

import logging

from flask import Flask, current_app, jsonify, render_template, request

logger = logging.getLogger(__name__)


def register_error_handlers(app: Flask) -> None:
    """Register application error handlers."""

    @app.errorhandler(404)
    def not_found_error(error):
        """Handle 404 errors with friendly HTML or JSON response."""
        logger.debug(f"404 error for path: {request.path}")

        # FASE 1: Always return JSON for API routes and health endpoints
        if request.path.startswith("/api/") or request.path.startswith("/health") or request.path in ["/healthz", "/readyz", "/liveness", "/readiness"]:
            return (
                jsonify(
                    {
                        "error": "Not Found",
                        "status_code": 404,
                        "message": "The requested resource was not found",
                        "path": request.path,
                    }
                ),
                404,
            )

        # Check if request expects JSON
        if request.is_json or "application/json" in request.headers.get("Accept", ""):
            return (
                jsonify(
                    {
                        "error": "Not Found",
                        "status_code": 404,
                        "message": "The requested resource was not found",
                        "path": request.path,
                    }
                ),
                404,
            )

        # Try to render HTML template for non-API routes
        try:
            return (
                render_template(
                    "errors/404.html",
                    app_name=current_app.config.get(
                        "APP_NAME", "Royal Equips Orchestrator"
                    ),
                    path=request.path,
                ),
                404,
            )
        except Exception:
            # Fallback to JSON if template fails
            return (
                jsonify(
                    {
                        "error": "Not Found",
                        "status_code": 404,
                        "message": "The requested resource was not found",
                        "path": request.path,
                    }
                ),
                404,
            )

    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors with friendly HTML or JSON response."""
        logger.error(f"500 error for path {request.path}: {error}")

        # Check if request expects JSON
        if request.is_json or "application/json" in request.headers.get("Accept", ""):
            return (
                jsonify(
                    {
                        "error": "Internal Server Error",
                        "status_code": 500,
                        "message": "An internal server error occurred",
                        "path": request.path,
                    }
                ),
                500,
            )

        # Try to render HTML template
        try:
            return (
                render_template(
                    "errors/500.html",
                    app_name=current_app.config.get(
                        "APP_NAME", "Royal Equips Orchestrator"
                    ),
                    path=request.path,
                ),
                500,
            )
        except Exception:
            # Fallback to JSON if template fails
            return (
                jsonify(
                    {
                        "error": "Internal Server Error",
                        "status_code": 500,
                        "message": "An internal server error occurred",
                        "path": request.path,
                    }
                ),
                500,
            )

    @app.errorhandler(503)
    def service_unavailable(error):
        """Handle 503 errors for service unavailable."""
        logger.warning(f"503 error for path {request.path}: {error}")

        return (
            jsonify(
                {
                    "error": "Service Unavailable",
                    "status_code": 503,
                    "message": "Service is temporarily unavailable",
                    "path": request.path,
                }
            ),
            503,
        )

    @app.errorhandler(Exception)
    def handle_exception(e):
        """Handle unexpected exceptions."""
        logger.error(f"Unhandled exception for path {request.path}: {e}", exc_info=True)

        # Don't handle HTTP exceptions that have their own handlers
        if hasattr(e, "code"):
            return e

        return (
            jsonify(
                {
                    "error": "Internal Server Error",
                    "status_code": 500,
                    "message": "An unexpected error occurred",
                    "path": request.path,
                }
            ),
            500,
        )
