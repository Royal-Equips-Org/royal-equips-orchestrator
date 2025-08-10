"""Entry point to run the AnalyticsAgent once.

This script is intended to be executed as a standalone command,
for example by Render cron jobs. It creates an instance of the
Orchestrator, registers the AnalyticsAgent along with other agents,
and runs the analytics export one time.
"""

import asyncio
import logging

from orchestrator.core.orchestrator import Orchestrator
from orchestrator.agents import (
    ProductResearchAgent,
    InventoryForecastingAgent,
    PricingOptimizerAgent,
    MarketingAutomationAgent,
    CustomerSupportAgent,
    OrderManagementAgent,
    AnalyticsAgent,
)


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    orch = Orchestrator()
    # Register core agents (they won't run automatically in this script)
    orch.register_agent(ProductResearchAgent(), interval=3600)
    orch.register_agent(InventoryForecastingAgent(), interval=86400)
    orch.register_agent(PricingOptimizerAgent(), interval=7200)
    orch.register_agent(MarketingAutomationAgent(), interval=43200)
    orch.register_agent(CustomerSupportAgent(), interval=300)
    orch.register_agent(OrderManagementAgent(), interval=600)
    analytics = AnalyticsAgent(orch)
    orch.register_agent(analytics, interval=86400)
    # Run analytics once
    await analytics.run()


if __name__ == "__main__":
    asyncio.run(main())
