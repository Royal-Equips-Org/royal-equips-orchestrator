"""Agent for dynamic pricing optimization based on competitor data.

The ``PricingOptimizerAgent`` monitors competitor prices and adjusts
product prices within the Shopify store to maximize profitability while
remaining competitive. It illustrates how data from external sources can
feed into automated pricing decisions.

Competitor data collection is handled via simple web scraping. A real
deployment should use approved APIs or commercial pricing data feeds to
avoid violating terms of service. This example uses a naive scraping
approach for demonstration.
"""

from __future__ import annotations

import asyncio
import logging
import os

import requests
from bs4 import BeautifulSoup

from orchestrator.core.agent_base import AgentBase


class PricingOptimizerAgent(AgentBase):
    """Adjusts product prices based on competitor pricing signals."""

    def __init__(self, name: str = "pricing_optimizer") -> None:
        super().__init__(name)
        self.logger = logging.getLogger(self.name)
        self.price_adjustments: dict[str, float] = {}

    async def run(self) -> None:
        self.logger.info("Running pricing optimizer agent")
        # Fetch competitor prices for known products
        loop = asyncio.get_event_loop()
        competitor_prices = await loop.run_in_executor(None, self._fetch_competitor_prices)
        # Fetch current prices from Shopify
        shop_prices = await loop.run_in_executor(None, self._fetch_shop_prices)
        # Compute new prices
        if competitor_prices and shop_prices:
            for product, comp_price in competitor_prices.items():
                current_price = shop_prices.get(product)
                if current_price:
                    new_price = self._optimize_price(current_price, comp_price)
                    self.price_adjustments[product] = new_price
                    # Update price via Shopify API
                    await loop.run_in_executor(None, self._update_shop_price, product, new_price)
        # update last run
        self._last_run = loop.time()

    def _fetch_competitor_prices(self) -> dict[str, float]:
        """Scrape competitor sites to estimate prices for our product SKUs."""
        # Example: For demonstration we scrape Amazon search results for each product name.
        # A mapping of internal product title to search query. Extend this mapping
        # based on your catalogue.
        product_queries = {
            "dash_cam": "dash+camera+car",
            "car_vacuum": "car+vacuum+portable",
        }
        prices: dict[str, float] = {}
        headers = {"User-Agent": "Mozilla/5.0"}
        for product, query in product_queries.items():
            url = f"https://www.amazon.com/s?k={query}"
            try:
                resp = requests.get(url, headers=headers, timeout=10)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")
                # Find the first price span (approx)
                price_span = soup.select_one("span.a-offscreen")
                if price_span and price_span.get_text():
                    price_text = price_span.get_text().replace("$", "").replace(",", "")
                    prices[product] = float(price_text)
            except Exception as e:
                self.logger.error("Error scraping %s: %s", url, e)
        return prices

    def _fetch_shop_prices(self) -> dict[str, float]:
        """Fetch current prices from Shopify via GraphQL."""
        api_key = os.getenv("SHOPIFY_API_KEY")
        api_secret = os.getenv("SHOPIFY_API_SECRET")
        shop_name = os.getenv("SHOP_NAME")
        if not api_key or not api_secret or not shop_name:
            self.logger.warning("Shopify credentials not set; cannot fetch product prices")
            return {}
        url = f"https://{api_key}:{api_secret}@{shop_name}.myshopify.com/admin/api/2024-07/graphql.json"
        query = """
        query($first:Int!) {
          products(first: $first) {
            edges {
              node {
                title
                variants(first: 1) {
                  edges {
                    node {
                      id
                      price
                    }
                  }
                }
              }
            }
          }
        }
        """
        variables = {"first": 50}
        prices: dict[str, float] = {}
        try:
            resp = requests.post(url, json={"query": query, "variables": variables}, timeout=15)
            resp.raise_for_status()
            data = resp.json()["data"]["products"]["edges"]
            for edge in data:
                node = edge["node"]
                title = node["title"].lower().replace(" ", "_")
                variant_edge = node["variants"]["edges"][0]["node"]
                price = float(variant_edge["price"])
                prices[title] = price
        except Exception as e:
            self.logger.error("Error fetching Shopify products: %s", e)
        return prices

    def _optimize_price(self, current_price: float, competitor_price: float) -> float:
        """Return an optimized price relative to competitor price."""
        # Simple strategy: set price slightly below competitor if margin allows.
        margin = 0.05  # 5% below competitor
        target_price = competitor_price * (1 - margin)
        # Don't drop price more than 20% from current price
        lower_bound = current_price * 0.8
        optimized_price = max(target_price, lower_bound)
        return round(optimized_price, 2)

    def _update_shop_price(self, product: str, new_price: float) -> None:
        """Update product price in Shopify.

        This function demonstrates how to update a variant's price via
        Shopify's REST Admin API. For simplicity it assumes the first
        variant is being updated. Real implementations should handle
        multi-variant products and error conditions gracefully.
        """
        api_key = os.getenv("SHOPIFY_API_KEY")
        api_secret = os.getenv("SHOPIFY_API_SECRET")
        shop_name = os.getenv("SHOP_NAME")
        if not api_key or not api_secret or not shop_name:
            self.logger.warning("Shopify credentials not set; cannot update price for %s", product)
            return
        # First fetch variant ID
        url = f"https://{api_key}:{api_secret}@{shop_name}.myshopify.com/admin/api/2024-07/graphql.json"
        query = """
        query($title: String!) {
          products(first: 1, query: $title) {
            edges {
              node {
                variants(first: 1) {
                  edges {
                    node {
                      id
                    }
                  }
                }
              }
            }
          }
        }
        """
        variables = {"title": product.replace("_", " ")}
        try:
            resp = requests.post(url, json={"query": query, "variables": variables}, timeout=15)
            resp.raise_for_status()
            product_edges = resp.json()["data"]["products"]["edges"]
            if not product_edges:
                self.logger.warning("Product %s not found in Shopify", product)
                return
            variant_id = product_edges[0]["node"]["variants"]["edges"][0]["node"]["id"]
        except Exception as e:
            self.logger.error("Error fetching variant for %s: %s", product, e)
            return
        # Now update the price via mutation
        mutation = """
        mutation productVariantUpdate($id: ID!, $price: Decimal!) {
          productVariantUpdate(input: {id: $id, price: $price}) {
            productVariant {
              id
              price
            }
            userErrors { field message }
          }
        }
        """
        variables = {"id": variant_id, "price": new_price}
        try:
            resp = requests.post(url, json={"query": mutation, "variables": variables}, timeout=15)
            resp.raise_for_status()
            data = resp.json().get("data", {}).get("productVariantUpdate", {})
            errors = data.get("userErrors", [])
            if errors:
                self.logger.error("Errors updating price for %s: %s", product, errors)
            else:
                self.logger.info("Updated price for %s to %.2f", product, new_price)
        except Exception as e:
            self.logger.error("Error updating price for %s: %s", product, e)
