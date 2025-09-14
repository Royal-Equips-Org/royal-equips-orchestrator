"""Tests for the enhanced pricing system."""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from orchestrator.services.ai_pricing_service import AIPricingService, PriceRecommendation, MarketAnalysis
from orchestrator.services.price_alert_system import PriceAlertSystem, AlertRule, PriceAlert
from orchestrator.services.pricing_rules_engine import (
    AutomatedPricingEngine, PricingRule, RuleAction, PriceChangeStatus
)


class TestAIPricingService:
    """Test cases for AI pricing service."""
    
    @pytest.fixture
    def ai_service(self):
        """Create AI pricing service with mock OpenAI client."""
        with patch('openai.OpenAI') as mock_openai:
            mock_client = Mock()
            mock_openai.return_value = mock_client
            
            service = AIPricingService("test-key")
            service.client = mock_client
            return service
    
    @pytest.mark.asyncio
    async def test_market_analysis(self, ai_service):
        """Test market analysis generation."""
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = """
        Market Analysis:
        1. Market trend: Rising prices due to increased demand
        2. Price sensitivity: 0.7 (moderate sensitivity)
        3. Competitive intensity: 0.8 (high competition)
        4. Recommended positioning: competitive
        """
        
        ai_service.client.chat.completions.create.return_value = mock_response
        
        competitor_prices = {"amazon": 49.99, "ebay": 45.99, "walmart": 47.50}
        
        analysis = await ai_service.analyze_market_conditions("test_product", competitor_prices)
        
        assert analysis.market_trend == "rising"
        assert analysis.competitive_intensity > 0.5
        assert analysis.recommended_positioning == "competitive"
    
    @pytest.mark.asyncio
    async def test_pricing_recommendation(self, ai_service):
        """Test AI pricing recommendation."""
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = """
        Pricing Recommendation:
        Recommended price: $46.99
        Confidence: 0.85
        This price positions us competitively while maintaining good margins.
        Market positioning: competitive
        Expected impact: 5-10% increase in sales
        Risk assessment: low
        """
        
        ai_service.client.chat.completions.create.return_value = mock_response
        
        market_analysis = MarketAnalysis(
            competitor_prices={"amazon": 49.99},
            market_trend="stable",
            price_sensitivity=0.7,
            competitive_intensity=0.6,
            recommended_positioning="competitive"
        )
        
        recommendation = await ai_service.generate_pricing_recommendation(
            "test_product", 50.0, market_analysis
        )
        
        assert recommendation.recommended_price == 46.99
        assert recommendation.confidence == 0.85
        assert recommendation.risk_level == "low"
    
    def test_fallback_recommendation(self, ai_service):
        """Test fallback recommendation when AI fails."""
        competitor_prices = {"amazon": 50.0}
        analysis = MarketAnalysis(
            competitor_prices=competitor_prices,
            market_trend="stable",
            price_sensitivity=0.7,
            competitive_intensity=0.6,
            recommended_positioning="competitive"
        )
        
        recommendation = ai_service._fallback_recommendation("test_product", 52.0, analysis)
        
        assert recommendation.recommended_price == 47.5  # 5% below average competitor price
        assert recommendation.confidence == 0.6
        assert recommendation.risk_level == "low"


class TestPriceAlertSystem:
    """Test cases for price alert system."""
    
    @pytest.fixture
    def alert_system(self):
        """Create price alert system."""
        return PriceAlertSystem()
    
    def test_add_alert_rule(self, alert_system):
        """Test adding alert rules."""
        rule = AlertRule(
            rule_id="test_rule",
            product_ids=["product1"],
            competitors=["amazon"],
            alert_types=["price_drop"],
            threshold=10.0,
            cooldown_minutes=60
        )
        
        alert_system.add_alert_rule(rule)
        
        assert "test_rule" in alert_system.alert_rules
        assert alert_system.alert_rules["test_rule"] == rule
    
    @pytest.mark.asyncio
    async def test_price_change_detection(self, alert_system):
        """Test price change detection and alerting."""
        # Setup alert rule
        rule = AlertRule(
            rule_id="price_drop_alert",
            product_ids=[],  # All products
            competitors=[],  # All competitors
            alert_types=["price_drop"],
            threshold=15.0,
            cooldown_minutes=60
        )
        alert_system.add_alert_rule(rule)
        
        # Setup initial prices
        initial_prices = {"product1": {"amazon": 100.0}}
        await alert_system.check_price_changes(initial_prices)
        
        # Create significant price drop
        new_prices = {"product1": {"amazon": 80.0}}  # 20% drop
        alerts = await alert_system.check_price_changes(new_prices)
        
        assert len(alerts) == 1
        assert alerts[0].alert_type == "price_drop"
        assert alerts[0].change_percentage == -20.0
        assert alerts[0].severity in ["medium", "high", "critical"]
    
    def test_cooldown_period(self, alert_system):
        """Test alert cooldown functionality."""
        rule = AlertRule(
            rule_id="test_rule",
            product_ids=[],
            competitors=[],
            alert_types=["price_drop"],
            threshold=10.0,
            cooldown_minutes=60
        )
        
        # Simulate recent alert
        alert_key = "test_rule:product1:amazon"
        alert_system.recent_alerts[alert_key] = datetime.now()
        
        assert alert_system._is_in_cooldown(alert_key, 60) == True
        assert alert_system._is_in_cooldown(alert_key, 0) == False


class TestPricingRulesEngine:
    """Test cases for pricing rules engine."""
    
    @pytest.fixture
    def pricing_engine(self):
        """Create pricing rules engine with mock AI service."""
        mock_ai_service = Mock(spec=AIPricingService)
        return AutomatedPricingEngine(mock_ai_service)
    
    def test_add_pricing_rule(self, pricing_engine):
        """Test adding pricing rules."""
        rule = PricingRule(
            rule_id="test_rule",
            name="Test Rule",
            description="Test pricing rule",
            min_confidence=0.8,
            action=RuleAction.APPLY_IMMEDIATELY
        )
        
        pricing_engine.add_rule(rule)
        
        assert "test_rule" in pricing_engine.rules
        assert pricing_engine.rules["test_rule"] == rule
    
    @pytest.mark.asyncio
    async def test_price_change_processing(self, pricing_engine):
        """Test processing price change recommendations."""
        # Add rule
        rule = PricingRule(
            rule_id="high_confidence",
            name="High Confidence Auto",
            description="Auto apply high confidence recommendations",
            min_confidence=0.85,
            max_price_decrease=0.20,
            action=RuleAction.APPLY_IMMEDIATELY
        )
        pricing_engine.add_rule(rule)
        
        # Create recommendation
        recommendation = PriceRecommendation(
            product_id="test_product",
            current_price=100.0,
            recommended_price=90.0,  # 10% decrease
            confidence=0.9,  # High confidence
            reasoning="Market analysis suggests price reduction",
            market_positioning="competitive",
            expected_impact="Increased market share",
            risk_level="low"
        )
        
        # Mock callback
        price_update_callback = Mock()
        pricing_engine.add_price_update_callback(price_update_callback)
        
        # Process recommendation
        request = await pricing_engine.process_pricing_recommendation(
            "test_product", 100.0, recommendation
        )
        
        assert request.status == PriceChangeStatus.APPLIED
        assert request.applied_by_rule == "high_confidence"
        price_update_callback.assert_called_once_with("test_product", 100.0, 90.0)
    
    @pytest.mark.asyncio
    async def test_price_limits_enforcement(self, pricing_engine):
        """Test price limit enforcement."""
        # Add rule with strict limits
        rule = PricingRule(
            rule_id="limited_rule",
            name="Limited Changes",
            description="Rule with price limits",
            min_confidence=0.5,
            max_price_decrease=0.10,  # Max 10% decrease
            action=RuleAction.APPLY_IMMEDIATELY
        )
        pricing_engine.add_rule(rule)
        
        # Create recommendation that exceeds limits
        recommendation = PriceRecommendation(
            product_id="test_product",
            current_price=100.0,
            recommended_price=80.0,  # 20% decrease - exceeds limit
            confidence=0.8,
            reasoning="Large price reduction recommended",
            market_positioning="aggressive",
            expected_impact="Market penetration",
            risk_level="medium"
        )
        
        # Process recommendation
        request = await pricing_engine.process_pricing_recommendation(
            "test_product", 100.0, recommendation
        )
        
        # Should require manual review due to exceeding limits
        assert request.status == PriceChangeStatus.MANUAL_REVIEW
        assert request.manual_approval_required == True
    
    @pytest.mark.asyncio
    async def test_manual_approval_workflow(self, pricing_engine):
        """Test manual approval workflow."""
        # Create a request that requires approval
        recommendation = PriceRecommendation(
            product_id="test_product",
            current_price=100.0,
            recommended_price=95.0,
            confidence=0.7,
            reasoning="Medium confidence recommendation",
            market_positioning="competitive",
            expected_impact="Moderate impact",
            risk_level="medium"
        )
        
        # Add rule requiring approval for medium confidence
        rule = PricingRule(
            rule_id="approval_rule",
            name="Requires Approval",
            description="Medium confidence requires approval",
            min_confidence=0.6,
            max_confidence=0.8,
            action=RuleAction.APPLY_WITH_APPROVAL
        )
        pricing_engine.add_rule(rule)
        
        # Process recommendation
        request = await pricing_engine.process_pricing_recommendation(
            "test_product", 100.0, recommendation
        )
        
        assert request.status == PriceChangeStatus.MANUAL_REVIEW
        assert request.manual_approval_required == True
        
        # Test approval
        success = await pricing_engine.approve_price_change(request.request_id, True, "admin")
        
        assert success == True
        assert request.status == PriceChangeStatus.APPLIED
        
        # Test rejection
        request.status = PriceChangeStatus.MANUAL_REVIEW  # Reset for rejection test
        success = await pricing_engine.approve_price_change(request.request_id, False, "admin")
        
        assert success == True
        assert request.status == PriceChangeStatus.REJECTED


# Integration test
@pytest.mark.asyncio
async def test_pricing_optimizer_integration():
    """Test integration of all pricing components."""
    # This would test the full PricingOptimizerAgent
    # For now, just verify imports work
    from orchestrator.agents.pricing_optimizer import PricingOptimizerAgent
    
    # Test basic initialization without external dependencies
    with patch.dict('os.environ', {}, clear=True):  # Clear environment
        agent = PricingOptimizerAgent()
        assert agent.ai_service is None  # Should be None without API key
        assert agent.pricing_engine is None  # Should be None without AI service
        assert agent.alert_system is not None  # Should initialize regardless


if __name__ == "__main__":
    pytest.main([__file__])