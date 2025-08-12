"""
API Documentation endpoints using Flasgger (Swagger UI).

Provides interactive API documentation at /docs.
"""

import logging

from flask import Blueprint

try:
    from flasgger import Swagger
    HAS_FLASGGER = True
except ImportError:
    HAS_FLASGGER = False

logger = logging.getLogger(__name__)

docs_bp = Blueprint("docs", __name__)


def init_swagger(app):
    """Initialize Swagger documentation for the Flask app."""
    if not HAS_FLASGGER:
        logger.warning("Flasgger not available, skipping Swagger initialization")
        return None

    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": "apispec",
                "route": "/docs/apispec.json",
                "rule_filter": lambda rule: True,  # Include all endpoints
                "model_filter": lambda tag: True,  # Include all models
            }
        ],
        "static_url_path": "/docs/static",
        "swagger_ui": True,
        "specs_route": "/docs"
    }

    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "Royal Equips Orchestrator API",
            "description": "Elite backend API for multi-agent e-commerce orchestration",
            "version": "2.0.0",
            "contact": {
                "name": "Royal Equips Orchestrator",
                "url": "https://github.com/Skidaw23/royal-equips-orchestrator"
            }
        },
        "host": "0.0.0.0:10000",  # Will be overridden in production
        "schemes": ["http", "https"],
        "consumes": ["application/json"],
        "produces": ["application/json", "text/plain"]
    }

    swagger = Swagger(app, config=swagger_config, template=swagger_template)
    logger.info("Swagger API documentation initialized at /docs")
    return swagger


@docs_bp.route("/docs")
def docs_redirect():
    """
    Redirect to Swagger UI documentation.
    This is handled by Flasgger automatically, but we keep this
    for explicit routing and potential customization.
    """
    # This will be handled by Flasgger's automatic routing
    pass
