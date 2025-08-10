#!/usr/bin/env python3
"""Helper script to launch the Streamlit Control Center.

This script provides a unified way to launch either the holographic or classic
control center based on the CONTROL_CENTER_VARIANT environment variable.
It can be customized with environment variables for host, port, and other
streamlit configuration.

Usage:
    python scripts/run_control_center.py

Environment Variables:
    CONTROL_CENTER_VARIANT: Which control center to launch ("holo" [default] or "classic")
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

    # Determine which app to launch based on CONTROL_CENTER_VARIANT
    variant = os.getenv("CONTROL_CENTER_VARIANT", "holo").lower()

    if variant == "classic":
        app_path = project_root / "orchestrator" / "control_center" / "app.py"
        print("🎛️  Launching Classic Control Center...")
    else:
        app_path = project_root / "orchestrator" / "control_center" / "holo_app.py"
        print("🌌 Launching Holographic Control Center...")

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

    # Add dark theme for holographic mode
    if variant != "classic":
        cmd.extend(["--theme.base", "dark"])

    print(f"Launching Control Center on {address}:{port}")
    print(f"Variant: {variant}")
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
