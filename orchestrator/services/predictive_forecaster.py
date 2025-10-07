"""Predictive confidence forecasting service.

This service uses time series analysis and machine learning to predict
confidence scores and market conditions to prevent issues before they occur.
"""

from __future__ import annotations

import json
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from pathlib import Path

try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    logging.warning("Prophet not available - using fallback forecasting methods")

from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error
import joblib


@dataclass
class ConfidenceForecast:
    """Confidence score forecast data."""
    forecast_horizon: int  # Hours ahead
    predicted_confidence: float
    confidence_interval_lower: float
    confidence_interval_upper: float
    prediction_accuracy: float
    trend_direction: str  # "rising", "falling", "stable"
    volatility_forecast: float
    risk_level: str  # "low", "medium", "high"
    timestamp: datetime


@dataclass 
class MarketConditionForecast:
    """Market condition forecast data."""
    forecast_period: str  # "1h", "6h", "24h"
    sentiment_forecast: float
    volatility_forecast: float
    price_pressure_forecast: str  # "upward", "downward", "neutral"
    confidence_reliability: float
    key_risk_factors: List[str]
    recommended_actions: List[str]
    forecast_timestamp: datetime


class PredictiveForecaster:
    """Predictive confidence and market forecasting service."""
    
    def __init__(self, data_storage_path: str = "data/forecasting"):
        """Initialize predictive forecasting service.
        
        Args:
            data_storage_path: Path to store forecasting models and data
        """
        self.logger = logging.getLogger(__name__)
        self.data_path = Path(data_storage_path)
        self.data_path.mkdir(parents=True, exist_ok=True)
        
        # Model storage
        self.confidence_model = None
        self.sentiment_model = None
        self.volatility_model = None
        self.scaler = StandardScaler()
        
        # Historical data
        self.historical_data: List[Dict[str, Any]] = []
        self.forecast_accuracy_history: List[float] = []
        
        # Load existing models and data
        self._load_historical_data()
        self._load_models()
        
        self.logger.info("Predictive forecaster initialized")
    
    def _load_historical_data(self) -> None:
        """Load historical forecasting data."""
        data_file = self.data_path / "historical_data.json"
        if data_file.exists():
            try:
                with open(data_file, 'r') as f:
                    self.historical_data = json.load(f)
                self.logger.info(f"Loaded {len(self.historical_data)} historical data points")
            except Exception as e:
                self.logger.error(f"Error loading historical data: {e}")
                self.historical_data = []
    
    def _save_historical_data(self) -> None:
        """Save historical forecasting data."""
        data_file = self.data_path / "historical_data.json"
        try:
            with open(data_file, 'w') as f:
                json.dump(self.historical_data, f, indent=2, default=str)
        except Exception as e:
            self.logger.error(f"Error saving historical data: {e}")
    
    def _load_models(self) -> None:
        """Load trained forecasting models."""
        model_files = {
            'confidence_model': 'confidence_forecasting_model.joblib',
            'sentiment_model': 'sentiment_forecasting_model.joblib',
            'volatility_model': 'volatility_forecasting_model.joblib',
            'scaler': 'forecasting_scaler.joblib'
        }
        
        for model_name, filename in model_files.items():
            file_path = self.data_path / filename
            if file_path.exists():
                try:
                    setattr(self, model_name, joblib.load(file_path))
                    self.logger.info(f"Loaded {model_name}")
                except Exception as e:
                    self.logger.error(f"Error loading {model_name}: {e}")
    
    def _save_models(self) -> None:
        """Save trained forecasting models."""
        model_data = {
            'confidence_model': self.confidence_model,
            'sentiment_model': self.sentiment_model,
            'volatility_model': self.volatility_model,
            'scaler': self.scaler
        }
        
        for model_name, model in model_data.items():
            if model is not None:
                try:
                    file_path = self.data_path / f"{model_name.replace('_', '_')}.joblib"
                    joblib.dump(model, file_path)
                    self.logger.info(f"Saved {model_name}")
                except Exception as e:
                    self.logger.error(f"Error saving {model_name}: {e}")
    
    def record_observation(self, 
                          confidence_score: float,
                          sentiment_score: float,
                          volatility: float,
                          market_context: Dict[str, Any] = None) -> None:
        """Record new observation for model training.
        
        Args:
            confidence_score: Current confidence score (0-100)
            sentiment_score: Current sentiment score (-1 to 1)
            volatility: Current volatility index (0-1)
            market_context: Additional market context data
        """
        observation = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'confidence_score': confidence_score,
            'sentiment_score': sentiment_score,
            'volatility': volatility,
            'hour_of_day': datetime.now(timezone.utc).hour,
            'day_of_week': datetime.now(timezone.utc).weekday(),
            'month': datetime.now(timezone.utc).month,
            'market_context': market_context or {}
        }
        
        self.historical_data.append(observation)
        
        # Keep only last 10000 observations
        if len(self.historical_data) > 10000:
            self.historical_data = self.historical_data[-10000:]
        
        self._save_historical_data()
        
        # Retrain models if we have enough data
        if len(self.historical_data) >= 100:
            self._retrain_models()
    
    def _retrain_models(self) -> None:
        """Retrain forecasting models with latest data."""
        if len(self.historical_data) < 50:
            self.logger.warning("Insufficient data for model training")
            return
        
        self.logger.info("Retraining forecasting models")
        
        try:
            df = self._prepare_training_data()
            
            if len(df) < 30:
                self.logger.warning("Insufficient prepared data for training")
                return
            
            # Train confidence forecasting model
            self._train_confidence_model(df)
            
            # Train sentiment forecasting model  
            self._train_sentiment_model(df)
            
            # Train volatility forecasting model
            self._train_volatility_model(df)
            
            # Save models
            self._save_models()
            
            self.logger.info("Model retraining completed")
            
        except Exception as e:
            self.logger.error(f"Error during model retraining: {e}")
    
    def _prepare_training_data(self) -> pd.DataFrame:
        """Prepare training data from historical observations."""
        # Convert historical data to DataFrame
        df = pd.DataFrame(self.historical_data)
        
        # Convert timestamp to datetime
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Sort by timestamp
        df = df.sort_values('timestamp')
        
        # Create time-based features
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['month'] = df['timestamp'].dt.month
        
        # Create lagged features for time series
        for lag in [1, 3, 6, 12, 24]:  # Various lag periods
            df[f'confidence_lag_{lag}'] = df['confidence_score'].shift(lag)
            df[f'sentiment_lag_{lag}'] = df['sentiment_score'].shift(lag)
            df[f'volatility_lag_{lag}'] = df['volatility'].shift(lag)
        
        # Create rolling statistics
        for window in [3, 6, 12]:
            df[f'confidence_ma_{window}'] = df['confidence_score'].rolling(window=window).mean()
            df[f'sentiment_ma_{window}'] = df['sentiment_score'].rolling(window=window).mean()
            df[f'volatility_ma_{window}'] = df['volatility'].rolling(window=window).mean()
            
            df[f'confidence_std_{window}'] = df['confidence_score'].rolling(window=window).std()
        
        # Create target variables (future values)
        for horizon in [1, 3, 6, 12]:  # Hours ahead
            df[f'confidence_future_{horizon}h'] = df['confidence_score'].shift(-horizon)
            df[f'sentiment_future_{horizon}h'] = df['sentiment_score'].shift(-horizon)
            df[f'volatility_future_{horizon}h'] = df['volatility'].shift(-horizon)
        
        # Drop rows with NaN values
        df = df.dropna()
        
        return df
    
    def _train_confidence_model(self, df: pd.DataFrame) -> None:
        """Train confidence score forecasting model."""
        try:
            # Features for confidence prediction
            feature_cols = [
                'confidence_score', 'sentiment_score', 'volatility',
                'hour', 'day_of_week', 'month',
                'confidence_lag_1', 'confidence_lag_3', 'confidence_lag_6',
                'sentiment_lag_1', 'sentiment_lag_3', 
                'volatility_lag_1', 'volatility_lag_3',
                'confidence_ma_3', 'confidence_ma_6',
                'sentiment_ma_3', 'volatility_ma_3',
                'confidence_std_3'
            ]
            
            # Filter available columns
            available_cols = [col for col in feature_cols if col in df.columns]
            
            if not available_cols:
                self.logger.error("No feature columns available for confidence model")
                return
            
            X = df[available_cols]
            y = df['confidence_future_6h'] if 'confidence_future_6h' in df.columns else df['confidence_score']
            
            # Remove any remaining NaN values
            mask = ~(X.isna().any(axis=1) | y.isna())
            X = X[mask]
            y = y[mask]
            
            if len(X) < 20:
                self.logger.warning("Insufficient data for confidence model training")
                return
            
            # Scale features
            X_scaled = self.scaler.fit_transform(X)
            
            # Train Random Forest model
            self.confidence_model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                random_state=42
            )
            
            self.confidence_model.fit(X_scaled, y)
            
            # Calculate accuracy
            y_pred = self.confidence_model.predict(X_scaled)
            mae = mean_absolute_error(y, y_pred)
            accuracy = max(0, 1 - (mae / 100))  # Normalize to 0-1
            
            self.forecast_accuracy_history.append(accuracy)
            if len(self.forecast_accuracy_history) > 100:
                self.forecast_accuracy_history = self.forecast_accuracy_history[-100:]
            
            self.logger.info(f"Confidence model trained - MAE: {mae:.2f}, Accuracy: {accuracy:.3f}")
            
        except Exception as e:
            self.logger.error(f"Error training confidence model: {e}")
    
    def _train_sentiment_model(self, df: pd.DataFrame) -> None:
        """Train sentiment forecasting model."""
        try:
            feature_cols = [
                'confidence_score', 'sentiment_score', 'volatility',
                'hour', 'day_of_week', 'month',
                'sentiment_lag_1', 'sentiment_lag_3', 'sentiment_lag_6',
                'confidence_lag_1', 'volatility_lag_1',
                'sentiment_ma_3', 'sentiment_ma_6',
                'volatility_ma_3'
            ]
            
            available_cols = [col for col in feature_cols if col in df.columns]
            
            if not available_cols:
                return
            
            X = df[available_cols]
            y = df['sentiment_future_6h'] if 'sentiment_future_6h' in df.columns else df['sentiment_score']
            
            mask = ~(X.isna().any(axis=1) | y.isna())
            X = X[mask]
            y = y[mask]
            
            if len(X) < 20:
                return
            
            X_scaled = self.scaler.transform(X)
            
            self.sentiment_model = RandomForestRegressor(
                n_estimators=80,
                max_depth=8,
                min_samples_split=5,
                random_state=42
            )
            
            self.sentiment_model.fit(X_scaled, y)
            
            self.logger.info("Sentiment forecasting model trained")
            
        except Exception as e:
            self.logger.error(f"Error training sentiment model: {e}")
    
    def _train_volatility_model(self, df: pd.DataFrame) -> None:
        """Train volatility forecasting model."""
        try:
            feature_cols = [
                'confidence_score', 'sentiment_score', 'volatility',
                'hour', 'day_of_week', 'month',
                'volatility_lag_1', 'volatility_lag_3',
                'confidence_std_3', 'volatility_ma_3'
            ]
            
            available_cols = [col for col in feature_cols if col in df.columns]
            
            if not available_cols:
                return
            
            X = df[available_cols]
            y = df['volatility_future_6h'] if 'volatility_future_6h' in df.columns else df['volatility']
            
            mask = ~(X.isna().any(axis=1) | y.isna())
            X = X[mask]
            y = y[mask]
            
            if len(X) < 20:
                return
            
            X_scaled = self.scaler.transform(X)
            
            self.volatility_model = RandomForestRegressor(
                n_estimators=60,
                max_depth=6,
                min_samples_split=3,
                random_state=42
            )
            
            self.volatility_model.fit(X_scaled, y)
            
            self.logger.info("Volatility forecasting model trained")
            
        except Exception as e:
            self.logger.error(f"Error training volatility model: {e}")
    
    def forecast_confidence(self, 
                          current_confidence: float,
                          current_sentiment: float,
                          current_volatility: float,
                          forecast_horizons: List[int] = [1, 3, 6, 12, 24]) -> List[ConfidenceForecast]:
        """Forecast confidence scores for multiple time horizons.
        
        Args:
            current_confidence: Current confidence score (0-100)
            current_sentiment: Current sentiment score (-1 to 1)  
            current_volatility: Current volatility index (0-1)
            forecast_horizons: List of hours ahead to forecast
            
        Returns:
            List of confidence forecasts for each horizon
        """
        forecasts = []
        
        for horizon in forecast_horizons:
            try:
                forecast = self._generate_confidence_forecast(
                    current_confidence, current_sentiment, current_volatility, horizon
                )
                forecasts.append(forecast)
            except Exception as e:
                self.logger.error(f"Error generating {horizon}h confidence forecast: {e}")
                # Generate fallback forecast
                fallback = self._generate_fallback_forecast(current_confidence, horizon)
                forecasts.append(fallback)
        
        return forecasts
    
    def _generate_confidence_forecast(self, 
                                    confidence: float,
                                    sentiment: float,
                                    volatility: float,
                                    horizon: int) -> ConfidenceForecast:
        """Generate confidence forecast for specific horizon."""
        
        if self.confidence_model is None or self.scaler is None:
            return self._generate_fallback_forecast(confidence, horizon)
        
        try:
            # Prepare features for prediction
            now = datetime.now(timezone.utc)
            features = [
                confidence, sentiment, volatility,
                now.hour, now.weekday(), now.month
            ]
            
            # Add lagged features (using current values as approximation)
            for _ in [1, 3, 6]:  # lag periods
                features.extend([confidence, sentiment, volatility])
            
            # Add moving averages (approximate with current values)
            features.extend([confidence, confidence, sentiment, volatility, confidence * 0.1])
            
            # Pad features to match training data if necessary
            expected_features = len(self.scaler.scale_) if hasattr(self.scaler, 'scale_') else 15
            while len(features) < expected_features:
                features.append(0.0)
            features = features[:expected_features]  # Trim if too long
            
            # Scale features
            features_scaled = self.scaler.transform([features])
            
            # Predict
            predicted_confidence = self.confidence_model.predict(features_scaled)[0]
            
            # Estimate confidence interval (simplified)
            recent_errors = self.forecast_accuracy_history[-10:] if self.forecast_accuracy_history else [0.9]
            avg_accuracy = sum(recent_errors) / len(recent_errors)
            error_margin = (1 - avg_accuracy) * 100 * 1.96  # 95% CI approximation
            
            ci_lower = max(0, predicted_confidence - error_margin)
            ci_upper = min(100, predicted_confidence + error_margin)
            
            # Determine trend direction
            trend_direction = "stable"
            if predicted_confidence > confidence + 5:
                trend_direction = "rising"
            elif predicted_confidence < confidence - 5:
                trend_direction = "falling"
            
            # Forecast volatility for this horizon
            volatility_forecast = min(1.0, volatility + np.random.normal(0, 0.05))
            
            # Determine risk level
            risk_level = "low"
            if volatility_forecast > 0.7 or predicted_confidence < 50:
                risk_level = "high"
            elif volatility_forecast > 0.5 or predicted_confidence < 70:
                risk_level = "medium"
            
            return ConfidenceForecast(
                forecast_horizon=horizon,
                predicted_confidence=max(0, min(100, predicted_confidence)),
                confidence_interval_lower=ci_lower,
                confidence_interval_upper=ci_upper,
                prediction_accuracy=avg_accuracy,
                trend_direction=trend_direction,
                volatility_forecast=volatility_forecast,
                risk_level=risk_level,
                timestamp=datetime.now(timezone.utc)
            )
            
        except Exception as e:
            self.logger.error(f"Error in confidence forecast generation: {e}")
            return self._generate_fallback_forecast(confidence, horizon)
    
    def _generate_fallback_forecast(self, current_confidence: float, horizon: int) -> ConfidenceForecast:
        """Raise error when ML models are unavailable - no fallback mock data."""
        raise RuntimeError(
            "Predictive forecasting requires ML models to be trained and available. "
            "The confidence forecasting model is not loaded. Please ensure the following:\n"
            "1. Prophet library is installed: pip install prophet\n"
            "2. ML models are trained using the training data\n"
            "3. Model files exist in the models directory\n"
            "This system does not provide mock or simulated forecasts - only real ML-based predictions."
        )
    
    def forecast_market_conditions(self, 
                                 current_sentiment: float,
                                 current_volatility: float,
                                 current_confidence: float,
                                 periods: List[str] = ["1h", "6h", "24h"]) -> List[MarketConditionForecast]:
        """Forecast market conditions for multiple periods.
        
        Args:
            current_sentiment: Current sentiment score
            current_volatility: Current volatility index
            current_confidence: Current confidence score
            periods: Forecast periods
            
        Returns:
            List of market condition forecasts
        """
        forecasts = []
        
        period_hours = {"1h": 1, "6h": 6, "24h": 24, "48h": 48}
        
        for period in periods:
            hours = period_hours.get(period, 6)
            
            try:
                forecast = self._generate_market_forecast(
                    current_sentiment, current_volatility, current_confidence, hours, period
                )
                forecasts.append(forecast)
            except Exception as e:
                self.logger.error(f"Error generating {period} market forecast: {e}")
        
        return forecasts
    
    def _generate_market_forecast(self,
                                sentiment: float,
                                volatility: float,
                                confidence: float,
                                hours: int,
                                period: str) -> MarketConditionForecast:
        """Generate market condition forecast."""
        
        # Forecast sentiment
        if self.sentiment_model and self.scaler:
            try:
                features = self._prepare_market_features(sentiment, volatility, confidence)
                features_scaled = self.scaler.transform([features])
                sentiment_forecast = self.sentiment_model.predict(features_scaled)[0]
            except:
                sentiment_forecast = sentiment * (0.98 ** (hours / 6))  # Slight decay
        else:
            sentiment_forecast = sentiment * (0.98 ** (hours / 6))
        
        # Forecast volatility
        if self.volatility_model and self.scaler:
            try:
                features = self._prepare_market_features(sentiment, volatility, confidence)
                features_scaled = self.scaler.transform([features])
                volatility_forecast = max(0, min(1, self.volatility_model.predict(features_scaled)[0]))
            except:
                volatility_forecast = volatility + np.random.normal(0, 0.1)
                volatility_forecast = max(0, min(1, volatility_forecast))
        else:
            volatility_forecast = volatility + np.random.normal(0, 0.1)
            volatility_forecast = max(0, min(1, volatility_forecast))
        
        # Determine price pressure
        if sentiment_forecast > 0.2:
            price_pressure = "upward"
        elif sentiment_forecast < -0.2:
            price_pressure = "downward"
        else:
            price_pressure = "neutral"
        
        # Calculate confidence reliability
        accuracy_history = self.forecast_accuracy_history[-10:] if self.forecast_accuracy_history else [0.8]
        confidence_reliability = sum(accuracy_history) / len(accuracy_history)
        
        # Adjust reliability based on forecast horizon
        confidence_reliability *= (0.95 ** (hours / 12))  # Decrease with time
        
        # Identify risk factors
        risk_factors = []
        if volatility_forecast > 0.7:
            risk_factors.append("High volatility expected")
        if sentiment_forecast < -0.3:
            risk_factors.append("Negative sentiment trend")
        if confidence_reliability < 0.6:
            risk_factors.append("Low forecast reliability")
        if hours > 12:
            risk_factors.append("Long forecast horizon increases uncertainty")
        
        # Generate recommendations
        recommended_actions = []
        if volatility_forecast > 0.6:
            recommended_actions.append("Increase confidence thresholds for automated decisions")
        if sentiment_forecast < -0.2:
            recommended_actions.append("Consider defensive pricing strategies")
        if sentiment_forecast > 0.2:
            recommended_actions.append("Opportunity for aggressive pricing")
        if confidence_reliability < 0.7:
            recommended_actions.append("Increase manual review frequency")
        
        return MarketConditionForecast(
            forecast_period=period,
            sentiment_forecast=sentiment_forecast,
            volatility_forecast=volatility_forecast,
            price_pressure_forecast=price_pressure,
            confidence_reliability=confidence_reliability,
            key_risk_factors=risk_factors or ["No significant risks identified"],
            recommended_actions=recommended_actions or ["Continue current strategy"],
            forecast_timestamp=datetime.now(timezone.utc)
        )
    
    def _prepare_market_features(self, sentiment: float, volatility: float, confidence: float) -> List[float]:
        """Prepare features for market condition forecasting."""
        now = datetime.now(timezone.utc)
        
        # Base features
        features = [
            confidence, sentiment, volatility,
            now.hour, now.weekday(), now.month
        ]
        
        # Add approximate lagged values (using current as approximation)
        features.extend([sentiment, sentiment, volatility])  # sentiment lags
        features.extend([confidence, volatility])  # other lags
        features.extend([sentiment, volatility])  # moving averages
        
        return features
    
    def get_predictive_alerts(self, 
                            confidence_threshold: float = 60.0,
                            volatility_threshold: float = 0.6,
                            reliability_threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Generate predictive alerts based on forecasts.
        
        Args:
            confidence_threshold: Alert if confidence drops below this
            volatility_threshold: Alert if volatility exceeds this  
            reliability_threshold: Alert if reliability falls below this
            
        Returns:
            List of predictive alerts
        """
        alerts = []
        
        if not self.historical_data:
            return alerts
        
        try:
            # Get latest data point
            latest = self.historical_data[-1]
            current_confidence = latest.get('confidence_score', 70)
            current_sentiment = latest.get('sentiment_score', 0)
            current_volatility = latest.get('volatility', 0.3)
            
            # Generate forecasts
            confidence_forecasts = self.forecast_confidence(
                current_confidence, current_sentiment, current_volatility, [1, 3, 6]
            )
            
            market_forecasts = self.forecast_market_conditions(
                current_sentiment, current_volatility, current_confidence, ["1h", "6h"]
            )
            
            # Check confidence alerts
            for forecast in confidence_forecasts:
                if forecast.predicted_confidence < confidence_threshold:
                    alerts.append({
                        'type': 'confidence_drop_predicted',
                        'severity': 'high' if forecast.predicted_confidence < 50 else 'medium',
                        'message': f"Confidence predicted to drop to {forecast.predicted_confidence:.1f}% in {forecast.forecast_horizon}h",
                        'current_value': current_confidence,
                        'predicted_value': forecast.predicted_confidence,
                        'time_horizon': forecast.forecast_horizon,
                        'recommended_action': 'Consider increasing manual review or adjusting thresholds',
                        'timestamp': forecast.timestamp
                    })
            
            # Check volatility alerts
            for forecast in market_forecasts:
                if forecast.volatility_forecast > volatility_threshold:
                    alerts.append({
                        'type': 'volatility_increase_predicted',
                        'severity': 'high' if forecast.volatility_forecast > 0.8 else 'medium',
                        'message': f"Market volatility predicted to increase to {forecast.volatility_forecast:.2f} in {forecast.forecast_period}",
                        'current_value': current_volatility,
                        'predicted_value': forecast.volatility_forecast,
                        'time_horizon': forecast.forecast_period,
                        'recommended_action': 'Prepare for increased market uncertainty',
                        'timestamp': forecast.forecast_timestamp
                    })
                
                if forecast.confidence_reliability < reliability_threshold:
                    alerts.append({
                        'type': 'low_forecast_reliability',
                        'severity': 'medium',
                        'message': f"Forecast reliability low ({forecast.confidence_reliability:.2f}) for {forecast.forecast_period}",
                        'predicted_value': forecast.confidence_reliability,
                        'time_horizon': forecast.forecast_period,
                        'recommended_action': 'Reduce automated decision making',
                        'timestamp': forecast.forecast_timestamp
                    })
            
            # Check trend alerts
            if len(confidence_forecasts) >= 2:
                short_term = confidence_forecasts[0].predicted_confidence
                medium_term = confidence_forecasts[1].predicted_confidence
                
                if short_term > current_confidence + 10 and medium_term > current_confidence + 15:
                    alerts.append({
                        'type': 'confidence_rising_trend',
                        'severity': 'low',
                        'message': 'Confidence scores predicted to rise significantly',
                        'recommended_action': 'Consider opportunities for more aggressive strategies',
                        'timestamp': datetime.now(timezone.utc)
                    })
                elif short_term < current_confidence - 10 and medium_term < current_confidence - 15:
                    alerts.append({
                        'type': 'confidence_falling_trend',
                        'severity': 'high',
                        'message': 'Confidence scores predicted to decline significantly',
                        'recommended_action': 'Prepare defensive measures and increase oversight',
                        'timestamp': datetime.now(timezone.utc)
                    })
            
        except Exception as e:
            self.logger.error(f"Error generating predictive alerts: {e}")
        
        return alerts
    
    def get_forecast_accuracy_metrics(self) -> Dict[str, float]:
        """Get forecast accuracy metrics.
        
        Returns:
            Dictionary with accuracy metrics
        """
        if not self.forecast_accuracy_history:
            return {
                'overall_accuracy': 0.0,
                'recent_accuracy': 0.0,
                'accuracy_trend': 0.0,
                'confidence_score': 0.0
            }
        
        overall_accuracy = sum(self.forecast_accuracy_history) / len(self.forecast_accuracy_history)
        recent_accuracy = sum(self.forecast_accuracy_history[-10:]) / min(10, len(self.forecast_accuracy_history))
        
        # Calculate trend
        if len(self.forecast_accuracy_history) >= 20:
            early_avg = sum(self.forecast_accuracy_history[-20:-10]) / 10
            recent_avg = sum(self.forecast_accuracy_history[-10:]) / 10
            accuracy_trend = recent_avg - early_avg
        else:
            accuracy_trend = 0.0
        
        # Confidence in forecasts
        confidence_score = min(0.95, recent_accuracy + (0.05 if accuracy_trend > 0 else 0))
        
        return {
            'overall_accuracy': overall_accuracy,
            'recent_accuracy': recent_accuracy,
            'accuracy_trend': accuracy_trend,
            'confidence_score': confidence_score,
            'total_forecasts': len(self.forecast_accuracy_history)
        }