"""Agent for automated marketing campaigns and customer engagement.

The ``MarketingAutomationAgent`` orchestrates marketing activities such
as email campaigns, push notifications, and social media posts. It
integrates with Shopify's marketing APIs to create and send campaigns
based on insights from other agents (e.g. trending products, forecast
surplus). This agent demonstrates how high-level orchestration can
drive top-line growth without manual intervention.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime

import requests

from orchestrator.core.agent_base import AgentBase


class MarketingAutomationAgent(AgentBase):
    """Creates and schedules marketing campaigns for the store."""

    def __init__(self, name: str = "marketing_automation") -> None:
        super().__init__(name)
        self.logger = logging.getLogger(self.name)
        self.campaign_log: list[dict[str, str]] = []

    async def run(self) -> None:
        self.logger.info("Running marketing automation agent")
        # Determine if we need to run a campaign today
        if not self._should_run_campaign():
            self.logger.debug("No marketing campaign scheduled for today")
            return
        # Prepare campaign content based on trending products or forecast
        subject, body = await self._prepare_campaign_content()
        # Send campaign via Shopify Email or alternative provider
        sent = await asyncio.get_event_loop().run_in_executor(None, self._send_email_campaign, subject, body)
        if sent:
            self.campaign_log.append({"subject": subject, "time": datetime.utcnow().isoformat()})
            self.logger.info("Campaign sent: %s", subject)
        # Update last run
        self._last_run = asyncio.get_event_loop().time()

    def _should_run_campaign(self) -> bool:
        """Return True if a marketing campaign should be run today."""
        # Example: run campaigns twice per week on Tuesday and Friday
        weekday = datetime.utcnow().weekday()  # Monday=0
        return weekday in {1, 4}

    async def _prepare_campaign_content(self) -> tuple[str, str]:
        """Build subject and body for the campaign based on recent data."""
        # For demonstration we use static content. In production, this
        # method would retrieve trending products from ProductResearchAgent
        # or forecast surplus stock from InventoryForecastingAgent and
        # craft a personalized message.
        subject = "Explore the Latest Car Tech & Accessories 🚗"
        body = (
            "Hi there,\n\n"
            "Stay ahead of the curve with our newest collection of car tech and accessories. "
            "From smart dash cams to portable vacuums, upgrade your drive today!\n\n"
            "Shop now and enjoy exclusive offers.\n\n"
            "Best regards,\nRoyal Equips Team"
        )
        return subject, body

    def _send_email_campaign(self, subject: str, body: str) -> bool:
        """Send the prepared email campaign using Shopify or another provider."""
        api_key = os.getenv("SHOPIFY_API_KEY")
        api_secret = os.getenv("SHOPIFY_API_SECRET")
        shop_name = os.getenv("SHOP_NAME")
        if not api_key or not api_secret or not shop_name:
            self.logger.warning("Shopify credentials not set; cannot send email campaign")
            return False
        # Shopify Marketing API endpoint for emails (if available). At the time
        # of writing, Shopify's Marketing API is limited; merchants often use
        # third-party providers. This example uses a hypothetical endpoint.
        url = f"https://{api_key}:{api_secret}@{shop_name}.myshopify.com/admin/api/2024-07/marketing/email_campaigns.json"
        payload = {
            "email_campaign": {
                "subject": subject,
                "body_html": body.replace("\n", "<br>")
            }
        }
        try:
            resp = requests.post(url, json=payload, timeout=15)
            resp.raise_for_status()
            return True
        except Exception as e:
            self.logger.error("Failed to send email campaign: %s", e)
            return False
