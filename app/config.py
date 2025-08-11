"""
Configuration management for Flask application.

Provides environment-specific configurations with sensible defaults
and environment variable support.
"""

import os
from typing import Type


class Config:
    """Base configuration class."""

    # Basic Flask settings
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    DEBUG = False
    TESTING = False

    # Application settings
    APP_NAME = os.getenv("APP_NAME", "Royal Equips Orchestrator")
    COMMAND_CENTER_URL = os.getenv("COMMAND_CENTER_URL", "/docs")

    # Server settings
    PORT = int(os.getenv("PORT", 10000))
    HOST = os.getenv("HOST", "0.0.0.0")

    # External service settings
    SHOPIFY_API_KEY = os.getenv("SHOPIFY_API_KEY")
    SHOPIFY_API_SECRET = os.getenv("SHOPIFY_API_SECRET")
    SHOP_NAME = os.getenv("SHOP_NAME")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

    # BigQuery settings
    BIGQUERY_PROJECT_ID = os.getenv("BIGQUERY_PROJECT_ID")
    BIGQUERY_DATASET = os.getenv("BIGQUERY_DATASET")
    BIGQUERY_TABLE = os.getenv("BIGQUERY_TABLE")

    # GitHub integration
    GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

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


class DevelopmentConfig(Config):
    """Development configuration."""

    DEBUG = True
    SECRET_KEY = "dev-secret-key"


class TestingConfig(Config):
    """Testing configuration."""

    TESTING = True
    SECRET_KEY = "test-secret-key"
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
