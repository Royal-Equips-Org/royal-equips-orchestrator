"""Streamlit control center for the Royal Equips Orchestrator.

This module implements a web-based dashboard that provides visibility
into the state of the orchestrator and its agents. It is intended to
run via ``streamlit run orchestrator/control_center/app.py``. The
dashboard displays key metrics such as trending products, demand
forecasts, pricing adjustments, campaign history, support activity,
and order processing. It also exposes basic controls to trigger
agent runs on-demand.

The control center does not expose any sensitive credentials or
private data. Interaction with the orchestrator occurs in-memory via
imported references. In a distributed deployment, the dashboard could
instead connect to a REST API exposed by the orchestrator service.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from typing import Any

# Bootstrap for script execution: ensure project root is on sys.path
# so absolute imports work when run as a script via streamlit
if __package__ in (None, ""):
    # Ensure project root is on sys.path so absolute imports work
    # app.py is at orchestrator/control_center/app.py, so we need to go up 2 levels
    root = Path(__file__).resolve().parents[2]
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

import pandas as pd
import plotly.express as px
import streamlit as st

from orchestrator.agents import (
    CustomerSupportAgent,
    InventoryForecastingAgent,
    MarketingAutomationAgent,
    OrderManagementAgent,
    PricingOptimizerAgent,
    ProductResearchAgent,
)
from orchestrator.core.orchestrator import Orchestrator

# Create global orchestrator and register agents
_orchestrator: Orchestrator | None = None


def get_orchestrator() -> Orchestrator:
    global _orchestrator
    if _orchestrator is None:
        loop = asyncio.new_event_loop()
        _orchestrator = Orchestrator(loop=loop)
        # Register agents with reasonable intervals (seconds)
        _orchestrator.register_agent(ProductResearchAgent(), interval=3600)  # hourly
        _orchestrator.register_agent(InventoryForecastingAgent(), interval=86400)  # daily
        _orchestrator.register_agent(PricingOptimizerAgent(), interval=7200)  # every 2 hours
        _orchestrator.register_agent(MarketingAutomationAgent(), interval=43200)  # twice daily
        _orchestrator.register_agent(CustomerSupportAgent(), interval=300)  # every 5 min
        _orchestrator.register_agent(OrderManagementAgent(), interval=600)  # every 10 min
        # Start orchestrator in background
        loop.create_task(_orchestrator.run_forever())
        # Run the loop in a background thread
        import threading

        def run_loop():
            loop.run_forever()

        threading.Thread(target=run_loop, daemon=True).start()
    return _orchestrator


def run_dashboard() -> None:
    st.set_page_config(page_title="Royal Equips Control Center", layout="wide")
    st.title("Royal Equips AI Control Center")
    orch = get_orchestrator()
    # Sidebar controls
    with st.sidebar:
        st.header("Controls")
        if st.button("Run All Agents Now"):
            # Trigger each agent once
            loop = orch.loop
            for agent in orch.agents.values():
                loop.create_task(agent.run())
        if st.button("Refresh Data"):
            pass  # Refresh actions are triggered by UI interactions anyway

    # Display trending products
    prod_agent = orch.agents.get("product_research")
    st.subheader("Trending Products (Keywords)")
    if isinstance(prod_agent, ProductResearchAgent) and prod_agent.trending_products:
        st.write(", ".join(prod_agent.trending_products[:30]))
    else:
        st.write("No data yet. Wait for the next run or click 'Run All Agents Now'.")

    # Display forecast chart
    forecast_agent = orch.agents.get("inventory_forecasting")
    st.subheader("Demand Forecast")
    if isinstance(forecast_agent, InventoryForecastingAgent) and forecast_agent.forecast_df is not None:
        df: pd.DataFrame = forecast_agent.forecast_df
        fig = px.line(df, x="ds", y="yhat", title="Projected Sales", labels={"ds": "Date", "yhat": "Sales"})
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.write("Forecast not available.")

    # Pricing adjustments
    price_agent = orch.agents.get("pricing_optimizer")
    st.subheader("Latest Price Adjustments")
    if isinstance(price_agent, PricingOptimizerAgent) and price_agent.price_adjustments:
        df_adj = pd.DataFrame([
            {"Product": k, "New Price": v} for k, v in price_agent.price_adjustments.items()
        ])
        st.table(df_adj)
    else:
        st.write("No price adjustments yet.")

    # Marketing campaign log
    marketing_agent = orch.agents.get("marketing_automation")
    st.subheader("Recent Marketing Campaigns")
    if isinstance(marketing_agent, MarketingAutomationAgent) and marketing_agent.campaign_log:
        df_campaigns = pd.DataFrame(marketing_agent.campaign_log)
        df_campaigns["time"] = pd.to_datetime(df_campaigns["time"])
        st.table(df_campaigns.tail(10))
    else:
        st.write("No campaigns sent yet.")

    # Support activity
    support_agent = orch.agents.get("customer_support")
    st.subheader("Customer Support Activity")
    if isinstance(support_agent, CustomerSupportAgent) and support_agent.support_log:
        df_support = pd.DataFrame(support_agent.support_log)
        st.table(df_support.tail(10))
    else:
        st.write("No support interactions recorded.")

    # Health status
    st.subheader("Agent Health Status")
    # Use asynchronous call to get health data
    health_data: dict[str, Any] = asyncio.run(orch.health())
    df_health = pd.DataFrame(health_data).T
    st.table(df_health)


if __name__ == "__main__":
    run_dashboard()
