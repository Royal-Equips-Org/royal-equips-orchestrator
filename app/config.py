"""
Configuration management for Flask application.

Provides environment-specific configurations with sensible defaults
and environment variable support. Uses UnifiedSecretResolver to fetch
secrets from Cloudflare/deployment variables when available.
"""

import os
import asyncio
from typing import Type, Optional

# Import secret resolver for secure credential management
try:
    from core.secrets.secret_provider import UnifiedSecretResolver
    _secret_resolver = UnifiedSecretResolver()
except ImportError:
    _secret_resolver = None


def _get_secret(key: str, default: Optional[str] = None) -> Optional[str]:
    """
    Get secret from UnifiedSecretResolver or fallback to environment variable.
    
    This ensures secrets are fetched from Cloudflare/deployment variables when available,
    with graceful fallback to local environment variables for development.
    """
    if _secret_resolver:
        try:
            value = asyncio.run(_secret_resolver.get_secret_with_fallback(key, None))
            if value:
                return value
        except Exception:
            pass
    
    # Fallback to environment variable
    return os.getenv(key, default)


class Config:
    """Base configuration class."""

    # Basic Flask settings (use secret resolver for sensitive values)
    SECRET_KEY = _get_secret("SECRET_KEY", "dev-secret-key-change-in-production")
    DEBUG = False
    TESTING = False

    # Application settings
    APP_NAME = os.getenv("APP_NAME", "Royal Equips Orchestrator")
    COMMAND_CENTER_URL = os.getenv("COMMAND_CENTER_URL", "/docs")

    # Server settings
    PORT = int(os.getenv("PORT", 10000))
    HOST = os.getenv("HOST", "0.0.0.0")

    # External service settings (use secret resolver for API keys)
    SHOPIFY_API_KEY = _get_secret("SHOPIFY_API_KEY")
    SHOPIFY_API_SECRET = _get_secret("SHOPIFY_API_SECRET")
    SHOP_NAME = os.getenv("SHOP_NAME")
    OPENAI_API_KEY = _get_secret("OPENAI_API_KEY")

    # Product Research Agent API keys (use secret resolver)
    AUTO_DS_API_KEY = _get_secret("AUTO_DS_API_KEY") or _get_secret("AUTODS_API_KEY")
    SPOCKET_API_KEY = _get_secret("SPOCKET_API_KEY")

    # BigQuery settings
    BIGQUERY_PROJECT_ID = os.getenv("BIGQUERY_PROJECT_ID")
    BIGQUERY_DATASET = os.getenv("BIGQUERY_DATASET")
    BIGQUERY_TABLE = os.getenv("BIGQUERY_TABLE")

    # GitHub integration (use secret resolver for token)
    GITHUB_TOKEN = _get_secret("GITHUB_TOKEN")

    # Feature flags
    ENABLE_METRICS = os.getenv("ENABLE_METRICS", "true").lower() == "true"
    ENABLE_STREAMING = os.getenv("ENABLE_STREAMING", "true").lower() == "true"

    # Circuit breaker settings
    CIRCUIT_BREAKER_FAILURE_THRESHOLD = int(
        os.getenv("CIRCUIT_BREAKER_FAILURE_THRESHOLD", "5")
    )
    CIRCUIT_BREAKER_RECOVERY_TIMEOUT = int(
        os.getenv("CIRCUIT_BREAKER_RECOVERY_TIMEOUT", "60")
    )

    # FASE 2: RoyalGPT Orchestration Settings (use secret resolver for API key)
    ROYALGPT_ENABLED = os.getenv("ENABLE_ROYALGPT_ORCHESTRATION", "true").lower() == "true"
    API_KEY_ROYALGPT = _get_secret("API_KEY_ROYALGPT", "")
    AUTHORIZED_AGENTS_SCOPE = os.getenv("AUTHORIZED_AGENTS_SCOPE", "*")


class DevelopmentConfig(Config):
    """Development configuration."""

    DEBUG = True
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")


class TestingConfig(Config):
    """Testing configuration."""

    TESTING = True
    SECRET_KEY = os.getenv("SECRET_KEY", "test-secret-key-change-in-production")
    PORT = 5000  # Different port for testing


class ProductionConfig(Config):
    """Production configuration."""

    DEBUG = False
    # Production settings are inherited from base Config with env vars


config = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}


def get_config(config_name: str = None) -> Type[Config]:
    """
    Get configuration class based on environment.

    Args:
        config_name: Configuration name ('development', 'testing', 'production')

    Returns:
        Configuration class
    """
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "default")

    return config.get(config_name, config["default"])
