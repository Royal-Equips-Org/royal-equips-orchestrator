"""Tests for the Streamlit Control Center import fixes.

These tests verify that the control center can be imported and run
both as a module and as a script, addressing the ImportError issue.
"""

import subprocess
import sys
from pathlib import Path

# Bootstrap for running tests: ensure project root is on sys.path
test_file = Path(__file__)
project_root = test_file.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))


def test_control_center_deprecated():
    """Test that acknowledges the old Streamlit control center has been removed."""
    # The old orchestrator/control_center Streamlit app has been deprecated
    # and replaced with the Flask-based command center at /command-center/
    # This test is kept for reference but no longer validates the old implementation
    pass


def test_orchestrator_core_imports():
    """Test that core orchestrator components can be imported."""
    try:
        from orchestrator.core import AgentBase, Orchestrator
        from orchestrator.core.orchestrator import Orchestrator as DirectOrchestrator
        assert Orchestrator is not None
        assert AgentBase is not None
        assert DirectOrchestrator is not None
    except ImportError as e:
        raise AssertionError(f"Failed to import orchestrator core: {e}")


def test_agents_imports():
    """Test that agents can be imported correctly."""
    try:
        from orchestrator.agents import (
            CustomerSupportAgent,
            InventoryForecastingAgent,
            MarketingAutomationAgent,
            OrderManagementAgent,
            PricingOptimizerAgent,
            ProductResearchAgent,
        )

        # Just check they're not None
        assert ProductResearchAgent is not None
        assert InventoryForecastingAgent is not None
        assert PricingOptimizerAgent is not None
    except ImportError as e:
        raise AssertionError(f"Failed to import agents: {e}")


if __name__ == "__main__":
    test_control_center_deprecated()
    test_orchestrator_core_imports()
    test_agents_imports()
    print("All tests passed!")
