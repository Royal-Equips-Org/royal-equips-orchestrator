"""Agents package for the Royal Equips Orchestrator.

This package exposes concrete agent implementations that encapsulate
autonomous behaviors for different aspects of running an e-commerce
business. Each agent inherits from :class:`~orchestrator.core.agent_base.AgentBase`
and implements asynchronous logic in its ``run`` method. Agents can be
registered with the orchestrator along with their desired run
intervals. Additional configuration and credentials are read from
environment variables or configuration files.
"""

from .product_research import ProductResearchAgent
from .inventory_forecasting import InventoryForecastingAgent
from .pricing_optimizer import PricingOptimizerAgent
from .marketing_automation import MarketingAutomationAgent
from .customer_support import CustomerSupportAgent
from .order_management import OrderManagementAgent
from .analytics import AnalyticsAgent
from .recommendation import ProductRecommendationAgent


__all__ = [
    "ProductResearchAgent",
    "InventoryForecastingAgent",
    "PricingOptimizerAgent",
    "MarketingAutomationAgent",
    "CustomerSupportAgent",
    "OrderManagementAgent",
    "ProductRecommendationAgent",
    "AnalyticsAgent",
]
