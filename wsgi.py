"""
WSGI entry point for Royal Equips Orchestrator Flask application.

This module provides the WSGI application object for production deployment
with Gunicorn or other WSGI servers, including WebSocket support.

Sentry error monitoring is automatically initialized when creating the app.
"""

# CRITICAL: Apply eventlet monkey patching BEFORE any other imports
# This must be the first thing to prevent "Working outside of request context" errors
try:
    import eventlet
    eventlet.monkey_patch()
except ImportError:
    # eventlet not available - fallback to standard threading
    pass

import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app import create_app
from app.sockets import socketio

# Create the application instance (Sentry auto-initialized)
app = create_app()

# For SocketIO WSGI support
if socketio is None:
    from app.sockets import init_socketio
    socketio_instance = init_socketio(app)
else:
    socketio_instance = socketio

if __name__ == "__main__":
    # For development testing
    port = int(os.environ.get("PORT", 10000))
    host = os.environ.get("HOST", "0.0.0.0")

    if socketio_instance:
        # Run with SocketIO support
        socketio_instance.run(
            app,
            host=host,
            port=port,
            debug=app.config.get("DEBUG", False)
        )
    else:
        # Fallback to regular Flask
        app.run(host=host, port=port, debug=app.config.get("DEBUG", False))
