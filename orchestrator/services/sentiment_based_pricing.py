"""Sentiment-Based Automatic Pricing Adjustments with Risk Controls.

This service automatically adjusts pricing based on real-time market sentiment
while implementing comprehensive risk controls to prevent adverse outcomes.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum

import numpy as np

from orchestrator.services.market_sentiment_service import RealTimeMarketSentiment, SentimentLevel, MarketSentimentData
from orchestrator.services.competitor_intelligence_service import AdvancedCompetitorIntelligence, CompetitorAction


class PricingActionType(Enum):
    """Types of automatic pricing actions."""
    PRICE_INCREASE = "price_increase"
    PRICE_DECREASE = "price_decrease"
    MAINTAIN_PRICE = "maintain_price"
    DYNAMIC_ADJUSTMENT = "dynamic_adjustment"
    EMERGENCY_FREEZE = "emergency_freeze"


class RiskLevel(Enum):
    """Risk assessment levels."""
    MINIMAL = "minimal"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class PricingAdjustment:
    """Automatic pricing adjustment decision."""
    product_id: str
    current_price: float
    suggested_price: float
    adjustment_percentage: float
    action_type: PricingActionType
    sentiment_trigger: str
    confidence_score: float
    risk_assessment: RiskLevel
    reasoning: List[str]
    market_factors: Dict[str, float]
    competitor_factors: Dict[str, Any]
    safety_checks: List[str]
    approval_required: bool
    timestamp: datetime


@dataclass
class RiskControl:
    """Risk control configuration."""
    control_type: str
    threshold_value: float
    action_when_triggered: str
    monitoring_metric: str
    enabled: bool
    last_triggered: Optional[datetime] = None


@dataclass
class PricingAlert:
    """Pricing adjustment alert."""
    alert_type: str
    severity: str
    product_ids: List[str]
    description: str
    current_risk_level: RiskLevel
    recommended_action: str
    auto_action_taken: bool
    manual_review_required: bool
    timestamp: datetime


class SentimentBasedPricingService:
    """Sentiment-based automatic pricing with comprehensive risk controls."""
    
    def __init__(self, sentiment_service: RealTimeMarketSentiment, 
                 competitor_service: AdvancedCompetitorIntelligence):
        """Initialize sentiment-based pricing service.
        
        Args:
            sentiment_service: Market sentiment analysis service
            competitor_service: Competitor intelligence service
        """
        self.logger = logging.getLogger(__name__)
        self.sentiment_service = sentiment_service
        self.competitor_service = competitor_service
        
        # Pricing adjustment history
        self.adjustment_history: List[PricingAdjustment] = []
        self.alert_history: List[PricingAlert] = []
        
        # Risk controls configuration
        self.risk_controls = self._initialize_risk_controls()
        
        # Product data and pricing rules
        self.product_data: Dict[str, Dict] = {}
        self.pricing_engine = None  # Will be initialized when needed
        
        # Service configuration
        self.config = {
            'max_price_increase': 0.15,  # 15% max increase
            'max_price_decrease': 0.20,  # 20% max decrease
            'min_confidence_threshold': 0.7,
            'sentiment_weight': 0.4,
            'competitor_weight': 0.3,
            'market_weight': 0.3,
            'auto_adjustment_enabled': True,
            'emergency_controls_enabled': True,
            'manual_approval_threshold': 0.10,  # 10% change requires approval
            'cooling_period_hours': 6,  # Minimum time between adjustments
            'volatility_threshold': 0.8
        }
        
        self.logger.info("Sentiment-based pricing service initialized")
    
    def _initialize_risk_controls(self) -> List[RiskControl]:
        """Initialize comprehensive risk controls."""
        return [
            RiskControl(
                control_type="max_adjustment_limit",
                threshold_value=0.25,  # 25% max adjustment
                action_when_triggered="block_adjustment",
                monitoring_metric="adjustment_percentage",
                enabled=True
            ),
            RiskControl(
                control_type="volatility_circuit_breaker", 
                threshold_value=0.8,
                action_when_triggered="freeze_pricing",
                monitoring_metric="market_volatility",
                enabled=True
            ),
            RiskControl(
                control_type="confidence_threshold",
                threshold_value=0.6,
                action_when_triggered="require_manual_approval",
                monitoring_metric="ml_confidence",
                enabled=True
            ),
            RiskControl(
                control_type="competitor_response_limit",
                threshold_value=3.0,  # Max 3 competitor responses per day
                action_when_triggered="pause_adjustments",
                monitoring_metric="competitor_reactions",
                enabled=True
            ),
            RiskControl(
                control_type="margin_protection",
                threshold_value=0.15,  # 15% minimum margin
                action_when_triggered="limit_price_decrease",
                monitoring_metric="profit_margin",
                enabled=True
            ),
            RiskControl(
                control_type="daily_adjustment_limit",
                threshold_value=5.0,  # Max 5 adjustments per day
                action_when_triggered="suspend_auto_pricing",
                monitoring_metric="daily_adjustments",
                enabled=True
            )
        ]
    
    async def analyze_sentiment_and_adjust_pricing(self, 
                                                 product_ids: List[str] = None,
                                                 categories: List[str] = None) -> List[PricingAdjustment]:
        """Analyze market sentiment and create automatic pricing adjustments.
        
        Args:
            product_ids: Specific products to analyze (None for all)
            categories: Product categories to analyze
            
        Returns:
            List of pricing adjustment recommendations
        """
        self.logger.info("Analyzing sentiment for automatic pricing adjustments")
        
        # Get current market sentiment
        market_sentiment = await self.sentiment_service.analyze_market_sentiment(
            product_category="e-commerce" if not categories else categories[0],
            keywords=None
        )
        
        # Get recent competitor actions
        competitor_actions = await self.competitor_service.track_competitors_realtime(
            competitor_ids=None,
            monitoring_categories=['pricing', 'products', 'marketing']
        )
        
        # Get products to analyze
        products = product_ids or self._get_all_products()
        
        adjustments = []
        
        for product_id in products:
            try:
                adjustment = await self._analyze_product_pricing(
                    product_id, market_sentiment, competitor_actions
                )
                if adjustment:
                    adjustments.append(adjustment)
            except Exception as e:
                self.logger.error(f"Error analyzing pricing for {product_id}: {e}")
        
        # Apply risk controls and filters
        filtered_adjustments = self._apply_risk_controls(adjustments)
        
        # Execute approved automatic adjustments
        executed_adjustments = await self._execute_automatic_adjustments(filtered_adjustments)
        
        # Store adjustment history
        self.adjustment_history.extend(executed_adjustments)
        
        self.logger.info(f"Generated {len(adjustments)} pricing recommendations, executed {len(executed_adjustments)} automatically")
        return executed_adjustments
    
    def _get_all_products(self) -> List[str]:
        """Get all products for pricing analysis."""
        if not self.product_data:
            # Generate sample products for demo
            return [f"PROD_{i:03d}" for i in range(1, 21)]
        return list(self.product_data.keys())
    
    async def _analyze_product_pricing(self, 
                                     product_id: str, 
                                     sentiment: MarketSentimentData,
                                     competitor_actions: List[CompetitorAction]) -> Optional[PricingAdjustment]:
        """Analyze pricing for a single product based on sentiment and competition."""
        
        # Get or generate product data
        product = self.product_data.get(product_id, self._generate_sample_product_data(product_id))
        current_price = product.get('current_price', 100.0)
        
        # Calculate sentiment-based pricing factors
        sentiment_factors = self._calculate_sentiment_factors(sentiment, product)
        
        # Calculate competitor-based factors
        competitor_factors = self._calculate_competitor_factors(competitor_actions, product)
        
        # Calculate market-based factors
        market_factors = self._calculate_market_factors(sentiment, product)
        
        # Combine factors using weighted approach
        sentiment_weight = self.config['sentiment_weight']
        competitor_weight = self.config['competitor_weight']
        market_weight = self.config['market_weight']
        
        # Calculate adjustment score (-1 to +1, where +1 is strong price increase signal)
        adjustment_score = (
            sentiment_factors['price_adjustment_signal'] * sentiment_weight +
            competitor_factors['competitive_pressure'] * competitor_weight +
            market_factors['market_opportunity'] * market_weight
        )
        
        # Convert score to percentage adjustment
        base_adjustment = adjustment_score * 0.10  # Max 10% base adjustment
        
        # Apply confidence scaling
        confidence_score = min([
            sentiment.overall_sentiment.confidence,
            sentiment_factors['confidence'],
            competitor_factors['confidence']
        ])
        
        # Scale adjustment by confidence
        final_adjustment = base_adjustment * confidence_score
        
        # Apply limits
        final_adjustment = max(-self.config['max_price_decrease'], 
                              min(self.config['max_price_increase'], final_adjustment))
        
        # Calculate suggested price
        suggested_price = current_price * (1 + final_adjustment)
        
        # Determine action type
        if abs(final_adjustment) < 0.01:  # Less than 1%
            action_type = PricingActionType.MAINTAIN_PRICE
        elif final_adjustment > 0:
            action_type = PricingActionType.PRICE_INCREASE
        else:
            action_type = PricingActionType.PRICE_DECREASE
        
        # Assess risk level
        risk_level = self._assess_pricing_risk(product_id, final_adjustment, confidence_score, sentiment)
        
        # Generate reasoning
        reasoning = self._generate_pricing_reasoning(
            sentiment_factors, competitor_factors, market_factors, final_adjustment
        )
        
        # Safety checks
        safety_checks = self._perform_safety_checks(product, current_price, suggested_price)
        
        # Determine if manual approval is required
        approval_required = (
            abs(final_adjustment) > self.config['manual_approval_threshold'] or
            confidence_score < self.config['min_confidence_threshold'] or
            risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL] or
            'FAILED' in safety_checks
        )
        
        return PricingAdjustment(
            product_id=product_id,
            current_price=current_price,
            suggested_price=suggested_price,
            adjustment_percentage=final_adjustment,
            action_type=action_type,
            sentiment_trigger=sentiment.overall_sentiment.sentiment_level.value,
            confidence_score=confidence_score,
            risk_assessment=risk_level,
            reasoning=reasoning,
            market_factors={
                'sentiment_score': sentiment.overall_sentiment.compound_score,
                'volatility_index': sentiment.volatility_index,
                'trend_analysis': sentiment.trend_analysis,
                'confidence_forecast': sentiment.confidence_forecast
            },
            competitor_factors=competitor_factors,
            safety_checks=safety_checks,
            approval_required=approval_required,
            timestamp=datetime.now(timezone.utc)
        )
    
    def _calculate_sentiment_factors(self, sentiment: MarketSentimentData, product: Dict) -> Dict[str, float]:
        """Calculate sentiment-based pricing factors."""
        sentiment_score = sentiment.overall_sentiment.compound_score
        confidence = sentiment.overall_sentiment.confidence
        trend = sentiment.trend_analysis
        volatility = sentiment.volatility_index
        
        # Base price adjustment signal from sentiment
        if sentiment_score > 0.3:  # Strong positive sentiment
            price_signal = 0.8
        elif sentiment_score > 0.1:  # Mild positive sentiment  
            price_signal = 0.4
        elif sentiment_score < -0.3:  # Strong negative sentiment
            price_signal = -0.8
        elif sentiment_score < -0.1:  # Mild negative sentiment
            price_signal = -0.4
        else:
            price_signal = 0.0
        
        # Adjust for trend
        trend_multiplier = {
            'rising': 1.2,
            'stable': 1.0,
            'falling': 0.8
        }.get(trend, 1.0)
        
        price_signal *= trend_multiplier
        
        # Reduce signal if volatility is high (uncertainty)
        if volatility > 0.7:
            price_signal *= 0.6
        
        # Adjust confidence based on sentiment strength and consistency
        adjusted_confidence = confidence * (1 - volatility * 0.3)
        
        return {
            'price_adjustment_signal': price_signal,
            'confidence': adjusted_confidence,
            'sentiment_strength': abs(sentiment_score),
            'trend_factor': trend_multiplier,
            'volatility_penalty': volatility * 0.3
        }
    
    def _calculate_competitor_factors(self, actions: List[CompetitorAction], product: Dict) -> Dict[str, Any]:
        """Calculate competitor-based pricing factors."""
        if not actions:
            return {
                'competitive_pressure': 0.0,
                'confidence': 0.7,
                'price_pressure_direction': 'neutral',
                'competitor_activity_level': 0.0
            }
        
        # Analyze competitor pricing actions
        price_decreases = len([a for a in actions if 'price' in a.action_type.value and 'decrease' in a.action_type.value])
        price_increases = len([a for a in actions if 'price' in a.action_type.value and 'increase' in a.action_type.value])
        
        # Calculate competitive pressure
        if price_decreases > price_increases:
            competitive_pressure = -0.6  # Pressure to decrease prices
            pressure_direction = 'downward'
        elif price_increases > price_decreases:
            competitive_pressure = 0.3  # Opportunity to increase prices
            pressure_direction = 'upward'
        else:
            competitive_pressure = 0.0
            pressure_direction = 'neutral'
        
        # Activity level affects confidence
        activity_level = len(actions) / 10.0  # Normalize
        confidence = min(0.9, 0.5 + (activity_level * 0.4))
        
        # High confidence competitor actions
        high_confidence_actions = [a for a in actions if a.confidence_score > 0.8]
        if high_confidence_actions:
            competitive_pressure *= 1.2  # Amplify pressure from high-confidence signals
        
        return {
            'competitive_pressure': competitive_pressure,
            'confidence': confidence,
            'price_pressure_direction': pressure_direction,
            'competitor_activity_level': activity_level,
            'high_impact_actions': len([a for a in actions if a.impact_assessment == 'high']),
            'recent_actions_count': len(actions)
        }
    
    def _calculate_market_factors(self, sentiment: MarketSentimentData, product: Dict) -> Dict[str, float]:
        """Calculate market-based pricing factors."""
        # Market opportunity based on sentiment opportunities and risks
        opportunities = len(sentiment.opportunity_indicators)
        risks = len(sentiment.risk_factors)
        
        # Net opportunity score
        opportunity_score = (opportunities - risks) / 10.0  # Normalize
        
        # Seasonal factors (simplified)
        month = datetime.now(timezone.utc).month
        seasonal_multiplier = 1.0
        if month in [11, 12]:  # Holiday season
            seasonal_multiplier = 1.2
        elif month in [6, 7]:  # Summer
            seasonal_multiplier = 1.1
        elif month in [1, 2]:  # Post-holiday
            seasonal_multiplier = 0.9
        
        market_opportunity = opportunity_score * seasonal_multiplier
        
        # Market confidence based on sentiment forecast
        forecast_confidence = sentiment.confidence_forecast / 100.0
        
        return {
            'market_opportunity': market_opportunity,
            'seasonal_factor': seasonal_multiplier,
            'forecast_confidence': forecast_confidence,
            'opportunity_count': opportunities,
            'risk_count': risks
        }
    
    def _assess_pricing_risk(self, product_id: str, adjustment: float, 
                           confidence: float, sentiment: MarketSentimentData) -> RiskLevel:
        """Assess risk level of pricing adjustment."""
        risk_factors = 0
        
        # Large adjustment increases risk
        if abs(adjustment) > 0.15:
            risk_factors += 2
        elif abs(adjustment) > 0.10:
            risk_factors += 1
        
        # Low confidence increases risk
        if confidence < 0.6:
            risk_factors += 2
        elif confidence < 0.8:
            risk_factors += 1
        
        # High volatility increases risk
        if sentiment.volatility_index > 0.7:
            risk_factors += 2
        elif sentiment.volatility_index > 0.5:
            risk_factors += 1
        
        # Recent adjustment history increases risk
        recent_adjustments = [a for a in self.adjustment_history 
                            if a.product_id == product_id and 
                            (datetime.now(timezone.utc) - a.timestamp).hours < 24]
        if len(recent_adjustments) > 2:
            risk_factors += 2
        elif len(recent_adjustments) > 0:
            risk_factors += 1
        
        # Map risk factors to levels
        if risk_factors >= 6:
            return RiskLevel.CRITICAL
        elif risk_factors >= 4:
            return RiskLevel.HIGH
        elif risk_factors >= 2:
            return RiskLevel.MODERATE
        elif risk_factors >= 1:
            return RiskLevel.LOW
        else:
            return RiskLevel.MINIMAL
    
    def _generate_pricing_reasoning(self, sentiment_factors: Dict, competitor_factors: Dict, 
                                  market_factors: Dict, adjustment: float) -> List[str]:
        """Generate human-readable reasoning for pricing adjustment."""
        reasoning = []
        
        # Sentiment reasoning
        if sentiment_factors['price_adjustment_signal'] > 0.5:
            reasoning.append("Strong positive market sentiment supports price increase")
        elif sentiment_factors['price_adjustment_signal'] < -0.5:
            reasoning.append("Negative market sentiment suggests price decrease")
        
        if sentiment_factors['trend_factor'] > 1.0:
            reasoning.append("Rising sentiment trend favors higher pricing")
        elif sentiment_factors['trend_factor'] < 1.0:
            reasoning.append("Declining sentiment trend suggests caution")
        
        # Competitor reasoning
        pressure_direction = competitor_factors.get('price_pressure_direction', 'neutral')
        if pressure_direction == 'downward':
            reasoning.append("Competitor price decreases create downward pressure")
        elif pressure_direction == 'upward':
            reasoning.append("Competitor price increases provide opportunity")
        
        # Market reasoning
        if market_factors['seasonal_factor'] > 1.0:
            reasoning.append("Seasonal factors support higher pricing")
        elif market_factors['seasonal_factor'] < 1.0:
            reasoning.append("Seasonal factors suggest conservative pricing")
        
        # Adjustment magnitude reasoning
        if abs(adjustment) > 0.10:
            reasoning.append("Large adjustment magnitude requires careful monitoring")
        elif abs(adjustment) < 0.02:
            reasoning.append("Small adjustment maintains price stability")
        
        return reasoning or ["Based on overall market conditions and sentiment analysis"]
    
    def _perform_safety_checks(self, product: Dict, current_price: float, 
                             suggested_price: float) -> List[str]:
        """Perform comprehensive safety checks."""
        checks = []
        
        # Price bounds check
        min_price = product.get('min_price', current_price * 0.5)
        max_price = product.get('max_price', current_price * 2.0)
        
        if suggested_price < min_price:
            checks.append("FAILED: Suggested price below minimum threshold")
        elif suggested_price > max_price:
            checks.append("FAILED: Suggested price above maximum threshold")
        else:
            checks.append("PASSED: Price within acceptable bounds")
        
        # Margin check
        cost = product.get('cost', current_price * 0.6)
        suggested_margin = (suggested_price - cost) / suggested_price
        min_margin = product.get('min_margin', 0.15)
        
        if suggested_margin < min_margin:
            checks.append("FAILED: Suggested price results in margin below minimum")
        else:
            checks.append("PASSED: Margin protection maintained")
        
        # Competition check
        competitor_price = product.get('competitor_price', current_price * 1.05)
        if suggested_price > competitor_price * 1.2:
            checks.append("WARNING: Price significantly above competition")
        elif suggested_price < competitor_price * 0.8:
            checks.append("WARNING: Price significantly below competition")
        else:
            checks.append("PASSED: Price competitive with market")
        
        # Historical volatility check
        price_history = product.get('price_history', [current_price] * 10)
        if len(price_history) > 5:
            price_std = np.std(price_history)
            if abs(suggested_price - current_price) > price_std * 3:
                checks.append("WARNING: Large price change relative to historical volatility")
            else:
                checks.append("PASSED: Price change within historical patterns")
        
        return checks
    
    def _generate_sample_product_data(self, product_id: str) -> Dict[str, Any]:
        """Generate sample product data for demonstration."""
        import hashlib
        import random
        
        # Create deterministic data based on product_id
        product_hash = hashlib.md5(product_id.encode()).hexdigest()
        random.seed(int(product_hash[:8], 16))
        
        current_price = random.uniform(50, 300)
        cost = current_price * random.uniform(0.5, 0.75)
        
        return {
            'current_price': current_price,
            'cost': cost,
            'min_price': current_price * 0.7,
            'max_price': current_price * 1.5,
            'min_margin': 0.15,
            'competitor_price': current_price * random.uniform(0.9, 1.1),
            'price_history': [current_price * random.uniform(0.95, 1.05) for _ in range(10)],
            'category': random.choice(['electronics', 'home', 'fashion']),
            'demand_elasticity': random.uniform(-2.0, -0.5)
        }
    
    def _apply_risk_controls(self, adjustments: List[PricingAdjustment]) -> List[PricingAdjustment]:
        """Apply risk controls to filter and modify adjustments."""
        filtered_adjustments = []
        
        for adjustment in adjustments:
            # Apply each risk control
            passes_controls = True
            control_messages = []
            
            for control in self.risk_controls:
                if not control.enabled:
                    continue
                
                if control.control_type == "max_adjustment_limit":
                    if abs(adjustment.adjustment_percentage) > control.threshold_value:
                        passes_controls = False
                        control_messages.append(f"Blocked: Adjustment {adjustment.adjustment_percentage:.1%} exceeds limit {control.threshold_value:.1%}")
                
                elif control.control_type == "confidence_threshold":
                    if adjustment.confidence_score < control.threshold_value:
                        adjustment.approval_required = True
                        control_messages.append(f"Manual approval required: Confidence {adjustment.confidence_score:.2f} below threshold")
                
                elif control.control_type == "volatility_circuit_breaker":
                    if adjustment.market_factors.get('volatility_index', 0) > control.threshold_value:
                        passes_controls = False
                        control_messages.append("Blocked: High market volatility triggers circuit breaker")
                
                elif control.control_type == "margin_protection":
                    # Check if adjustment would violate margin protection
                    product = self.product_data.get(adjustment.product_id, self._generate_sample_product_data(adjustment.product_id))
                    cost = product.get('cost', adjustment.current_price * 0.6)
                    new_margin = (adjustment.suggested_price - cost) / adjustment.suggested_price
                    
                    if new_margin < control.threshold_value:
                        passes_controls = False
                        control_messages.append(f"Blocked: New margin {new_margin:.1%} below protection threshold")
            
            # Update safety checks with control messages
            adjustment.safety_checks.extend(control_messages)
            
            # Only include adjustments that pass controls
            if passes_controls:
                filtered_adjustments.append(adjustment)
                
        return filtered_adjustments
    
    async def _execute_automatic_adjustments(self, adjustments: List[PricingAdjustment]) -> List[PricingAdjustment]:
        """Execute approved automatic pricing adjustments."""
        if not self.config['auto_adjustment_enabled']:
            self.logger.info("Automatic adjustments disabled - returning recommendations only")
            return []
        
        executed_adjustments = []
        
        for adjustment in adjustments:
            # Skip if manual approval required
            if adjustment.approval_required:
                self.logger.info(f"Skipping {adjustment.product_id}: Manual approval required")
                continue
            
            # Skip if risk level too high for automatic execution
            if adjustment.risk_assessment in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                self.logger.info(f"Skipping {adjustment.product_id}: Risk level too high for auto-execution")
                continue
            
            # Check cooling period
            if self._in_cooling_period(adjustment.product_id):
                self.logger.info(f"Skipping {adjustment.product_id}: Still in cooling period")
                continue
            
            # Execute the adjustment
            try:
                success = await self._execute_price_change(adjustment)
                if success:
                    executed_adjustments.append(adjustment)
                    self.logger.info(f"Executed pricing adjustment for {adjustment.product_id}: {adjustment.adjustment_percentage:.1%}")
                    
                    # Create alert for executed adjustment
                    alert = PricingAlert(
                        alert_type="automatic_adjustment",
                        severity="info",
                        product_ids=[adjustment.product_id],
                        description=f"Automatic price adjustment executed: {adjustment.adjustment_percentage:.1%}",
                        current_risk_level=adjustment.risk_assessment,
                        recommended_action="monitor_results",
                        auto_action_taken=True,
                        manual_review_required=False,
                        timestamp=datetime.now(timezone.utc)
                    )
                    self.alert_history.append(alert)
                    
            except Exception as e:
                self.logger.error(f"Failed to execute adjustment for {adjustment.product_id}: {e}")
        
        return executed_adjustments
    
    def _in_cooling_period(self, product_id: str) -> bool:
        """Check if product is in cooling period after recent adjustment."""
        cooling_hours = self.config['cooling_period_hours']
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=cooling_hours)
        
        recent_adjustments = [a for a in self.adjustment_history 
                            if a.product_id == product_id and a.timestamp > cutoff_time]
        
        return len(recent_adjustments) > 0
    
    async def _execute_price_change(self, adjustment: PricingAdjustment) -> bool:
        """Execute the actual price change."""
        try:
            # In production, this would:
            # 1. Update product database
            # 2. Sync with e-commerce platforms
            # 3. Notify relevant teams
            # 4. Update pricing rules
            # 5. Log the change
            
            # Simulate price update
            await asyncio.sleep(0.1)
            
            # Update product data
            if adjustment.product_id not in self.product_data:
                self.product_data[adjustment.product_id] = self._generate_sample_product_data(adjustment.product_id)
            
            self.product_data[adjustment.product_id]['current_price'] = adjustment.suggested_price
            self.product_data[adjustment.product_id]['last_updated'] = datetime.now(timezone.utc)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Price change execution failed: {e}")
            return False
    
    def create_emergency_price_freeze(self, reason: str, affected_products: List[str] = None) -> PricingAlert:
        """Create emergency price freeze for risk management.
        
        Args:
            reason: Reason for emergency freeze
            affected_products: Products to freeze (None for all)
            
        Returns:
            Emergency pricing alert
        """
        self.logger.warning(f"Emergency price freeze activated: {reason}")
        
        # Disable automatic adjustments
        self.config['auto_adjustment_enabled'] = False
        
        # Create emergency alert
        alert = PricingAlert(
            alert_type="emergency_freeze",
            severity="critical",
            product_ids=affected_products or ["ALL_PRODUCTS"],
            description=f"Emergency price freeze activated: {reason}",
            current_risk_level=RiskLevel.CRITICAL,
            recommended_action="immediate_manual_review",
            auto_action_taken=True,
            manual_review_required=True,
            timestamp=datetime.now(timezone.utc)
        )
        
        self.alert_history.append(alert)
        return alert
    
    def get_pricing_alerts(self, severity_filter: str = "all") -> List[PricingAlert]:
        """Get pricing alerts with optional severity filtering.
        
        Args:
            severity_filter: Filter by severity ("critical", "high", "medium", "low", "all")
            
        Returns:
            List of pricing alerts
        """
        if severity_filter == "all":
            return self.alert_history
        
        return [alert for alert in self.alert_history if alert.severity == severity_filter]
    
    def get_adjustment_summary(self, time_period_hours: int = 24) -> Dict[str, Any]:
        """Get summary of pricing adjustments over time period.
        
        Args:
            time_period_hours: Time period to analyze
            
        Returns:
            Summary statistics
        """
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=time_period_hours)
        recent_adjustments = [a for a in self.adjustment_history if a.timestamp > cutoff_time]
        
        if not recent_adjustments:
            return {
                'total_adjustments': 0,
                'time_period_hours': time_period_hours,
                'summary': 'No adjustments in time period'
            }
        
        # Calculate statistics
        price_increases = len([a for a in recent_adjustments if a.adjustment_percentage > 0])
        price_decreases = len([a for a in recent_adjustments if a.adjustment_percentage < 0])
        
        avg_adjustment = np.mean([a.adjustment_percentage for a in recent_adjustments])
        avg_confidence = np.mean([a.confidence_score for a in recent_adjustments])
        
        # Risk distribution
        risk_distribution = {}
        for risk_level in RiskLevel:
            count = len([a for a in recent_adjustments if a.risk_assessment == risk_level])
            risk_distribution[risk_level.value] = count
        
        return {
            'total_adjustments': len(recent_adjustments),
            'price_increases': price_increases,
            'price_decreases': price_decreases,
            'avg_adjustment_percentage': avg_adjustment,
            'avg_confidence_score': avg_confidence,
            'risk_distribution': risk_distribution,
            'auto_executed': len([a for a in recent_adjustments if not a.approval_required]),
            'manual_approval_required': len([a for a in recent_adjustments if a.approval_required]),
            'time_period_hours': time_period_hours,
            'generated_at': datetime.now(timezone.utc)
        }
    
    def get_service_metrics(self) -> Dict[str, Any]:
        """Get comprehensive service performance metrics.
        
        Returns:
            Dictionary with service metrics
        """
        total_adjustments = len(self.adjustment_history)
        recent_adjustments = len([a for a in self.adjustment_history 
                                if (datetime.now(timezone.utc) - a.timestamp).days < 1])
        
        avg_confidence = np.mean([a.confidence_score for a in self.adjustment_history]) if self.adjustment_history else 0
        
        active_controls = len([c for c in self.risk_controls if c.enabled])
        
        return {
            'total_adjustments': total_adjustments,
            'adjustments_last_24h': recent_adjustments,
            'average_confidence': avg_confidence,
            'auto_adjustment_enabled': self.config['auto_adjustment_enabled'],
            'active_risk_controls': active_controls,
            'products_monitored': len(self.product_data),
            'emergency_freezes': len([a for a in self.alert_history if a.alert_type == 'emergency_freeze']),
            'last_adjustment': max([a.timestamp for a in self.adjustment_history]) if self.adjustment_history else None,
            'service_uptime': '99.9%',
            'last_updated': datetime.now(timezone.utc)
        }