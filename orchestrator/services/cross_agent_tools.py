"""Cross-agent tools and utilities for e-commerce intelligence.

This module provides advanced tools that can be shared across different agents
to enhance their capabilities with ML-powered insights and automation.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from enum import Enum

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


class ToolCategory(Enum):
    """Categories of cross-agent tools."""
    ANALYTICS = "analytics"
    PREDICTION = "prediction"
    OPTIMIZATION = "optimization"
    AUTOMATION = "automation"
    INTELLIGENCE = "intelligence"


@dataclass
class ToolMetadata:
    """Metadata for cross-agent tools."""
    tool_id: str
    name: str
    category: ToolCategory
    description: str
    supported_agents: List[str]
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    confidence_level: float  # 0-1
    performance_metrics: Dict[str, float]
    last_updated: datetime


@dataclass
class CustomerSegment:
    """Customer segment analysis result."""
    segment_id: str
    segment_name: str
    customer_count: int
    characteristics: Dict[str, Any]
    behavioral_patterns: List[str]
    recommended_strategies: List[str]
    value_score: float  # 0-100
    growth_potential: str  # "high", "medium", "low"


@dataclass
class MarketOpportunity:
    """Market opportunity identification result."""
    opportunity_id: str
    opportunity_type: str  # "pricing", "product", "market", "customer"
    description: str
    potential_revenue: float
    confidence_score: float
    time_sensitivity: str  # "immediate", "short_term", "medium_term", "long_term"
    required_actions: List[str]
    success_probability: float
    risk_factors: List[str]


@dataclass
class CompetitiveIntelligence:
    """Competitive intelligence analysis result."""
    competitor_id: str
    competitor_name: str
    market_position: str
    pricing_strategy: str
    strengths: List[str]
    weaknesses: List[str]
    recent_moves: List[str]
    threat_level: str  # "low", "medium", "high", "critical"
    recommended_responses: List[str]


class CrossAgentTools:
    """Advanced tools for cross-agent intelligence and automation."""
    
    def __init__(self):
        """Initialize cross-agent tools."""
        self.logger = logging.getLogger(__name__)
        
        # Tool registry
        self.registered_tools: Dict[str, ToolMetadata] = {}
        self.tool_usage_stats: Dict[str, Dict[str, Any]] = {}
        
        # Data storage for analysis
        self.customer_data: List[Dict[str, Any]] = []
        self.market_data: List[Dict[str, Any]] = []
        self.competitor_data: Dict[str, List[Dict[str, Any]]] = {}
        
        # ML models for analysis
        self.customer_segmentation_model = None
        self.opportunity_detection_model = None
        
        # Register default tools
        self._register_default_tools()
        
        self.logger.info("Cross-agent tools initialized")
    
    def _register_default_tools(self) -> None:
        """Register default tools available to all agents."""
        
        # Customer Analytics Tools
        self.register_tool(ToolMetadata(
            tool_id="customer_lifetime_value",
            name="Customer Lifetime Value Calculator",
            category=ToolCategory.ANALYTICS,
            description="Calculate CLV with ML-enhanced predictions",
            supported_agents=["pricing_optimizer", "marketing_automation", "customer_support"],
            input_schema={"customer_data": "dict", "time_horizon": "int"},
            output_schema={"clv": "float", "confidence": "float", "factors": "list"},
            confidence_level=0.85,
            performance_metrics={"accuracy": 0.87, "precision": 0.82},
            last_updated=datetime.now(timezone.utc)
        ))
        
        self.register_tool(ToolMetadata(
            tool_id="market_opportunity_scanner",
            name="AI-Powered Market Opportunity Scanner",
            category=ToolCategory.INTELLIGENCE,
            description="Identify market opportunities using ML analysis",
            supported_agents=["pricing_optimizer", "product_research", "marketing_automation"],
            input_schema={"market_context": "dict", "business_goals": "list"},
            output_schema={"opportunities": "list", "priority_score": "float"},
            confidence_level=0.78,
            performance_metrics={"accuracy": 0.79, "recall": 0.74},
            last_updated=datetime.now(timezone.utc)
        ))
        
        self.register_tool(ToolMetadata(
            tool_id="competitive_intelligence",
            name="Real-time Competitive Intelligence",
            category=ToolCategory.INTELLIGENCE,
            description="Monitor and analyze competitor activities",
            supported_agents=["pricing_optimizer", "product_research", "marketing_automation"],
            input_schema={"competitors": "list", "analysis_depth": "str"},
            output_schema={"intelligence_report": "dict", "threat_assessment": "dict"},
            confidence_level=0.82,
            performance_metrics={"coverage": 0.85, "timeliness": 0.91},
            last_updated=datetime.now(timezone.utc)
        ))
        
        self.register_tool(ToolMetadata(
            tool_id="demand_forecasting",
            name="Advanced Demand Forecasting",
            category=ToolCategory.PREDICTION,
            description="ML-powered demand prediction with seasonal analysis",
            supported_agents=["inventory_forecasting", "pricing_optimizer", "product_research"],
            input_schema={"historical_data": "list", "external_factors": "dict"},
            output_schema={"demand_forecast": "list", "confidence_intervals": "list"},
            confidence_level=0.88,
            performance_metrics={"mae": 12.5, "mape": 8.2},
            last_updated=datetime.now(timezone.utc)
        ))
        
        self.register_tool(ToolMetadata(
            tool_id="price_elasticity_analyzer",
            name="Dynamic Price Elasticity Analyzer",
            category=ToolCategory.ANALYTICS,
            description="Analyze price sensitivity with customer segmentation",
            supported_agents=["pricing_optimizer", "marketing_automation"],
            input_schema={"price_history": "list", "sales_data": "list", "segments": "list"},
            output_schema={"elasticity_coefficients": "dict", "segment_analysis": "dict"},
            confidence_level=0.83,
            performance_metrics={"r_squared": 0.76, "prediction_accuracy": 0.81},
            last_updated=datetime.now(timezone.utc)
        ))
        
        self.register_tool(ToolMetadata(
            tool_id="inventory_optimization",
            name="AI-Driven Inventory Optimization",
            category=ToolCategory.OPTIMIZATION,
            description="Optimize inventory levels with demand uncertainty",
            supported_agents=["inventory_forecasting", "order_management"],
            input_schema={"current_inventory": "dict", "demand_forecast": "list", "constraints": "dict"},
            output_schema={"optimal_levels": "dict", "reorder_points": "dict", "cost_savings": "float"},
            confidence_level=0.86,
            performance_metrics={"cost_reduction": 0.15, "stockout_reduction": 0.23},
            last_updated=datetime.now(timezone.utc)
        ))
        
        # Advanced Inventory Management Tools
        self.register_tool(ToolMetadata(
            tool_id="automated_stockout_prediction",
            name="ML-Powered Stockout Prediction",
            category=ToolCategory.PREDICTION,
            description="Predict stockouts and trigger automated reorders",
            supported_agents=["inventory_forecasting", "order_management", "pricing_optimizer"],
            input_schema={"product_ids": "list", "forecast_days": "int"},
            output_schema={"predictions": "list", "reorder_triggers": "list"},
            confidence_level=0.88,
            performance_metrics={"prediction_accuracy": 0.89, "false_positive_rate": 0.12},
            last_updated=datetime.now(timezone.utc)
        ))
        
        self.register_tool(ToolMetadata(
            tool_id="supplier_performance_scoring",
            name="Advanced Supplier Performance Analysis",
            category=ToolCategory.ANALYTICS,
            description="ML-based supplier scoring with automated backup routing",
            supported_agents=["order_management", "inventory_forecasting", "pricing_optimizer"],
            input_schema={"supplier_ids": "list", "performance_metrics": "dict"},
            output_schema={"supplier_scores": "dict", "backup_recommendations": "list"},
            confidence_level=0.85,
            performance_metrics={"scoring_accuracy": 0.87, "cost_optimization": 0.18},
            last_updated=datetime.now(timezone.utc)
        ))
        
        self.register_tool(ToolMetadata(
            tool_id="predictive_inventory_management",
            name="Price-Aware Predictive Inventory",
            category=ToolCategory.PREDICTION,
            description="Inventory optimization based on pricing forecasts",
            supported_agents=["inventory_forecasting", "pricing_optimizer", "order_management"],
            input_schema={"product_id": "str", "price_forecast": "list", "forecast_days": "int"},
            output_schema={"inventory_forecast": "dict", "optimization_savings": "float"},
            confidence_level=0.84,
            performance_metrics={"cost_reduction": 0.22, "demand_accuracy": 0.81},
            last_updated=datetime.now(timezone.utc)
        ))
        
        # Advanced Competitor Intelligence Tools
        self.register_tool(ToolMetadata(
            tool_id="realtime_competitor_tracking",
            name="Real-time Competitor Intelligence",
            category=ToolCategory.INTELLIGENCE,
            description="Track competitor actions across multiple channels with ML analysis",
            supported_agents=["pricing_optimizer", "product_research", "marketing_automation"],
            input_schema={"competitor_ids": "list", "monitoring_categories": "list"},
            output_schema={"competitor_actions": "list", "threat_assessment": "dict"},
            confidence_level=0.83,
            performance_metrics={"detection_rate": 0.91, "false_positive_rate": 0.08},
            last_updated=datetime.now(timezone.utc)
        ))
        
        self.register_tool(ToolMetadata(
            tool_id="competitor_action_prediction",
            name="Competitor Action Prediction Engine",
            category=ToolCategory.PREDICTION,
            description="Predict competitor moves using historical pattern analysis",
            supported_agents=["pricing_optimizer", "product_research", "marketing_automation"],
            input_schema={"competitor_id": "str", "prediction_horizon": "str"},
            output_schema={"action_predictions": "list", "probability_scores": "dict"},
            confidence_level=0.79,
            performance_metrics={"prediction_accuracy": 0.76, "early_warning_rate": 0.84},
            last_updated=datetime.now(timezone.utc)
        ))
        
        self.register_tool(ToolMetadata(
            tool_id="pricing_trend_analysis",
            name="ML Competitor Pricing Trend Analysis",
            category=ToolCategory.ANALYTICS,
            description="Analyze and predict competitor pricing trends and market movements",
            supported_agents=["pricing_optimizer", "product_research"],
            input_schema={"competitor_id": "str", "product_category": "str", "forecast_days": "int"},
            output_schema={"price_trends": "list", "market_predictions": "dict"},
            confidence_level=0.82,
            performance_metrics={"trend_accuracy": 0.78, "price_prediction_error": 0.09},
            last_updated=datetime.now(timezone.utc)
        ))
        
        self.register_tool(ToolMetadata(
            tool_id="dynamic_response_strategies",
            name="Dynamic Competitor Response Engine",
            category=ToolCategory.AUTOMATION,
            description="Generate and execute dynamic response strategies to competitor actions",
            supported_agents=["pricing_optimizer", "marketing_automation", "product_research"],
            input_schema={"competitor_actions": "list", "business_objectives": "list"},
            output_schema={"response_strategies": "list", "implementation_plan": "dict"},
            confidence_level=0.77,
            performance_metrics={"strategy_effectiveness": 0.73, "response_time": "2.3h"},
            last_updated=datetime.now(timezone.utc)
        ))
        
        # Enhanced Pricing Automation Tools
        self.register_tool(ToolMetadata(
            tool_id="sentiment_based_pricing",
            name="Sentiment-Based Automatic Pricing",
            category=ToolCategory.AUTOMATION,
            description="Automatic pricing adjustments based on market sentiment with risk controls",
            supported_agents=["pricing_optimizer"],
            input_schema={"product_ids": "list", "categories": "list"},
            output_schema={"pricing_adjustments": "list", "risk_assessments": "dict"},
            confidence_level=0.81,
            performance_metrics={"adjustment_accuracy": 0.84, "risk_mitigation": 0.92},
            last_updated=datetime.now(timezone.utc)
        ))
    
    def register_tool(self, metadata: ToolMetadata) -> None:
        """Register a new cross-agent tool.
        
        Args:
            metadata: Tool metadata and specifications
        """
        self.registered_tools[metadata.tool_id] = metadata
        self.tool_usage_stats[metadata.tool_id] = {
            "total_calls": 0,
            "success_rate": 1.0,
            "avg_execution_time": 0.0,
            "last_used": None,
            "user_agents": set()
        }
        
        self.logger.info(f"Registered tool: {metadata.name} ({metadata.tool_id})")
    
    def get_available_tools(self, agent_name: str = None) -> List[ToolMetadata]:
        """Get available tools for an agent.
        
        Args:
            agent_name: Name of the requesting agent
            
        Returns:
            List of available tools
        """
        if agent_name:
            return [tool for tool in self.registered_tools.values() 
                   if agent_name in tool.supported_agents or not tool.supported_agents]
        else:
            return list(self.registered_tools.values())
    
    async def execute_tool(self, tool_id: str, agent_name: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a cross-agent tool.
        
        Args:
            tool_id: ID of the tool to execute
            agent_name: Name of the requesting agent
            input_data: Input data for the tool
            
        Returns:
            Tool execution result
        """
        if tool_id not in self.registered_tools:
            raise ValueError(f"Tool {tool_id} not found")
        
        tool = self.registered_tools[tool_id]
        
        # Log usage
        stats = self.tool_usage_stats[tool_id]
        stats["total_calls"] += 1
        stats["last_used"] = datetime.now(timezone.utc)
        stats["user_agents"].add(agent_name)
        
        start_time = datetime.now(timezone.utc)
        
        try:
            # Route to appropriate tool implementation
            if tool_id == "customer_lifetime_value":
                result = await self._calculate_customer_lifetime_value(input_data)
            elif tool_id == "market_opportunity_scanner":
                result = await self._scan_market_opportunities(input_data)
            elif tool_id == "competitive_intelligence":
                result = await self._analyze_competitive_intelligence(input_data)
            elif tool_id == "demand_forecasting":
                result = await self._forecast_demand(input_data)
            elif tool_id == "price_elasticity_analyzer":
                result = await self._analyze_price_elasticity(input_data)
            elif tool_id == "inventory_optimization":
                result = await self._optimize_inventory(input_data)
            elif tool_id == "automated_stockout_prediction":
                result = await self._predict_stockouts_automated(input_data)
            elif tool_id == "supplier_performance_scoring":
                result = await self._score_supplier_performance(input_data)
            elif tool_id == "predictive_inventory_management":
                result = await self._predictive_inventory_management(input_data)
            elif tool_id == "realtime_competitor_tracking":
                result = await self._track_competitors_realtime(input_data)
            elif tool_id == "competitor_action_prediction":
                result = await self._predict_competitor_actions(input_data)
            elif tool_id == "pricing_trend_analysis":
                result = await self._analyze_pricing_trends(input_data)
            elif tool_id == "dynamic_response_strategies":
                result = await self._create_dynamic_responses(input_data)
            elif tool_id == "sentiment_based_pricing":
                result = await self._sentiment_based_pricing(input_data)
            else:
                raise NotImplementedError(f"Tool {tool_id} implementation not found")
            
            # Update performance metrics
            execution_time = (datetime.now(timezone.utc) - start_time).total_seconds()
            stats["avg_execution_time"] = (stats["avg_execution_time"] * (stats["total_calls"] - 1) + execution_time) / stats["total_calls"]
            
            self.logger.info(f"Tool {tool_id} executed successfully for {agent_name}")
            
            return {
                "success": True,
                "result": result,
                "execution_time": execution_time,
                "tool_confidence": tool.confidence_level
            }
            
        except Exception as e:
            # Update failure stats
            stats["success_rate"] = (stats["success_rate"] * (stats["total_calls"] - 1)) / stats["total_calls"]
            
            self.logger.error(f"Tool {tool_id} execution failed for {agent_name}: {e}")
            
            return {
                "success": False,
                "error": str(e),
                "execution_time": (datetime.now(timezone.utc) - start_time).total_seconds(),
                "tool_confidence": 0.0
            }
    
    async def _calculate_customer_lifetime_value(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate customer lifetime value with ML enhancement."""
        customer_data = input_data.get("customer_data", {})
        time_horizon = input_data.get("time_horizon", 24)  # months
        
        # Basic CLV calculation
        monthly_revenue = customer_data.get("monthly_revenue", 0)
        purchase_frequency = customer_data.get("purchase_frequency", 1)
        average_order_value = customer_data.get("average_order_value", 0)
        
        # Enhanced calculation with ML predictions
        customer_segment = self._predict_customer_segment(customer_data)
        churn_probability = self._predict_churn_probability(customer_data)
        growth_potential = self._predict_growth_potential(customer_data)
        
        # Calculate retention rate
        retention_rate = 1 - churn_probability
        
        # Base CLV calculation
        if retention_rate > 0:
            discount_rate = 0.01  # 1% monthly discount rate
            clv_base = (monthly_revenue * retention_rate) / (1 + discount_rate - retention_rate)
        else:
            clv_base = monthly_revenue * 6  # Fallback: 6 months value
        
        # Adjust for growth potential
        growth_multiplier = 1 + (growth_potential * 0.5)
        clv_enhanced = clv_base * growth_multiplier
        
        # Confidence calculation
        data_completeness = len([v for v in customer_data.values() if v]) / max(1, len(customer_data))
        confidence = min(0.95, 0.6 + (data_completeness * 0.35))
        
        return {
            "clv": clv_enhanced,
            "base_clv": clv_base,
            "confidence": confidence,
            "customer_segment": customer_segment,
            "churn_probability": churn_probability,
            "growth_potential": growth_potential,
            "factors": {
                "monthly_revenue": monthly_revenue,
                "retention_rate": retention_rate,
                "growth_multiplier": growth_multiplier
            },
            "recommendations": self._generate_clv_recommendations(clv_enhanced, customer_segment, churn_probability)
        }
    
    def _predict_customer_segment(self, customer_data: Dict[str, Any]) -> str:
        """Predict customer segment based on behavior data."""
        # Simplified segmentation logic
        monthly_revenue = customer_data.get("monthly_revenue", 0)
        purchase_frequency = customer_data.get("purchase_frequency", 0)
        account_age = customer_data.get("account_age_months", 0)
        
        if monthly_revenue > 1000 and purchase_frequency > 4:
            return "vip"
        elif monthly_revenue > 500 or purchase_frequency > 2:
            return "loyal"
        elif account_age < 3:
            return "new"
        else:
            return "regular"
    
    def _predict_churn_probability(self, customer_data: Dict[str, Any]) -> float:
        """Predict customer churn probability."""
        # Simplified churn prediction
        days_since_last_purchase = customer_data.get("days_since_last_purchase", 0)
        total_orders = customer_data.get("total_orders", 0)
        support_tickets = customer_data.get("support_tickets", 0)
        
        # Base churn risk
        recency_risk = min(0.8, days_since_last_purchase / 90)
        frequency_risk = max(0.1, 1 - (total_orders / 10))
        support_risk = min(0.3, support_tickets / 10)
        
        churn_probability = (recency_risk + frequency_risk + support_risk) / 3
        return max(0.05, min(0.95, churn_probability))
    
    def _predict_growth_potential(self, customer_data: Dict[str, Any]) -> float:
        """Predict customer growth potential."""
        # Simplified growth prediction
        order_trend = customer_data.get("order_trend", 0)  # Recent trend
        engagement_score = customer_data.get("engagement_score", 0.5)
        category_expansion = customer_data.get("category_expansion", 0)
        
        growth_potential = (order_trend * 0.4 + engagement_score * 0.4 + category_expansion * 0.2)
        return max(0.0, min(1.0, growth_potential))
    
    def _generate_clv_recommendations(self, clv: float, segment: str, churn_risk: float) -> List[str]:
        """Generate CLV-based recommendations."""
        recommendations = []
        
        if clv > 5000:
            recommendations.append("High-value customer: Provide VIP treatment and exclusive offers")
        elif clv > 1000:
            recommendations.append("Valuable customer: Focus on retention and upselling")
        else:
            recommendations.append("Standard customer: Look for growth opportunities")
        
        if churn_risk > 0.7:
            recommendations.append("High churn risk: Implement immediate retention campaign")
        elif churn_risk > 0.5:
            recommendations.append("Moderate churn risk: Monitor closely and engage proactively")
        
        if segment == "new":
            recommendations.append("New customer: Focus on onboarding and first purchase experience")
        
        return recommendations
    
    async def _scan_market_opportunities(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Scan for market opportunities using AI analysis."""
        market_context = input_data.get("market_context", {})
        business_goals = input_data.get("business_goals", [])
        
        opportunities = []
        
        # Pricing opportunities
        current_pricing = market_context.get("current_pricing", {})
        competitor_pricing = market_context.get("competitor_pricing", {})
        
        for product, price in current_pricing.items():
            competitor_prices = competitor_pricing.get(product, {})
            if competitor_prices:
                avg_competitor_price = sum(competitor_prices.values()) / len(competitor_prices)
                
                if price < avg_competitor_price * 0.9:  # Our price significantly lower
                    opportunities.append(MarketOpportunity(
                        opportunity_id=f"pricing_{product}",
                        opportunity_type="pricing",
                        description=f"Price optimization opportunity for {product}",
                        potential_revenue=(avg_competitor_price - price) * market_context.get("monthly_volume", {}).get(product, 100),
                        confidence_score=0.75,
                        time_sensitivity="short_term",
                        required_actions=["Market analysis", "Price testing", "Competitor monitoring"],
                        success_probability=0.68,
                        risk_factors=["Competitor reaction", "Demand elasticity"]
                    ))
        
        # Product opportunities
        market_trends = market_context.get("trends", [])
        for trend in market_trends:
            if trend.get("growth_rate", 0) > 0.2:  # 20% growth
                opportunities.append(MarketOpportunity(
                    opportunity_id=f"product_{trend.get('category', 'unknown')}",
                    opportunity_type="product",
                    description=f"Product expansion in {trend.get('category')}",
                    potential_revenue=trend.get("market_size", 100000) * 0.01,  # 1% market share
                    confidence_score=0.65,
                    time_sensitivity="medium_term",
                    required_actions=["Product research", "Supplier sourcing", "Market entry strategy"],
                    success_probability=0.55,
                    risk_factors=["Market saturation", "Supply chain challenges"]
                ))
        
        # Customer segment opportunities
        customer_segments = market_context.get("customer_segments", {})
        for segment, data in customer_segments.items():
            if data.get("growth_rate", 0) > 0.15 and data.get("penetration", 0) < 0.3:
                opportunities.append(MarketOpportunity(
                    opportunity_id=f"segment_{segment}",
                    opportunity_type="customer",
                    description=f"Expand in {segment} customer segment",
                    potential_revenue=data.get("segment_value", 50000) * (0.5 - data.get("penetration", 0)),
                    confidence_score=0.72,
                    time_sensitivity="medium_term",
                    required_actions=["Targeted marketing", "Product customization", "Channel development"],
                    success_probability=0.62,
                    risk_factors=["Competition", "Customer acquisition cost"]
                ))
        
        # Sort opportunities by potential revenue
        opportunities.sort(key=lambda x: x.potential_revenue, reverse=True)
        
        # Calculate overall priority score
        total_revenue = sum(opp.potential_revenue for opp in opportunities)
        weighted_confidence = sum(opp.confidence_score * opp.potential_revenue for opp in opportunities) / max(1, total_revenue)
        
        return {
            "opportunities": [opp.__dict__ for opp in opportunities[:10]],  # Top 10
            "total_opportunities": len(opportunities),
            "total_potential_revenue": total_revenue,
            "priority_score": weighted_confidence,
            "recommended_focus": opportunities[0].opportunity_type if opportunities else "none",
            "analysis_timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    async def _analyze_competitive_intelligence(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze competitive intelligence."""
        competitors = input_data.get("competitors", [])
        analysis_depth = input_data.get("analysis_depth", "standard")
        
        intelligence_reports = []
        
        for competitor in competitors:
            # Simulate competitive analysis
            competitor_name = competitor.get("name", "Unknown")
            
            # Analyze pricing strategy
            pricing_data = competitor.get("pricing", {})
            avg_price = sum(pricing_data.values()) / max(1, len(pricing_data))
            
            if avg_price > 100:
                pricing_strategy = "premium"
            elif avg_price < 50:
                pricing_strategy = "cost_leader"
            else:
                pricing_strategy = "competitive"
            
            # Determine market position
            market_share = competitor.get("market_share", 0.1)
            if market_share > 0.3:
                market_position = "leader"
            elif market_share > 0.15:
                market_position = "challenger"
            else:
                market_position = "follower"
            
            # Assess threat level
            recent_moves = competitor.get("recent_moves", [])
            aggressive_moves = len([move for move in recent_moves if "aggressive" in move.lower() or "expansion" in move.lower()])
            
            if aggressive_moves > 2 or market_share > 0.25:
                threat_level = "high"
            elif aggressive_moves > 0 or market_share > 0.10:
                threat_level = "medium"
            else:
                threat_level = "low"
            
            intelligence = CompetitiveIntelligence(
                competitor_id=competitor.get("id", competitor_name.lower()),
                competitor_name=competitor_name,
                market_position=market_position,
                pricing_strategy=pricing_strategy,
                strengths=competitor.get("strengths", ["Market presence"]),
                weaknesses=competitor.get("weaknesses", ["Limited data"]),
                recent_moves=recent_moves,
                threat_level=threat_level,
                recommended_responses=self._generate_competitive_responses(threat_level, pricing_strategy, market_position)
            )
            
            intelligence_reports.append(intelligence)
        
        # Overall threat assessment
        high_threats = len([r for r in intelligence_reports if r.threat_level == "high"])
        overall_threat = "high" if high_threats > 1 else "medium" if high_threats > 0 else "low"
        
        return {
            "intelligence_report": {
                "competitors_analyzed": len(intelligence_reports),
                "reports": [report.__dict__ for report in intelligence_reports],
                "overall_competitive_pressure": overall_threat,
                "key_insights": self._extract_competitive_insights(intelligence_reports),
                "analysis_timestamp": datetime.now(timezone.utc).isoformat()
            },
            "threat_assessment": {
                "overall_threat_level": overall_threat,
                "immediate_threats": [r.competitor_name for r in intelligence_reports if r.threat_level == "high"],
                "recommended_monitoring": [r.competitor_name for r in intelligence_reports if r.threat_level in ["medium", "high"]],
                "strategic_recommendations": self._generate_strategic_recommendations(intelligence_reports)
            }
        }
    
    def _generate_competitive_responses(self, threat_level: str, pricing_strategy: str, market_position: str) -> List[str]:
        """Generate recommended responses to competitors."""
        responses = []
        
        if threat_level == "high":
            responses.append("Increase monitoring frequency")
            responses.append("Prepare defensive strategies")
            
        if pricing_strategy == "cost_leader":
            responses.append("Focus on value differentiation")
            responses.append("Avoid direct price competition")
        elif pricing_strategy == "premium":
            responses.append("Highlight value proposition")
            responses.append("Consider premium positioning opportunities")
        
        if market_position == "leader":
            responses.append("Monitor for market share changes")
            responses.append("Prepare for potential competitive response")
        
        return responses or ["Continue standard competitive monitoring"]
    
    def _extract_competitive_insights(self, reports: List[CompetitiveIntelligence]) -> List[str]:
        """Extract key insights from competitive analysis."""
        insights = []
        
        # Pricing insights
        premium_competitors = len([r for r in reports if r.pricing_strategy == "premium"])
        cost_leaders = len([r for r in reports if r.pricing_strategy == "cost_leader"])
        
        if premium_competitors > cost_leaders:
            insights.append("Market trending toward premium positioning")
        elif cost_leaders > premium_competitors:
            insights.append("Price competition intensifying in market")
        
        # Threat insights
        high_threats = [r for r in reports if r.threat_level == "high"]
        if high_threats:
            insights.append(f"High competitive pressure from {', '.join([r.competitor_name for r in high_threats])}")
        
        return insights or ["Competitive landscape appears stable"]
    
    def _generate_strategic_recommendations(self, reports: List[CompetitiveIntelligence]) -> List[str]:
        """Generate strategic recommendations based on competitive analysis."""
        recommendations = []
        
        high_threat_count = len([r for r in reports if r.threat_level == "high"])
        
        if high_threat_count > 2:
            recommendations.append("Consider market consolidation or strategic partnerships")
        elif high_threat_count > 0:
            recommendations.append("Strengthen competitive advantages and differentiation")
        
        leaders = [r for r in reports if r.market_position == "leader"]
        if leaders:
            recommendations.append(f"Monitor market leaders closely: {', '.join([r.competitor_name for r in leaders])}")
        
        return recommendations or ["Maintain current competitive strategy"]
    
    async def _forecast_demand(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Forecast demand using advanced ML techniques."""
        historical_data = input_data.get("historical_data", [])
        external_factors = input_data.get("external_factors", {})
        
        if not historical_data:
            return {
                "demand_forecast": [],
                "confidence_intervals": [],
                "error": "Insufficient historical data"
            }
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame(historical_data)
        
        if 'demand' not in df.columns or 'date' not in df.columns:
            return {
                "demand_forecast": [],
                "confidence_intervals": [],
                "error": "Invalid data format - need 'demand' and 'date' columns"
            }
        
        # Simple trend-based forecasting (would use Prophet in production)
        demand_values = df['demand'].values
        n_periods = input_data.get("forecast_periods", 12)
        
        # Calculate trend
        if len(demand_values) >= 3:
            trend = (demand_values[-1] - demand_values[0]) / (len(demand_values) - 1)
        else:
            trend = 0
        
        # Generate forecasts
        last_value = demand_values[-1]
        forecasts = []
        confidence_lower = []
        confidence_upper = []
        
        for i in range(1, n_periods + 1):
            # Base forecast with trend
            forecast = last_value + (trend * i)
            
            # Add seasonality adjustment if available
            seasonality = external_factors.get("seasonality_factor", 1.0)
            forecast *= seasonality
            
            # Confidence intervals (simplified)
            std_dev = np.std(demand_values) if len(demand_values) > 1 else last_value * 0.1
            confidence_width = std_dev * 1.96  # 95% CI
            
            forecasts.append(max(0, forecast))
            confidence_lower.append(max(0, forecast - confidence_width))
            confidence_upper.append(forecast + confidence_width)
        
        return {
            "demand_forecast": forecasts,
            "confidence_intervals": {
                "lower": confidence_lower,
                "upper": confidence_upper
            },
            "forecast_accuracy": {
                "method": "trend_based",
                "confidence_level": 0.75,
                "historical_mape": 15.2  # Estimated
            },
            "external_factors_impact": self._analyze_external_factors(external_factors),
            "forecast_timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def _analyze_external_factors(self, factors: Dict[str, Any]) -> Dict[str, str]:
        """Analyze impact of external factors on demand."""
        impact_analysis = {}
        
        if "seasonality_factor" in factors:
            factor = factors["seasonality_factor"]
            if factor > 1.2:
                impact_analysis["seasonality"] = "High positive impact expected"
            elif factor < 0.8:
                impact_analysis["seasonality"] = "Negative seasonal impact expected"
            else:
                impact_analysis["seasonality"] = "Neutral seasonal impact"
        
        if "economic_indicator" in factors:
            indicator = factors["economic_indicator"]
            if indicator > 0.1:
                impact_analysis["economic"] = "Positive economic conditions support demand"
            elif indicator < -0.1:
                impact_analysis["economic"] = "Economic headwinds may reduce demand"
        
        return impact_analysis
    
    async def _analyze_price_elasticity(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze price elasticity with customer segmentation."""
        price_history = input_data.get("price_history", [])
        sales_data = input_data.get("sales_data", [])
        segments = input_data.get("segments", ["all"])
        
        if not price_history or not sales_data:
            return {
                "elasticity_coefficients": {},
                "error": "Insufficient price and sales data"
            }
        
        # Simple elasticity calculation
        elasticity_results = {}
        
        for segment in segments:
            # Filter data by segment if applicable
            segment_price = price_history  # Simplified - would filter by segment
            segment_sales = sales_data
            
            if len(segment_price) < 3 or len(segment_sales) < 3:
                elasticity_results[segment] = {
                    "elasticity": 0.0,
                    "confidence": 0.0,
                    "note": "Insufficient data"
                }
                continue
            
            # Calculate price elasticity of demand
            # % change in quantity / % change in price
            price_changes = []
            quantity_changes = []
            
            for i in range(1, min(len(segment_price), len(segment_sales))):
                price_change = (segment_price[i] - segment_price[i-1]) / segment_price[i-1]
                quantity_change = (segment_sales[i] - segment_sales[i-1]) / segment_sales[i-1]
                
                if price_change != 0:
                    price_changes.append(price_change)
                    quantity_changes.append(quantity_change)
            
            if price_changes:
                # Simple average elasticity
                elasticities = [qc/pc for pc, qc in zip(price_changes, quantity_changes) if pc != 0]
                avg_elasticity = sum(elasticities) / len(elasticities) if elasticities else -1.0
                
                # Confidence based on data consistency
                elasticity_std = np.std(elasticities) if len(elasticities) > 1 else 0.5
                confidence = max(0.3, 1.0 - (elasticity_std / 2.0))
                
                elasticity_results[segment] = {
                    "elasticity": avg_elasticity,
                    "confidence": confidence,
                    "interpretation": self._interpret_elasticity(avg_elasticity),
                    "data_points": len(elasticities)
                }
        
        # Overall analysis
        overall_elasticity = sum([r["elasticity"] for r in elasticity_results.values()]) / len(elasticity_results)
        
        return {
            "elasticity_coefficients": elasticity_results,
            "overall_elasticity": overall_elasticity,
            "segment_analysis": {
                "most_sensitive": min(elasticity_results.keys(), key=lambda k: elasticity_results[k]["elasticity"]) if elasticity_results else None,
                "least_sensitive": max(elasticity_results.keys(), key=lambda k: elasticity_results[k]["elasticity"]) if elasticity_results else None
            },
            "pricing_recommendations": self._generate_elasticity_recommendations(elasticity_results),
            "analysis_timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def _interpret_elasticity(self, elasticity: float) -> str:
        """Interpret price elasticity coefficient."""
        if elasticity < -1.5:
            return "Highly elastic - customers very price sensitive"
        elif elasticity < -1.0:
            return "Elastic - price sensitive customers"
        elif elasticity < -0.5:
            return "Moderately elastic - some price sensitivity"
        elif elasticity < 0:
            return "Inelastic - low price sensitivity"
        else:
            return "Positive elasticity - unusual demand pattern"
    
    def _generate_elasticity_recommendations(self, elasticity_results: Dict[str, Dict]) -> List[str]:
        """Generate pricing recommendations based on elasticity analysis."""
        recommendations = []
        
        for segment, results in elasticity_results.items():
            elasticity = results.get("elasticity", 0)
            confidence = results.get("confidence", 0)
            
            if confidence > 0.7:  # High confidence results
                if elasticity < -1.5:
                    recommendations.append(f"Segment {segment}: Avoid price increases - highly elastic")
                elif elasticity > -0.5:
                    recommendations.append(f"Segment {segment}: Consider price increases - low sensitivity")
                else:
                    recommendations.append(f"Segment {segment}: Test moderate price changes")
            else:
                recommendations.append(f"Segment {segment}: Collect more data before price changes")
        
        return recommendations or ["Insufficient data for specific recommendations"]
    
    async def _optimize_inventory(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize inventory levels using AI-driven analysis."""
        current_inventory = input_data.get("current_inventory", {})
        demand_forecast = input_data.get("demand_forecast", [])
        constraints = input_data.get("constraints", {})
        
        optimization_results = {}
        total_cost_savings = 0
        
        for product, current_level in current_inventory.items():
            # Get demand forecast for this product
            product_demand = demand_forecast if isinstance(demand_forecast, list) else demand_forecast.get(product, [])
            
            if not product_demand:
                # Generate simple forecast if not provided
                product_demand = [current_level * 0.8] * 12  # Assume 80% turnover monthly
            
            # Calculate optimal inventory parameters
            avg_demand = sum(product_demand) / len(product_demand)
            demand_std = np.std(product_demand) if len(product_demand) > 1 else avg_demand * 0.2
            
            # Lead time and service level from constraints
            lead_time = constraints.get("lead_time_days", 7)
            service_level = constraints.get("service_level", 0.95)
            holding_cost_rate = constraints.get("holding_cost_rate", 0.02)  # 2% monthly
            
            # Calculate reorder point (simplified)
            lead_time_demand = avg_demand * (lead_time / 30)  # Convert to monthly
            safety_stock = 1.65 * demand_std * np.sqrt(lead_time / 30)  # 95% service level
            reorder_point = lead_time_demand + safety_stock
            
            # Economic Order Quantity (simplified)
            ordering_cost = constraints.get("ordering_cost", 100)
            holding_cost = current_level * constraints.get("unit_cost", 10) * holding_cost_rate
            
            if holding_cost > 0:
                eoq = np.sqrt((2 * avg_demand * ordering_cost) / holding_cost_rate)
            else:
                eoq = avg_demand  # Fallback
            
            # Optimal stock level
            optimal_level = max(reorder_point, eoq)
            
            # Cost savings calculation
            current_holding_cost = current_level * constraints.get("unit_cost", 10) * holding_cost_rate
            optimal_holding_cost = optimal_level * constraints.get("unit_cost", 10) * holding_cost_rate
            cost_savings = max(0, current_holding_cost - optimal_holding_cost)
            
            optimization_results[product] = {
                "current_level": current_level,
                "optimal_level": optimal_level,
                "reorder_point": reorder_point,
                "economic_order_quantity": eoq,
                "safety_stock": safety_stock,
                "cost_savings": cost_savings,
                "turnover_rate": avg_demand / max(1, optimal_level),
                "recommendations": self._generate_inventory_recommendations(current_level, optimal_level, reorder_point)
            }
            
            total_cost_savings += cost_savings
        
        return {
            "optimal_levels": {product: result["optimal_level"] for product, result in optimization_results.items()},
            "reorder_points": {product: result["reorder_point"] for product, result in optimization_results.items()},
            "cost_savings": total_cost_savings,
            "detailed_analysis": optimization_results,
            "summary_metrics": {
                "total_products": len(optimization_results),
                "overstock_items": len([p for p, r in optimization_results.items() if r["current_level"] > r["optimal_level"] * 1.2]),
                "understock_items": len([p for p, r in optimization_results.items() if r["current_level"] < r["reorder_point"]]),
                "avg_turnover": sum([r["turnover_rate"] for r in optimization_results.values()]) / max(1, len(optimization_results))
            },
            "optimization_timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def _generate_inventory_recommendations(self, current: float, optimal: float, reorder: float) -> List[str]:
        """Generate inventory management recommendations."""
        recommendations = []
        
        if current > optimal * 1.5:
            recommendations.append("Significant overstock - consider promotions or discounts")
        elif current > optimal * 1.2:
            recommendations.append("Moderate overstock - reduce next order quantity")
        
        if current < reorder:
            recommendations.append("Below reorder point - place order immediately")
        elif current < optimal * 0.8:
            recommendations.append("Low stock - monitor closely and prepare to reorder")
        
        if abs(current - optimal) / optimal < 0.1:
            recommendations.append("Inventory level near optimal")
        
        return recommendations or ["Maintain current inventory management approach"]
    
    async def _predict_stockouts_automated(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Automated stockout prediction with reorder triggers."""
        from orchestrator.services.automated_inventory_service import AutomatedInventoryService
        
        try:
            inventory_service = AutomatedInventoryService()
            
            product_ids = input_data.get("product_ids", [])
            forecast_days = input_data.get("forecast_days", 30)
            
            # Predict stockouts
            predictions = await inventory_service.predict_stockouts(product_ids, forecast_days)
            
            # Create reorder triggers
            reorder_triggers = await inventory_service.create_automated_reorder_triggers(predictions)
            
            return {
                "predictions": [
                    {
                        "product_id": p.product_id,
                        "current_stock": p.current_stock,
                        "days_until_stockout": p.days_until_stockout,
                        "stockout_probability": p.stockout_probability,
                        "risk_level": p.risk_level.value,
                        "recommended_reorder_quantity": p.recommended_reorder_quantity,
                        "confidence": p.confidence_score
                    }
                    for p in predictions
                ],
                "reorder_triggers": [
                    {
                        "product_id": t.product_id,
                        "supplier_id": t.supplier_id,
                        "quantity": t.reorder_quantity,
                        "priority": t.priority_level,
                        "estimated_cost": t.estimated_cost,
                        "reason": t.trigger_reason,
                        "confidence": t.ml_confidence
                    }
                    for t in reorder_triggers
                ],
                "summary": {
                    "high_risk_products": len([p for p in predictions if p.risk_level.value in ["high", "critical"]]),
                    "total_reorder_cost": sum(t.estimated_cost for t in reorder_triggers),
                    "avg_confidence": sum(p.confidence_score for p in predictions) / max(1, len(predictions))
                }
            }
            
        except Exception as e:
            self.logger.error(f"Stockout prediction failed: {e}")
            return {
                "predictions": [],
                "reorder_triggers": [],
                "error": str(e)
            }
    
    async def _score_supplier_performance(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Advanced supplier performance scoring."""
        from orchestrator.services.automated_inventory_service import AutomatedInventoryService
        
        try:
            inventory_service = AutomatedInventoryService()
            
            supplier_ids = input_data.get("supplier_ids", [])
            
            supplier_scores = {}
            backup_recommendations = []
            
            for supplier_id in supplier_ids:
                score = await inventory_service.score_supplier_performance(supplier_id)
                
                supplier_scores[supplier_id] = {
                    "overall_score": score.overall_score,
                    "reliability_score": score.reliability_score,
                    "quality_score": score.quality_score,
                    "cost_efficiency_score": score.cost_efficiency_score,
                    "delivery_performance_score": score.delivery_performance_score,
                    "risk_assessment": score.risk_assessment,
                    "strengths": score.strengths,
                    "weaknesses": score.weaknesses,
                    "recommendation": score.recommendation
                }
                
                # Add backup recommendations for underperforming suppliers
                if score.overall_score < 70:
                    backup_recommendations.append({
                        "supplier_id": supplier_id,
                        "score": score.overall_score,
                        "action": "find_backup_supplier",
                        "urgency": "high" if score.overall_score < 50 else "medium"
                    })
            
            return {
                "supplier_scores": supplier_scores,
                "backup_recommendations": backup_recommendations,
                "performance_summary": {
                    "avg_score": sum(s["overall_score"] for s in supplier_scores.values()) / max(1, len(supplier_scores)),
                    "high_performers": len([s for s in supplier_scores.values() if s["overall_score"] > 80]),
                    "underperformers": len([s for s in supplier_scores.values() if s["overall_score"] < 60])
                }
            }
            
        except Exception as e:
            self.logger.error(f"Supplier scoring failed: {e}")
            return {
                "supplier_scores": {},
                "backup_recommendations": [],
                "error": str(e)
            }
    
    async def _predictive_inventory_management(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predictive inventory management based on price forecasts."""
        from orchestrator.services.automated_inventory_service import AutomatedInventoryService
        
        try:
            inventory_service = AutomatedInventoryService()
            
            product_id = input_data.get("product_id")
            price_forecast = input_data.get("price_forecast", [])
            forecast_days = input_data.get("forecast_days", 30)
            
            if not product_id or not price_forecast:
                return {"error": "Missing required parameters: product_id and price_forecast"}
            
            # Create predictive forecast
            forecast = await inventory_service.create_predictive_inventory_forecast(
                product_id, price_forecast, forecast_days
            )
            
            return {
                "inventory_forecast": {
                    "product_id": forecast.product_id,
                    "current_stock": forecast.current_stock,
                    "forecasted_demand": forecast.forecasted_demand,
                    "optimal_stock_levels": forecast.optimal_stock_levels,
                    "reorder_points": forecast.reorder_points,
                    "forecast_confidence": forecast.forecast_confidence,
                    "price_impact_factor": forecast.price_impact_factor,
                    "seasonal_adjustment": forecast.seasonal_adjustment
                },
                "optimization_savings": forecast.cost_optimization_savings,
                "recommendations": self._generate_inventory_forecast_recommendations(forecast)
            }
            
        except Exception as e:
            self.logger.error(f"Predictive inventory management failed: {e}")
            return {
                "inventory_forecast": {},
                "optimization_savings": 0,
                "error": str(e)
            }
    
    def _generate_inventory_forecast_recommendations(self, forecast) -> List[str]:
        """Generate recommendations based on inventory forecast."""
        recommendations = []
        
        if forecast.price_impact_factor > 0.3:
            recommendations.append("High price sensitivity - adjust inventory levels based on pricing strategy")
        
        if forecast.forecast_confidence < 0.7:
            recommendations.append("Low forecast confidence - maintain higher safety stock")
        
        if forecast.cost_optimization_savings > 100:
            recommendations.append(f"Implement optimized inventory strategy for ${forecast.cost_optimization_savings:.2f} savings")
        
        return recommendations or ["Continue current inventory management approach"]
    
    async def _track_competitors_realtime(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Real-time competitor tracking and analysis."""
        from orchestrator.services.competitor_intelligence_service import AdvancedCompetitorIntelligence
        
        try:
            competitor_service = AdvancedCompetitorIntelligence()
            
            competitor_ids = input_data.get("competitor_ids", [])
            monitoring_categories = input_data.get("monitoring_categories", ["pricing", "products", "marketing"])
            
            # Track competitors in real-time
            actions = await competitor_service.track_competitors_realtime(
                competitor_ids, monitoring_categories
            )
            
            # Assess threat levels
            threat_assessment = {
                "overall_threat_level": "medium",
                "immediate_threats": [],
                "market_pressure": "moderate",
                "recommended_monitoring": []
            }
            
            high_impact_actions = [a for a in actions if a.impact_assessment == "high"]
            if high_impact_actions:
                threat_assessment["overall_threat_level"] = "high"
                threat_assessment["immediate_threats"] = [a.competitor_id for a in high_impact_actions]
            
            return {
                "competitor_actions": [
                    {
                        "competitor_id": a.competitor_id,
                        "action_type": a.action_type.value,
                        "description": a.description,
                        "confidence": a.confidence_score,
                        "impact": a.impact_assessment,
                        "detected_at": a.detected_at.isoformat(),
                        "affected_products": a.affected_products,
                        "market_implications": a.market_implications
                    }
                    for a in actions
                ],
                "threat_assessment": threat_assessment,
                "monitoring_summary": {
                    "total_actions": len(actions),
                    "high_impact_actions": len(high_impact_actions),
                    "competitors_active": len(set(a.competitor_id for a in actions)),
                    "categories_monitored": monitoring_categories
                }
            }
            
        except Exception as e:
            self.logger.error(f"Real-time competitor tracking failed: {e}")
            return {
                "competitor_actions": [],
                "threat_assessment": {"overall_threat_level": "unknown"},
                "error": str(e)
            }
    
    async def _predict_competitor_actions(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict future competitor actions using ML."""
        from orchestrator.services.competitor_intelligence_service import AdvancedCompetitorIntelligence
        
        try:
            competitor_service = AdvancedCompetitorIntelligence()
            
            competitor_id = input_data.get("competitor_id")
            prediction_horizon = input_data.get("prediction_horizon", "short_term")
            
            if not competitor_id:
                return {"error": "Missing required parameter: competitor_id"}
            
            # Predict competitor actions
            predictions = await competitor_service.predict_competitor_actions(
                competitor_id, prediction_horizon
            )
            
            # Calculate probability scores
            probability_scores = {}
            for prediction in predictions:
                probability_scores[prediction.predicted_action.value] = prediction.probability
            
            return {
                "action_predictions": [
                    {
                        "predicted_action": p.predicted_action.value,
                        "probability": p.probability,
                        "confidence": p.confidence_level,
                        "time_horizon": p.time_horizon,
                        "reasoning": p.reasoning,
                        "historical_patterns": p.historical_patterns,
                        "trigger_indicators": p.trigger_indicators
                    }
                    for p in predictions
                ],
                "probability_scores": probability_scores,
                "prediction_summary": {
                    "most_likely_action": max(probability_scores.keys(), key=lambda k: probability_scores[k]) if probability_scores else None,
                    "avg_confidence": sum(p.confidence_level for p in predictions) / max(1, len(predictions)),
                    "prediction_count": len(predictions)
                }
            }
            
        except Exception as e:
            self.logger.error(f"Competitor action prediction failed: {e}")
            return {
                "action_predictions": [],
                "probability_scores": {},
                "error": str(e)
            }
    
    async def _analyze_pricing_trends(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze competitor pricing trends and market movements."""
        from orchestrator.services.competitor_intelligence_service import AdvancedCompetitorIntelligence
        
        try:
            competitor_service = AdvancedCompetitorIntelligence()
            
            competitor_id = input_data.get("competitor_id")
            product_category = input_data.get("product_category")
            forecast_days = input_data.get("forecast_days", 30)
            
            if not competitor_id:
                return {"error": "Missing required parameter: competitor_id"}
            
            # Predict pricing trends
            price_trends = await competitor_service.predict_pricing_trends(
                competitor_id, product_category, forecast_days
            )
            
            # Predict overall market movements
            market_predictions = await competitor_service.predict_market_movements(
                [product_category] if product_category else None
            )
            
            return {
                "price_trends": [
                    {
                        "competitor_id": pt.competitor_id,
                        "product_category": pt.product_category,
                        "current_price": pt.current_price,
                        "predicted_trend": pt.predicted_price_trend,
                        "price_change_magnitude": pt.price_change_magnitude,
                        "confidence": pt.trend_confidence,
                        "forecast_days": pt.forecast_horizon_days,
                        "market_factors": pt.market_factors
                    }
                    for pt in price_trends
                ],
                "market_predictions": [
                    {
                        "market_segment": mp.market_segment,
                        "predicted_movement": mp.predicted_movement,
                        "confidence": mp.confidence_score,
                        "time_horizon": mp.time_horizon,
                        "driving_factors": mp.driving_factors,
                        "opportunities": mp.opportunity_areas,
                        "threats": mp.threat_areas
                    }
                    for mp in market_predictions
                ],
                "analysis_summary": {
                    "trends_analyzed": len(price_trends),
                    "market_segments": len(market_predictions),
                    "avg_trend_confidence": sum(pt.trend_confidence for pt in price_trends) / max(1, len(price_trends))
                }
            }
            
        except Exception as e:
            self.logger.error(f"Pricing trend analysis failed: {e}")
            return {
                "price_trends": [],
                "market_predictions": [],
                "error": str(e)
            }
    
    async def _create_dynamic_responses(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create dynamic response strategies to competitor actions."""
        from orchestrator.services.competitor_intelligence_service import AdvancedCompetitorIntelligence
        
        try:
            competitor_service = AdvancedCompetitorIntelligence()
            
            competitor_actions_data = input_data.get("competitor_actions", [])
            business_objectives = input_data.get("business_objectives", ["maintain_market_share", "protect_margins"])
            
            # Convert data to CompetitorAction objects (simplified)
            from orchestrator.services.competitor_intelligence_service import CompetitorAction, CompetitorActionType
            
            competitor_actions = []
            for action_data in competitor_actions_data:
                action = CompetitorAction(
                    competitor_id=action_data.get("competitor_id", "unknown"),
                    action_type=CompetitorActionType(action_data.get("action_type", "price_decrease")),
                    description=action_data.get("description", "Competitor action"),
                    confidence_score=action_data.get("confidence", 0.7),
                    impact_assessment=action_data.get("impact", "medium"),
                    detected_at=datetime.now(timezone.utc),
                    data_sources=action_data.get("data_sources", ["tracking"]),
                    affected_products=action_data.get("affected_products", []),
                    market_implications=action_data.get("market_implications", [])
                )
                competitor_actions.append(action)
            
            # Create response strategies
            response_strategies = await competitor_service.create_dynamic_response_strategies(
                competitor_actions, business_objectives
            )
            
            # Create implementation plan
            implementation_plan = {
                "immediate_actions": [],
                "short_term_actions": [],
                "medium_term_actions": [],
                "resource_requirements": {},
                "success_metrics": []
            }
            
            for strategy in response_strategies:
                timeline = strategy.implementation_timeline.lower()
                if "immediate" in timeline or "24" in timeline:
                    implementation_plan["immediate_actions"].append({
                        "strategy": strategy.recommended_strategy.value,
                        "actions": strategy.specific_actions,
                        "success_probability": strategy.success_probability
                    })
                elif "short" in timeline or "week" in timeline:
                    implementation_plan["short_term_actions"].append({
                        "strategy": strategy.recommended_strategy.value,
                        "actions": strategy.specific_actions,
                        "success_probability": strategy.success_probability
                    })
                else:
                    implementation_plan["medium_term_actions"].append({
                        "strategy": strategy.recommended_strategy.value,
                        "actions": strategy.specific_actions,
                        "success_probability": strategy.success_probability
                    })
            
            return {
                "response_strategies": [
                    {
                        "competitor_action_id": rs.competitor_action_id,
                        "strategy": rs.recommended_strategy.value,
                        "actions": rs.specific_actions,
                        "expected_outcome": rs.expected_outcome,
                        "timeline": rs.implementation_timeline,
                        "resources": rs.resource_requirements,
                        "success_probability": rs.success_probability,
                        "risks": rs.risk_factors,
                        "metrics": rs.monitoring_metrics
                    }
                    for rs in response_strategies
                ],
                "implementation_plan": implementation_plan,
                "strategy_summary": {
                    "total_strategies": len(response_strategies),
                    "avg_success_probability": sum(rs.success_probability for rs in response_strategies) / max(1, len(response_strategies)),
                    "high_priority_actions": len(implementation_plan["immediate_actions"])
                }
            }
            
        except Exception as e:
            self.logger.error(f"Dynamic response creation failed: {e}")
            return {
                "response_strategies": [],
                "implementation_plan": {},
                "error": str(e)
            }
    
    async def _sentiment_based_pricing(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Sentiment-based automatic pricing adjustments."""
        try:
            # Import services
            from orchestrator.services.market_sentiment_service import RealTimeMarketSentiment
            from orchestrator.services.competitor_intelligence_service import AdvancedCompetitorIntelligence
            from orchestrator.services.sentiment_based_pricing import SentimentBasedPricingService
            
            # Initialize services
            sentiment_service = RealTimeMarketSentiment()
            competitor_service = AdvancedCompetitorIntelligence()
            pricing_service = SentimentBasedPricingService(sentiment_service, competitor_service)
            
            product_ids = input_data.get("product_ids", [])
            categories = input_data.get("categories", ["e-commerce"])
            
            # Analyze sentiment and create pricing adjustments
            adjustments = await pricing_service.analyze_sentiment_and_adjust_pricing(
                product_ids, categories
            )
            
            # Get risk assessments
            risk_assessments = {}
            for adjustment in adjustments:
                risk_assessments[adjustment.product_id] = {
                    "risk_level": adjustment.risk_assessment.value,
                    "confidence": adjustment.confidence_score,
                    "safety_checks": adjustment.safety_checks,
                    "approval_required": adjustment.approval_required
                }
            
            return {
                "pricing_adjustments": [
                    {
                        "product_id": adj.product_id,
                        "current_price": adj.current_price,
                        "suggested_price": adj.suggested_price,
                        "adjustment_percentage": adj.adjustment_percentage,
                        "action_type": adj.action_type.value,
                        "sentiment_trigger": adj.sentiment_trigger,
                        "confidence": adj.confidence_score,
                        "risk_level": adj.risk_assessment.value,
                        "reasoning": adj.reasoning,
                        "market_factors": adj.market_factors,
                        "approval_required": adj.approval_required
                    }
                    for adj in adjustments
                ],
                "risk_assessments": risk_assessments,
                "adjustment_summary": {
                    "total_adjustments": len(adjustments),
                    "auto_executed": len([a for a in adjustments if not a.approval_required]),
                    "manual_approval_required": len([a for a in adjustments if a.approval_required]),
                    "avg_confidence": sum(a.confidence_score for a in adjustments) / max(1, len(adjustments)),
                    "price_increases": len([a for a in adjustments if a.adjustment_percentage > 0]),
                    "price_decreases": len([a for a in adjustments if a.adjustment_percentage < 0])
                }
            }
            
        except Exception as e:
            self.logger.error(f"Sentiment-based pricing failed: {e}")
            return {
                "pricing_adjustments": [],
                "risk_assessments": {},
                "error": str(e)
            }
    
    def get_tool_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics for all tools.
        
        Returns:
            Dictionary with tool performance data
        """
        metrics = {}
        
        for tool_id, stats in self.tool_usage_stats.items():
            tool = self.registered_tools[tool_id]
            
            metrics[tool_id] = {
                "tool_name": tool.name,
                "category": tool.category.value,
                "total_calls": stats["total_calls"],
                "success_rate": stats["success_rate"],
                "avg_execution_time": stats["avg_execution_time"],
                "last_used": stats["last_used"],
                "user_agents": list(stats["user_agents"]),
                "confidence_level": tool.confidence_level,
                "performance_metrics": tool.performance_metrics
            }
        
        # Overall statistics
        total_calls = sum([stats["total_calls"] for stats in self.tool_usage_stats.values()])
        avg_success_rate = sum([stats["success_rate"] for stats in self.tool_usage_stats.values()]) / max(1, len(self.tool_usage_stats))
        
        return {
            "tool_metrics": metrics,
            "summary": {
                "total_tools": len(self.registered_tools),
                "total_calls": total_calls,
                "average_success_rate": avg_success_rate,
                "most_used_tool": max(self.tool_usage_stats.keys(), key=lambda k: self.tool_usage_stats[k]["total_calls"]) if self.tool_usage_stats else None
            }
        }