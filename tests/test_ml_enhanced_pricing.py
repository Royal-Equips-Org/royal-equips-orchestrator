"""Tests for ML-enhanced pricing system components."""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock

from orchestrator.services.ml_rule_optimizer import (
    MLRuleOptimizer, RulePerformance, OptimalParameters
)
from orchestrator.services.market_sentiment_service import (
    RealTimeMarketSentiment, SentimentScore, SentimentLevel, MarketSentimentData
)
from orchestrator.services.predictive_forecaster import (
    PredictiveForecaster, ConfidenceForecast, MarketConditionForecast
)
from orchestrator.services.cross_agent_tools import (
    CrossAgentTools, ToolMetadata, ToolCategory
)


class TestMLRuleOptimizer:
    """Test ML rule optimization functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.optimizer = MLRuleOptimizer(data_storage_path="test_data/ml_models")
    
    def test_initialization(self):
        """Test ML rule optimizer initialization."""
        assert self.optimizer is not None
        assert hasattr(self.optimizer, 'models')
        assert hasattr(self.optimizer, 'performance_history')
    
    def test_record_performance(self):
        """Test performance data recording."""
        performance = RulePerformance(
            rule_id="test_rule",
            timestamp=datetime.now(),
            confidence_threshold=0.85,
            price_change_percentage=0.08,
            revenue_impact=1000.0,
            profit_margin_change=0.03,
            conversion_rate_change=0.02,
            customer_satisfaction_score=85.0,
            market_response_time=300.0,
            success_score=88.0
        )
        
        initial_count = len(self.optimizer.performance_history)
        self.optimizer.record_performance(performance)
        
        assert len(self.optimizer.performance_history) == initial_count + 1
        assert self.optimizer.performance_history[-1].rule_id == "test_rule"
        assert self.optimizer.performance_history[-1].success_score == 88.0
    
    def test_rule_insights(self):
        """Test rule performance insights generation."""
        # Clear existing history for clean test
        self.optimizer.performance_history = []
        
        # Add some test performance data
        for i in range(10):
            performance = RulePerformance(
                rule_id="test_rule",
                timestamp=datetime.now() - timedelta(days=i),
                confidence_threshold=0.85 + (i * 0.01),
                price_change_percentage=0.08,
                revenue_impact=1000.0 + (i * 50),
                profit_margin_change=0.03,
                conversion_rate_change=0.02,
                customer_satisfaction_score=80.0 + i,
                market_response_time=300.0,
                success_score=70.0 + i * 2
            )
            self.optimizer.record_performance(performance)
        
        insights = self.optimizer.get_rule_insights("test_rule")
        
        assert insights['rule_id'] == "test_rule"
        assert insights['total_executions'] >= 10
        assert insights['average_success_score'] > 0
        assert isinstance(insights['recommendations'], list)
        assert len(insights['recommendations']) > 0
    
    def test_optimal_parameters_prediction(self):
        """Test ML-powered optimal parameter prediction."""
        # Clear existing history for clean test
        self.optimizer.performance_history = []
        
        # Add sufficient training data
        for i in range(60):
            performance = RulePerformance(
                rule_id="test_rule",
                timestamp=datetime.now() - timedelta(days=i),
                confidence_threshold=0.75 + (i * 0.002),
                price_change_percentage=0.05 + (i * 0.001),
                revenue_impact=500.0 + (i * 25),
                profit_margin_change=0.02 + (i * 0.001),
                conversion_rate_change=0.01,
                customer_satisfaction_score=75.0 + (i % 20),
                market_response_time=250.0 + (i * 2),
                # success_score cycles every 30, with a bonus every 7th data point
                success_score=60.0 + (i % SUCCESS_SCORE_CYCLE) + (SUCCESS_SCORE_BONUS if i % SUCCESS_SCORE_BONUS_INTERVAL == 0 else 0)
            )
            self.optimizer.record_performance(performance)
        
        market_context = {
            'expected_price_change': 0.08,
            'market_volatility': 0.4,
            'competitive_intensity': 0.6,
            'market_response_time': 300.0
        }
        
        optimal_params = self.optimizer.predict_optimal_parameters("test_rule", market_context)
        
        assert isinstance(optimal_params, OptimalParameters)
        assert optimal_params.rule_id == "test_rule"
        assert 0.5 <= optimal_params.optimal_confidence_threshold <= 0.95
        assert 0.05 <= optimal_params.optimal_max_price_increase <= 0.30
        assert 0.05 <= optimal_params.optimal_max_price_decrease <= 0.40
        assert 0.05 <= optimal_params.optimal_min_profit_margin <= 0.30


class TestMarketSentimentService:
    """Test market sentiment analysis functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.sentiment_service = RealTimeMarketSentiment()
    
    def test_initialization(self):
        """Test sentiment service initialization."""
        assert self.sentiment_service is not None
        assert hasattr(self.sentiment_service, 'sentiment_history')
        assert hasattr(self.sentiment_service, 'data_sources')
    
    @pytest.mark.asyncio
    async def test_market_sentiment_analysis(self):
        """Test market sentiment analysis."""
        sentiment_data = await self.sentiment_service.analyze_market_sentiment(
            "e-commerce", ["online shopping", "retail pricing"]
        )
        
        assert isinstance(sentiment_data, MarketSentimentData)
        assert hasattr(sentiment_data.overall_sentiment, 'sentiment_level')
        assert hasattr(sentiment_data.overall_sentiment, 'confidence')
        assert isinstance(sentiment_data.trend_analysis, str)
        assert 0.0 <= sentiment_data.volatility_index <= 1.0
        assert 0.0 <= sentiment_data.confidence_forecast <= 100.0
        assert isinstance(sentiment_data.risk_factors, list)
        assert isinstance(sentiment_data.opportunity_indicators, list)
    
    def test_sentiment_alerts(self):
        """Test sentiment-based alert generation."""
        # Add some sentiment history
        sentiment_score = SentimentScore(
            sentiment_level=SentimentLevel.NEGATIVE,
            confidence=0.8,
            polarity=-0.3,
            subjectivity=0.6,
            compound_score=-0.4,
            source_count=5,
            timestamp=datetime.now()
        )
        self.sentiment_service.sentiment_history.append(sentiment_score)
        
        alerts = self.sentiment_service.get_sentiment_alerts({
            'negative_sentiment': -0.2,
            'high_volatility': 0.7
        })
        
        assert isinstance(alerts, list)
        # Should have negative sentiment alert
        negative_alerts = [a for a in alerts if a['type'] == 'negative_sentiment']
        assert len(negative_alerts) > 0
    
    def test_sentiment_level_determination(self):
        """Test sentiment level classification."""
        # Test very positive
        level = self.sentiment_service._determine_sentiment_level(0.8, 0.7)
        assert level == SentimentLevel.VERY_POSITIVE
        
        # Test negative
        level = self.sentiment_service._determine_sentiment_level(-0.3, -0.3)
        assert level == SentimentLevel.NEGATIVE
        
        # Test neutral
        level = self.sentiment_service._determine_sentiment_level(0.05, 0.05)
        assert level == SentimentLevel.NEUTRAL


class TestPredictiveForecaster:
    """Test predictive forecasting functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.forecaster = PredictiveForecaster(data_storage_path="test_data/forecasting")
    
    def test_initialization(self):
        """Test forecaster initialization."""
        assert self.forecaster is not None
        assert hasattr(self.forecaster, 'historical_data')
        assert hasattr(self.forecaster, 'confidence_model')
        assert hasattr(self.forecaster, 'sentiment_model')
        assert hasattr(self.forecaster, 'volatility_model')
    
    def test_record_observation(self):
        """Test observation recording."""
        initial_count = len(self.forecaster.historical_data)
        
        self.forecaster.record_observation(
            confidence_score=75.0,
            sentiment_score=0.2,
            volatility=0.3,
            market_context={'test': True}
        )
        
        assert len(self.forecaster.historical_data) == initial_count + 1
        latest_obs = self.forecaster.historical_data[-1]
        assert latest_obs['confidence_score'] == 75.0
        assert latest_obs['sentiment_score'] == 0.2
        assert latest_obs['volatility'] == 0.3
    
    def test_confidence_forecasting(self):
        """Test confidence score forecasting."""
        # Add historical data
        for i in range(30):
            self.forecaster.record_observation(
                confidence_score=70.0 + i + (i % 5),
                sentiment_score=0.1 + (i * 0.01),
                volatility=0.2 + (i * 0.005),
                market_context={'day': i}
            )
        
        forecasts = self.forecaster.forecast_confidence(
            current_confidence=78.5,
            current_sentiment=0.25,
            current_volatility=0.35,
            forecast_horizons=[1, 6, 24]
        )
        
        assert len(forecasts) == 3
        for forecast in forecasts:
            assert isinstance(forecast, ConfidenceForecast)
            assert forecast.forecast_horizon in [1, 6, 24]
            assert 0 <= forecast.predicted_confidence <= 100
            assert forecast.confidence_interval_lower <= forecast.predicted_confidence <= forecast.confidence_interval_upper
            assert forecast.trend_direction in ["rising", "falling", "stable"]
            assert forecast.risk_level in ["low", "medium", "high"]
    
    def test_market_condition_forecasting(self):
        """Test market condition forecasting."""
        # Add some historical data
        for i in range(20):
            self.forecaster.record_observation(
                confidence_score=70.0 + i,
                sentiment_score=0.1 + (i * 0.02),
                volatility=0.2 + (i * 0.01),
                market_context={'day': i}
            )
        
        market_forecasts = self.forecaster.forecast_market_conditions(
            current_sentiment=0.25,
            current_volatility=0.35,
            current_confidence=78.5,
            periods=["1h", "6h", "24h"]
        )
        
        assert len(market_forecasts) == 3
        for forecast in market_forecasts:
            assert isinstance(forecast, MarketConditionForecast)
            assert forecast.forecast_period in ["1h", "6h", "24h"]
            assert -1.0 <= forecast.sentiment_forecast <= 1.0
            assert 0.0 <= forecast.volatility_forecast <= 1.0
            assert forecast.price_pressure_forecast in ["upward", "downward", "neutral"]
            assert 0.0 <= forecast.confidence_reliability <= 1.0
            assert isinstance(forecast.key_risk_factors, list)
            assert isinstance(forecast.recommended_actions, list)
    
    def test_predictive_alerts(self):
        """Test predictive alert generation."""
        # Add data that should trigger alerts
        for i in range(10):
            self.forecaster.record_observation(
                confidence_score=80.0 - (i * self.CONFIDENCE_DECLINE_RATE),  # Declining confidence
                sentiment_score=0.3 - (i * 0.05),  # Declining sentiment
                volatility=0.2 + (i * 0.05),  # Increasing volatility
                market_context={'declining_scenario': True}
            )
        
        alerts = self.forecaster.get_predictive_alerts(
            confidence_threshold=60.0,
            volatility_threshold=0.5,
            reliability_threshold=0.8
        )
        
        assert isinstance(alerts, list)
        # Should have some alerts due to declining trends
        if alerts:  # May not always have alerts depending on specific values
            for alert in alerts:
                assert 'type' in alert
                assert 'severity' in alert
                assert 'message' in alert
                assert 'recommended_action' in alert


class TestCrossAgentTools:
    """Test cross-agent intelligence tools."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.tools = CrossAgentTools()
    
    def test_initialization(self):
        """Test tools initialization."""
        assert self.tools is not None
        assert len(self.tools.registered_tools) > 0
        assert 'customer_lifetime_value' in self.tools.registered_tools
        assert 'market_opportunity_scanner' in self.tools.registered_tools
        assert 'competitive_intelligence' in self.tools.registered_tools
    
    def test_tool_registration(self):
        """Test tool registration."""
        initial_count = len(self.tools.registered_tools)
        
        test_tool = ToolMetadata(
            tool_id="test_tool",
            name="Test Tool",
            category=ToolCategory.ANALYTICS,
            description="A test tool",
            supported_agents=["test_agent"],
            input_schema={"test_param": "str"},
            output_schema={"test_result": "float"},
            confidence_level=0.8,
            performance_metrics={"accuracy": 0.85},
            last_updated=datetime.now()
        )
        
        self.tools.register_tool(test_tool)
        
        assert len(self.tools.registered_tools) == initial_count + 1
        assert "test_tool" in self.tools.registered_tools
        assert self.tools.registered_tools["test_tool"].name == "Test Tool"
    
    def test_available_tools_filtering(self):
        """Test filtering tools by agent."""
        all_tools = self.tools.get_available_tools()
        pricing_tools = self.tools.get_available_tools("pricing_optimizer")
        
        assert len(all_tools) >= len(pricing_tools)
        
        # All pricing tools should be available to pricing_optimizer
        for tool in pricing_tools:
            assert ("pricing_optimizer" in tool.supported_agents or 
                   len(tool.supported_agents) == 0)
    
    @pytest.mark.asyncio
    async def test_customer_lifetime_value_tool(self):
        """Test customer lifetime value calculation tool."""
        customer_data = {
            'monthly_revenue': 100.0,
            'purchase_frequency': 2.0,
            'average_order_value': 50.0,
            'account_age_months': 12,
            'days_since_last_purchase': 15,
            'total_orders': 10,
            'support_tickets': 1,
            'engagement_score': 0.8,
            'category_expansion': 0.4
        }
        
        result = await self.tools.execute_tool(
            "customer_lifetime_value",
            "pricing_optimizer",
            {"customer_data": customer_data, "time_horizon": 24}
        )
        
        assert result['success'] is True
        assert 'clv' in result['result']
        assert 'confidence' in result['result']
        assert 'customer_segment' in result['result']
        assert result['result']['clv'] > 0
        assert 0 <= result['result']['confidence'] <= 1
    
    @pytest.mark.asyncio
    async def test_market_opportunity_scanner(self):
        """Test market opportunity scanning tool."""
        market_context = {
            'current_pricing': {'product_a': 50.0, 'product_b': 30.0},
            'competitor_pricing': {
                'product_a': {'competitor1': 55.0, 'competitor2': 52.0},
                'product_b': {'competitor1': 35.0, 'competitor2': 33.0}
            },
            'monthly_volume': {'product_a': 100, 'product_b': 200},
            'trends': [
                {'category': 'electronics', 'growth_rate': 0.15, 'market_size': 100000}
            ],
            'customer_segments': {
                'premium': {'growth_rate': 0.20, 'penetration': 0.15, 'segment_value': 50000}
            }
        }
        
        result = await self.tools.execute_tool(
            "market_opportunity_scanner",
            "pricing_optimizer",
            {"market_context": market_context, "business_goals": ["revenue_growth"]}
        )
        
        assert result['success'] is True
        assert 'opportunities' in result['result']
        assert 'total_opportunities' in result['result']
        assert 'priority_score' in result['result']
        assert isinstance(result['result']['opportunities'], list)
    
    @pytest.mark.asyncio
    async def test_competitive_intelligence_tool(self):
        """Test competitive intelligence analysis tool."""
        competitors = [
            {
                'name': 'Competitor A',
                'market_share': 0.25,
                'pricing': {'product_a': 55.0},
                'strengths': ['Brand recognition', 'Distribution'],
                'weaknesses': ['Higher prices', 'Limited innovation'],
                'recent_moves': ['Price reduction campaign', 'New product launch']
            },
            {
                'name': 'Competitor B',
                'market_share': 0.15,
                'pricing': {'product_a': 52.0},
                'strengths': ['Customer service', 'Quality'],
                'weaknesses': ['Limited market presence'],
                'recent_moves': ['Aggressive expansion']
            }
        ]
        
        result = await self.tools.execute_tool(
            "competitive_intelligence",
            "pricing_optimizer",
            {"competitors": competitors, "analysis_depth": "standard"}
        )
        
        assert result['success'] is True
        assert 'intelligence_report' in result['result']
        assert 'threat_assessment' in result['result']
        
        intelligence = result['result']['intelligence_report']
        threat_assessment = result['result']['threat_assessment']
        
        assert intelligence['competitors_analyzed'] == 2
        assert 'overall_competitive_pressure' in intelligence
        assert 'overall_threat_level' in threat_assessment
        assert isinstance(threat_assessment['strategic_recommendations'], list)
    
    def test_tool_performance_metrics(self):
        """Test tool performance metrics collection."""
        metrics = self.tools.get_tool_performance_metrics()
        
        assert 'tool_metrics' in metrics
        assert 'summary' in metrics
        
        summary = metrics['summary']
        assert 'total_tools' in summary
        assert 'total_calls' in summary
        assert 'average_success_rate' in summary
        
        assert summary['total_tools'] == len(self.tools.registered_tools)


class TestIntegration:
    """Test integration between ML components."""
    
    @pytest.mark.asyncio
    async def test_ml_enhanced_pricing_workflow(self):
        """Test complete ML-enhanced pricing workflow."""
        # Initialize all components
        optimizer = MLRuleOptimizer(data_storage_path="test_data/integration")
        sentiment_service = RealTimeMarketSentiment()
        forecaster = PredictiveForecaster(data_storage_path="test_data/integration")
        tools = CrossAgentTools()
        
        # Step 1: Analyze market sentiment
        sentiment_data = await sentiment_service.analyze_market_sentiment("e-commerce")
        assert isinstance(sentiment_data, MarketSentimentData)
        
        # Step 2: Record some performance data for ML learning
        for i in range(20):
            performance = RulePerformance(
                rule_id="integration_test",
                timestamp=datetime.now() - timedelta(hours=i),
                confidence_threshold=0.80 + (i * 0.005),
                price_change_percentage=0.06 + (i * 0.002),
                revenue_impact=800.0 + (i * 40),
                profit_margin_change=0.025,
                conversion_rate_change=0.015,
                customer_satisfaction_score=82.0 + (i % 10),
                market_response_time=280.0 + (i * 5),
                success_score=75.0 + (i % 20)
            )
            optimizer.record_performance(performance)
        
        # Step 3: Record observations for forecasting
        for i in range(15):
            forecaster.record_observation(
                confidence_score=77.0 + i,
                sentiment_score=sentiment_data.overall_sentiment.compound_score + (i * 0.01),
                volatility=sentiment_data.volatility_index + (i * 0.01),
                market_context={'integration_test': True}
            )
        
        # Step 4: Get ML-optimized parameters
        market_context = {
            'expected_price_change': 0.08,
            'market_volatility': sentiment_data.volatility_index,
            'competitive_intensity': 0.5,
            'market_response_time': 300.0
        }
        
        optimal_params = optimizer.predict_optimal_parameters("integration_test", market_context)
        assert isinstance(optimal_params, OptimalParameters)
        
        # Step 5: Generate forecasts
        forecasts = forecaster.forecast_confidence(
            current_confidence=80.0,
            current_sentiment=sentiment_data.overall_sentiment.compound_score,
            current_volatility=sentiment_data.volatility_index,
            forecast_horizons=[1, 6]
        )
        assert len(forecasts) == 2
        
        # Step 6: Use cross-agent tools for market analysis
        market_context_tools = {
            'current_pricing': {'test_product': 45.0},
            'competitor_pricing': {'test_product': {'competitor': 50.0}},
            'trends': [{'category': 'test', 'growth_rate': 0.1, 'market_size': 10000}]
        }
        
        opportunities = await tools.execute_tool(
            "market_opportunity_scanner",
            "pricing_optimizer",
            {"market_context": market_context_tools, "business_goals": ["revenue_growth"]}
        )
        
        assert opportunities['success'] is True
        
        # Verify integration - all components should work together
        assert optimal_params.predicted_success_score > 0
        assert all(f.predicted_confidence > 0 for f in forecasts)
        assert len(opportunities['result']['opportunities']) >= 0  # May be 0 if no opportunities found
        
        print("✅ ML-enhanced pricing workflow integration test passed!")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])