"""Royal Equips Orchestrator package.

This top-level package exposes the orchestrator, agents, and control
center. It enables programmatic access to the orchestrator engine
without using the provided entry scripts. You can import the
orchestrator and agents directly from here.
"""

# Lazy imports to avoid heavy dependencies during Flask app startup
__all__ = [
    "Orchestrator",
    "ProductResearchAgent",
    "InventoryForecastingAgent",
    "PricingOptimizerAgent",
    "MarketingAutomationAgent",
    "CustomerSupportAgent",
    "OrderManagementAgent",
    "ProductRecommendationAgent",
    "AnalyticsAgent",
]

__version__ = "0.1.0"


def __getattr__(name):
    """Lazy import orchestrator components to avoid startup dependency issues."""
    if name == "Orchestrator":
        try:
            from orchestrator.core.orchestrator import Orchestrator
            return Orchestrator
        except ImportError as e:
            import warnings
            warnings.warn(f"Failed to import Orchestrator: {e}")
            return None

    # Agent imports
    agent_map = {
        "AnalyticsAgent": "orchestrator.agents.analytics",
        "CustomerSupportAgent": "orchestrator.agents.customer_support",
        "InventoryForecastingAgent": "orchestrator.agents.inventory_forecasting",
        "MarketingAutomationAgent": "orchestrator.agents.marketing_automation",
        "OrderManagementAgent": "orchestrator.agents.order_management",
        "PricingOptimizerAgent": "orchestrator.agents.pricing_optimizer",
        "ProductRecommendationAgent": "orchestrator.agents.recommendation",
        "ProductResearchAgent": "orchestrator.agents.product_research",
    }

    if name in agent_map:
        try:
            module = __import__(agent_map[name], fromlist=[name])
            return getattr(module, name)
        except ImportError as e:
            import warnings
            warnings.warn(f"Failed to import {name}: {e}")
            return None

    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")

__version__ = "0.1.0"
