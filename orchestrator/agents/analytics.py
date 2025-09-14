"""Agent for exporting orchestrator metrics to external analytics platforms.

The ``AnalyticsAgent`` collects metrics from other agents (e.g. trending
keywords, forecast summaries, price adjustments) and writes them to a
BigQuery table. This allows long‑term analysis of business metrics,
trends and agent performance. If the Google Cloud library is not
installed or the environment variables are missing, the agent logs a
warning and does nothing.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime
from typing import TYPE_CHECKING, Any

from orchestrator.core.agent_base import AgentBase

if TYPE_CHECKING:
    from orchestrator.core.orchestrator import Orchestrator

try:
    from google.cloud import bigquery  # type: ignore
except ImportError:
    bigquery = None  # optional dependency


class AnalyticsAgent(AgentBase):
    """Exports orchestrator metrics to BigQuery."""

    def __init__(self, orchestrator: Orchestrator, name: str = "analytics") -> None:
        super().__init__(name)
        self.logger = logging.getLogger(self.name)
        self.orchestrator = orchestrator

    async def run(self) -> None:
        self.logger.info("Running analytics agent")
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._export_metrics)
        self._last_run = loop.time()

    def _export_metrics(self) -> None:
        """Gather metrics from other agents and write them to BigQuery."""
        project_id = os.getenv("BIGQUERY_PROJECT_ID")
        dataset_id = os.getenv("BIGQUERY_DATASET")
        table_id = os.getenv("BIGQUERY_TABLE")
        if not all([project_id, dataset_id, table_id]):
            self.logger.warning("BigQuery configuration not set; skipping export")
            return
        if bigquery is None:
            self.logger.warning("google-cloud-bigquery library not installed; skipping export")
            return
        client = bigquery.Client(project=project_id)
        table_ref = client.dataset(dataset_id).table(table_id)
        # Build a row of metrics
        metrics: dict[str, Any] = {"timestamp": datetime.utcnow().isoformat()}
        # Trending keywords
        prod_agent = self.orchestrator.agents.get("product_research")
        if prod_agent and hasattr(prod_agent, "trending_products"):
            metrics["trending_keywords"] = ",".join(prod_agent.trending_products[:20])
        # Forecast summary
        forecast_agent = self.orchestrator.agents.get("inventory_forecasting")
        if forecast_agent and hasattr(forecast_agent, "forecast_df") and forecast_agent.forecast_df is not None:
            df = forecast_agent.forecast_df
            metrics["forecast_mean"] = float(df["yhat"].mean())
            metrics["forecast_max"] = float(df["yhat"].max())
            metrics["forecast_min"] = float(df["yhat"].min())
        # Pricing adjustments count
        price_agent = self.orchestrator.agents.get("pricing_optimizer")
        if price_agent and hasattr(price_agent, "price_adjustments"):
            metrics["num_price_adjustments"] = len(price_agent.price_adjustments)
        # Insert row
        rows_to_insert = [metrics]
        try:
            errors = client.insert_rows_json(table_ref, rows_to_insert)
            if errors:
                self.logger.error("Errors inserting rows into BigQuery: %s", errors)
            else:
                self.logger.info("Exported metrics to BigQuery")
        except Exception as e:
            self.logger.error("Error exporting metrics to BigQuery: %s", e)
