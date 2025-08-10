#!/usr/bin/env python3
"""Helper script to launch the Holographic Control Center."""

import os
import subprocess
import sys
from pathlib import Path

def main():
    """Launch the holographic control center with environment overrides."""
    # Get project root
    script_path = Path(__file__).resolve()
    project_root = script_path.parent.parent
    
    # Set default environment variables for holographic mode
    env = os.environ.copy()
    env.setdefault('CONTROL_CENTER_VARIANT', 'holo')
    env.setdefault('POLL_SECONDS', '30')
    env.setdefault('VOICE_ENABLED', 'true')
    
    # Path to holographic app
    app_path = project_root / 'orchestrator' / 'control_center' / 'holo_app.py'
    
    # Launch streamlit
    cmd = [
        sys.executable, '-m', 'streamlit', 'run',
        str(app_path),
        '--server.port', '8501',
        '--server.enableCORS', 'false',
        '--server.enableXsrfProtection', 'false',
        '--theme.base', 'dark'
    ]
    
    print("🌌 Launching Holographic Control Center...")
    print(f"Command: {' '.join(cmd)}")
    print(f"Working directory: {project_root}")
    
    # Run in project root
    subprocess.run(cmd, cwd=project_root, env=env)

if __name__ == '__main__':
    main()