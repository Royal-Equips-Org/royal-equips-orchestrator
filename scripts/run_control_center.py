#!/usr/bin/env python3
"""Helper script to launch the Streamlit Control Center.

This script provides a standardized way to launch the control center
with proper environment handling. It can be customized with environment
variables for host, port, and other streamlit configuration.

Usage:
    python scripts/run_control_center.py

Environment Variables:
    STREAMLIT_SERVER_PORT: Port to run on (default: 8501)
    STREAMLIT_SERVER_ADDRESS: Address to bind to (default: localhost)
    STREAMLIT_SERVER_HEADLESS: Run in headless mode (default: false)
"""

import os
import subprocess
import sys
from pathlib import Path


def main():
    """Launch the Streamlit Control Center with environment-controlled settings."""
    # Get the project root directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    app_path = project_root / "orchestrator" / "control_center" / "app.py"
    
    if not app_path.exists():
        print(f"Error: Control center app not found at {app_path}")
        sys.exit(1)
    
    # Build streamlit command with environment variables
    cmd = ["streamlit", "run", str(app_path)]
    
    # Add server configuration from environment
    port = os.getenv("STREAMLIT_SERVER_PORT", "8501")
    address = os.getenv("STREAMLIT_SERVER_ADDRESS", "localhost") 
    headless = os.getenv("STREAMLIT_SERVER_HEADLESS", "false").lower() == "true"
    
    cmd.extend([
        "--server.port", port,
        "--server.address", address
    ])
    
    if headless:
        cmd.append("--server.headless")
        cmd.append("true")
    
    print(f"Launching Control Center on {address}:{port}")
    print(f"Command: {' '.join(cmd)}")
    
    # Change to project root directory
    os.chdir(project_root)
    
    # Launch streamlit
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error launching Control Center: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nShutting down Control Center...")
        sys.exit(0)


if __name__ == "__main__":
    main()