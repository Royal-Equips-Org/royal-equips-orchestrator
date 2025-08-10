"""Entry point to launch the Royal Equips Orchestrator API server.

This script starts a FastAPI server exposing endpoints for basic
orchestrator operations (health checks, on-demand agent runs) and
initializes the orchestrator with all registered agents.

Run with:
    uvicorn scripts.run_orchestrator:app --reload
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Response

from orchestrator.core.orchestrator import Orchestrator
from orchestrator.agents import ProductResearchAgent
from orchestrator.agents import InventoryForecastingAgent
from orchestrator.agents import PricingOptimizerAgent
from orchestrator.agents import MarketingAutomationAgent
from orchestrator.agents import CustomerSupportAgent
from orchestrator.agents import OrderManagementAgent
from orchestrator.agents import ProductRecommendationAgent
from orchestrator.agents import AnalyticsAgent

# Install logging filters at module import time
# This ensures the filters are active when Render starts uvicorn by import string
from scripts.logging_filters import install_log_filters
install_log_filters()

app = FastAPI(title="Royal Equips Orchestrator API")

logger = logging.getLogger(__name__)

loop = asyncio.get_event_loop()
orch = Orchestrator(loop=loop)

# Agent registrations
orch.register_agent(ProductResearchAgent(), interval=3600)
orch.register_agent(InventoryForecastingAgent(), interval=86400)
orch.register_agent(PricingOptimizerAgent(), interval=7200)
orch.register_agent(MarketingAutomationAgent(), interval=43200)
orch.register_agent(CustomerSupportAgent(), interval=300)
orch.register_agent(OrderManagementAgent(), interval=600)
orch.register_agent(ProductRecommendationAgent(), interval=21600)  # adjust interval as needed
orch.register_agent(AnalyticsAgent(orch), interval=86400)  # export analytics daily

# Start orchestrator background loop
loop.create_task(orch.run_forever())


@app.get("/")
async def get_root() -> Dict[str, str]:
    """Return basic service information to avoid 404s."""
    service_version = os.getenv("SERVICE_VERSION", "unknown")
    return {
        "service": "orchestrator",
        "status": "ok",
        "version": service_version
    }


@app.get("/favicon.ico")
@app.head("/favicon.ico")
async def get_favicon() -> Response:
    """Return empty response for favicon requests to avoid 404 logs."""
    return Response(status_code=204)


@app.get("/health")
async def get_health() -> Dict[str, Any]:
    """Return health information for all agents."""
    return await orch.health()


@app.post("/run_agent/{agent_name}")
async def run_agent(agent_name: str) -> Dict[str, str]:
    """Trigger a specific agent to run once."""
    agent = orch.agents.get(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    loop.create_task(agent.run())
    return {"status": "scheduled"}


@app.post("/run_all")
async def run_all_agents() -> Dict[str, str]:
    """Trigger all agents to run once."""
    for agent in orch.agents.values():
        loop.create_task(agent.run())
    return {"status": "all scheduled"}


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await orch.shutdown()