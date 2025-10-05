"""API documentation wiring for the Royal Equips orchestrator."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, Optional

from flask import Blueprint

try:
    from flasgger import Swagger
    HAS_FLASGGER = True
except ImportError:  # pragma: no cover - validated in init
    HAS_FLASGGER = False

try:
    import yaml
    HAS_YAML = True
except ImportError:  # pragma: no cover - runtime dependency via flasgger
    HAS_YAML = False

logger = logging.getLogger(__name__)

docs_bp = Blueprint("docs", __name__)

_SPEC_RELATIVE_PATH = Path("docs") / "openapi" / "royalgpt-command-api.yaml"


def _load_openapi_template() -> Optional[Dict[str, Any]]:
    """Load the RoyalGPT OpenAPI specification from disk."""

    if not HAS_YAML:
        logger.error("PyYAML is required to load the RoyalGPT OpenAPI document")
        return None

    project_root = Path(__file__).resolve().parents[2]
    spec_path = project_root / _SPEC_RELATIVE_PATH

    if not spec_path.exists():
        logger.error("OpenAPI specification missing at %s", spec_path)
        return None

    try:
        with spec_path.open("r", encoding="utf-8") as handle:
            template = yaml.safe_load(handle)
            if not isinstance(template, dict):
                raise ValueError("OpenAPI document must deserialize to a dictionary")
            return template
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.exception("Failed to load OpenAPI specification: %s", exc)
        return None


def init_swagger(app):
    """Initialize Flasgger with the RoyalGPT OpenAPI 3.1 specification."""
    if not HAS_FLASGGER:
        logger.warning("Flasgger not available, skipping Swagger initialization")
        return None

    swagger_config: Dict[str, Any] = {
        "headers": [],
        "specs": [
            {
                "endpoint": "apispec",
                "route": "/docs/apispec.json",
                "rule_filter": lambda _: True,
                "model_filter": lambda _: True,
            }
        ],
        "static_url_path": "/docs/static",
        "swagger_ui": True,
        "specs_route": "/docs",
    }

    template = _load_openapi_template()
    if template is None:
        logger.warning("Falling back to legacy Swagger 2 template")
        template = {
            "swagger": "2.0",
            "info": {
                "title": "Royal Equips Orchestrator API",
                "description": "Elite backend API for multi-agent e-commerce orchestration",
                "version": "2.0.0",
            },
        }

    if template.get("openapi"):
        swagger_state = app.config.setdefault("SWAGGER", {})
        swagger_state.update(
            {
                "title": template.get("info", {}).get("title", "RoyalGPT Command API"),
                "openapi": template["openapi"],
                "uiversion": 3,
            }
        )

    swagger = Swagger(app, config=swagger_config, template=template)
    logger.info("Swagger API documentation initialized at /docs using RoyalGPT spec")
    return swagger


@docs_bp.route("/api-documentation")  
def docs_redirect():
    """
    Redirect to Swagger UI documentation.
    This provides an alternative endpoint since /docs is handled by Flasgger.
    """
    from flask import redirect
    return redirect("/docs", code=307)
