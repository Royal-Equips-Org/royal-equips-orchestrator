"""Agents package for the Royal Equips Orchestrator.

This package exposes concrete agent implementations that encapsulate
autonomous behaviors for different aspects of running an e-commerce
business. Each agent inherits from :class:`~orchestrator.core.agent_base.AgentBase`
and implements asynchronous logic in its ``run`` method. Agents can be
registered with the orchestrator along with their desired run
intervals. Additional configuration and credentials are read from
environment variables or configuration files.
"""

# Always import ProductResearchAgent (Phase 1 implementation)
from orchestrator.agents.product_research import ProductResearchAgent

__all__ = ["ProductResearchAgent"]

# Conditionally import other agents that may have additional dependencies
try:
    from orchestrator.agents.analytics import AnalyticsAgent
    __all__.append("AnalyticsAgent")
except ImportError:
    pass

try:
    from orchestrator.agents.customer_support import CustomerSupportAgent
    __all__.append("CustomerSupportAgent")
except ImportError:
    pass

try:
    from orchestrator.agents.inventory_forecasting import InventoryForecastingAgent
    __all__.append("InventoryForecastingAgent")
except ImportError:
    pass

try:
    from orchestrator.agents.marketing_automation import MarketingAutomationAgent
    __all__.append("MarketingAutomationAgent")
except ImportError:
    pass

try:
    from orchestrator.agents.order_management import OrderManagementAgent
    __all__.append("OrderManagementAgent")
except ImportError:
    pass

try:
    from orchestrator.agents.pricing_optimizer import PricingOptimizerAgent
    __all__.append("PricingOptimizerAgent")
except ImportError:
    pass

try:
    from orchestrator.agents.recommendation import ProductRecommendationAgent
    __all__.append("ProductRecommendationAgent")
except ImportError:
    pass
