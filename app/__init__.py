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
from pathlib import Path
from typing import Optional

from flask import Flask
from flask_cors import CORS

from app.config import get_config
from app.routes.docs import init_swagger
from app.sockets import init_socketio


def create_app(config: Optional[str] = None) -> Flask:
    """
    Create and configure Flask application.

    Args:
        config: Configuration object or string name

    Returns:
        Configured Flask application
    """
    # Set correct paths for templates and static files relative to project root
    template_dir = Path(__file__).parent.parent / "templates" 
    static_dir = Path(__file__).parent.parent / "static"
    
    app = Flask(__name__, 
                template_folder=str(template_dir),
                static_folder=str(static_dir))

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
    init_socketio(app)

    # Initialize API documentation
    init_swagger(app)

    # Register blueprints
    register_blueprints(app)

    # Register error handlers
    register_error_handlers(app)

    # Initialize autonomous empire (after everything else is set up)
    init_autonomous_empire(app)

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
    """Register application blueprints with auto-fixing capabilities."""
    from app.utils.auto_fix import resilient_import
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Define blueprints with their import paths and registration details
    blueprints_config = [
        ('app.routes.main', 'main_bp', None),
        ('app.routes.health', 'health_bp', None),
        ('app.routes.agents', 'agents_bp', '/agents'),
        ('app.routes.metrics', 'metrics_bp', None),
        ('app.routes.control', 'control_bp', None),
        ('app.routes.command_center', 'command_center_bp', None),
        ('app.routes.aria', 'aria_bp', None),
        ('app.routes.docs', 'docs_bp', None),
        ('app.routes.auto_fix', 'auto_fix_bp', None),
        ('app.routes.empire', 'empire_bp', None),  # Empire management endpoints
        ('app.routes.empire_production', 'empire_bp', None),  # Production Empire API with real business logic
        ('app.blueprints.shopify', 'shopify_bp', None),
        ('app.blueprints.github', 'github_bp', None),
        ('app.blueprints.ai_assistant', 'assistant_bp', None),
        ('app.blueprints.workspace', 'workspace_bp', None),
        ('app.routes.edge_functions', 'edge_functions_bp', None),
        ('app.routes.marketing_automation', 'marketing_bp', None),  # Production Marketing Automation with AI
        ('app.routes.customer_support', 'customer_support_bp', None),  # Production Customer Support with AI
        ('app.routes.analytics', 'analytics_bp', None),  # Production Analytics with Business Intelligence
        ('app.routes.inventory', 'inventory_bp', None),
        ('app.routes.security', 'security_bp', None),  # Production Security with AI Fraud Detection
        ('app.routes.finance', 'finance_bp', None),  # Production Finance with Payment Intelligence
    ]
    
    registered_count = 0
    failed_count = 0
    
    for module_path, blueprint_name, url_prefix in blueprints_config:
        try:
            # Use resilient import to load the module
            module = resilient_import(module_path)
            
            if module and hasattr(module, blueprint_name):
                blueprint = getattr(module, blueprint_name)
                
                if url_prefix:
                    app.register_blueprint(blueprint, url_prefix=url_prefix)
                    logger.info(f"Registered blueprint {blueprint_name} with prefix {url_prefix}")
                else:
                    app.register_blueprint(blueprint)
                    logger.info(f"Registered blueprint {blueprint_name}")
                
                registered_count += 1
            else:
                logger.warning(f"Blueprint {blueprint_name} not found in module {module_path}")
                failed_count += 1
                
        except Exception as e:
            logger.error(f"Failed to register blueprint {blueprint_name} from {module_path}: {e}")
            failed_count += 1
    
    logger.info(f"Blueprint registration complete: {registered_count} successful, {failed_count} failed")
    
    # Perform a health check after blueprint registration
    from app.utils.auto_fix import health_check
    health_report = health_check()
    
    if health_report['overall_status'] != 'healthy':
        logger.warning(f"System health check shows status: {health_report['overall_status']}")
        if health_report['errors_detected']:
            for error in health_report['errors_detected']:
                logger.error(f"Health check error: {error}")
        if health_report['fixes_applied']:
            for fix in health_report['fixes_applied']:
                logger.info(f"Auto-fix applied: {fix}")
    else:
        logger.info("System health check passed")


def register_error_handlers(app: Flask) -> None:
    """Register application error handlers."""
    from app.routes.errors import register_error_handlers as reg_errors

    reg_errors(app)


def init_autonomous_empire(app: Flask) -> None:
    """Initialize the autonomous empire management system."""
    try:
        from app.services.empire_startup import auto_start_autonomous_empire
        
        # Start autonomous empire with a 15-second delay to allow full app initialization
        auto_start_autonomous_empire(delay_seconds=15)
        
        app.logger.info("🤖 Autonomous Empire initialization scheduled")
        
    except Exception as e:
        app.logger.error(f"❌ Failed to initialize autonomous empire: {e}")
        # Don't fail the entire app startup - empire can be started manually
