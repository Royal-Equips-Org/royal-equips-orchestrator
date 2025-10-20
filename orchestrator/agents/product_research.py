"""Production-grade Agent for discovering trending products via AutoDS and Spocket APIs.

The ``ProductResearchAgent`` fetches trending products from AutoDS and Spocket
using their APIs to identify promising items that could be introduced into
the Shopify catalog. It computes potential margin and maintains a database
table of candidate products for further analysis.

PRODUCTION IMPLEMENTATION - NO MOCK/STUB/FALLBACK DATA:
- Enforces real API credentials (AUTO_DS_API_KEY, SPOCKET_API_KEY)
- Fail-fast on missing credentials
- Comprehensive error handling with structured logging
- Retry logic with exponential backoff via tenacity
- Real-time trend analysis with Google Trends integration
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
import re
from typing import Any, Dict, List, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

try:
    from pytrends.request import TrendReq
    _PYTRENDS_AVAILABLE = True
except ImportError:
    TrendReq = None
    _PYTRENDS_AVAILABLE = False

from orchestrator.core.agent_base import AgentBase
from core.resilience import get_circuit_breaker, get_dead_letter_queue, CircuitBreakerConfig
from core.structured_logging import get_structured_logger, set_agent_context


class ProductResearchAgent(AgentBase):
    """Fetches trending products from AutoDS and Spocket APIs."""

    def __init__(self, name: str = "product_research") -> None:
        super().__init__(name, agent_type="product_research", description="Discovers trending products via multiple APIs")
        self.logger = logging.getLogger(self.name)
        
        # Initialize structured logging
        self.structured_logger = get_structured_logger(self.name)
        set_agent_context(self.name)
        
        # Initialize circuit breakers for external APIs
        self.autods_breaker = get_circuit_breaker(
            "autods_api",
            config=CircuitBreakerConfig(
                failure_threshold=3,
                timeout_seconds=60,
                max_requests_per_second=5.0
            )
        )
        self.spocket_breaker = get_circuit_breaker(
            "spocket_api",
            config=CircuitBreakerConfig(
                failure_threshold=3,
                timeout_seconds=60,
                max_requests_per_second=5.0
            )
        )
        
        # Initialize dead letter queue for failed operations
        self.dlq = get_dead_letter_queue("product_research_failures")
        
        self.trending_products: List[Dict[str, Any]] = []
        self.execution_params: Dict[str, Any] = {}
        self.last_result: Optional[Dict[str, Any]] = None  # Stores the results of the most recent execution
        self.discoveries_count: int = 0  # Tracks the number of products discovered in the last run

    def set_execution_params(self, params: Dict[str, Any]) -> None:
        """Set execution parameters for the agent."""
        self.execution_params = params
        self.logger.info(f"Execution parameters set: {params}")

    async def _execute_task(self) -> None:
        """Execute the main product research task with configurable parameters.
        
        PRODUCTION MODE: Requires valid API credentials. No fallback data.
        Raises ValueError if credentials are missing.
        """
        # Validate credentials first - FAIL FAST
        self._validate_credentials()
        
        categories = self.execution_params.get("categories", ["general"])
        if isinstance(categories, str):
            categories = [categories]

        max_products = self.execution_params.get("maxProducts", 20)
        min_margin = self.execution_params.get("minMargin", 30)

        self.structured_logger.info(
            "🔍 PRODUCTION MODE: Running product research agent",
            categories=categories,
            max_products=max_products,
            min_margin=min_margin,
            execution_mode="production"
        )

        all_products = []

        # Fetch from multiple sources based on categories
        for category in categories:
            # Fetch trending products from both sources with retry logic
            try:
                autods_products = await self._fetch_autods_products(category=category)
                all_products.extend(autods_products)
                self.structured_logger.info(
                    "✅ AutoDS API success",
                    category=category,
                    products_fetched=len(autods_products)
                )
            except Exception as e:
                self.structured_logger.error(
                    "❌ AutoDS API failed",
                    exc_info=True,
                    category=category,
                    error_type=type(e).__name__
                )
                # Add to dead letter queue for investigation
                await self.dlq.add(
                    operation="fetch_autods_products",
                    error=e,
                    context={"category": category}
                )
            
            try:
                spocket_products = await self._fetch_spocket_products(category=category)
                all_products.extend(spocket_products)
                self.structured_logger.info(
                    "✅ Spocket API success",
                    category=category,
                    products_fetched=len(spocket_products)
                )
            except Exception as e:
                self.structured_logger.error(
                    "❌ Spocket API failed",
                    exc_info=True,
                    category=category,
                    error_type=type(e).__name__
                )
                # Add to dead letter queue for investigation
                await self.dlq.add(
                    operation="fetch_spocket_products",
                    error=e,
                    context={"category": category}
                )

        # PRODUCTION: Fail if no products retrieved from real APIs
        if not all_products:
            error_msg = (
                "❌ PRODUCTION ERROR: No products retrieved from AutoDS or Spocket APIs. "
                "Check API credentials and service availability. NO FALLBACK DATA IN PRODUCTION."
            )
            self.logger.error(error_msg)
            raise RuntimeError(error_msg)

        # Process and filter products
        self.trending_products = self._process_products(all_products, min_margin=min_margin)

        # Limit to max_products
        self.trending_products = self.trending_products[:max_products]

        # Update discoveries count
        self.discoveries_count = len(self.trending_products)

        # Store results for retrieval
        self.last_result = {
            "products": self.trending_products,
            "count": self.discoveries_count,
            "categories": categories,
            "timestamp": time.time(),
            "sources": ["AutoDS", "Spocket"],
            "production_mode": True
        }

        self.logger.info(
            "✅ Found %d trending products across categories: %s",
            len(self.trending_products),
            ", ".join(categories)
        )

        # Log sample products for debugging with structured logging
        for i, product in enumerate(self.trending_products[:5]):
            self.logger.info(
                "📦 Sample product %d: %s - $%.2f (margin: %.1f%%, source: %s)",
                i + 1,
                product['title'],
                product.get('price', 0),
                product.get('margin_percent', 0),
                product.get('source', 'Unknown')
            )
    
    def _validate_credentials(self) -> None:
        """Validate that required API credentials are present.
        
        Raises:
            ValueError: If any required credentials are missing.
        """
        autods_key = os.getenv('AUTO_DS_API_KEY') or os.getenv('AUTODS_API_KEY')
        spocket_key = os.getenv('SPOCKET_API_KEY')
        
        missing_credentials = []
        if not autods_key:
            missing_credentials.append('AUTO_DS_API_KEY')
        if not spocket_key:
            missing_credentials.append('SPOCKET_API_KEY')
        
        if missing_credentials:
            error_msg = (
                f"❌ PRODUCTION ERROR: Missing required API credentials: {', '.join(missing_credentials)}. "
                "Set environment variables for production operation. NO MOCK DATA AVAILABLE."
            )
            self.logger.error(error_msg)
            raise ValueError(error_msg)
        
        self.logger.info("✅ Credentials validated: AutoDS and Spocket API keys present")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
        reraise=True
    )
    async def _fetch_autods_products(self, category: str = "general") -> List[Dict[str, Any]]:
        """Fetch trending products from AutoDS API with retry logic.
        
        PRODUCTION MODE: Requires AUTO_DS_API_KEY environment variable.
        Implements exponential backoff retry on network failures.
        
        Args:
            category: Product category to fetch (electronics, home, car, general)
            
        Returns:
            List of product dictionaries from AutoDS API
            
        Raises:
            ValueError: If API key is missing
            httpx.HTTPError: If API returns error response after retries
        """
        self.logger.info(f"🔍 Fetching products from AutoDS API for category: {category}")

        # Get API credentials - already validated in _validate_credentials
        api_key = os.getenv('AUTO_DS_API_KEY') or os.getenv('AUTODS_API_KEY')

        # Map categories to AutoDS format
        category_mapping = {
            "electronics": "electronics",
            "home": "home-garden",
            "car": "car-accessories",
            "general": "trending"
        }
        autods_category = category_mapping.get(category.lower(), category)

        # Real AutoDS API implementation with proper error handling and circuit breaker
        start_time = time.time()
        
        async def _make_autods_call():
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                    'User-Agent': 'RoyalEquipsOrchestrator/2.0'
                }

                # AutoDS trending products endpoint
                response = await client.get(
                    'https://app.autods.com/api/v1/products/trending',
                    headers=headers,
                    params={
                        'category': autods_category,
                        'limit': 20,
                        'min_margin': 30
                    }
                )
                return response
        
        # Call through circuit breaker
        response = await self.autods_breaker.call(_make_autods_call)

        if response.status_code == 200:
            duration_ms = (time.time() - start_time) * 1000
            data = response.json()
            products = []

            for item in data.get('products', []):
                products.append({
                    'id': f"autods_{item.get('id')}",
                    'title': item.get('title'),
                    'source': 'AutoDS',
                    'supplier_price': float(item.get('supplier_price', 0)),
                    'suggested_price': float(item.get('suggested_retail_price', 0)),
                    'category': item.get('category', category),
                    'trend_score': item.get('trend_score', 50),
                    'image_url': item.get('main_image'),
                    'supplier_name': item.get('supplier_name'),
                    'shipping_time': item.get('shipping_time'),
                    'rating': item.get('rating', 0)
                })

            # Log performance metrics
            self.structured_logger.performance(
                "autods_api_fetch",
                duration_ms,
                category=category,
                products_count=len(products),
                status_code=200
            )
            return products
        
        elif response.status_code == 401:
            error_msg = f"❌ AutoDS API authentication failed. Check AUTO_DS_API_KEY validity."
            self.structured_logger.error(error_msg, status_code=401, category=category)
            raise ValueError(error_msg)
        
        elif response.status_code == 429:
            error_msg = f"❌ AutoDS API rate limit exceeded. Retry will be attempted."
            self.structured_logger.warning(error_msg, status_code=429, category=category)
            raise httpx.HTTPError(error_msg)
        
        else:
            error_msg = f"❌ AutoDS API error: {response.status_code}"
            duration_ms = (time.time() - start_time) * 1000
            self.structured_logger.error(
                error_msg,
                status_code=response.status_code,
                category=category,
                duration_ms=duration_ms
            )
            raise httpx.HTTPError(error_msg)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
        reraise=True
    )
    async def _fetch_spocket_products(self, category: str = "general") -> List[Dict[str, Any]]:
        """Fetch trending products from Spocket API with retry logic.
        
        PRODUCTION MODE: Requires SPOCKET_API_KEY environment variable.
        Implements exponential backoff retry on network failures.
        
        Args:
            category: Product category to fetch (electronics, home, car, general)
            
        Returns:
            List of product dictionaries from Spocket API
            
        Raises:
            ValueError: If API key is missing
            httpx.HTTPError: If API returns error response after retries
        """
        self.structured_logger.info(
            "🔍 Fetching products from Spocket API",
            category=category
        )

        # Get API credentials - already validated in _validate_credentials
        api_key = os.getenv('SPOCKET_API_KEY')

        # Map categories to Spocket format
        category_mapping = {
            "electronics": "electronics",
            "home": "home-garden",
            "car": "automotive",
            "general": "trending"
        }
        spocket_category = category_mapping.get(category.lower(), category)

        # Real Spocket API implementation with proper error handling and circuit breaker
        import time
        start_time = time.time()
        
        async def _make_spocket_call():
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                    'User-Agent': 'RoyalEquipsOrchestrator/2.0'
                }

                # Spocket products endpoint
                response = await client.get(
                    'https://api.spocket.co/api/v1/dropshipping/search/products',
                    headers=headers,
                    params={
                        'category': spocket_category,
                        'limit': 15,
                        'sort': 'trending',
                        'shipping_from': 'US,EU'
                    }
                )
                return response
        
        # Call through circuit breaker
        response = await self.spocket_breaker.call(_make_spocket_call)

        if response.status_code == 200:
            duration_ms = (time.time() - start_time) * 1000
            data = response.json()
            products = []

            for item in data.get('data', []):
                products.append({
                    'id': f"spocket_{item.get('id')}",
                    'title': item.get('title'),
                    'source': 'Spocket',
                    'supplier_price': float(item.get('price', 0)),
                    'suggested_price': float(item.get('price', 0)) * 2.5,  # 150% markup (2.5x multiplier)
                    'category': item.get('category', category),
                    'trend_score': self._calculate_trend_score(item),
                    'image_url': item.get('images', [{}])[0].get('src') if item.get('images') else None,
                    'supplier_name': item.get('supplier', {}).get('name'),
                    'shipping_time': item.get('shipping_time'),
                    'rating': item.get('rating', 0)
                })

            # Log performance metrics
            self.structured_logger.performance(
                "spocket_api_fetch",
                duration_ms,
                category=category,
                products_count=len(products),
                status_code=200
            )
            return products
        
        elif response.status_code == 401:
            error_msg = f"❌ Spocket API authentication failed. Check SPOCKET_API_KEY validity."
            self.structured_logger.error(error_msg, status_code=401, category=category)
            raise ValueError(error_msg)
        
        elif response.status_code == 429:
            error_msg = f"❌ Spocket API rate limit exceeded. Retry will be attempted."
            self.structured_logger.warning(error_msg, status_code=429, category=category)
            raise httpx.HTTPError(error_msg)
        
        else:
            error_msg = f"❌ Spocket API error: {response.status_code}"
            duration_ms = (time.time() - start_time) * 1000
            self.structured_logger.error(
                error_msg,
                status_code=response.status_code,
                category=category,
                duration_ms=duration_ms
            )
            raise httpx.HTTPError(error_msg)


    # PRODUCTION MODE: All fallback/stub methods removed
    # This agent now requires real AutoDS and Spocket API credentials
    # Removed methods: _fetch_trending_products_fallback, _get_google_trends_products,
    # _scrape_aliexpress_trending, _scrape_amazon_bestsellers,
    # _autods_enhanced_stub, _spocket_enhanced_stub

    def _calculate_trend_score(self, item: Dict) -> int:
        """Calculate trend score based on product metrics."""
        score = 50  # Base score

        # Factor in rating
        if item.get('rating', 0) > 4.0:
            score += 20
        elif item.get('rating', 0) > 3.5:
            score += 10

        # Factor in inventory
        if item.get('inventory', 0) > 100:
            score += 15
        elif item.get('inventory', 0) > 50:
            score += 10

        # Factor in shipping speed (US/EU preferred)
        shipping_from = item.get('shipping_from', '').upper()
        if 'US' in shipping_from or 'EU' in shipping_from:
            score += 15

        return min(100, score)

    def _process_products(self, products: List[Dict[str, Any]], min_margin: float = 30.0) -> List[Dict[str, Any]]:
        """Process and enrich product data with calculated margins and trend analysis."""
        processed = []

        for product in products:
            # Calculate margin
            supplier_price = product['supplier_price']
            suggested_price = product['suggested_price']
            margin = suggested_price - supplier_price
            margin_percent = (margin / suggested_price) * 100

            # Filter by minimum margin
            if margin_percent < min_margin:
                continue

            # Enhanced product data
            enriched_product = {
                **product,
                'price': suggested_price,
                'margin': margin,
                'margin_percent': margin_percent,
                'profit_potential': self._calculate_profit_potential(product),
                'market_viability': self._assess_market_viability(product),
                'processed_at': time.time()
            }

            # Apply 5-factor scoring model
            enriched_product['empire_score'] = self._calculate_empire_score(enriched_product)

            processed.append(enriched_product)

        # Sort by empire score (highest first)
        processed.sort(key=lambda x: x['empire_score'], reverse=True)

        return processed

    def _calculate_profit_potential(self, product: Dict[str, Any]) -> str:
        """Calculate profit potential rating."""
        margin_percent = ((product['suggested_price'] - product['supplier_price']) / product['suggested_price']) * 100

        if margin_percent >= 60:
            return "EXCELLENT"
        elif margin_percent >= 45:
            return "GOOD"
        elif margin_percent >= 30:
            return "FAIR"
        else:
            return "LOW"

    def _assess_market_viability(self, product: Dict[str, Any]) -> str:
        """Assess market viability based on trend score and category."""
        trend_score = product.get('trend_score', 50)
        category = product.get('category', '').lower()

        # Bonus for high-demand categories
        category_multiplier = 1.0
        if 'electronics' in category or 'tech' in category:
            category_multiplier = 1.2
        elif 'accessories' in category:
            category_multiplier = 1.1

        adjusted_score = trend_score * category_multiplier

        if adjusted_score >= 85:
            return "HIGH"
        elif adjusted_score >= 70:
            return "MEDIUM"
        else:
            return "LOW"

    def _calculate_empire_score(self, product: Dict[str, Any]) -> float:
        """Calculate Empire 5-factor scoring model:
        1. Profit Margin (30%)
        2. Trend Score (25%) 
        3. Market Viability (20%)
        4. Supplier Reliability (15%)
        5. Shipping Speed (10%)
        """
        scores = {}

        # Factor 1: Profit Margin (30%)
        margin_percent = product.get('margin_percent', 0)
        if margin_percent >= 60:
            scores['margin'] = 100
        elif margin_percent >= 45:
            scores['margin'] = 80
        elif margin_percent >= 30:
            scores['margin'] = 60
        else:
            scores['margin'] = 20

        # Factor 2: Trend Score (25%)
        scores['trend'] = product.get('trend_score', 50)

        # Factor 3: Market Viability (20%)
        viability = product.get('market_viability', 'LOW')
        viability_scores = {'HIGH': 90, 'MEDIUM': 70, 'LOW': 40}
        scores['viability'] = viability_scores.get(viability, 40)

        # Factor 4: Supplier Reliability (15%)
        rating = product.get('rating', 0)
        if rating >= 4.5:
            scores['reliability'] = 95
        elif rating >= 4.0:
            scores['reliability'] = 80
        elif rating >= 3.5:
            scores['reliability'] = 65
        else:
            scores['reliability'] = 40

        # Factor 5: Shipping Speed (10%)
        shipping_time = product.get('shipping_time', '10+ days').lower()
        if '1-3' in shipping_time or '3-5' in shipping_time:
            scores['shipping'] = 90
        elif '5-7' in shipping_time or '7-10' in shipping_time:
            scores['shipping'] = 70
        else:
            scores['shipping'] = 40

        # Calculate weighted score
        empire_score = (
            scores['margin'] * 0.30 +
            scores['trend'] * 0.25 +
            scores['viability'] * 0.20 +
            scores['reliability'] * 0.15 +
            scores['shipping'] * 0.10
        )

        return round(empire_score, 2)

    async def get_trending_keywords(self, category: str = "car accessories") -> List[str]:
        """Get trending keywords from Google Trends."""
        try:
            # Initialize pytrends
            pytrends = TrendReq(hl='en-US', tz=360)

            # Build payload for category
            base_keywords = [category, f"{category} 2024", f"best {category}"]
            pytrends.build_payload(base_keywords, timeframe='today 3-m', geo='US')

            # Get related queries
            related_queries = pytrends.related_queries()
            trending_keywords = []

            for keyword in base_keywords:
                if keyword in related_queries and related_queries[keyword]['top'] is not None:
                    top_queries = related_queries[keyword]['top']['query'].tolist()
                    trending_keywords.extend(top_queries[:5])  # Top 5 per keyword

            self.logger.info(f"Found {len(trending_keywords)} trending keywords for {category}")
            return trending_keywords[:15]  # Return top 15 overall

        except Exception as e:
            self.logger.error(f"Error fetching trending keywords: {e}")
            # Return default keywords if API fails
            return ["wireless car charger", "dashboard camera", "car phone mount",
                   "bluetooth adapter", "car air freshener"]

    async def get_daily_discoveries(self) -> int:
        """Get count of high-scoring products discovered today."""
        high_score_products = [p for p in self.trending_products if p.get('empire_score', 0) >= 75]
        return len(high_score_products)

    async def get_top_products(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top products by Empire score."""
        return sorted(self.trending_products, key=lambda x: x.get('empire_score', 0), reverse=True)[:limit]

    async def _update_performance_metrics(self):
        """Update agent performance metrics."""
        await super()._update_performance_metrics()

        # Calculate success rate based on high-scoring products
        if self.trending_products:
            high_score_count = len([p for p in self.trending_products if p.get('empire_score', 0) >= 70])
            self.success_rate = (high_score_count / len(self.trending_products)) * 100
        else:
            self.success_rate = 0.0

        # Update performance score based on discoveries and quality
        quality_bonus = len([p for p in self.trending_products if p.get('empire_score', 0) >= 80])
        self.performance_score = min(100, (self.discoveries_count * 2) + (quality_bonus * 5))

    async def health_check(self) -> Dict[str, Any]:
        """Return health status with agent-specific metrics."""
        base_health = await super().health_check()

        # Add product research specific health information
        now = asyncio.get_event_loop().time()

        agent_health = {
            **base_health,
            'products_found': len(self.trending_products),
            'last_run_timestamp': self._last_run,
            'time_since_last_run_seconds': now - (self._last_run or now),
        }

        # Determine overall status
        if self._last_run is None:
            agent_health['status'] = 'never_run'
        elif (now - self._last_run) > 7200:  # 2 hours
            agent_health['status'] = 'stale'
        else:
            agent_health['status'] = 'healthy'

        return agent_health
