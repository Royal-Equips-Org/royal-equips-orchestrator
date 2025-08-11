"""
WSGI entry point for Royal Equips Orchestrator Flask application.

This module provides the WSGI application object for production deployment
with Gunicorn or other WSGI servers.
"""

import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app import create_app

# Create the application instance
app = create_app()

if __name__ == "__main__":
    # For development testing
    port = int(os.environ.get("PORT", 10000))
    host = os.environ.get("HOST", "0.0.0.0")

    app.run(host=host, port=port, debug=app.config.get("DEBUG", False))
