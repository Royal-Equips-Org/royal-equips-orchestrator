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
import time
from typing import Any, Dict, List

from orchestrator.core.agent_base import AgentBase


class ProductResearchAgent(AgentBase):
    """Fetches trending products from AutoDS and Spocket APIs."""

    def __init__(self, name: str = "product_research") -> None:
        super().__init__(name)
        self.logger = logging.getLogger(self.name)
        self.trending_products: List[Dict[str, Any]] = []

    async def run(self) -> None:
        """Run the product research agent to fetch trending products."""
        self.logger.info("Running product research agent")
        
        try:
            # Fetch trending products from both sources
            autods_products = await self._fetch_autods_products()
            spocket_products = await self._fetch_spocket_products()
            
            # Combine and process results
            all_products = autods_products + spocket_products
            self.trending_products = self._process_products(all_products)
            
            self.logger.info(
                "Found %d trending products (%d from AutoDS, %d from Spocket)",
                len(self.trending_products),
                len(autods_products),
                len(spocket_products)
            )
            
            # Log sample products for debugging
            for i, product in enumerate(self.trending_products[:3]):
                self.logger.info(
                    "Sample product %d: %s - $%.2f (margin: %.1f%%)",
                    i + 1,
                    product['title'],
                    product['price'],
                    product['margin_percent']
                )
            
            # Update last run timestamp
            self._last_run = asyncio.get_event_loop().time()
            
        except Exception as e:
            self.logger.error("Error in product research run: %s", e)
            raise

    async def _fetch_autods_products(self) -> List[Dict[str, Any]]:
        """Stub function to fetch trending products from AutoDS API."""
        self.logger.debug("Fetching products from AutoDS API")
        
        # Simulate API call delay
        await asyncio.sleep(0.5)
        
        # Stub data - replace with actual AutoDS API call
        stub_products = [
            {
                'id': 'autods_001',
                'title': 'Wireless Car Charger Mount',
                'source': 'AutoDS',
                'supplier_price': 12.50,
                'suggested_price': 24.99,
                'category': 'Car Electronics',
                'trend_score': 85
            },
            {
                'id': 'autods_002', 
                'title': 'LED Dashboard Lights Kit',
                'source': 'AutoDS',
                'supplier_price': 8.75,
                'suggested_price': 19.99,
                'category': 'Car Accessories',
                'trend_score': 92
            },
            {
                'id': 'autods_003',
                'title': 'Bluetooth OBD2 Scanner',
                'source': 'AutoDS', 
                'supplier_price': 15.30,
                'suggested_price': 34.99,
                'category': 'Car Electronics',
                'trend_score': 78
            }
        ]
        
        self.logger.debug("Retrieved %d products from AutoDS", len(stub_products))
        return stub_products

    async def _fetch_spocket_products(self) -> List[Dict[str, Any]]:
        """Stub function to fetch trending products from Spocket API.""" 
        self.logger.debug("Fetching products from Spocket API")
        
        # Simulate API call delay
        await asyncio.sleep(0.3)
        
        # Stub data - replace with actual Spocket API call
        stub_products = [
            {
                'id': 'spocket_001',
                'title': 'Carbon Fiber Phone Holder',
                'source': 'Spocket',
                'supplier_price': 9.99,
                'suggested_price': 22.99,
                'category': 'Car Accessories',
                'trend_score': 88
            },
            {
                'id': 'spocket_002',
                'title': 'Solar Powered Car Ventilator',
                'source': 'Spocket',
                'supplier_price': 18.45,
                'suggested_price': 39.99,
                'category': 'Car Electronics',
                'trend_score': 91
            }
        ]
        
        self.logger.debug("Retrieved %d products from Spocket", len(stub_products))
        return stub_products

    def _process_products(self, products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process and enrich product data with calculated margins."""
        processed = []
        
        for product in products:
            # Calculate margin
            supplier_price = product['supplier_price']
            suggested_price = product['suggested_price']
            margin = suggested_price - supplier_price
            margin_percent = (margin / suggested_price) * 100
            
            # Enrich product data
            enriched_product = {
                **product,
                'price': suggested_price,
                'cost': supplier_price,
                'margin': margin,
                'margin_percent': margin_percent,
                'processed_at': time.time()
            }
            
            processed.append(enriched_product)
        
        # Sort by trend score (highest first)
        processed.sort(key=lambda x: x['trend_score'], reverse=True)
        
        return processed

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
