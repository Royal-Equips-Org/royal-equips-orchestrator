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


def test_control_center_script_import():
    """Test that the control center can be run as a script without ImportError."""
    project_root = Path(__file__).parent.parent
    app_path = project_root / "orchestrator" / "control_center" / "app.py"
    
    # Run the script and check it doesn't fail with ImportError
    result = subprocess.run(
        [sys.executable, str(app_path)],
        cwd=project_root,
        capture_output=True,
        text=True,
        timeout=10  # Don't let it run too long
    )
    
    # The script should start without ImportError
    # We expect it to exit successfully or with a warning about running via streamlit
    assert "ImportError" not in result.stderr, f"ImportError found: {result.stderr}"
    assert "attempted relative import with no known parent package" not in result.stderr
    

def test_control_center_module_import():
    """Test that the control center can be imported as a module."""
    try:
        from orchestrator.control_center import run_dashboard
        from orchestrator.control_center.app import get_orchestrator
        assert callable(run_dashboard)
        assert callable(get_orchestrator)
    except ImportError as e:
        assert False, f"Failed to import control center module: {e}"


def test_orchestrator_core_imports():
    """Test that core orchestrator components can be imported."""
    try:
        from orchestrator.core import Orchestrator, AgentBase
        from orchestrator.core.orchestrator import Orchestrator as DirectOrchestrator
        assert Orchestrator is not None
        assert AgentBase is not None
        assert DirectOrchestrator is not None
    except ImportError as e:
        assert False, f"Failed to import orchestrator core: {e}"


def test_agents_imports():
    """Test that agents can be imported correctly."""
    try:
        from orchestrator.agents import (
            ProductResearchAgent,
            InventoryForecastingAgent,
            PricingOptimizerAgent,
            MarketingAutomationAgent,
            CustomerSupportAgent,
            OrderManagementAgent
        )
        # Just check they're not None
        assert ProductResearchAgent is not None
        assert InventoryForecastingAgent is not None
        assert PricingOptimizerAgent is not None
    except ImportError as e:
        assert False, f"Failed to import agents: {e}"


if __name__ == "__main__":
    test_control_center_script_import()
    test_control_center_module_import() 
    test_orchestrator_core_imports()
    test_agents_imports()
    print("All tests passed!")