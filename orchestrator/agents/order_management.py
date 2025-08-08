"""Agent for order management and fulfillment automation.

The ``OrderManagementAgent`` monitors orders, updates their status,
handles returns and refunds, and coordinates shipping. This agent
illustrates how the orchestrator can automate back-office workflows that
otherwise require significant manual intervention. It interacts
directly with Shopify's API.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import List, Dict

import requests

from ..core.agent_base import AgentBase


class OrderManagementAgent(AgentBase):
    """Automates order processing, fulfillment, and returns."""

    def __init__(self, name: str = "order_management") -> None:
        super().__init__(name)
        self.logger = logging.getLogger(self.name)
        self.last_processed: datetime | None = None

    async def run(self) -> None:
        self.logger.info("Running order management agent")
        new_orders = await asyncio.get_event_loop().run_in_executor(None, self._fetch_new_orders)
        for order in new_orders:
            await asyncio.get_event_loop().run_in_executor(None, self._process_order, order)
        self._last_run = asyncio.get_event_loop().time()

    def _fetch_new_orders(self) -> List[Dict[str, any]]:
        """Fetch orders that need to be processed."""
        api_key = os.getenv("SHOPIFY_API_KEY")
        api_secret = os.getenv("SHOPIFY_API_SECRET")
        shop_name = os.getenv("SHOP_NAME")
        if not api_key or not api_secret or not shop_name:
            self.logger.warning("Shopify credentials not set; cannot fetch orders")
            return []
        url = f"https://{api_key}:{api_secret}@{shop_name}.myshopify.com/admin/api/2024-07/orders.json?status=unfulfilled"
        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            orders = resp.json().get("orders", [])
            return orders
        except Exception as e:
            self.logger.error("Error fetching orders: %s", e)
            return []

    def _process_order(self, order: Dict[str, any]) -> None:
        """Process an individual order: capture payment, fulfill, and notify customer."""
        order_id = order.get("id")
        if not order_id:
            return
        # Capture payment if not already captured (placeholder)
        # In practice, use shopify API to capture transactions
        # Fulfill order
        self._fulfill_order(order_id)
        # Send notification (optional)
        self.logger.info("Processed order %s", order_id)

    def _fulfill_order(self, order_id: any) -> None:
        api_key = os.getenv("SHOPIFY_API_KEY")
        api_secret = os.getenv("SHOPIFY_API_SECRET")
        shop_name = os.getenv("SHOP_NAME")
        if not api_key or not api_secret or not shop_name:
            self.logger.warning("Shopify credentials not set; cannot fulfill order")
            return
        url = f"https://{api_key}:{api_secret}@{shop_name}.myshopify.com/admin/api/2024-07/orders/{order_id}/fulfillments.json"
        payload = {
            "fulfillment": {
                "location_id": None,  # specify location ID if necessary
                "tracking_number": None,
                "line_items": [
                    {
                        "id": item["id"],
                        "quantity": item["quantity"],
                    }
                    for item in order.get("line_items", [])
                ],
            }
        }
        try:
            resp = requests.post(url, json=payload, timeout=15)
            resp.raise_for_status()
            self.logger.info("Fulfillment created for order %s", order_id)
        except Exception as e:
            self.logger.error("Error fulfilling order %s: %s", order_id, e)
