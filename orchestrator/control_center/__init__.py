"""Streamlit Control Center for the Royal Equips Orchestrator.

This package provides two web-based dashboards for monitoring and controlling
the orchestrator and its agents:

- **Holographic Control Center (holo_app.py)**: The default, featuring a futuristic
  neon/cyberpunk interface with voice control, AI assistance, and advanced features.
- **Classic Dashboard (app.py)**: The original interface with basic monitoring and controls.

Use the CONTROL_CENTER_VARIANT environment variable to select between variants:
- Default (unset or 'holo'): Holographic Control Center
- 'classic': Classic Dashboard

Entry points:
- python scripts/run_control_center.py (unified launcher)
- streamlit run orchestrator/control_center/holo_app.py (holographic)
- streamlit run orchestrator/control_center/app.py (classic)
"""

from orchestrator.control_center.app import run_dashboard

__all__ = ["run_dashboard"]
