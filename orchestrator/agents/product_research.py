"""Agent for discovering trending car tech and accessories products.

The ``ProductResearchAgent`` crawls selected automotive technology and
accessory e-commerce sites to identify trending products and innovations.
By regularly pulling headlines and extracting keywords, the agent
maintains an up-to-date list of promising items that could be
introduced into the Shopify catalog. It illustrates how the
orchestrator can incorporate external signals to inform product
development and sourcing decisions.

This agent uses ``requests`` and ``BeautifulSoup`` with robust error handling
to parse HTML content. It implements conservative request headers, timeouts,
retries, and graceful degradation. Sites may restrict automated crawling or
require captcha verification - the agent detects such cases and logs warnings
rather than crashing. For production use with Amazon or Temu, consider using
their official APIs (e.g., Amazon Product Advertising API) to comply with
terms of service.

The agent dynamically tests selectors and discovers tabbed navigation to
ensure comprehensive content extraction. Collected data is stored in memory
and can be exported or persisted via the orchestrator's shared state.
"""

from __future__ import annotations

import asyncio
import logging
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from orchestrator.core.agent_base import AgentBase


class ProductResearchAgent(AgentBase):
    """Fetches and analyzes trending car tech and accessories topics."""

    # List of (URL, CSS selector) pairs to scrape headlines from
    SOURCES: list[tuple[str, str]] = [
        ("https://www.amazon.nl/b/?ie=UTF8&node=16496233031&ref_=sv_automotive_5", "h2 a span"),
        ("https://www.amazon.nl/b/?ie=UTF8&node=16496241031&ref_=sv_automotive_3", "h2 a span"),
        ("https://www.temu.com/nl-en/car-smart-aromatherapy-machine-smart-aromatherapy-set-with-three--touch-sensor-colorful-led-light-ring-lithium-battery-usb-charging--1-3-bottle-perfume-set-suitable-for-home--g-601101303027471.html?_oak_name_id=7292451120539833076&_oak_mp_inf=EI%2BukO2s1ogBGi5jYXRlZ29yeV9saXN0XzE1MTBjMzAzZjhhODRiYWRiNzc5NDg3YzZmMjAyYWY1IN2IvY%2BJMw%3D%3D&top_gallery_url=https%3A%2F%2Fimg.kwcdn.com%2Fproduct%2Ffancy%2F5c5fb800-d690-4656-bbec-6b0fdfac9c55.jpg&spec_gallery_id=10424689522&refer_page_sn=10012&refer_source=0&freesia_scene=3&_oak_freesia_scene=3&_oak_rec_ext_1=ODk2&_oak_gallery_order=118971947%2C316667627%2C1094959646%2C748401201%2C1834909844&refer_page_el_sn=200064&_x_enter_scene_type=cate_tab&_x_vst_scene=adg&_x_ads_channel=bing&_x_ads_sub_channel=search&_x_ads_account=176233882&_x_ads_set=522905051&_x_ads_id=1323814591657994&_x_ads_creative_id=82738652460558&_x_ns_source=o&_x_ns_msclkid=2872fc254ddd1f64b8bd94bd4526ae1f&_x_ns_match_type=e&_x_ns_bid_match_type=be&_x_ns_query=auto%20accessories&_x_ns_keyword=auto%20accessories.&_x_ns_device=c&_x_ns_targetid=kwd-82739754077277%3Aloc-129&_x_ns_extensionid=&_x_sessn_id=5oelue8xkv&refer_page_name=category&refer_page_id=10012_1754795037550_4wku78im21", "h1")
    ]

    # Fallback selectors to try if primary selector yields no results
    FALLBACK_SELECTORS: list[str] = [
        "h2 a span", "h2 span", "h2 a", "span.a-size-base-plus", "h1", "title",
        ".a-link-normal", ".product-title", ".item-title", "[data-test-id*='title']"
    ]

    # Maximum headlines per source to avoid unbounded growth
    MAX_HEADLINES_PER_SOURCE = 100

    # Maximum tab links to discover and fetch per source
    MAX_TAB_LINKS = 10

    def __init__(self, name: str = "product_research") -> None:
        super().__init__(name)
        self.logger = logging.getLogger(self.name)
        self.trending_products: list[str] = []
        self._session = None
        self._setup_session()

    def _setup_session(self) -> None:
        """Set up a requests session with retry logic and browser-like headers."""
        self._session = requests.Session()

        # Configure retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self._session.mount("http://", adapter)
        self._session.mount("https://", adapter)

        # Set realistic browser headers
        self._session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })

    async def run(self) -> None:
        self.logger.info("Running product research agent")
        loop = asyncio.get_event_loop()

        # Pre-validate sources and adjust selectors
        validated_sources = []
        for url, selector in self.SOURCES:
            is_supported, chosen_selector = await loop.run_in_executor(
                None, self._validate_source, url, selector
            )
            if is_supported:
                validated_sources.append((url, chosen_selector))
                self.logger.info("Validated source %s with selector '%s'", url[:50], chosen_selector)
            else:
                self.logger.warning("Skipping unsupported source: %s", url[:50])

        if not validated_sources:
            self.logger.warning("No validated sources available for scraping")
            self.trending_products = []
            self._last_run = loop.time()
            return

        # Run blocking HTTP calls in a thread pool
        headlines_lists: list[list[str]] = await asyncio.gather(
            *[
                loop.run_in_executor(None, self._fetch_headlines_with_tabs, url, selector)
                for url, selector in validated_sources
            ],
            return_exceptions=True
        )

        # Filter out exceptions and flatten list of lists
        flat_headlines = []
        for i, result in enumerate(headlines_lists):
            if isinstance(result, Exception):
                self.logger.error("Error processing source %d: %s", i, result)
            elif isinstance(result, list):
                flat_headlines.extend(result[:self.MAX_HEADLINES_PER_SOURCE])

        self.trending_products = self._extract_keywords(flat_headlines)
        self.logger.info("Found %d trending items from %d headlines across %d sources",
                        len(self.trending_products), len(flat_headlines), len(validated_sources))

        # Update last run timestamp
        self._last_run = loop.time()

    def _validate_source(self, url: str, selector: str) -> tuple[bool, str]:
        """Test source URL and return the best working selector."""
        try:
            resp = self._session.get(url, timeout=10)
            resp.raise_for_status()

            # Check for anti-bot protection
            if self._is_protected_page(resp.text):
                self.logger.warning("Anti-bot protection detected for %s", url[:50])
                return False, selector

        except Exception as e:
            self.logger.error("Failed to validate source %s: %s", url[:50], e)
            return False, selector

        soup = BeautifulSoup(resp.text, "html.parser")

        # Try primary selector first
        elements = soup.select(selector)
        if elements and any(elem.get_text(strip=True) for elem in elements):
            self.logger.debug("Primary selector '%s' works for %s", selector, url[:50])
            return True, selector

        # Try fallback selectors
        for fallback_selector in self.FALLBACK_SELECTORS:
            if fallback_selector == selector:
                continue  # Skip if same as primary
            elements = soup.select(fallback_selector)
            if elements and any(elem.get_text(strip=True) for elem in elements):
                self.logger.info("Using fallback selector '%s' for %s", fallback_selector, url[:50])
                return True, fallback_selector

        self.logger.warning("No working selector found for %s", url[:50])
        return False, selector

    def _is_protected_page(self, page_text: str) -> bool:
        """Detect if page shows anti-bot protection or captcha."""
        protection_indicators = [
            "robot check", "captcha", "automated access", "verify you are human",
            "unusual traffic", "security check", "blocked", "access denied"
        ]
        page_lower = page_text.lower()
        return any(indicator in page_lower for indicator in protection_indicators)

    def _fetch_headlines_with_tabs(self, url: str, selector: str) -> list[str]:
        """Fetch headlines from main page and discovered tab links."""
        headlines = self._fetch_headlines(url, selector)

        # Discover and fetch tab links
        try:
            resp = self._session.get(url, timeout=10)
            resp.raise_for_status()

            if self._is_protected_page(resp.text):
                return headlines  # Return what we have if protected

            soup = BeautifulSoup(resp.text, "html.parser")
            tab_links = self._extract_tab_links(soup, url)

            if tab_links:
                self.logger.info("Found %d tab links for %s", len(tab_links), url[:50])

                # Fetch headlines from each tab
                for tab_url in tab_links:
                    try:
                        tab_headlines = self._fetch_headlines(tab_url, selector)
                        headlines.extend(tab_headlines)
                        self.logger.debug("Added %d headlines from tab: %s", len(tab_headlines), tab_url[:50])
                    except Exception as e:
                        self.logger.debug("Failed to fetch tab %s: %s", tab_url[:50], e)

        except Exception as e:
            self.logger.debug("Tab discovery failed for %s: %s", url[:50], e)

        return headlines

    def _extract_tab_links(self, soup: BeautifulSoup, base_url: str) -> list[str]:
        """Extract tab navigation links from the page."""
        tab_links = set()

        # Look for various tab navigation patterns
        tab_selectors = [
            '[role="tab"] a[href]',
            '[role="tablist"] a[href]',
            '[data-toggle="tab"][href]',
            '.tab a[href]',
            '.tabs a[href]',
            '.nav-tabs a[href]',
            '[class*="tab"] a[href]',
            'a[href][data-tab]'
        ]

        for tab_selector in tab_selectors:
            elements = soup.select(tab_selector)
            for elem in elements:
                href = elem.get('href')
                if href:
                    # Convert to absolute URL
                    full_url = urljoin(base_url, href)

                    # Basic filtering - avoid obvious non-tab links
                    if self._looks_like_tab_link(href, elem):
                        tab_links.add(full_url)

                    if len(tab_links) >= self.MAX_TAB_LINKS:
                        break

            if len(tab_links) >= self.MAX_TAB_LINKS:
                break

        return list(tab_links)

    def _looks_like_tab_link(self, href: str, element) -> bool:
        """Heuristic to determine if a link looks like tab navigation."""
        href_lower = href.lower()

        # Skip obvious non-tab links
        if any(skip in href_lower for skip in ['javascript:', 'mailto:', 'tel:', '#', 'login', 'register', 'cart']):
            return False

        # Check for tab-like text or attributes
        text = element.get_text(strip=True).lower() if hasattr(element, 'get_text') else ''
        classes_list = element.get('class', []) if hasattr(element, 'get') else []
        classes = ' '.join(classes_list if classes_list else []).lower()

        tab_indicators = ['tab', 'category', 'section', 'filter', 'view', 'type']
        return any(indicator in text or indicator in classes or indicator in href_lower
                  for indicator in tab_indicators)

    def _fetch_headlines(self, url: str, selector: str) -> list[str]:
        """Fetch headlines from a given URL and CSS selector."""
        try:
            resp = self._session.get(url, timeout=10)
            resp.raise_for_status()

            # Check for anti-bot protection
            if self._is_protected_page(resp.text):
                self.logger.warning("Anti-bot protection detected for %s, skipping", url[:50])
                return []

        except Exception as e:
            self.logger.error("Error fetching %s: %s", url[:50], e)
            return []

        soup = BeautifulSoup(resp.text, "html.parser")
        headlines = [tag.get_text(strip=True) for tag in soup.select(selector) if tag.get_text(strip=True)]

        self.logger.debug("Extracted %d headlines from %s using selector '%s'",
                         len(headlines), url[:50], selector)

        return headlines

    def _extract_keywords(self, headlines: list[str]) -> list[str]:
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
        tokens: list[str] = []
        for headline in headlines:
            words = [w.lower().strip(".,:;!?") for w in headline.split()]
            tokens.extend([w for w in words if len(w) > 3 and w not in stop_words])
        # Deduplicate while preserving order
        seen = set()
        keywords: list[str] = []
        for token in tokens:
            if token not in seen:
                seen.add(token)
                keywords.append(token)
        return keywords

    async def shutdown(self) -> None:
        """Clean up the session on shutdown."""
        if self._session:
            self._session.close()
        await super().shutdown()
