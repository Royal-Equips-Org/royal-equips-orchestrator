"""Royal Equips Orchestrator package.

This top-level package exposes the orchestrator, agents, and control
center. It enables programmatic access to the orchestrator engine
without using the provided entry scripts. You can import the
orchestrator and agents directly from here.
"""

from orchestrator.agents import (
    AnalyticsAgent,
    CustomerSupportAgent,
    InventoryForecastingAgent,
    MarketingAutomationAgent,
    OrderManagementAgent,
    PricingOptimizerAgent,
    ProductRecommendationAgent,
    ProductResearchAgent,
)
from orchestrator.core.orchestrator import Orchestrator

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
