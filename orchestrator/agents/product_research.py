"""Agent for discovering trending car tech and accessories products.

The ``ProductResearchAgent`` crawls selected automotive technology and
accessory news websites to identify trending products and innovations.
By regularly pulling headlines and extracting keywords, the agent
maintains an up-to-date list of promising items that could be
introduced into the Shopify catalog. It illustrates how the
orchestrator can incorporate external signals to inform product
development and sourcing decisions.

This agent uses ``requests`` and ``BeautifulSoup`` to parse HTML
content. The sites scraped should be publicly accessible and allow
crawling under their terms of service. Adjust the URLs in
``SOURCES`` as needed. The collected data is stored in memory and can
be exported or persisted via the orchestrator's shared state.
"""

from __future__ import annotations

import asyncio
import logging
from typing import List, Tuple

import requests
from bs4 import BeautifulSoup

from ..core.agent_base import AgentBase


class ProductResearchAgent(AgentBase):
    """Fetches and analyzes trending car tech and accessories topics."""

    # List of (URL, CSS selector) pairs to scrape headlines from
    SOURCES: List[Tuple[str, str]] = [
        ("https://www.autoblog.com/category/tech/", "h2.entry-title a"),
        ("https://www.topgear.com/car-news", "h3.listing-item__title"),
    ]

    def __init__(self, name: str = "product_research") -> None:
        super().__init__(name)
        self.logger = logging.getLogger(self.name)
        self.trending_products: List[str] = []

    async def run(self) -> None:
        self.logger.info("Running product research agent")
        loop = asyncio.get_event_loop()
        # Run blocking HTTP calls in a thread pool
        headlines: List[str] = await asyncio.gather(
            *[loop.run_in_executor(None, self._fetch_headlines, url, selector) for url, selector in self.SOURCES]
        )
        # Flatten list of lists
        flat_headlines = [item for sublist in headlines for item in sublist]
        self.trending_products = self._extract_keywords(flat_headlines)
        self.logger.info("Found %d trending items", len(self.trending_products))
        # Update last run timestamp
        self._last_run = loop.time()

    def _fetch_headlines(self, url: str, selector: str) -> List[str]:
        """Fetch headlines from a given URL and CSS selector."""
        try:
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
        except Exception as e:
            self.logger.error("Error fetching %s: %s", url, e)
            return []
        soup = BeautifulSoup(resp.text, "html.parser")
        headlines = [tag.get_text(strip=True) for tag in soup.select(selector) if tag.get_text(strip=True)]
        return headlines

    def _extract_keywords(self, headlines: List[str]) -> List[str]:
        """Extract simple keywords from headlines.

        This heuristic splits headlines into words, filters out common stop
        words, and returns a deduplicated list. A more sophisticated
        implementation could use NLP techniques or connect to a trend
        analysis API.
        """
        stop_words = {
            "the", "a", "an", "and", "or", "to", "with", "of", "for", "on",
            "in", "at", "is", "it", "its", "by", "from", "new", "best",
        }
        tokens: List[str] = []
        for headline in headlines:
            words = [w.lower().strip(".,:;!?") for w in headline.split()]
            tokens.extend([w for w in words if len(w) > 3 and w not in stop_words])
        # Deduplicate while preserving order
        seen = set()
        keywords: List[str] = []
        for token in tokens:
            if token not in seen:
                seen.add(token)
                keywords.append(token)
        return keywords
