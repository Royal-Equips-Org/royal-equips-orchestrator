"""
Flask application factory for Royal Equips Orchestrator.

This module provides a production-ready Flask application with:
- Agent endpoints with streaming support
- System health and metrics endpoints
- Command center SPA serving
- WebSocket real-time streams
- Control endpoints (god-mode, emergency-stop)
- Circuit breaker patterns and fallbacks
- Structured logging and error handling
- CORS configuration
"""

import logging
import os
from datetime import datetime
from typing import Optional

from flask import Flask
from flask_cors import CORS

from app.config import get_config
from app.sockets import init_socketio
from app.routes.docs import init_swagger


def create_app(config: Optional[str] = None) -> Flask:
    """
    Create and configure Flask application.

    Args:
        config: Configuration object or string name

    Returns:
        Configured Flask application
    """
    app = Flask(__name__)

    # Load configuration
    app.config.from_object(get_config(config))

    # Set up logging
    setup_logging(app)

    # Configure CORS
    CORS(
        app,
        origins=["*"],  # TODO: Restrict per environment
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Store startup time for uptime calculation
    app.startup_time = datetime.now()

    # Initialize WebSocket support
    socketio_instance = init_socketio(app)
    
    # Initialize API documentation
    init_swagger(app)

    # Register blueprints
    register_blueprints(app)

    # Register error handlers
    register_error_handlers(app)

    app.logger.info("Royal Equips Flask Orchestrator initialized successfully")

    return app


def setup_logging(app: Flask) -> None:
    """Configure application logging."""
    if not app.debug:
        logging.basicConfig(
            level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
        )

    # Suppress health endpoint noise
    logging.getLogger("werkzeug").setLevel(logging.WARNING)


def register_blueprints(app: Flask) -> None:
    """Register application blueprints."""
    from app.routes.agents import agents_bp
    from app.routes.health import health_bp
    from app.routes.main import main_bp
    from app.routes.metrics import metrics_bp
    from app.routes.control import control_bp
    from app.routes.command_center import command_center_bp
    from app.routes.docs import docs_bp
    from app.blueprints.shopify import shopify_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(agents_bp, url_prefix="/agents")
    app.register_blueprint(metrics_bp)
    app.register_blueprint(control_bp)
    app.register_blueprint(command_center_bp)
    app.register_blueprint(docs_bp)
    app.register_blueprint(shopify_bp)


def register_error_handlers(app: Flask) -> None:
    """Register application error handlers."""
    from app.routes.errors import register_error_handlers as reg_errors

    reg_errors(app)
