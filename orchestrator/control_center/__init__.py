"""Streamlit Control Center for the Royal Equips Orchestrator.

This package provides web-based dashboards for monitoring and controlling
the orchestrator and its agents.

- **Classic Dashboard (app.py)**: The default interface with monitoring and controls.

Entry points:
- python scripts/run_control_center.py (unified launcher)
- streamlit run orchestrator/control_center/app.py
"""

from orchestrator.control_center.app import run_dashboard

__all__ = ["run_dashboard"]
