"""Streamlit Control Center for the Royal Equips Orchestrator.

This package provides a web-based dashboard for monitoring and controlling
the orchestrator and its agents. The main entry point is the app.py module
which can be run via streamlit.
"""

from .app import run_dashboard

__all__ = ["run_dashboard"]