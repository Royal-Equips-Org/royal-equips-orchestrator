"""Agent for discovering trending products via AutoDS and Spocket APIs.

The ``ProductResearchAgent`` fetches trending products from AutoDS and Spocket
using their APIs to identify promising items that could be introduced into
the Shopify catalog. It computes potential margin and maintains a database
table of candidate products for further analysis.

This is the Phase 1 implementation that uses stub functions for the APIs
while the full integration is being developed. The agent demonstrates the
core orchestrator functionality and logging patterns.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Any, Dict, List, Optional

import httpx

try:
    from pytrends.request import TrendReq
    _PYTRENDS_AVAILABLE = True
except ImportError:
    TrendReq = None
    _PYTRENDS_AVAILABLE = False

from orchestrator.core.agent_base import AgentBase


class ProductResearchAgent(AgentBase):
    """Fetches trending products from AutoDS and Spocket APIs."""

    def __init__(self, name: str = "product_research") -> None:
        super().__init__(name, agent_type="product_research", description="Discovers trending products via multiple APIs")
        self.logger = logging.getLogger(self.name)
        self.trending_products: List[Dict[str, Any]] = []
        self.execution_params: Dict[str, Any] = {}
        self.last_result: Optional[Dict[str, Any]] = None  # Stores the results of the most recent execution
        self.discoveries_count: int = 0  # Tracks the number of products discovered in the last run

    def set_execution_params(self, params: Dict[str, Any]) -> None:
        """Set execution parameters for the agent."""
        self.execution_params = params
        self.logger.info(f"Execution parameters set: {params}")

    async def _execute_task(self) -> None:
        """Execute the main product research task with configurable parameters."""
        categories = self.execution_params.get("categories", ["general"])
        if isinstance(categories, str):
            categories = [categories]

        max_products = self.execution_params.get("maxProducts", 20)
        min_margin = self.execution_params.get("minMargin", 30)

        self.logger.info(
            f"Running product research agent with categories={categories}, "
            f"maxProducts={max_products}, minMargin={min_margin}%"
        )

        all_products = []

        # Fetch from multiple sources based on categories
        for category in categories:
            # Fetch trending products from both sources
            autods_products = await self._fetch_autods_products(category=category)
            spocket_products = await self._fetch_spocket_products(category=category)

            all_products.extend(autods_products)
            all_products.extend(spocket_products)

        # If no products found, use enhanced analysis
        if not all_products:
            self.logger.warning("No products from APIs, using enhanced analysis")
            all_products = await self._fetch_trending_products_fallback()

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
            "timestamp": time.time()
        }

        self.logger.info(
            "Found %d trending products across categories: %s",
            len(self.trending_products),
            ", ".join(categories)
        )

        # Log sample products for debugging
        for i, product in enumerate(self.trending_products[:5]):
            self.logger.info(
                "Sample product %d: %s - $%.2f (margin: %.1f%%)",
                i + 1,
                product['title'],
                product.get('price', 0),
                product.get('margin_percent', 0)
            )

    async def _fetch_autods_products(self, category: str = "general") -> List[Dict[str, Any]]:
        """Fetch trending products from AutoDS API or simulate with enhanced stub."""
        self.logger.debug(f"Fetching products from AutoDS API for category: {category}")

        try:
            # Check for AutoDS API credentials
            api_key = os.getenv('AUTO_DS_API_KEY') or os.getenv('AUTODS_API_KEY')
            if not api_key:
                self.logger.warning("AUTO_DS_API_KEY not found, using enhanced stub data")
                return await self._autods_enhanced_stub(category=category)

            # Map categories to AutoDS format
            category_mapping = {
                "electronics": "electronics",
                "home": "home-garden",
                "car": "car-accessories",
                "general": "trending"
            }
            autods_category = category_mapping.get(category.lower(), category)

            # Real AutoDS API implementation
            async with httpx.AsyncClient() as client:
                headers = {
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                }

                # AutoDS trending products endpoint
                response = await client.get(
                    'https://app.autods.com/api/v1/products/trending',
                    headers=headers,
                    params={
                        'category': autods_category,
                        'limit': 20,
                        'min_margin': 30
                    },
                    timeout=30
                )

                if response.status_code == 200:
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

                    self.logger.info(f"Successfully fetched {len(products)} products from AutoDS API for {category}")
                    return products
                else:
                    self.logger.error(f"AutoDS API error: {response.status_code}")
                    return await self._autods_enhanced_stub(category=category)

        except Exception as e:
            self.logger.error(f"Error fetching AutoDS products: {e}")
            return await self._autods_enhanced_stub(category=category)

    async def _fetch_trending_products_fallback(self) -> List[Dict[str, Any]]:
        """Fallback to trending product analysis using Google Trends and web scraping."""
        self.logger.info("Using fallback trending product analysis")

        try:
            # Use Google Trends for car accessories if pytrends is available
            if _PYTRENDS_AVAILABLE:
                trends = await self._get_google_trends_products()
                if trends:
                    return trends

            # Fallback to AliExpress trending analysis
            aliexpress_products = await self._scrape_aliexpress_trending()
            if aliexpress_products:
                return aliexpress_products

            # Final fallback - return empty list to force manual intervention
            self.logger.warning("All trending product sources failed - manual intervention required")
            return []

        except Exception as e:
            self.logger.error(f"Fallback trending analysis failed: {e}")
            return []

    async def _get_google_trends_products(self) -> List[Dict[str, Any]]:
        """Get trending car accessories from Google Trends."""
        try:
            pytrends = TrendReq(hl='en-US', tz=360)

            # Car accessory keywords to track
            keywords = [
                'car phone mount', 'dash cam', 'car charger', 'seat covers',
                'car organizer', 'LED lights car', 'bluetooth car adapter'
            ]

            products = []
            for keyword in keywords:
                pytrends.build_payload([keyword], timeframe='today 3-m')
                interest_data = pytrends.interest_over_time()

                if not interest_data.empty:
                    # Calculate trend score from recent growth
                    recent_avg = interest_data[keyword].tail(4).mean()
                    overall_avg = interest_data[keyword].mean()
                    trend_score = min(100, int((recent_avg / overall_avg) * 50)) if overall_avg > 0 else 50

                    # Estimate pricing based on keyword
                    base_price = self._estimate_product_price(keyword)

                    products.append({
                        'id': f'trends_{hash(keyword)}',
                        'title': self._generate_product_title(keyword),
                        'source': 'Google Trends',
                        'supplier_price': base_price * 0.4,  # 40% cost
                        'suggested_price': base_price,
                        'category': 'Car Accessories',
                        'trend_score': trend_score,
                        'image_url': None,
                        'supplier_name': 'Multiple Sources',
                        'shipping_time': '10-20 days',
                        'rating': 4.0
                    })

            self.logger.info(f"Generated {len(products)} products from Google Trends analysis")
            return products

        except Exception as e:
            self.logger.error(f"Google Trends analysis failed: {e}")
            return []

    async def _scrape_aliexpress_trending(self) -> List[Dict[str, Any]]:
        """Scrape trending car accessories from AliExpress."""
        try:
            url = "https://www.aliexpress.com/category/34/automobiles-motorcycles.html"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }

            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(url, headers=headers)
                if response.status_code != 200:
                    return []

                # Basic product extraction (would need proper HTML parsing in production)
                products = []
                # This is a simplified implementation - would need BeautifulSoup/Scrapy
                # for robust HTML parsing and product extraction

                self.logger.warning("AliExpress scraping not fully implemented - requires HTML parsing")
                return products

        except Exception as e:
            self.logger.error(f"AliExpress scraping failed: {e}")
            return []

    def _estimate_product_price(self, keyword: str) -> float:
        """Estimate product price based on keyword analysis."""
        price_ranges = {
            'phone mount': (15, 35),
            'dash cam': (50, 150),
            'car charger': (10, 25),
            'seat covers': (25, 80),
            'organizer': (20, 40),
            'LED lights': (15, 45),
            'bluetooth adapter': (20, 50)
        }

        for key, (min_price, max_price) in price_ranges.items():
            if key in keyword.lower():
                return (min_price + max_price) / 2

        return 25.0  # Default price

    def _generate_product_title(self, keyword: str) -> str:
        """Generate appealing product title from keyword."""
        templates = {
            'phone mount': 'Universal Phone Holder Mount for Car Dashboard',
            'dash cam': 'HD Dashboard Camera with Night Vision',
            'car charger': 'Fast Charging USB Car Charger Adapter',
            'seat covers': 'Premium Leather Car Seat Covers Set',
            'organizer': 'Multi-Pocket Car Organizer Storage Solution',
            'LED lights': 'RGB LED Interior Lighting Kit for Cars',
            'bluetooth adapter': 'Wireless Bluetooth Car Audio Adapter'
        }

        for key, template in templates.items():
            if key in keyword.lower():
                return template

        return f"Premium {keyword.title()} for Automotive Use"

    async def _fetch_spocket_products(self, category: str = "general") -> List[Dict[str, Any]]:
        """Fetch trending products from Spocket API or simulate with enhanced stub."""
        self.logger.debug(f"Fetching products from Spocket API for category: {category}")

        try:
            # Check for Spocket API credentials
            api_key = os.getenv('SPOCKET_API_KEY')
            if not api_key:
                self.logger.warning("SPOCKET_API_KEY not found, using enhanced stub data")
                return await self._spocket_enhanced_stub(category=category)

            # Map categories to Spocket format
            category_mapping = {
                "electronics": "electronics",
                "home": "home-garden",
                "car": "automotive",
                "general": "trending"
            }
            spocket_category = category_mapping.get(category.lower(), category)

            # Real Spocket API implementation
            async with httpx.AsyncClient() as client:
                headers = {
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
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
                    },
                    timeout=30
                )

                if response.status_code == 200:
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
                            'image_url': item.get('images', [{}])[0].get('src'),
                            'supplier_name': item.get('supplier', {}).get('name'),
                            'shipping_time': item.get('shipping_time'),
                            'rating': item.get('rating', 0)
                        })

                    self.logger.info(f"Successfully fetched {len(products)} products from Spocket API for {category}")
                    return products
                else:
                    self.logger.error(f"Spocket API error: {response.status_code}")
                    return await self._spocket_enhanced_stub(category=category)

        except Exception as e:
            self.logger.error(f"Error fetching Spocket products: {e}")
            return await self._spocket_enhanced_stub(category=category)

    async def _autods_enhanced_stub(self, category: str = "general") -> List[Dict[str, Any]]:
        """Enhanced stub data for AutoDS products with category support."""
        await asyncio.sleep(0.2)  # Simulate API delay

        # Category-specific product templates
        products_by_category = {
            "electronics": [
                {
                    'id': 'autods_elec_001',
                    'title': 'Smart WiFi LED Strip Lights 10M RGB Remote Control',
                    'source': 'AutoDS',
                    'supplier_price': 12.50,
                    'suggested_price': 34.99,
                    'category': 'Electronics',
                    'trend_score': 89,
                    'image_url': 'https://example.com/led-strip.jpg',
                    'supplier_name': 'SmartHome Direct',
                    'shipping_time': '7-12 days',
                    'rating': 4.5
                },
                {
                    'id': 'autods_elec_002',
                    'title': 'Wireless Security Camera 1080P Night Vision',
                    'source': 'AutoDS',
                    'supplier_price': 22.00,
                    'suggested_price': 59.99,
                    'category': 'Electronics',
                    'trend_score': 92,
                    'image_url': 'https://example.com/security-cam.jpg',
                    'supplier_name': 'SecureVision Pro',
                    'shipping_time': '8-15 days',
                    'rating': 4.6
                },
                {
                    'id': 'autods_elec_003',
                    'title': 'Bluetooth Earbuds Wireless Charging Case',
                    'source': 'AutoDS',
                    'supplier_price': 15.75,
                    'suggested_price': 44.99,
                    'category': 'Electronics',
                    'trend_score': 87,
                    'image_url': 'https://example.com/earbuds.jpg',
                    'supplier_name': 'AudioTech Global',
                    'shipping_time': '10-18 days',
                    'rating': 4.3
                }
            ],
            "home": [
                {
                    'id': 'autods_home_001',
                    'title': 'Automatic Soap Dispenser Touchless Sensor',
                    'source': 'AutoDS',
                    'supplier_price': 8.50,
                    'suggested_price': 24.99,
                    'category': 'Home',
                    'trend_score': 85,
                    'image_url': 'https://example.com/soap-dispenser.jpg',
                    'supplier_name': 'HomeSmart Solutions',
                    'shipping_time': '5-10 days',
                    'rating': 4.4
                },
                {
                    'id': 'autods_home_002',
                    'title': 'Electric Spin Scrubber Cleaning Brush',
                    'source': 'AutoDS',
                    'supplier_price': 18.00,
                    'suggested_price': 49.99,
                    'category': 'Home',
                    'trend_score': 91,
                    'image_url': 'https://example.com/scrubber.jpg',
                    'supplier_name': 'CleanTech Pro',
                    'shipping_time': '7-14 days',
                    'rating': 4.7
                },
                {
                    'id': 'autods_home_003',
                    'title': 'Multi-Function Kitchen Vegetable Chopper',
                    'source': 'AutoDS',
                    'supplier_price': 11.25,
                    'suggested_price': 32.99,
                    'category': 'Home',
                    'trend_score': 83,
                    'image_url': 'https://example.com/chopper.jpg',
                    'supplier_name': 'KitchenPro Supplies',
                    'shipping_time': '8-16 days',
                    'rating': 4.2
                }
            ],
            "general": [
                {
                    'id': 'autods_gen_001',
                    'title': 'Portable Mini Blender USB Rechargeable',
                    'source': 'AutoDS',
                    'supplier_price': 14.00,
                    'suggested_price': 38.99,
                    'category': 'General',
                    'trend_score': 86,
                    'image_url': 'https://example.com/blender.jpg',
                    'supplier_name': 'HealthyLife Essentials',
                    'shipping_time': '9-15 days',
                    'rating': 4.3
                }
            ]
        }

        # Get products for the requested category or general
        stub_products = products_by_category.get(category.lower(), products_by_category["general"])

        self.logger.debug(f"Using enhanced stub data: {len(stub_products)} products from AutoDS for {category}")
        return stub_products

    async def _spocket_enhanced_stub(self, category: str = "general") -> List[Dict[str, Any]]:
        """Enhanced stub data for Spocket products with category support."""
        await asyncio.sleep(0.3)  # Simulate API delay

        # Category-specific product templates
        products_by_category = {
            "electronics": [
                {
                    'id': 'spocket_elec_001',
                    'title': 'USB C Hub Multi-Port Adapter HDMI 4K',
                    'source': 'Spocket',
                    'supplier_price': 16.50,
                    'suggested_price': 42.99,
                    'category': 'Electronics',
                    'trend_score': 90,
                    'image_url': 'https://example.com/usb-hub.jpg',
                    'supplier_name': 'TechConnect US',
                    'shipping_time': '3-5 days',
                    'rating': 4.6
                },
                {
                    'id': 'spocket_elec_002',
                    'title': 'Smart Watch Fitness Tracker Heart Rate Monitor',
                    'source': 'Spocket',
                    'supplier_price': 24.00,
                    'suggested_price': 69.99,
                    'category': 'Electronics',
                    'trend_score': 93,
                    'image_url': 'https://example.com/smartwatch.jpg',
                    'supplier_name': 'FitTech Direct',
                    'shipping_time': '4-7 days',
                    'rating': 4.5
                }
            ],
            "home": [
                {
                    'id': 'spocket_home_001',
                    'title': 'Bamboo Drawer Organizer Expandable Dividers',
                    'source': 'Spocket',
                    'supplier_price': 12.00,
                    'suggested_price': 29.99,
                    'category': 'Home',
                    'trend_score': 84,
                    'image_url': 'https://example.com/organizer.jpg',
                    'supplier_name': 'OrganizePro EU',
                    'shipping_time': '5-8 days',
                    'rating': 4.4
                },
                {
                    'id': 'spocket_home_002',
                    'title': 'Silicone Baking Mat Non-Stick Reusable Sheet',
                    'source': 'Spocket',
                    'supplier_price': 7.50,
                    'suggested_price': 19.99,
                    'category': 'Home',
                    'trend_score': 82,
                    'image_url': 'https://example.com/baking-mat.jpg',
                    'supplier_name': 'BakeWell Supplies',
                    'shipping_time': '6-10 days',
                    'rating': 4.3
                }
            ],
            "general": [
                {
                    'id': 'spocket_gen_001',
                    'title': 'Carbon Fiber Phone Holder Dashboard Mount',
                    'source': 'Spocket',
                    'supplier_price': 9.99,
                    'suggested_price': 22.99,
                    'category': 'General',
                    'trend_score': 88,
                    'image_url': 'https://example.com/carbon-holder.jpg',
                    'supplier_name': 'CarbonTech Solutions',
                    'shipping_time': '3-5 days',
                    'rating': 4.4
                }
            ]
        }

        # Get products for the requested category or general
        stub_products = products_by_category.get(category.lower(), products_by_category["general"])

        self.logger.debug(f"Using enhanced stub data: {len(stub_products)} products from Spocket for {category}")
        return stub_products

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
