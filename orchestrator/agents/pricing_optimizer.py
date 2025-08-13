"""Enhanced AI-powered pricing optimizer agent.

The ``PricingOptimizerAgent`` provides comprehensive pricing optimization with:
- Real-time competitor price monitoring with alerts
- AI-powered pricing recommendations based on market analysis
- Automated pricing rules engine with confidence thresholds
- Multi-channel alerting system (email, webhooks, dashboard)
- Historical price tracking and trend analysis

This enhanced version integrates advanced AI capabilities for intelligent
pricing decisions while maintaining safety through rule-based constraints
and manual approval workflows.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

import requests
from bs4 import BeautifulSoup

from orchestrator.core.agent_base import AgentBase
from orchestrator.services.ai_pricing_service import AIPricingService, PriceRecommendation, MarketAnalysis
from orchestrator.services.price_alert_system import PriceAlertSystem, AlertRule, PriceAlert
from orchestrator.services.pricing_rules_engine import (
    AutomatedPricingEngine, PricingRule, RuleAction, PriceChangeRequest
)


class PricingOptimizerAgent(AgentBase):
    """Enhanced AI-powered pricing optimizer agent."""

    def __init__(self, name: str = "pricing_optimizer") -> None:
        super().__init__(name)
        self.logger = logging.getLogger(self.name)
        self.price_adjustments: dict[str, float] = {}
        
        # Initialize AI services
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if openai_api_key:
            self.ai_service = AIPricingService(openai_api_key)
            self.logger.info("AI pricing service initialized")
        else:
            self.ai_service = None
            self.logger.warning("No OpenAI API key found, AI features disabled")
        
        # Initialize alert system
        alert_config = {
            'email_enabled': os.getenv("PRICE_ALERT_EMAIL_ENABLED", "false").lower() == "true",
            'webhook_enabled': os.getenv("PRICE_ALERT_WEBHOOK_ENABLED", "false").lower() == "true",
            'email': {
                'smtp_server': os.getenv("SMTP_SERVER"),
                'smtp_port': int(os.getenv("SMTP_PORT", "587")),
                'username': os.getenv("SMTP_USERNAME"),
                'password': os.getenv("SMTP_PASSWORD"),
                'from_address': os.getenv("PRICE_ALERT_FROM_EMAIL"),
                'to_address': os.getenv("PRICE_ALERT_TO_EMAIL")
            },
            'webhook': {
                'url': os.getenv("PRICE_ALERT_WEBHOOK_URL"),
                'headers': {}
            }
        }
        
        self.alert_system = PriceAlertSystem(alert_config)
        self._setup_default_alert_rules()
        
        # Initialize pricing rules engine
        if self.ai_service:
            self.pricing_engine = AutomatedPricingEngine(self.ai_service)
            self._setup_default_pricing_rules()
            
            # Register callbacks
            self.pricing_engine.add_price_update_callback(self._on_price_update)
            self.pricing_engine.add_approval_required_callback(self._on_approval_required)
        else:
            self.pricing_engine = None
        
        # Price history tracking
        self.price_history: Dict[str, List[Dict[str, Any]]] = {}
        self.last_competitor_prices: Dict[str, Dict[str, float]] = {}

    async def run(self) -> None:
        """Enhanced pricing optimization with AI and automated rules."""
        self.logger.info("Running enhanced pricing optimizer agent")
        
        try:
            # Fetch competitor prices
            loop = asyncio.get_event_loop()
            competitor_prices = await loop.run_in_executor(None, self._fetch_competitor_prices)
            self.logger.info(f"Fetched prices for {len(competitor_prices)} products")
            
            # Check for price alerts
            if competitor_prices:
                current_prices = {product: {"amazon": price} for product, price in competitor_prices.items()}
                alerts = await self.alert_system.check_price_changes(current_prices)
                if alerts:
                    self.logger.info(f"Triggered {len(alerts)} price alerts")
            
            # Fetch current Shopify prices
            shop_prices = await loop.run_in_executor(None, self._fetch_shop_prices)
            self.logger.info(f"Fetched Shopify prices for {len(shop_prices)} products")
            
            # Process each product with AI recommendations
            if competitor_prices and shop_prices:
                for product, competitor_price in competitor_prices.items():
                    current_price = shop_prices.get(product)
                    if current_price:
                        await self._process_product_pricing(
                            product, current_price, {"amazon": competitor_price}
                        )
            
            # Store current prices as history
            self._update_price_history(competitor_prices, shop_prices)
            self.last_competitor_prices = {product: {"amazon": price} for product, price in competitor_prices.items()}
            
            self.logger.info("Enhanced pricing optimization completed")
            
        except Exception as e:
            self.logger.error(f"Error in enhanced pricing optimization: {e}")
        
        # Update last run timestamp
        self._last_run = asyncio.get_event_loop().time()
    
    async def _process_product_pricing(
        self,
        product_id: str,
        current_price: float,
        competitor_prices: Dict[str, float]
    ) -> None:
        """Process pricing for a single product with AI recommendations."""
        try:
            if not self.ai_service or not self.pricing_engine:
                # Fallback to simple optimization
                avg_competitor_price = sum(competitor_prices.values()) / len(competitor_prices)
                new_price = self._optimize_price(current_price, avg_competitor_price)
                self.price_adjustments[product_id] = new_price
                await asyncio.get_event_loop().run_in_executor(
                    None, self._update_shop_price, product_id, new_price
                )
                return
            
            # Get historical prices for trend analysis
            historical_prices = self.price_history.get(product_id, [])
            
            # AI market analysis
            market_analysis = await self.ai_service.analyze_market_conditions(
                product_id, competitor_prices, historical_prices
            )
            
            # Generate AI recommendation
            business_objectives = {
                "primary_goal": os.getenv("PRICING_GOAL", "balanced_growth"),
                "min_margin": float(os.getenv("MIN_PROFIT_MARGIN", "0.15")),
                "max_discount": float(os.getenv("MAX_DISCOUNT", "0.30"))
            }
            
            recommendation = await self.ai_service.generate_pricing_recommendation(
                product_id, current_price, market_analysis, business_objectives
            )
            
            self.logger.info(f"AI recommendation for {product_id}: ${recommendation.recommended_price:.2f} (confidence: {recommendation.confidence:.2f})")
            
            # Process through automated rules engine
            business_context = {
                'category': self._get_product_category(product_id),
                'cost': self._get_product_cost(product_id),
                'inventory_level': self._get_inventory_level(product_id)
            }
            
            price_change_request = await self.pricing_engine.process_pricing_recommendation(
                product_id, current_price, recommendation, business_context
            )
            
            self.logger.info(f"Pricing request for {product_id}: {price_change_request.status}")
            
            # Store AI recommendation for future reference
            self.price_adjustments[product_id] = recommendation.recommended_price
            
        except Exception as e:
            self.logger.error(f"Error processing pricing for {product_id}: {e}")
    
    def _setup_default_alert_rules(self) -> None:
        """Setup default price alert rules."""
        # High priority alerts for significant price drops
        high_priority_rule = AlertRule(
            rule_id="high_priority_drops",
            product_ids=[],  # All products
            competitors=[],  # All competitors
            alert_types=["price_drop"],
            threshold=15.0,  # 15% drop
            cooldown_minutes=30,
            notification_channels=["email", "webhook"]
        )
        
        # Medium priority alerts for price increases
        medium_priority_rule = AlertRule(
            rule_id="price_increases",
            product_ids=[],
            competitors=[],
            alert_types=["price_increase"],
            threshold=10.0,  # 10% increase
            cooldown_minutes=60,
            notification_channels=["webhook"]
        )
        
        # General price monitoring
        general_monitoring = AlertRule(
            rule_id="general_monitoring",
            product_ids=[],
            competitors=[],
            alert_types=["significant_change"],
            threshold=8.0,  # 8% change in any direction
            cooldown_minutes=120,
            notification_channels=["dashboard"]
        )
        
        self.alert_system.add_alert_rule(high_priority_rule)
        self.alert_system.add_alert_rule(medium_priority_rule)
        self.alert_system.add_alert_rule(general_monitoring)
        
        self.logger.info("Default price alert rules configured")
    
    def _setup_default_pricing_rules(self) -> None:
        """Setup default automated pricing rules."""
        # High confidence automatic pricing
        high_confidence_rule = PricingRule(
            rule_id="high_confidence_auto",
            name="High Confidence Automatic Pricing",
            description="Automatically apply high confidence AI recommendations",
            min_confidence=0.85,
            max_price_increase=0.10,  # Max 10% increase
            max_price_decrease=0.20,  # Max 20% decrease
            max_changes_per_day=2,
            cooldown_hours=4,
            action=RuleAction.APPLY_IMMEDIATELY,
            min_profit_margin=0.15,
            priority=10
        )
        
        # Medium confidence with approval
        medium_confidence_rule = PricingRule(
            rule_id="medium_confidence_approval",
            name="Medium Confidence with Approval",
            description="Require approval for medium confidence recommendations",
            min_confidence=0.65,
            max_confidence=0.84,
            max_price_increase=0.15,
            max_price_decrease=0.25,
            max_changes_per_day=3,
            cooldown_hours=6,
            action=RuleAction.APPLY_WITH_APPROVAL,
            min_profit_margin=0.12,
            priority=20
        )
        
        # Low confidence notification only
        low_confidence_rule = PricingRule(
            rule_id="low_confidence_notify",
            name="Low Confidence Notifications",
            description="Notify only for low confidence recommendations",
            min_confidence=0.40,
            max_confidence=0.64,
            action=RuleAction.NOTIFY_ONLY,
            priority=30
        )
        
        self.pricing_engine.add_rule(high_confidence_rule)
        self.pricing_engine.add_rule(medium_confidence_rule)
        self.pricing_engine.add_rule(low_confidence_rule)
        
        self.logger.info("Default pricing rules configured")
    
    def _on_price_update(self, product_id: str, old_price: float, new_price: float) -> None:
        """Callback when a price is updated automatically."""
        self.logger.info(f"Price updated for {product_id}: ${old_price:.2f} → ${new_price:.2f}")
        
        # Update Shopify price
        try:
            self._update_shop_price(product_id, new_price)
        except Exception as e:
            self.logger.error(f"Failed to update Shopify price for {product_id}: {e}")
    
    def _on_approval_required(self, request: PriceChangeRequest) -> None:
        """Callback when manual approval is required."""
        self.logger.info(f"Manual approval required for {request.product_id}: ${request.current_price:.2f} → ${request.recommended_price:.2f}")
        
        # Here you could integrate with your approval system
        # For example, send notifications to administrators, create tickets, etc.
    
    def _update_price_history(
        self, 
        competitor_prices: Dict[str, float], 
        shop_prices: Dict[str, float]
    ) -> None:
        """Update price history for trend analysis."""
        timestamp = datetime.now()
        
        for product_id in set(competitor_prices.keys()) | set(shop_prices.keys()):
            if product_id not in self.price_history:
                self.price_history[product_id] = []
            
            price_point = {
                'timestamp': timestamp,
                'competitor_price': competitor_prices.get(product_id),
                'shop_price': shop_prices.get(product_id)
            }
            
            self.price_history[product_id].append(price_point)
            
            # Keep only last 100 data points per product
            if len(self.price_history[product_id]) > 100:
                self.price_history[product_id] = self.price_history[product_id][-100:]
    
    def _get_product_category(self, product_id: str) -> str:
        """Get product category for business rules."""
        # This would typically come from your product database
        category_map = {
            "dash_cam": "automotive",
            "car_vacuum": "automotive"
        }
        return category_map.get(product_id, "general")
    
    def _get_product_cost(self, product_id: str) -> float:
        """Get product cost for margin calculations."""
        # This would typically come from your inventory/cost system
        cost_map = {
            "dash_cam": 25.0,
            "car_vacuum": 15.0
        }
        return cost_map.get(product_id, 0.0)
    
    def _get_inventory_level(self, product_id: str) -> int:
        """Get current inventory level."""
        # This would typically come from your inventory system
        return 100  # Default inventory level
    
    # Enhanced API methods for external access
    async def get_ai_recommendation(self, product_id: str, current_price: float) -> Optional[PriceRecommendation]:
        """Get AI pricing recommendation for a product."""
        if not self.ai_service:
            return None
        
        competitor_prices = self.last_competitor_prices.get(product_id, {})
        if not competitor_prices:
            return None
        
        try:
            market_analysis = await self.ai_service.analyze_market_conditions(
                product_id, competitor_prices, self.price_history.get(product_id, [])
            )
            
            return await self.ai_service.generate_pricing_recommendation(
                product_id, current_price, market_analysis
            )
        except Exception as e:
            self.logger.error(f"Error getting AI recommendation for {product_id}: {e}")
            return None
    
    def get_pending_approvals(self) -> List[PriceChangeRequest]:
        """Get all pricing changes pending approval."""
        if not self.pricing_engine:
            return []
        return self.pricing_engine.get_pending_approvals()
    
    async def approve_price_change(self, request_id: str, approved: bool, approver: str = "admin") -> bool:
        """Approve or reject a pending price change."""
        if not self.pricing_engine:
            return False
        return await self.pricing_engine.approve_price_change(request_id, approved, approver)
    
    def get_alert_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get summary of recent price alerts."""
        return self.alert_system.get_alert_summary(hours)
    
    def get_pricing_history(self, product_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get pricing history for a product."""
        if self.pricing_engine:
            return self.pricing_engine.get_pricing_history(product_id, days)
        return []

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
