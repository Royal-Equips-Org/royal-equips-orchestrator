"""Agent for personalized product recommendations based on purchase history.

The ``ProductRecommendationAgent`` generates personalized product
recommendations for each customer by analysing historical order data
from Shopify. It builds a customer–product interaction matrix and
computes item‑to‑item similarities using cosine similarity from
``scikit‑learn``. Recommendations are calculated by aggregating
similarity scores for products that a customer has already purchased
and selecting the top unseen items. This allows the orchestrator to
proactively surface relevant accessories and car tech products to
customers, increasing cross‑sell opportunities without manual
curation.

To use this agent you must provide Shopify credentials via the
``SHOPIFY_API_KEY``, ``SHOPIFY_API_SECRET`` and ``SHOP_NAME``
environment variables. Optionally set ``NUM_RECOMMENDATIONS`` to
control how many items are suggested per customer.
"""

from __future__ import annotations

import asyncio
import logging
import os
from collections import defaultdict

import numpy as np
import requests
from sklearn.metrics.pairwise import cosine_similarity  # type: ignore

from orchestrator.core.agent_base import AgentBase


class ProductRecommendationAgent(AgentBase):
    """Generates product recommendations from customer purchase history."""

    def __init__(self, name: str = "recommendation", num_recommendations: int | None = None) -> None:
        super().__init__(name)
        self.logger = logging.getLogger(self.name)
        # Determine number of recommendations either from argument or env var
        if num_recommendations is not None:
            self.num_recommendations = num_recommendations
        else:
            # Fallback to environment variable, default to 5 if unset or invalid
            try:
                self.num_recommendations = int(os.getenv("NUM_RECOMMENDATIONS", "5"))
            except ValueError:
                self.num_recommendations = 5
        # Mapping of customer identifier to list of recommended product titles
        self.recommendations: dict[str, list[str]] = {}

    async def run(self) -> None:
        """Fetch order history, compute recommendations and update internal state."""
        self.logger.info("Running product recommendation agent")
        loop = asyncio.get_event_loop()
        # Fetch order data in thread pool to avoid blocking
        customer_products = await loop.run_in_executor(None, self._fetch_purchase_history)
        if not customer_products:
            self.logger.warning("No purchase history retrieved; skipping recommendation computation")
            self.recommendations = {}
            self._last_run = loop.time()
            return
        # Compute recommendations using cosine similarity
        recs = await loop.run_in_executor(None, self._compute_recommendations, customer_products)
        self.recommendations = recs
        self._last_run = loop.time()
        self.logger.info("Generated recommendations for %d customers", len(self.recommendations))

    def _fetch_purchase_history(self) -> dict[str, list[str]]:
        """Retrieve purchase history from Shopify orders.

        Returns a mapping of customer ID/email to the list of product titles
        they have purchased. If credentials are missing or an error occurs,
        an empty dictionary is returned and a warning is logged.
        """
        api_key = os.getenv("SHOPIFY_API_KEY")
        api_secret = os.getenv("SHOPIFY_API_SECRET")
        shop_name = os.getenv("SHOP_NAME")
        if not api_key or not api_secret or not shop_name:
            self.logger.warning("Shopify credentials not set; cannot fetch order history")
            return {}
        # GraphQL endpoint with basic auth using API key and secret
        url = f"https://{api_key}:{api_secret}@{shop_name}.myshopify.com/admin/api/2024-07/graphql.json"
        # Build GraphQL query with pagination. Retrieve customer email and line item titles.
        query = """
        query($first: Int!, $cursor: String) {
          orders(first: $first, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                customer { id email }
                lineItems(first: 50) {
                  edges {
                    node { title }
                  }
                }
              }
            }
          }
        }
        """
        variables: dict[str, str | None] = {"first": 100, "cursor": None}
        customer_products: dict[str, list[str]] = defaultdict(list)
        while True:
            try:
                resp = requests.post(url, json={"query": query, "variables": variables}, timeout=15)
                resp.raise_for_status()
            except Exception as exc:
                self.logger.error("Error fetching Shopify orders: %s", exc)
                break
            data = resp.json().get("data", {}).get("orders", {})
            edges = data.get("edges", [])
            for edge in edges:
                node = edge.get("node", {})
                customer = node.get("customer", {}) or {}
                customer_id = customer.get("email") or customer.get("id") or "unknown"
                line_items = node.get("lineItems", {}).get("edges", [])
                for item_edge in line_items:
                    item = item_edge.get("node", {})
                    title = item.get("title")
                    if title:
                        # Normalise titles to lowercase slug
                        slug = title.lower().strip().replace(" ", "_")
                        customer_products[customer_id].append(slug)
            page_info = data.get("pageInfo", {})
            if page_info.get("hasNextPage"):
                variables["cursor"] = page_info.get("endCursor")
            else:
                break
        return dict(customer_products)

    def _compute_recommendations(self, customer_products: dict[str, list[str]]) -> dict[str, list[str]]:
        """Compute recommendations for each customer using item similarity.

        The algorithm builds a customer–product matrix where rows
        correspond to customers and columns correspond to unique products.
        Cosine similarity is computed between product vectors to estimate
        item affinity. For each customer, similarity scores for their
        purchased products are aggregated and top unseen products are
        selected as recommendations.
        """
        customers = list(customer_products.keys())
        # Build list of unique products
        all_products = sorted({p for prods in customer_products.values() for p in prods})
        if not all_products:
            return {}
        # Map product to index
        index = {prod: idx for idx, prod in enumerate(all_products)}
        # Build customer–product binary matrix
        matrix = np.zeros((len(customers), len(all_products)), dtype=float)
        for i, cust in enumerate(customers):
            for prod in customer_products[cust]:
                j = index.get(prod)
                if j is not None:
                    matrix[i, j] = 1.0
        # Compute item–item cosine similarity
        # Transpose matrix to shape (num_products, num_customers)
        similarity = cosine_similarity(matrix.T)
        # Build recommendations
        recommendations: dict[str, list[str]] = {}
        for i, cust in enumerate(customers):
            purchased = set(customer_products[cust])
            scores: dict[str, float] = defaultdict(float)
            for prod in purchased:
                j = index[prod]
                # similarity[j] is an array of similarities for this product to all others
                sim_scores = similarity[j]
                for k, score in enumerate(sim_scores):
                    candidate = all_products[k]
                    if candidate == prod or candidate in purchased:
                        continue
                    scores[candidate] += score
            # Sort by aggregated score
            top = sorted(scores.items(), key=lambda x: x[1], reverse=True)[: self.num_recommendations]
            recommendations[cust] = [prod for prod, _ in top]
        return recommendations
