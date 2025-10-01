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
- Sentry error monitoring and tracking
"""

import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

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
    # Initialize Sentry error monitoring (before everything else)
    init_sentry()
    
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


def init_sentry() -> None:
    """
    Initialize Sentry error monitoring with production-ready configuration.
    
    Uses environment variables for configuration:
    - SENTRY_DSN: Sentry project DSN (required)
    - ENVIRONMENT: Deployment environment (production/staging/development)
    - SENTRY_TRACES_SAMPLE_RATE: Transaction sampling rate (0.0-1.0)
    - SENTRY_PROFILES_SAMPLE_RATE: Profiling sampling rate (0.0-1.0)
    """
    sentry_dsn = os.environ.get('SENTRY_DSN')
    
    if not sentry_dsn:
        logging.warning("SENTRY_DSN not set - error monitoring disabled")
        return
    
    environment = os.environ.get('ENVIRONMENT', 'production')
    traces_sample_rate = float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '1.0'))
    profiles_sample_rate = float(os.environ.get('SENTRY_PROFILES_SAMPLE_RATE', '1.0'))
    
    try:
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=environment,
            
            # Integrations for Flask ecosystem
            integrations=[
                FlaskIntegration(
                    transaction_style="url",  # Track by URL pattern
                ),
                RedisIntegration(),  # Redis operations tracking
                SqlalchemyIntegration(),  # Database query tracking
                LoggingIntegration(
                    level=logging.INFO,  # Capture info and above
                    event_level=logging.ERROR  # Send errors as events
                ),
            ],
            
            # Performance monitoring
            traces_sample_rate=traces_sample_rate,
            profiles_sample_rate=profiles_sample_rate,
            
            # Enhanced data collection
            send_default_pii=True,  # Include user IP, headers for debugging
            attach_stacktrace=True,  # Always include stack traces
            
            # Release tracking
            release=os.environ.get('RELEASE_VERSION', 'dev'),
            
            # Error filtering
            ignore_errors=[
                KeyboardInterrupt,
                SystemExit,
            ],
            
            # Performance
            max_breadcrumbs=50,
            debug=False,
        )
        
        logging.info(f"✅ Sentry error monitoring initialized (environment: {environment})")
        
    except Exception as e:
        logging.error(f"❌ Failed to initialize Sentry: {e}")


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
        ('app.routes.empire_real', 'empire_bp', None),  # Real Empire API with business logic
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
        ('app.routes.aira_intelligence', 'aira_intelligence_bp', None),  # Enhanced AIRA Intelligence System
        ('app.routes.agent_orchestration', 'agent_orchestration_bp', None),  # Agent Orchestration for 100+ Agents
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
    
    # Initialize Agent Orchestration System
    try:
        import asyncio
        from orchestrator.core.agent_initialization import initialize_all_agents
        
        def init_agents():
            """Initialize agents in background thread."""
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(initialize_all_agents())
                app.logger.info(
                    f"🏰 Agent Orchestration initialized: {result['successful']}/{result['total_agents']} agents registered"
                )
            except Exception as e:
                app.logger.error(f"❌ Failed to initialize agent orchestration: {e}", exc_info=True)
            finally:
                loop.close()
        
        # Start agent initialization in background
        import threading
        agent_thread = threading.Thread(target=init_agents, daemon=True)
        agent_thread.start()
        
        app.logger.info("🏰 Agent Orchestration System initialization started")
        
    except Exception as e:
        app.logger.error(f"❌ Failed to start agent orchestration: {e}", exc_info=True)
