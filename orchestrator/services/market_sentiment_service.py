"""Real-time market sentiment analysis service.

This service analyzes market sentiment from various sources to enhance
pricing predictions and provide early warning signals for market shifts.
"""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

import pandas as pd
import requests
from textblob import TextBlob
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer


class SentimentLevel(Enum):
    """Market sentiment levels."""
    VERY_NEGATIVE = "very_negative"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    POSITIVE = "positive"
    VERY_POSITIVE = "very_positive"


@dataclass
class SentimentScore:
    """Sentiment analysis result."""
    sentiment_level: SentimentLevel
    confidence: float  # 0.0 to 1.0
    polarity: float    # -1.0 to 1.0
    subjectivity: float # 0.0 to 1.0
    compound_score: float # -1.0 to 1.0 (VADER)
    source_count: int
    timestamp: datetime


@dataclass
class MarketSentimentData:
    """Market sentiment analysis data."""
    overall_sentiment: SentimentScore
    trend_analysis: str  # "rising", "falling", "stable"
    volatility_index: float  # 0.0 to 1.0
    confidence_forecast: float  # Predicted confidence for next period
    risk_factors: List[str]
    opportunity_indicators: List[str]
    sentiment_history: List[SentimentScore]


class RealTimeMarketSentiment:
    """Real-time market sentiment analysis service."""

    def __init__(self):
        """Initialize sentiment analysis service."""
        self.logger = logging.getLogger(__name__)
        self.vader_analyzer = SentimentIntensityAnalyzer()
        self.sentiment_history: List[SentimentScore] = []

        # Data sources configuration
        self.data_sources = {
            'news_api': {
                'enabled': bool(os.getenv('NEWS_API_KEY')),
                'api_key': os.getenv('NEWS_API_KEY'),
                'base_url': 'https://newsapi.org/v2'
            },
            'reddit_api': {
                'enabled': bool(os.getenv('REDDIT_CLIENT_ID')),
                'client_id': os.getenv('REDDIT_CLIENT_ID'),
                'client_secret': os.getenv('REDDIT_CLIENT_SECRET'),
                'user_agent': 'RoyalEquipsOrchestrator/1.0'
            },
            'twitter_api': {
                'enabled': bool(os.getenv('TWITTER_BEARER_TOKEN')),
                'bearer_token': os.getenv('TWITTER_BEARER_TOKEN')
            }
        }

        self.logger.info(f"Market sentiment service initialized with {sum(1 for s in self.data_sources.values() if s['enabled'])} active data sources")

    async def analyze_market_sentiment(self,
                                     product_category: str = "e-commerce",
                                     keywords: List[str] = None) -> MarketSentimentData:
        """Analyze current market sentiment for given category/keywords.
        
        Args:
            product_category: Product category to analyze
            keywords: Specific keywords to focus on
            
        Returns:
            Market sentiment analysis data
        """
        self.logger.info(f"Analyzing market sentiment for: {product_category}")

        if keywords is None:
            keywords = self._get_default_keywords(product_category)

        # Gather sentiment data from multiple sources
        sentiment_sources = await asyncio.gather(
            self._analyze_news_sentiment(keywords),
            self._analyze_social_media_sentiment(keywords),
            self._analyze_market_indicators(product_category),
            return_exceptions=True
        )

        # Combine and process sentiment data
        combined_sentiment = self._combine_sentiment_sources(sentiment_sources)

        # Analyze trends and forecast
        trend_analysis = self._analyze_sentiment_trends()
        volatility_index = self._calculate_volatility_index()
        confidence_forecast = self._predict_confidence_score()

        # Identify risk factors and opportunities
        risk_factors = self._identify_risk_factors(combined_sentiment, trend_analysis)
        opportunity_indicators = self._identify_opportunities(combined_sentiment, trend_analysis)

        # Store sentiment history
        self.sentiment_history.append(combined_sentiment)
        if len(self.sentiment_history) > 1000:  # Keep last 1000 records
            self.sentiment_history = self.sentiment_history[-1000:]

        return MarketSentimentData(
            overall_sentiment=combined_sentiment,
            trend_analysis=trend_analysis,
            volatility_index=volatility_index,
            confidence_forecast=confidence_forecast,
            risk_factors=risk_factors,
            opportunity_indicators=opportunity_indicators,
            sentiment_history=self.sentiment_history[-24:]  # Last 24 periods
        )

    def _get_default_keywords(self, product_category: str) -> List[str]:
        """Get default keywords for product category."""
        keyword_map = {
            "e-commerce": ["online shopping", "retail", "consumer", "sales", "pricing"],
            "electronics": ["electronics", "tech", "gadgets", "consumer electronics"],
            "automotive": ["car", "automotive", "vehicle", "auto parts"],
            "fashion": ["fashion", "clothing", "apparel", "style"],
            "home": ["home", "furniture", "home improvement", "decor"]
        }
        return keyword_map.get(product_category, ["market", "business", "economy"])

    async def _analyze_news_sentiment(self, keywords: List[str]) -> Optional[SentimentScore]:
        """Analyze sentiment from news sources."""
        if not self.data_sources['news_api']['enabled']:
            return None

        try:
            api_key = self.data_sources['news_api']['api_key']
            base_url = self.data_sources['news_api']['base_url']

            # Search for recent news articles
            query = ' OR '.join(keywords[:3])  # Limit to top 3 keywords
            url = f"{base_url}/everything"
            params = {
                'q': query,
                'language': 'en',
                'sortBy': 'publishedAt',
                'from': (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat(),
                'apiKey': api_key,
                'pageSize': 50
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            news_data = response.json()
            articles = news_data.get('articles', [])

            if not articles:
                return self._create_neutral_sentiment("news", 0)

            # Analyze sentiment of headlines and descriptions
            sentiments = []
            for article in articles:
                text = f"{article.get('title', '')} {article.get('description', '')}"
                if text.strip():
                    sentiment = self._analyze_text_sentiment(text)
                    sentiments.append(sentiment)

            if not sentiments:
                return self._create_neutral_sentiment("news", 0)

            # Aggregate sentiments
            avg_polarity = sum(s['polarity'] for s in sentiments) / len(sentiments)
            avg_subjectivity = sum(s['subjectivity'] for s in sentiments) / len(sentiments)
            avg_compound = sum(s['compound'] for s in sentiments) / len(sentiments)

            sentiment_level = self._determine_sentiment_level(avg_polarity, avg_compound)
            confidence = min(0.9, abs(avg_compound) + 0.1)  # Higher confidence for stronger sentiments

            return SentimentScore(
                sentiment_level=sentiment_level,
                confidence=confidence,
                polarity=avg_polarity,
                subjectivity=avg_subjectivity,
                compound_score=avg_compound,
                source_count=len(sentiments),
                timestamp=datetime.now(timezone.utc)
            )

        except Exception as e:
            self.logger.error(f"Error analyzing news sentiment: {e}")
            return self._create_neutral_sentiment("news", 0)

    async def _analyze_social_media_sentiment(self, keywords: List[str]) -> Optional[SentimentScore]:
        """Analyze sentiment from social media sources."""
        # For demo purposes, we'll simulate social media sentiment analysis
        # In production, this would integrate with Reddit API, Twitter API, etc.

        try:
            # Simulate API call delay
            await asyncio.sleep(0.1)

            # Generate realistic sentiment based on keywords and current market conditions
            import hashlib
            import random

            # Create deterministic "sentiment" based on keywords
            keyword_hash = hashlib.md5(''.join(keywords).encode()).hexdigest()
            random.seed(int(keyword_hash[:8], 16))

            # Simulate market sentiment with some volatility
            base_sentiment = random.uniform(-0.3, 0.4)  # Slightly positive bias for e-commerce
            noise = random.uniform(-0.2, 0.2)
            compound_score = max(-1.0, min(1.0, base_sentiment + noise))

            polarity = compound_score * 0.8  # Slightly dampened
            subjectivity = random.uniform(0.3, 0.8)

            sentiment_level = self._determine_sentiment_level(polarity, compound_score)
            confidence = min(0.85, abs(compound_score) + random.uniform(0.1, 0.3))

            return SentimentScore(
                sentiment_level=sentiment_level,
                confidence=confidence,
                polarity=polarity,
                subjectivity=subjectivity,
                compound_score=compound_score,
                source_count=random.randint(15, 50),
                timestamp=datetime.now(timezone.utc)
            )

        except Exception as e:
            self.logger.error(f"Error analyzing social media sentiment: {e}")
            return self._create_neutral_sentiment("social_media", 0)

    async def _analyze_market_indicators(self, product_category: str) -> Optional[SentimentScore]:
        """Analyze sentiment from market indicators and economic data."""
        try:
            # Simulate analysis of market indicators
            # In production, this would analyze:
            # - Stock market performance for relevant sectors
            # - Economic indicators
            # - Consumer confidence indices
            # - Retail sales data

            await asyncio.sleep(0.1)  # Simulate API call

            # Generate market-based sentiment
            import random

            # Different categories have different market sentiment patterns
            category_bias = {
                "e-commerce": 0.15,     # Generally positive growth
                "electronics": 0.05,    # Moderate growth
                "automotive": -0.05,    # Slight challenges
                "fashion": 0.10,        # Positive trends
                "home": 0.08            # Strong market
            }

            base_bias = category_bias.get(product_category, 0.0)
            market_noise = random.uniform(-0.15, 0.15)
            compound_score = max(-1.0, min(1.0, base_bias + market_noise))

            polarity = compound_score * 0.9
            subjectivity = 0.4  # Market data is more objective

            sentiment_level = self._determine_sentiment_level(polarity, compound_score)
            confidence = min(0.90, abs(compound_score) + 0.2)  # Higher confidence in market data

            return SentimentScore(
                sentiment_level=sentiment_level,
                confidence=confidence,
                polarity=polarity,
                subjectivity=subjectivity,
                compound_score=compound_score,
                source_count=1,  # Single aggregated market indicator
                timestamp=datetime.now(timezone.utc)
            )

        except Exception as e:
            self.logger.error(f"Error analyzing market indicators: {e}")
            return self._create_neutral_sentiment("market_indicators", 0)

    def _analyze_text_sentiment(self, text: str) -> Dict[str, float]:
        """Analyze sentiment of text using both TextBlob and VADER."""
        # TextBlob analysis
        blob = TextBlob(text)
        tb_polarity = blob.sentiment.polarity
        tb_subjectivity = blob.sentiment.subjectivity

        # VADER analysis
        vader_scores = self.vader_analyzer.polarity_scores(text)

        return {
            'polarity': tb_polarity,
            'subjectivity': tb_subjectivity,
            'compound': vader_scores['compound'],
            'positive': vader_scores['pos'],
            'negative': vader_scores['neg'],
            'neutral': vader_scores['neu']
        }

    def _determine_sentiment_level(self, polarity: float, compound: float) -> SentimentLevel:
        """Determine sentiment level from scores."""
        # Use compound score as primary indicator
        if compound >= 0.5:
            return SentimentLevel.VERY_POSITIVE
        elif compound >= 0.1:
            return SentimentLevel.POSITIVE
        elif compound <= -0.5:
            return SentimentLevel.VERY_NEGATIVE
        elif compound <= -0.1:
            return SentimentLevel.NEGATIVE
        else:
            return SentimentLevel.NEUTRAL

    def _combine_sentiment_sources(self, sentiment_sources: List[Optional[SentimentScore]]) -> SentimentScore:
        """Combine sentiment data from multiple sources."""
        valid_sources = [s for s in sentiment_sources if s is not None and not isinstance(s, Exception)]

        if not valid_sources:
            return self._create_neutral_sentiment("combined", 0)

        # Weighted combination of sources
        weights = {
            'news': 0.4,
            'social_media': 0.35,
            'market_indicators': 0.25
        }

        total_weight = 0
        weighted_polarity = 0
        weighted_subjectivity = 0
        weighted_compound = 0
        weighted_confidence = 0
        total_sources = 0

        for i, sentiment in enumerate(valid_sources):
            source_type = ['news', 'social_media', 'market_indicators'][i]
            weight = weights.get(source_type, 0.33)

            weighted_polarity += sentiment.polarity * weight
            weighted_subjectivity += sentiment.subjectivity * weight
            weighted_compound += sentiment.compound_score * weight
            weighted_confidence += sentiment.confidence * weight
            total_weight += weight
            total_sources += sentiment.source_count

        # Normalize by total weight
        if total_weight > 0:
            avg_polarity = weighted_polarity / total_weight
            avg_subjectivity = weighted_subjectivity / total_weight
            avg_compound = weighted_compound / total_weight
            avg_confidence = weighted_confidence / total_weight
        else:
            avg_polarity = 0.0
            avg_subjectivity = 0.5
            avg_compound = 0.0
            avg_confidence = 0.5

        sentiment_level = self._determine_sentiment_level(avg_polarity, avg_compound)

        return SentimentScore(
            sentiment_level=sentiment_level,
            confidence=avg_confidence,
            polarity=avg_polarity,
            subjectivity=avg_subjectivity,
            compound_score=avg_compound,
            source_count=total_sources,
            timestamp=datetime.now(timezone.utc)
        )

    def _analyze_sentiment_trends(self) -> str:
        """Analyze sentiment trends over time."""
        if len(self.sentiment_history) < 3:
            return "stable"

        # Look at last few sentiment scores
        recent_scores = [s.compound_score for s in self.sentiment_history[-5:]]

        if len(recent_scores) < 3:
            return "stable"

        # Calculate trend
        early_avg = sum(recent_scores[:len(recent_scores)//2]) / (len(recent_scores)//2)
        late_avg = sum(recent_scores[len(recent_scores)//2:]) / (len(recent_scores) - len(recent_scores)//2)

        trend_threshold = 0.1
        if late_avg > early_avg + trend_threshold:
            return "rising"
        elif late_avg < early_avg - trend_threshold:
            return "falling"
        else:
            return "stable"

    def _calculate_volatility_index(self) -> float:
        """Calculate market sentiment volatility index."""
        if len(self.sentiment_history) < 5:
            return 0.3  # Default moderate volatility

        # Calculate standard deviation of recent compound scores
        recent_scores = [s.compound_score for s in self.sentiment_history[-10:]]

        if len(recent_scores) < 2:
            return 0.3

        std_dev = pd.Series(recent_scores).std()

        # Normalize to 0-1 scale (assuming max std dev of 0.5 for compound scores)
        volatility = min(1.0, std_dev / 0.5)

        return volatility

    def _predict_confidence_score(self) -> float:
        """Predict confidence score for next period based on trends."""
        if len(self.sentiment_history) < 3:
            return 70.0  # Default confidence

        # Simple trend-based prediction
        recent_confidences = [s.confidence * 100 for s in self.sentiment_history[-5:]]
        recent_compounds = [s.compound_score for s in self.sentiment_history[-5:]]

        # Base prediction on recent average
        base_confidence = sum(recent_confidences) / len(recent_confidences)

        # Adjust based on sentiment trend
        trend = self._analyze_sentiment_trends()
        if trend == "rising":
            adjustment = 5.0
        elif trend == "falling":
            adjustment = -5.0
        else:
            adjustment = 0.0

        # Adjust based on volatility
        volatility = self._calculate_volatility_index()
        volatility_penalty = volatility * 10  # Higher volatility reduces confidence

        predicted_confidence = base_confidence + adjustment - volatility_penalty

        return max(30.0, min(95.0, predicted_confidence))

    def _identify_risk_factors(self, sentiment: SentimentScore, trend: str) -> List[str]:
        """Identify market risk factors based on sentiment analysis."""
        risk_factors = []

        if sentiment.sentiment_level in [SentimentLevel.NEGATIVE, SentimentLevel.VERY_NEGATIVE]:
            risk_factors.append("Negative market sentiment detected")

        if trend == "falling":
            risk_factors.append("Declining sentiment trend")

        if sentiment.confidence < 0.6:
            risk_factors.append("Low confidence in sentiment analysis")

        volatility = self._calculate_volatility_index()
        if volatility > 0.7:
            risk_factors.append("High market volatility")

        if sentiment.subjectivity > 0.8:
            risk_factors.append("Highly subjective market sentiment")

        return risk_factors or ["No significant risk factors detected"]

    def _identify_opportunities(self, sentiment: SentimentScore, trend: str) -> List[str]:
        """Identify market opportunities based on sentiment analysis."""
        opportunities = []

        if sentiment.sentiment_level in [SentimentLevel.POSITIVE, SentimentLevel.VERY_POSITIVE]:
            opportunities.append("Positive market sentiment for price optimization")

        if trend == "rising":
            opportunities.append("Rising sentiment trend favors aggressive pricing")

        if sentiment.confidence > 0.8:
            opportunities.append("High confidence allows for automated decisions")

        volatility = self._calculate_volatility_index()
        if volatility < 0.3:
            opportunities.append("Low volatility enables stable pricing strategies")

        if sentiment.compound_score > 0.3 and trend in ["rising", "stable"]:
            opportunities.append("Market conditions favorable for price increases")

        return opportunities or ["Market conditions are neutral"]

    def _create_neutral_sentiment(self, source: str, source_count: int) -> SentimentScore:
        """Create a neutral sentiment score."""
        return SentimentScore(
            sentiment_level=SentimentLevel.NEUTRAL,
            confidence=0.5,
            polarity=0.0,
            subjectivity=0.5,
            compound_score=0.0,
            source_count=source_count,
            timestamp=datetime.now(timezone.utc)
        )

    def get_sentiment_alerts(self, threshold_config: Dict[str, float] = None) -> List[Dict[str, Any]]:
        """Get sentiment-based alerts for pricing decisions.
        
        Args:
            threshold_config: Custom thresholds for alerts
            
        Returns:
            List of sentiment alerts
        """
        if not self.sentiment_history:
            return []

        # Default thresholds
        thresholds = {
            'negative_sentiment': -0.3,
            'positive_sentiment': 0.3,
            'high_volatility': 0.7,
            'low_confidence': 0.5,
            'trend_change': 0.2
        }

        if threshold_config:
            thresholds.update(threshold_config)

        alerts = []
        current_sentiment = self.sentiment_history[-1]
        volatility = self._calculate_volatility_index()
        trend = self._analyze_sentiment_trends()

        # Negative sentiment alert
        if current_sentiment.compound_score < thresholds['negative_sentiment']:
            alerts.append({
                'type': 'negative_sentiment',
                'severity': 'high' if current_sentiment.compound_score < -0.5 else 'medium',
                'message': f"Negative market sentiment detected: {current_sentiment.compound_score:.2f}",
                'recommended_action': 'Consider defensive pricing strategies',
                'timestamp': current_sentiment.timestamp
            })

        # Positive sentiment alert
        if current_sentiment.compound_score > thresholds['positive_sentiment']:
            alerts.append({
                'type': 'positive_sentiment',
                'severity': 'low',
                'message': f"Positive market sentiment detected: {current_sentiment.compound_score:.2f}",
                'recommended_action': 'Consider aggressive pricing opportunities',
                'timestamp': current_sentiment.timestamp
            })

        # High volatility alert
        if volatility > thresholds['high_volatility']:
            alerts.append({
                'type': 'high_volatility',
                'severity': 'high',
                'message': f"High market volatility: {volatility:.2f}",
                'recommended_action': 'Increase confidence thresholds and manual review',
                'timestamp': current_sentiment.timestamp
            })

        # Low confidence alert
        if current_sentiment.confidence < thresholds['low_confidence']:
            alerts.append({
                'type': 'low_confidence',
                'severity': 'medium',
                'message': f"Low sentiment analysis confidence: {current_sentiment.confidence:.2f}",
                'recommended_action': 'Gather more data sources or delay pricing decisions',
                'timestamp': current_sentiment.timestamp
            })

        # Trend change alert
        if len(self.sentiment_history) >= 5:
            prev_trend_scores = [s.compound_score for s in self.sentiment_history[-5:-2]]
            curr_trend_scores = [s.compound_score for s in self.sentiment_history[-3:]]

            prev_avg = sum(prev_trend_scores) / len(prev_trend_scores) if prev_trend_scores else 0
            curr_avg = sum(curr_trend_scores) / len(curr_trend_scores) if curr_trend_scores else 0

            if abs(curr_avg - prev_avg) > thresholds['trend_change']:
                direction = "positive" if curr_avg > prev_avg else "negative"
                alerts.append({
                    'type': 'trend_change',
                    'severity': 'medium',
                    'message': f"Significant sentiment trend change detected: {direction}",
                    'recommended_action': f'Review pricing rules for {direction} market shift',
                    'timestamp': current_sentiment.timestamp
                })

        return alerts
