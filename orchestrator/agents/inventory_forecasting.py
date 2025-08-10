"""Agent for inventory forecasting using historical sales data.

The ``InventoryForecastingAgent`` retrieves historical sales data from
Shopify via GraphQL and applies Facebook Prophet (now called ``prophet``)
to forecast future demand. Accurate forecasting helps prevent
stockouts and reduce excess inventory. Forecasts are stored in-memory
for downstream agents (e.g. pricing optimizer) or can be persisted to
an external database.

Before running this agent, set the following environment variables
to connect to Shopify:

- ``SHOPIFY_API_KEY``: API key for your Shopify app
- ``SHOPIFY_API_SECRET``: API secret
- ``SHOP_NAME``: The myshopify.com subdomain of your store

You may also specify ``FORECAST_DAYS`` to control the horizon.
"""

from __future__ import annotations

import asyncio
import logging
import os

import pandas as pd
import requests

try:
    from prophet import Prophet  # type: ignore
except ImportError:
    Prophet = None  # allow module import even if prophet is missing

from orchestrator.core.agent_base import AgentBase


class InventoryForecastingAgent(AgentBase):
    """Forecasts product demand using sales history and Prophet."""

    def __init__(self, name: str = "inventory_forecasting", horizon_days: int = 30) -> None:
        super().__init__(name)
        self.logger = logging.getLogger(self.name)
        self.horizon_days = horizon_days
        self.forecast_df: pd.DataFrame | None = None

    async def run(self) -> None:
        self.logger.info("Running inventory forecasting agent")
        loop = asyncio.get_event_loop()
        # Fetch sales data in a separate thread to avoid blocking
        df = await loop.run_in_executor(None, self._fetch_sales_data)
        if df is None or df.empty:
            self.logger.warning("No sales data available for forecasting")
            self.forecast_df = None
            return
        # Build forecast using Prophet
        if Prophet is None:
            self.logger.warning("prophet library not installed; skipping forecast")
            self.forecast_df = None
        else:
            model = Prophet()
            try:
                model.fit(df)
                future = model.make_future_dataframe(periods=self.horizon_days)
                forecast = model.predict(future)
                # Keep only ds (date) and yhat (predicted) columns
                self.forecast_df = forecast[["ds", "yhat"]].tail(self.horizon_days)
                self.logger.info("Forecast generated for %d days", self.horizon_days)
            except Exception as exc:
                self.logger.exception("Forecasting failed: %s", exc)
                self.forecast_df = None
        # Update last run timestamp
        self._last_run = loop.time()

    def _fetch_sales_data(self) -> pd.DataFrame | None:
        """Fetch historical sales from Shopify GraphQL API."""
        api_key = os.getenv("SHOPIFY_API_KEY")
        api_secret = os.getenv("SHOPIFY_API_SECRET")
        shop_name = os.getenv("SHOP_NAME")
        if not api_key or not api_secret or not shop_name:
            self.logger.warning("Shopify credentials not set; cannot fetch sales data")
            return None
        # Use basic auth with API key and password (secret)
        url = f"https://{api_key}:{api_secret}@{shop_name}.myshopify.com/admin/api/2024-07/graphql.json"
        # GraphQL query to fetch order line items by date
        # We aggregate by day to feed Prophet. Shopify GraphQL limit might require pagination.
        query = """
        query ($first: Int!, $cursor: String) {
            orders(first: $first, after: $cursor, reverse: true) {
                pageInfo { hasNextPage endCursor }
                edges {
                    node {
                        processedAt
                        totalPriceSet { shopMoney { amount } }
                    }
                }
            }
        }
        """
        variables = {"first": 100, "cursor": None}
        sales: list[tuple[str, float]] = []
        while True:
            try:
                resp = requests.post(url, json={"query": query, "variables": variables}, timeout=15)
                resp.raise_for_status()
                data = resp.json().get("data", {}).get("orders", {})
            except Exception as exc:
                self.logger.error("Error fetching Shopify orders: %s", exc)
                break
            edges = data.get("edges", [])
            for edge in edges:
                node = edge.get("node", {})
                date_str = node.get("processedAt")
                amount = float(node.get("totalPriceSet", {}).get("shopMoney", {}).get("amount", 0.0))
                if date_str:
                    sales.append((date_str[:10], amount))
            page_info = data.get("pageInfo", {})
            if page_info.get("hasNextPage"):
                variables["cursor"] = page_info.get("endCursor")
            else:
                break
        if not sales:
            return None
        # Aggregate by date
        df = pd.DataFrame(sales, columns=["ds", "y"])
        df["ds"] = pd.to_datetime(df["ds"])
        df = df.groupby("ds")["y"].sum().reset_index().sort_values("ds")
        return df
