"""AI-powered pricing recommendation service.

This service provides intelligent pricing recommendations based on:
- Competitor pricing data
- Market trends and analysis
- Historical performance data
- AI-powered market positioning analysis
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import openai
import requests
from dataclasses import dataclass


@dataclass
class PriceRecommendation:
    """AI pricing recommendation with confidence score."""
    product_id: str
    current_price: float
    recommended_price: float
    confidence: float  # 0.0 to 1.0
    reasoning: str
    market_positioning: str  # "aggressive", "competitive", "premium"
    expected_impact: str
    risk_level: str  # "low", "medium", "high"


@dataclass
class MarketAnalysis:
    """Market analysis data for pricing decisions."""
    competitor_prices: Dict[str, float]
    market_trend: str  # "rising", "falling", "stable"
    price_sensitivity: float
    competitive_intensity: float
    recommended_positioning: str


class AIPricingService:
    """AI-powered pricing recommendation service."""
    
    def __init__(self, openai_api_key: str, model: str = "gpt-4"):
        """Initialize the AI pricing service.
        
        Args:
            openai_api_key: OpenAI API key
            model: OpenAI model to use for analysis
        """
        self.client = openai.OpenAI(api_key=openai_api_key)
        self.model = model
        self.logger = logging.getLogger(__name__)
        
    async def analyze_market_conditions(
        self, 
        product_id: str,
        competitor_prices: Dict[str, float],
        historical_prices: List[Dict[str, any]] = None
    ) -> MarketAnalysis:
        """Analyze market conditions for pricing decisions.
        
        Args:
            product_id: Product identifier
            competitor_prices: Mapping of competitor names to prices
            historical_prices: Historical pricing data
            
        Returns:
            MarketAnalysis object with market insights
        """
        try:
            # Prepare market data for AI analysis
            market_data = {
                "product_id": product_id,
                "competitor_prices": competitor_prices,
                "price_range": {
                    "min": min(competitor_prices.values()) if competitor_prices else 0,
                    "max": max(competitor_prices.values()) if competitor_prices else 0,
                    "avg": sum(competitor_prices.values()) / len(competitor_prices) if competitor_prices else 0
                },
                "historical_data": historical_prices or []
            }
            
            # AI prompt for market analysis
            prompt = self._build_market_analysis_prompt(market_data)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert e-commerce pricing strategist with deep knowledge of competitive pricing, market analysis, and consumer behavior."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=800
            )
            
            # Parse AI response
            analysis_text = response.choices[0].message.content
            market_analysis = self._parse_market_analysis(analysis_text, competitor_prices)
            
            self.logger.info(f"Market analysis completed for {product_id}")
            return market_analysis
            
        except Exception as e:
            self.logger.error(f"Error analyzing market conditions: {e}")
            # Return fallback analysis
            return self._fallback_market_analysis(competitor_prices)
    
    async def generate_pricing_recommendation(
        self,
        product_id: str,
        current_price: float,
        market_analysis: MarketAnalysis,
        business_objectives: Dict[str, any] = None
    ) -> PriceRecommendation:
        """Generate AI-powered pricing recommendation.
        
        Args:
            product_id: Product identifier
            current_price: Current product price
            market_analysis: Market analysis data
            business_objectives: Business goals (profit_margin, market_share, etc.)
            
        Returns:
            PriceRecommendation with detailed analysis
        """
        try:
            objectives = business_objectives or {
                "primary_goal": "balanced_growth",
                "min_margin": 0.15,
                "max_discount": 0.30
            }
            
            # Build AI prompt for pricing recommendation
            prompt = self._build_pricing_prompt(
                product_id, current_price, market_analysis, objectives
            )
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert pricing strategist. Analyze the market data and provide a specific pricing recommendation with confidence score (0.0-1.0), detailed reasoning, and risk assessment."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=1000
            )
            
            # Parse recommendation
            recommendation_text = response.choices[0].message.content
            recommendation = self._parse_pricing_recommendation(
                product_id, current_price, recommendation_text
            )
            
            self.logger.info(f"Pricing recommendation generated for {product_id}: ${recommendation.recommended_price:.2f} (confidence: {recommendation.confidence:.2f})")
            return recommendation
            
        except Exception as e:
            self.logger.error(f"Error generating pricing recommendation: {e}")
            # Return fallback recommendation
            return self._fallback_recommendation(product_id, current_price, market_analysis)
    
    def _build_market_analysis_prompt(self, market_data: Dict) -> str:
        """Build AI prompt for market analysis."""
        return f"""
        Analyze the following market data for pricing strategy:
        
        Product ID: {market_data['product_id']}
        Competitor Prices: {json.dumps(market_data['competitor_prices'], indent=2)}
        Price Statistics:
        - Min: ${market_data['price_range']['min']:.2f}
        - Max: ${market_data['price_range']['max']:.2f}
        - Average: ${market_data['price_range']['avg']:.2f}
        
        Historical Data Points: {len(market_data['historical_data'])}
        
        Please provide:
        1. Market trend analysis (rising/falling/stable)
        2. Price sensitivity assessment (0.0-1.0)
        3. Competitive intensity level (0.0-1.0)
        4. Recommended market positioning (aggressive/competitive/premium)
        
        Format your response as structured analysis with clear metrics.
        """
    
    def _build_pricing_prompt(
        self, 
        product_id: str, 
        current_price: float, 
        analysis: MarketAnalysis,
        objectives: Dict
    ) -> str:
        """Build AI prompt for pricing recommendation."""
        return f"""
        Generate a pricing recommendation based on this analysis:
        
        Product: {product_id}
        Current Price: ${current_price:.2f}
        
        Market Analysis:
        - Competitor Prices: {json.dumps(analysis.competitor_prices, indent=2)}
        - Market Trend: {analysis.market_trend}
        - Price Sensitivity: {analysis.price_sensitivity:.2f}
        - Competitive Intensity: {analysis.competitive_intensity:.2f}
        - Recommended Positioning: {analysis.recommended_positioning}
        
        Business Objectives:
        - Primary Goal: {objectives.get('primary_goal', 'balanced_growth')}
        - Min Margin: {objectives.get('min_margin', 0.15)*100:.1f}%
        - Max Discount: {objectives.get('max_discount', 0.30)*100:.1f}%
        
        Provide:
        1. Recommended price (specific dollar amount)
        2. Confidence score (0.0-1.0)
        3. Detailed reasoning (2-3 sentences)
        4. Market positioning strategy
        5. Expected business impact
        6. Risk assessment (low/medium/high)
        
        Format as structured recommendation with clear price and confidence.
        """
    
    def _parse_market_analysis(self, analysis_text: str, competitor_prices: Dict[str, float]) -> MarketAnalysis:
        """Parse AI market analysis response."""
        try:
            # Simple parsing - in production, use more robust JSON parsing
            lines = analysis_text.lower()
            
            # Determine trend
            if "rising" in lines or "increasing" in lines:
                trend = "rising"
            elif "falling" in lines or "decreasing" in lines:
                trend = "falling"
            else:
                trend = "stable"
            
            # Extract sensitivity (fallback to heuristic)
            price_sensitivity = 0.7  # Default moderate sensitivity
            if "high sensitivity" in lines or "very sensitive" in lines:
                price_sensitivity = 0.9
            elif "low sensitivity" in lines or "not sensitive" in lines:
                price_sensitivity = 0.3
            
            # Extract competitive intensity
            competitive_intensity = 0.6  # Default moderate competition
            if "intense" in lines or "high competition" in lines:
                competitive_intensity = 0.9
            elif "low competition" in lines or "limited competition" in lines:
                competitive_intensity = 0.3
            
            # Determine positioning
            positioning = "competitive"
            if "premium" in lines:
                positioning = "premium"
            elif "aggressive" in lines:
                positioning = "aggressive"
            
            return MarketAnalysis(
                competitor_prices=competitor_prices,
                market_trend=trend,
                price_sensitivity=price_sensitivity,
                competitive_intensity=competitive_intensity,
                recommended_positioning=positioning
            )
            
        except Exception as e:
            self.logger.error(f"Error parsing market analysis: {e}")
            return self._fallback_market_analysis(competitor_prices)
    
    def _parse_pricing_recommendation(self, product_id: str, current_price: float, text: str) -> PriceRecommendation:
        """Parse AI pricing recommendation response."""
        try:
            lines = text.lower()
            
            # Extract recommended price
            import re
            price_match = re.search(r'\$?([0-9,]+\.?[0-9]*)', text)
            recommended_price = float(price_match.group(1).replace(',', '')) if price_match else current_price
            
            # Extract confidence score
            confidence_match = re.search(r'confidence[:\s]*([0-9]*\.?[0-9]+)', lines)
            confidence = float(confidence_match.group(1)) if confidence_match else 0.5
            confidence = min(1.0, max(0.0, confidence))
            
            # Determine risk level
            risk_level = "medium"
            if "high risk" in lines or "risky" in lines:
                risk_level = "high"
            elif "low risk" in lines or "safe" in lines:
                risk_level = "low"
            
            # Positioning
            positioning = "competitive"
            if "premium" in lines:
                positioning = "premium"
            elif "aggressive" in lines:
                positioning = "aggressive"
            
            return PriceRecommendation(
                product_id=product_id,
                current_price=current_price,
                recommended_price=recommended_price,
                confidence=confidence,
                reasoning=text[:200] + "..." if len(text) > 200 else text,
                market_positioning=positioning,
                expected_impact="Price optimization based on AI analysis",
                risk_level=risk_level
            )
            
        except Exception as e:
            self.logger.error(f"Error parsing pricing recommendation: {e}")
            return self._fallback_recommendation(product_id, current_price, None)
    
    def _fallback_market_analysis(self, competitor_prices: Dict[str, float]) -> MarketAnalysis:
        """Provide fallback market analysis when AI fails."""
        return MarketAnalysis(
            competitor_prices=competitor_prices,
            market_trend="stable",
            price_sensitivity=0.7,
            competitive_intensity=0.6,
            recommended_positioning="competitive"
        )
    
    def _fallback_recommendation(self, product_id: str, current_price: float, analysis: Optional[MarketAnalysis]) -> PriceRecommendation:
        """Provide fallback recommendation when AI fails."""
        # Simple heuristic: competitive pricing
        if analysis and analysis.competitor_prices:
            avg_competitor_price = sum(analysis.competitor_prices.values()) / len(analysis.competitor_prices)
            recommended_price = avg_competitor_price * 0.95  # 5% below average
        else:
            recommended_price = current_price * 0.95  # 5% reduction as fallback
            
        return PriceRecommendation(
            product_id=product_id,
            current_price=current_price,
            recommended_price=round(recommended_price, 2),
            confidence=0.6,
            reasoning="Fallback competitive pricing strategy",
            market_positioning="competitive",
            expected_impact="Conservative price adjustment",
            risk_level="low"
        )