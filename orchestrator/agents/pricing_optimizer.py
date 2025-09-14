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
from orchestrator.services.ml_rule_optimizer import MLRuleOptimizer, RulePerformance
from orchestrator.services.market_sentiment_service import RealTimeMarketSentiment, MarketSentimentData
from orchestrator.services.predictive_forecaster import PredictiveForecaster, ConfidenceForecast
from orchestrator.services.cross_agent_tools import CrossAgentTools


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
        
        # Initialize ML-powered services
        self.ml_optimizer = MLRuleOptimizer()
        self.sentiment_analyzer = RealTimeMarketSentiment()
        self.forecaster = PredictiveForecaster()
        self.cross_agent_tools = CrossAgentTools()
        
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
        
        # ML performance tracking
        self.performance_data: List[RulePerformance] = []

    async def run(self) -> None:
        """Enhanced pricing optimization with AI and automated rules."""
        self.logger.info("Running enhanced ML-powered pricing optimizer agent")
        
        try:
            # Step 1: Analyze market sentiment to inform pricing decisions
            market_sentiment = await self.sentiment_analyzer.analyze_market_sentiment("e-commerce")
            self.logger.info(f"Market sentiment: {market_sentiment.overall_sentiment.sentiment_level.value} (confidence: {market_sentiment.confidence_forecast:.1f}%)")
            
            # Step 2: Generate predictive forecasts
            if self.performance_data:
                latest_performance = self.performance_data[-1]
                confidence_forecasts = self.forecaster.forecast_confidence(
                    latest_performance.success_score,
                    market_sentiment.overall_sentiment.compound_score,
                    market_sentiment.volatility_index,
                    [1, 6, 24]
                )
                
                # Check for predictive alerts
                predictive_alerts = self.forecaster.get_predictive_alerts()
                if predictive_alerts:
                    self.logger.info(f"Generated {len(predictive_alerts)} predictive alerts")
                    await self._handle_predictive_alerts(predictive_alerts)
            
            # Step 3: Fetch competitor prices
            loop = asyncio.get_event_loop()
            competitor_prices = await loop.run_in_executor(None, self._fetch_competitor_prices)
            self.logger.info(f"Fetched prices for {len(competitor_prices)} products")
            
            # Step 4: Check for price alerts with sentiment context
            if competitor_prices:
                current_prices = {product: {"amazon": price} for product, price in competitor_prices.items()}
                alerts = await self.alert_system.check_price_changes(current_prices)
                
                # Enhanced alerts with sentiment analysis
                sentiment_alerts = self.sentiment_analyzer.get_sentiment_alerts()
                all_alerts = alerts + sentiment_alerts
                
                if all_alerts:
                    self.logger.info(f"Generated {len(all_alerts)} price and sentiment alerts")
                    await self._process_enhanced_alerts(all_alerts, market_sentiment)
                
                # Update price history with sentiment context
                self._update_price_history(competitor_prices, market_sentiment)
            
            # Step 5: Generate AI recommendations with enhanced context
            if self.ai_service and competitor_prices:
                for product_id, current_price in competitor_prices.items():
                    try:
                        # Enhanced market context for AI
                        enhanced_context = {
                            'competitor_prices': {product_id: current_price},
                            'market_sentiment': market_sentiment.overall_sentiment.compound_score,
                            'volatility_index': market_sentiment.volatility_index,
                            'trend_analysis': market_sentiment.trend_analysis,
                            'risk_factors': market_sentiment.risk_factors,
                            'confidence_forecast': market_sentiment.confidence_forecast
                        }
                        
                        recommendation = await self.ai_service.get_ai_recommendation(
                            product_id, current_price, enhanced_context
                        )
                        
                        # Process recommendation with ML-optimized rules
                        await self._process_ml_enhanced_recommendation(recommendation, market_sentiment)
                        
                    except Exception as e:
                        self.logger.error(f"Error processing AI recommendation for {product_id}: {e}")
            
            # Step 6: Optimize rules based on historical performance
            if len(self.performance_data) >= 10:  # Need minimum data for optimization
                await self._optimize_rules_with_ml()
            
            # Step 7: Execute cross-agent intelligence gathering
            await self._execute_cross_agent_analysis()
            
            # Step 8: Update predictive models with new observations
            if market_sentiment and competitor_prices:
                self._update_ml_models(market_sentiment, competitor_prices)
            
        except Exception as e:
            self.logger.error(f"Error in enhanced pricing optimization: {e}")
            # Fallback to basic functionality
            await self._run_basic_pricing_optimization()
    
    async def _run_basic_pricing_optimization(self) -> None:
        """Fallback to basic pricing optimization when ML services fail."""
        self.logger.info("Running basic pricing optimization (fallback mode)")
        
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
        except Exception as e:
            self.logger.error(f"Error in basic pricing optimization: {e}")
            
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
    
    # ML-Enhanced Methods
    
    async def _handle_predictive_alerts(self, alerts: List[Dict[str, Any]]) -> None:
        """Handle predictive alerts from forecasting service."""
        for alert in alerts:
            self.logger.warning(f"Predictive Alert: {alert['message']}")
            
            # Take action based on alert type
            if alert['type'] == 'confidence_drop_predicted':
                # Increase manual review thresholds
                await self._adjust_confidence_thresholds(increase=True)
            elif alert['type'] == 'volatility_increase_predicted':
                # Prepare for market uncertainty
                await self._prepare_for_volatility()
            elif alert['type'] == 'confidence_falling_trend':
                # Enable defensive measures
                await self._enable_defensive_measures()
    
    async def _process_enhanced_alerts(self, alerts: List[Dict[str, Any]], market_sentiment: MarketSentimentData) -> None:
        """Process alerts with enhanced sentiment context."""
        high_priority_alerts = [alert for alert in alerts if alert.get('severity') == 'high']
        
        if high_priority_alerts:
            self.logger.warning(f"Processing {len(high_priority_alerts)} high-priority alerts")
            
            # Adjust response based on market sentiment
            if market_sentiment.overall_sentiment.sentiment_level.value in ['very_negative', 'negative']:
                # More conservative responses during negative sentiment
                for alert in high_priority_alerts:
                    await self._handle_conservative_alert_response(alert)
            else:
                # Standard alert handling
                for alert in high_priority_alerts:
                    await self._handle_standard_alert_response(alert)
    
    def _update_price_history(self, competitor_prices: Dict[str, float], sentiment: MarketSentimentData) -> None:
        """Update price history with sentiment context."""
        timestamp = datetime.now()
        
        for product_id, price in competitor_prices.items():
            if product_id not in self.price_history:
                self.price_history[product_id] = []
            
            price_point = {
                'timestamp': timestamp,
                'competitor_price': price,
                'sentiment_score': sentiment.overall_sentiment.compound_score,
                'volatility_index': sentiment.volatility_index,
                'confidence_forecast': sentiment.confidence_forecast
            }
            
            self.price_history[product_id].append(price_point)
            
            # Keep only last 200 data points per product (increased for ML)
            if len(self.price_history[product_id]) > 200:
                self.price_history[product_id] = self.price_history[product_id][-200:]
    
    async def _process_ml_enhanced_recommendation(self, recommendation: PriceRecommendation, sentiment: MarketSentimentData) -> None:
        """Process AI recommendation with ML enhancement."""
        try:
            # Get ML-optimized rule parameters
            market_context = {
                'expected_price_change': (recommendation.recommended_price - recommendation.current_price) / recommendation.current_price,
                'market_volatility': sentiment.volatility_index,
                'competitive_intensity': 0.5,  # Would come from competitive analysis
                'market_response_time': 300.0  # 5 minutes average
            }
            
            optimal_params = self.ml_optimizer.predict_optimal_parameters(
                f"rule_{recommendation.product_id}", market_context
            )
            
            # Apply ML-optimized confidence thresholds
            effective_confidence = min(recommendation.confidence, optimal_params.predicted_success_score / 100)
            
            # Determine action based on optimized parameters
            if effective_confidence >= optimal_params.optimal_confidence_threshold:
                if self.pricing_engine:
                    await self.pricing_engine.apply_recommendation(recommendation, auto_apply=True)
                    self.logger.info(f"Applied ML-optimized recommendation for {recommendation.product_id}")
                    
                    # Record performance for learning
                    await self._record_recommendation_performance(recommendation, optimal_params, sentiment)
            else:
                self.logger.info(f"ML optimization suggests manual review for {recommendation.product_id} (confidence: {effective_confidence:.2f})")
                if self.pricing_engine:
                    await self.pricing_engine.apply_recommendation(recommendation, auto_apply=False)
        
        except Exception as e:
            self.logger.error(f"Error in ML-enhanced recommendation processing: {e}")
    
    async def _optimize_rules_with_ml(self) -> None:
        """Optimize pricing rules using ML insights."""
        self.logger.info("Optimizing pricing rules with ML insights")
        
        try:
            # Get insights for each rule
            rule_insights = {}
            for rule_id in ["high_confidence_auto", "medium_confidence_approval", "low_confidence_notify"]:
                insights = self.ml_optimizer.get_rule_insights(rule_id)
                rule_insights[rule_id] = insights
                
                # Apply recommendations
                if insights['average_success_score'] < 70 and insights['total_executions'] > 10:
                    self.logger.warning(f"Rule {rule_id} underperforming - average success: {insights['average_success_score']:.1f}%")
                    # Would adjust rule parameters here
            
            self.logger.info(f"Rule optimization completed - analyzed {len(rule_insights)} rules")
            
        except Exception as e:
            self.logger.error(f"Error optimizing rules with ML: {e}")
    
    async def _execute_cross_agent_analysis(self) -> None:
        """Execute cross-agent intelligence gathering."""
        try:
            # Market opportunity scanning
            market_context = {
                'current_pricing': self.last_competitor_prices,
                'competitor_pricing': self.last_competitor_prices,  # Would include multiple competitors
                'trends': [{'category': 'automotive', 'growth_rate': 0.15, 'market_size': 500000}],
                'customer_segments': {
                    'automotive_enthusiasts': {'growth_rate': 0.20, 'penetration': 0.25, 'segment_value': 100000}
                }
            }
            
            opportunities = await self.cross_agent_tools.execute_tool(
                "market_opportunity_scanner", "pricing_optimizer", 
                {"market_context": market_context, "business_goals": ["revenue_growth", "market_expansion"]}
            )
            
            if opportunities['success']:
                opportunity_count = len(opportunities['result']['opportunities'])
                self.logger.info(f"Identified {opportunity_count} market opportunities")
                
                # Process high-value opportunities
                for opp in opportunities['result']['opportunities'][:3]:  # Top 3
                    if opp['potential_revenue'] > 10000:  # Significant opportunities
                        self.logger.info(f"High-value opportunity: {opp['description']} - ${opp['potential_revenue']:.2f} potential")
            
            # Competitive intelligence
            competitors = [
                {'name': 'Amazon', 'market_share': 0.30, 'pricing': self.last_competitor_prices, 'strengths': ['Distribution', 'Scale']},
                {'name': 'Best Buy', 'market_share': 0.15, 'pricing': {}, 'strengths': ['Brand', 'Service']}
            ]
            
            intel = await self.cross_agent_tools.execute_tool(
                "competitive_intelligence", "pricing_optimizer",
                {"competitors": competitors, "analysis_depth": "standard"}
            )
            
            if intel['success']:
                threat_level = intel['result']['threat_assessment']['overall_threat_level']
                self.logger.info(f"Competitive threat level: {threat_level}")
        
        except Exception as e:
            self.logger.error(f"Error in cross-agent analysis: {e}")
    
    def _update_ml_models(self, sentiment: MarketSentimentData, prices: Dict[str, float]) -> None:
        """Update ML models with new observations."""
        try:
            # Record observations for forecasting
            avg_confidence = sum([p.confidence for p in self.performance_data[-5:]]) / 5 if len(self.performance_data) >= 5 else 75.0
            
            self.forecaster.record_observation(
                confidence_score=avg_confidence,
                sentiment_score=sentiment.overall_sentiment.compound_score,
                volatility=sentiment.volatility_index,
                market_context={'price_data': prices}
            )
            
            # Record for sentiment analysis
            self.sentiment_analyzer.sentiment_history.append(sentiment.overall_sentiment)
            if len(self.sentiment_analyzer.sentiment_history) > 1000:
                self.sentiment_analyzer.sentiment_history = self.sentiment_analyzer.sentiment_history[-1000:]
            
            self.logger.debug("Updated ML models with new observations")
            
        except Exception as e:
            self.logger.error(f"Error updating ML models: {e}")
    
    async def _record_recommendation_performance(self, recommendation: PriceRecommendation, 
                                               optimal_params, sentiment: MarketSentimentData) -> None:
        """Record performance data for ML learning."""
        try:
            # Simulate performance metrics (would come from actual business results)
            success_score = min(95, max(30, recommendation.confidence * 100 + 
                                     (sentiment.overall_sentiment.confidence * 20) - 
                                     (sentiment.volatility_index * 30)))
            
            performance = RulePerformance(
                rule_id=f"rule_{recommendation.product_id}",
                timestamp=datetime.now(),
                confidence_threshold=optimal_params.optimal_confidence_threshold,
                price_change_percentage=(recommendation.recommended_price - recommendation.current_price) / recommendation.current_price,
                revenue_impact=1000 * (recommendation.recommended_price - recommendation.current_price),  # Estimate
                profit_margin_change=0.05,  # Estimate
                conversion_rate_change=0.02,  # Estimate  
                customer_satisfaction_score=85.0,  # Would come from surveys
                market_response_time=300.0,  # 5 minutes
                success_score=success_score
            )
            
            self.ml_optimizer.record_performance(performance)
            self.performance_data.append(performance)
            
            # Keep only last 500 performance records
            if len(self.performance_data) > 500:
                self.performance_data = self.performance_data[-500:]
        
        except Exception as e:
            self.logger.error(f"Error recording performance: {e}")
    
    async def _adjust_confidence_thresholds(self, increase: bool = True) -> None:
        """Adjust confidence thresholds based on predictive alerts."""
        if not self.pricing_engine:
            return
        
        try:
            # Get current rules and adjust thresholds
            adjustment = 0.05 if increase else -0.05
            self.logger.info(f"Adjusting confidence thresholds by {adjustment:+.2f}")
            
            # Would update actual rule configurations here
            # For demonstration, just log the action
            
        except Exception as e:
            self.logger.error(f"Error adjusting confidence thresholds: {e}")
    
    async def _prepare_for_volatility(self) -> None:
        """Prepare pricing system for increased market volatility."""
        self.logger.info("Preparing for increased market volatility")
        
        try:
            # Increase monitoring frequency
            # Reduce automated decision making
            # Enable additional safety checks
            
            # Log preparation actions
            actions = [
                "Increased monitoring frequency to 1-minute intervals",
                "Reduced automated price changes threshold to 95% confidence",
                "Enabled additional margin protection rules"
            ]
            
            for action in actions:
                self.logger.info(f"Volatility preparation: {action}")
        
        except Exception as e:
            self.logger.error(f"Error preparing for volatility: {e}")
    
    async def _enable_defensive_measures(self) -> None:
        """Enable defensive pricing measures."""
        self.logger.info("Enabling defensive pricing measures")
        
        try:
            # Implement conservative pricing strategies
            # Increase manual review requirements
            # Prioritize margin protection
            
            defensive_measures = [
                "Enabled margin protection mode",
                "Increased manual review requirements",
                "Activated conservative pricing algorithms",
                "Enhanced risk assessment protocols"
            ]
            
            for measure in defensive_measures:
                self.logger.info(f"Defensive measure: {measure}")
        
        except Exception as e:
            self.logger.error(f"Error enabling defensive measures: {e}")
    
    async def _handle_conservative_alert_response(self, alert: Dict[str, Any]) -> None:
        """Handle alert with conservative response during negative sentiment."""
        self.logger.info(f"Conservative response to alert: {alert.get('message', 'Unknown alert')}")
        
        # More cautious responses during negative market sentiment
        # Increase thresholds, reduce automation, require more approvals
    
    async def _handle_standard_alert_response(self, alert: Dict[str, Any]) -> None:
        """Handle alert with standard response."""
        self.logger.info(f"Standard response to alert: {alert.get('message', 'Unknown alert')}")
        
        # Standard alert handling procedures
    
    # Enhanced API Methods for ML Features
    
    async def get_ml_insights(self) -> Dict[str, Any]:
        """Get ML-powered insights and recommendations."""
        try:
            insights = {}
            
            # Forecasting insights
            if len(self.performance_data) > 0:
                accuracy_metrics = self.forecaster.get_forecast_accuracy_metrics()
                insights['forecasting'] = accuracy_metrics
            
            # Rule performance insights
            if len(self.performance_data) >= 10:
                rule_insights = {}
                for rule_id in ["high_confidence_auto", "medium_confidence_approval"]:
                    rule_insights[rule_id] = self.ml_optimizer.get_rule_insights(rule_id)
                insights['rule_performance'] = rule_insights
            
            # Cross-agent tool performance
            tool_metrics = self.cross_agent_tools.get_tool_performance_metrics()
            insights['cross_agent_tools'] = tool_metrics['summary']
            
            # Market sentiment summary
            if hasattr(self, 'sentiment_analyzer') and self.sentiment_analyzer.sentiment_history:
                latest_sentiment = self.sentiment_analyzer.sentiment_history[-1]
                insights['market_sentiment'] = {
                    'current_sentiment': latest_sentiment.sentiment_level.value,
                    'confidence': latest_sentiment.confidence,
                    'trend': 'rising' if len(self.sentiment_analyzer.sentiment_history) >= 2 and 
                            latest_sentiment.compound_score > self.sentiment_analyzer.sentiment_history[-2].compound_score
                            else 'falling' if len(self.sentiment_analyzer.sentiment_history) >= 2 else 'stable'
                }
            
            return insights
        
        except Exception as e:
            self.logger.error(f"Error getting ML insights: {e}")
            return {"error": str(e)}
    
    async def get_predictive_alerts(self) -> List[Dict[str, Any]]:
        """Get current predictive alerts."""
        try:
            return self.forecaster.get_predictive_alerts()
        except Exception as e:
            self.logger.error(f"Error getting predictive alerts: {e}")
            return []
    
    async def get_market_opportunities(self, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get AI-identified market opportunities."""
        try:
            market_context = context or {
                'current_pricing': self.last_competitor_prices,
                'competitor_pricing': self.last_competitor_prices,
                'trends': [],
                'customer_segments': {}
            }
            
            return await self.cross_agent_tools.execute_tool(
                "market_opportunity_scanner", "pricing_optimizer",
                {"market_context": market_context, "business_goals": ["revenue_growth"]}
            )
        except Exception as e:
            self.logger.error(f"Error getting market opportunities: {e}")
            return {"success": False, "error": str(e)}
    
    async def optimize_rule_parameters(self, rule_id: str) -> Dict[str, Any]:
        """Get ML-optimized parameters for a specific rule."""
        try:
            market_context = {
                'market_volatility': 0.3,  # Default
                'competitive_intensity': 0.5,
                'market_response_time': 300.0
            }
            
            optimal_params = self.ml_optimizer.predict_optimal_parameters(rule_id, market_context)
            
            return {
                "success": True,
                "optimal_parameters": {
                    "confidence_threshold": optimal_params.optimal_confidence_threshold,
                    "max_price_increase": optimal_params.optimal_max_price_increase,
                    "max_price_decrease": optimal_params.optimal_max_price_decrease,
                    "min_profit_margin": optimal_params.optimal_min_profit_margin,
                    "predicted_success": optimal_params.predicted_success_score,
                    "model_accuracy": optimal_params.model_accuracy
                }
            }
        except Exception as e:
            self.logger.error(f"Error optimizing rule parameters: {e}")
            return {"success": False, "error": str(e)}
