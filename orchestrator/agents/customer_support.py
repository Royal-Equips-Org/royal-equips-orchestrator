"""Agent for automated customer support via AI-assisted chat.

The ``CustomerSupportAgent`` monitors customer inquiries coming from
Shopify's support channels (e.g. chat, email) and generates helpful
responses using a language model. It demonstrates how AI-powered
conversations can reduce support workload while maintaining high
customer satisfaction.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, Dict, List, Optional

import requests

from ..core.agent_base import AgentBase

try:
    import openai  # type: ignore
except ImportError:
    openai = None  # optional dependency


class CustomerSupportAgent(AgentBase):
    """Handles customer inquiries and generates responses using OpenAI."""

    def __init__(self, name: str = "customer_support") -> None:
        super().__init__(name)
        self.logger = logging.getLogger(self.name)
        self.support_log: List[Dict[str, Any]] = []

    async def run(self) -> None:
        self.logger.info("Running customer support agent")
        # Fetch new support tickets
        tickets = await asyncio.get_event_loop().run_in_executor(None, self._fetch_new_tickets)
        if not tickets:
            return
        # Respond to each ticket asynchronously
        tasks = [self._handle_ticket(ticket) for ticket in tickets]
        await asyncio.gather(*tasks)
        self._last_run = asyncio.get_event_loop().time()

    def _fetch_new_tickets(self) -> List[Dict[str, Any]]:
        """Retrieve unprocessed support tickets from Shopify or another service."""
        api_key = os.getenv("SHOPIFY_API_KEY")
        api_secret = os.getenv("SHOPIFY_API_SECRET")
        shop_name = os.getenv("SHOP_NAME")
        if not api_key or not api_secret or not shop_name:
            self.logger.warning("Shopify credentials not set; cannot fetch support tickets")
            return []
        # Hypothetical endpoint for support tickets
        url = f"https://{api_key}:{api_secret}@{shop_name}.myshopify.com/admin/api/2024-07/support/tickets.json?status=open"
        try:
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            data = resp.json().get("tickets", [])
            return data
        except Exception as e:
            self.logger.error("Error fetching support tickets: %s", e)
            return []

    async def _handle_ticket(self, ticket: Dict[str, Any]) -> None:
        """Generate a response for the ticket and submit it back to Shopify."""
        question = ticket.get("message", "")
        if not question:
            return
        # Generate answer
        answer = await self._generate_response(question)
        if answer:
            await asyncio.get_event_loop().run_in_executor(None, self._post_response, ticket["id"], answer)

    async def _generate_response(self, question: str) -> Optional[str]:
        """Use OpenAI to generate a response to the customer question."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or openai is None:
            self.logger.warning("OpenAI API key not set or package not installed; cannot generate response")
            return None
        openai.api_key = api_key
        try:
            completion = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: openai.ChatCompletion.create(
                    model="gpt-4-turbo",
                    messages=[
                        {"role": "system", "content": "You are an AI assistant for an e-commerce store specializing in car tech and accessories."},
                        {"role": "user", "content": question},
                    ],
                    max_tokens=200,
                    temperature=0.7,
                ),
            )
            answer = completion.choices[0].message["content"].strip()
            return answer
        except Exception as e:
            self.logger.error("Error generating response: %s", e)
            return None

    def _post_response(self, ticket_id: Any, answer: str) -> None:
        """Post the generated answer to the ticket via Shopify API."""
        api_key = os.getenv("SHOPIFY_API_KEY")
        api_secret = os.getenv("SHOPIFY_API_SECRET")
        shop_name = os.getenv("SHOP_NAME")
        if not api_key or not api_secret or not shop_name:
            self.logger.warning("Shopify credentials not set; cannot post response")
            return
        url = f"https://{api_key}:{api_secret}@{shop_name}.myshopify.com/admin/api/2024-07/support/tickets/{ticket_id}/reply.json"
        payload = {"reply": {"message": answer}}
        try:
            resp = requests.post(url, json=payload, timeout=15)
            resp.raise_for_status()
            self.logger.info("Responded to ticket %s", ticket_id)
        except Exception as e:
            self.logger.error("Error posting response for ticket %s: %s", ticket_id, e)
