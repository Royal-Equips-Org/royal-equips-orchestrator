"""
Legacy FastAPI configuration retained for backward compatibility. 
Default production runtime is Flask (wsgi:app).

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
    
    # Logging Configuration
    suppress_health_logs: bool = True
    disable_access_log: bool = False
    log_level: str = "info"
    
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
            
        # Logging control
        if env_suppress := os.getenv("SUPPRESS_HEALTH_LOGS"):
            self.suppress_health_logs = env_suppress.lower() in ("true", "1", "yes", "on")
        
        if env_disable := os.getenv("DISABLE_ACCESS_LOG"):
            self.disable_access_log = env_disable.lower() in ("true", "1", "yes", "on")
        
        if env_level := os.getenv("LOG_LEVEL"):
            self.log_level = env_level.lower()


# Global settings instance
settings = Settings()