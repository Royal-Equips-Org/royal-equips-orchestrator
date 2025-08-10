"""
Configuration module for Royal Equips Orchestrator FastAPI application.

This module provides centralized configuration management using environment variables
with sensible defaults for development and production environments.
"""

import os
from dataclasses import dataclass


@dataclass
class Settings:
    """Application settings loaded from environment variables."""
    
    # Command Center Configuration
    command_center_url: str = "/docs"  # Default to FastAPI Swagger UI
    app_name: str = "Royal Equips Orchestrator"
    
    # Application Configuration
    debug: bool = False
    
    def __post_init__(self):
        """Load settings from environment variables after initialization."""
        # Command Center URL - can be internal path or external URL
        if env_url := os.getenv("COMMAND_CENTER_URL"):
            self.command_center_url = env_url
            
        # Application name for display
        if env_name := os.getenv("APP_NAME"):
            self.app_name = env_name
            
        # Debug mode
        if env_debug := os.getenv("DEBUG"):
            self.debug = env_debug.lower() in ("true", "1", "yes", "on")


# Global settings instance
settings = Settings()