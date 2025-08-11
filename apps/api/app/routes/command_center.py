"""
Command Center blueprint for serving the React SPA.

Serves the built React application at /command-center with proper
SPA routing fallback support.
"""

import logging
import os
from pathlib import Path
from flask import Blueprint, send_from_directory, send_file

logger = logging.getLogger(__name__)

command_center_bp = Blueprint("command_center", __name__, url_prefix="/command-center")

# Path to built React app
STATIC_DIR = Path(__file__).parent.parent / "static"
ADMIN_BUILD_DIR = Path(__file__).parent.parent.parent / "admin" / "dist"

@command_center_bp.route("/", defaults={'path': ''})
@command_center_bp.route("/<path:path>")
def serve_spa(path):
    """
    Serve the React SPA with client-side routing support.
    
    - If path is empty or doesn't exist as a file, serve index.html
    - Otherwise serve the requested static file
    """
    try:
        # Determine which directory to serve from
        if ADMIN_BUILD_DIR.exists() and (ADMIN_BUILD_DIR / "index.html").exists():
            build_dir = ADMIN_BUILD_DIR
            logger.debug(f"Serving from admin build directory: {build_dir}")
        elif STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
            build_dir = STATIC_DIR
            logger.debug(f"Serving from static directory: {build_dir}")
        else:
            logger.error("No built React app found - run 'npm run build' in admin/")
            return """
            <html>
            <head><title>Royal Equips Control Center</title></head>
            <body style="background: #0A0A0F; color: #00FFFF; font-family: monospace; text-align: center; padding: 2rem;">
                <h1>🚀 Royal Equips Control Center</h1>
                <p>React app not built yet.</p>
                <p>Run: <code>cd admin && npm install && npm run build</code></p>
                <hr>
                <p><a href="/healthz" style="color: #00FFFF;">Health Check</a> | 
                   <a href="/metrics" style="color: #00FFFF;">Metrics</a> |
                   <a href="/docs" style="color: #00FFFF;">API Docs</a></p>
            </body>
            </html>
            """, 200, {'Content-Type': 'text/html'}
        
        # Handle assets paths - map /admin/ to assets/ for compatibility
        if path.startswith('admin/assets/'):
            actual_path = path.replace('admin/assets/', 'assets/')
        elif path.startswith('admin/'):
            actual_path = path.replace('admin/', '')
        else:
            actual_path = path
        
        # If no path or path doesn't exist as file, serve index.html for SPA routing
        if not actual_path or not (build_dir / actual_path).exists():
            index_file = build_dir / "index.html"
            if index_file.exists():
                return send_file(index_file)
            else:
                logger.error(f"index.html not found in {build_dir}")
                return "Command Center unavailable", 503
        
        # Serve the requested static file
        return send_from_directory(build_dir, actual_path)
        
    except Exception as e:
        logger.error(f"Error serving command center: {e}")
        return f"Error loading command center: {str(e)}", 500

@command_center_bp.route("/health")
def command_center_health():
    """Health check specifically for the command center."""
    build_exists = (
        (ADMIN_BUILD_DIR.exists() and (ADMIN_BUILD_DIR / "index.html").exists()) or
        (STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists())
    )
    
    return {
        "service": "Command Center",
        "status": "ok" if build_exists else "unavailable",
        "build_exists": build_exists,
        "admin_build_dir": str(ADMIN_BUILD_DIR),
        "static_dir": str(STATIC_DIR)
    }, 200 if build_exists else 503