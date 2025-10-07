"""Machine Learning-powered rule parameter optimization service.

This service uses historical performance data to predict optimal rule parameters
and continuously improves pricing rules based on past successes and failures.
"""

from __future__ import annotations

import joblib
import json
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from pathlib import Path

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score

from orchestrator.services.pricing_rules_engine import PricingRule


@dataclass
class RulePerformance:
    """Historical performance data for a pricing rule."""
    rule_id: str
    timestamp: datetime
    confidence_threshold: float
    price_change_percentage: float
    revenue_impact: float
    profit_margin_change: float
    conversion_rate_change: float
    customer_satisfaction_score: float
    market_response_time: float
    success_score: float  # Combined metric (0-100)


@dataclass
class OptimalParameters:
    """Optimized parameters for a pricing rule."""
    rule_id: str
    optimal_confidence_threshold: float
    optimal_max_price_increase: float
    optimal_max_price_decrease: float
    optimal_min_profit_margin: float
    predicted_success_score: float
    confidence_interval: Tuple[float, float]
    model_accuracy: float


class MLRuleOptimizer:
    """ML-powered pricing rule parameter optimization service."""
    
    def __init__(self, data_storage_path: str = "data/ml_models"):
        """Initialize ML rule optimizer.
        
        Args:
            data_storage_path: Path to store ML models and training data
        """
        self.logger = logging.getLogger(__name__)
        self.data_path = Path(data_storage_path)
        self.data_path.mkdir(parents=True, exist_ok=True)
        
        # Model storage
        self.models: Dict[str, Any] = {}
        self.scalers: Dict[str, StandardScaler] = {}
        self.performance_history: List[RulePerformance] = []
        
        # Load existing data and models
        self._load_historical_data()
        self._load_models()
        
    def _load_historical_data(self) -> None:
        """Load historical performance data."""
        data_file = self.data_path / "performance_history.json"
        if data_file.exists():
            try:
                with open(data_file, 'r') as f:
                    data = json.load(f)
                    self.performance_history = []
                    for item in data:
                        # Convert timestamp string back to datetime
                        if isinstance(item['timestamp'], str):
                            item['timestamp'] = datetime.fromisoformat(item['timestamp'])
                        self.performance_history.append(RulePerformance(**item))
                self.logger.info(f"Loaded {len(self.performance_history)} historical records")
            except Exception as e:
                self.logger.error(f"Error loading historical data: {e}")
                self.performance_history = []
    
    def _save_historical_data(self) -> None:
        """Save historical performance data."""
        data_file = self.data_path / "performance_history.json"
        try:
            # Convert dataclass to dict with datetime serialization
            data = []
            for perf in self.performance_history:
                item = perf.__dict__.copy()
                item['timestamp'] = perf.timestamp.isoformat() if isinstance(perf.timestamp, datetime) else perf.timestamp
                data.append(item)
            
            with open(data_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            self.logger.error(f"Error saving historical data: {e}")
    
    def _load_models(self) -> None:
        """Load trained ML models."""
        for rule_type in ['confidence_threshold', 'price_limits', 'profit_margin']:
            model_file = self.data_path / f"model_{rule_type}.joblib"
            scaler_file = self.data_path / f"scaler_{rule_type}.joblib"
            
            if model_file.exists() and scaler_file.exists():
                try:
                    self.models[rule_type] = joblib.load(model_file)
                    self.scalers[rule_type] = joblib.load(scaler_file)
                    self.logger.info(f"Loaded {rule_type} model and scaler")
                except Exception as e:
                    self.logger.error(f"Error loading {rule_type} model: {e}")
    
    def _save_models(self) -> None:
        """Save trained ML models."""
        for rule_type, model in self.models.items():
            try:
                model_file = self.data_path / f"model_{rule_type}.joblib"
                scaler_file = self.data_path / f"scaler_{rule_type}.joblib"
                
                joblib.dump(model, model_file)
                if rule_type in self.scalers:
                    joblib.dump(self.scalers[rule_type], scaler_file)
                    
                self.logger.info(f"Saved {rule_type} model")
            except Exception as e:
                self.logger.error(f"Error saving {rule_type} model: {e}")
    
    def record_performance(self, performance: RulePerformance) -> None:
        """Record new rule performance data.
        
        Args:
            performance: Performance data to record
        """
        self.performance_history.append(performance)
        self._save_historical_data()
        
        # Retrain models if we have enough data
        if len(self.performance_history) >= 50:  # Minimum data points for training
            self._retrain_models()
    
    def _prepare_features(self, performance_data: List[RulePerformance]) -> pd.DataFrame:
        """Prepare feature matrix from performance data.
        
        Args:
            performance_data: Historical performance records
            
        Returns:
            Feature DataFrame
        """
        features = []
        for perf in performance_data:
            # Market context features (would be enhanced with real market data)
            day_of_week = perf.timestamp.weekday()
            hour_of_day = perf.timestamp.hour
            month = perf.timestamp.month
            
            features.append({
                'confidence_threshold': perf.confidence_threshold,
                'price_change_percentage': perf.price_change_percentage,
                'profit_margin_change': perf.profit_margin_change,
                'market_response_time': perf.market_response_time,
                'day_of_week': day_of_week,
                'hour_of_day': hour_of_day,
                'month': month,
                'historical_success_avg': self._get_historical_success_rate(perf.rule_id, perf.timestamp),
                'success_score': perf.success_score
            })
        
        return pd.DataFrame(features)
    
    def _get_historical_success_rate(self, rule_id: str, timestamp: datetime) -> float:
        """Calculate historical success rate for a rule before given timestamp."""
        relevant_history = [
            p for p in self.performance_history 
            if p.rule_id == rule_id and p.timestamp < timestamp
        ]
        
        if not relevant_history:
            return 50.0  # Default neutral score
            
        return np.mean([p.success_score for p in relevant_history[-20:]])  # Last 20 records
    
    def _retrain_models(self) -> None:
        """Retrain ML models with latest performance data."""
        self.logger.info("Retraining ML models with latest performance data")
        
        df = self._prepare_features(self.performance_history)
        if len(df) < 30:  # Need minimum data for reliable training
            self.logger.warning("Insufficient data for model training")
            return
        
        # Train confidence threshold optimization model
        self._train_confidence_model(df)
        
        # Train price limit optimization model
        self._train_price_limits_model(df)
        
        # Train profit margin optimization model
        self._train_profit_margin_model(df)
        
        self._save_models()
    
    def _train_confidence_model(self, df: pd.DataFrame) -> None:
        """Train model to predict optimal confidence threshold."""
        try:
            # Features for confidence threshold prediction
            feature_cols = [
                'price_change_percentage', 'profit_margin_change', 'market_response_time',
                'day_of_week', 'hour_of_day', 'month', 'historical_success_avg'
            ]
            target_col = 'confidence_threshold'
            
            X = df[feature_cols]
            y = df[target_col]
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train model with hyperparameter tuning
            param_grid = {
                'n_estimators': [100, 200, 300],
                'max_depth': [10, 20, 30],
                'min_samples_split': [2, 5, 10]
            }
            
            rf = RandomForestRegressor(random_state=42)
            grid_search = GridSearchCV(rf, param_grid, cv=3, scoring='neg_mean_squared_error')
            grid_search.fit(X_train_scaled, y_train)
            
            # Best model
            best_model = grid_search.best_estimator_
            
            # Evaluate
            y_pred = best_model.predict(X_test_scaled)
            mse = mean_squared_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            self.models['confidence_threshold'] = best_model
            self.scalers['confidence_threshold'] = scaler
            
            self.logger.info(f"Confidence threshold model trained - MSE: {mse:.4f}, R²: {r2:.4f}")
            
        except Exception as e:
            self.logger.error(f"Error training confidence model: {e}")
    
    def _train_price_limits_model(self, df: pd.DataFrame) -> None:
        """Train model to predict optimal price change limits."""
        try:
            # Features for price limits prediction
            feature_cols = [
                'confidence_threshold', 'profit_margin_change', 'market_response_time',
                'day_of_week', 'hour_of_day', 'month', 'historical_success_avg'
            ]
            target_col = 'price_change_percentage'
            
            X = df[feature_cols]
            y = df[target_col]
            
            # Split and scale
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Use Gradient Boosting for price limits
            gb = GradientBoostingRegressor(
                n_estimators=200, 
                learning_rate=0.1, 
                max_depth=6,
                random_state=42
            )
            gb.fit(X_train_scaled, y_train)
            
            # Evaluate
            y_pred = gb.predict(X_test_scaled)
            mse = mean_squared_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            self.models['price_limits'] = gb
            self.scalers['price_limits'] = scaler
            
            self.logger.info(f"Price limits model trained - MSE: {mse:.4f}, R²: {r2:.4f}")
            
        except Exception as e:
            self.logger.error(f"Error training price limits model: {e}")
    
    def _train_profit_margin_model(self, df: pd.DataFrame) -> None:
        """Train model to predict optimal profit margin parameters."""
        try:
            feature_cols = [
                'confidence_threshold', 'price_change_percentage', 'market_response_time',
                'day_of_week', 'hour_of_day', 'month', 'historical_success_avg'
            ]
            target_col = 'profit_margin_change'
            
            X = df[feature_cols]
            y = df[target_col]
            
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Random Forest for profit margin
            rf = RandomForestRegressor(
                n_estimators=150,
                max_depth=15,
                min_samples_split=5,
                random_state=42
            )
            rf.fit(X_train_scaled, y_train)
            
            # Evaluate
            y_pred = rf.predict(X_test_scaled)
            mse = mean_squared_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            self.models['profit_margin'] = rf
            self.scalers['profit_margin'] = scaler
            
            self.logger.info(f"Profit margin model trained - MSE: {mse:.4f}, R²: {r2:.4f}")
            
        except Exception as e:
            self.logger.error(f"Error training profit margin model: {e}")
    
    def predict_optimal_parameters(self, rule_id: str, current_market_context: Dict[str, Any]) -> OptimalParameters:
        """Predict optimal rule parameters using ML models.
        
        Args:
            rule_id: ID of the pricing rule
            current_market_context: Current market conditions
            
        Returns:
            Optimized parameters for the rule
        """
        self.logger.info(f"Predicting optimal parameters for rule: {rule_id}")
        
        try:
            # Prepare features for prediction
            features = self._prepare_prediction_features(rule_id, current_market_context)
            
            # Predict with each model
            predictions = {}
            confidence_intervals = {}
            
            for model_type, model in self.models.items():
                if model_type in self.scalers:
                    scaler = self.scalers[model_type]
                    features_scaled = scaler.transform([features])
                    
                    # Get prediction
                    pred = model.predict(features_scaled)[0]
                    predictions[model_type] = pred
                    
                    # Estimate confidence interval (simplified)
                    if hasattr(model, 'predict_quantiles'):
                        ci_low = model.predict_quantiles([features], quantiles=[0.25])[0]
                        ci_high = model.predict_quantiles([features], quantiles=[0.75])[0]
                        confidence_intervals[model_type] = (ci_low, ci_high)
                    else:
                        # Approximate CI using standard error estimation
                        std_err = np.std([p.success_score for p in self.performance_history[-50:]]) / np.sqrt(50)
                        confidence_intervals[model_type] = (pred - 1.96*std_err, pred + 1.96*std_err)
            
            # Combine predictions into optimal parameters
            optimal_confidence = predictions.get('confidence_threshold', 0.75)
            optimal_price_change = abs(predictions.get('price_limits', 0.15))
            optimal_margin = predictions.get('profit_margin', 0.15)
            
            # Estimate overall success probability
            success_score = self._estimate_success_score(predictions, current_market_context)
            
            # Calculate model accuracy (simplified)
            model_accuracy = self._calculate_model_accuracy()
            
            return OptimalParameters(
                rule_id=rule_id,
                optimal_confidence_threshold=max(0.5, min(0.95, optimal_confidence)),
                optimal_max_price_increase=max(0.05, min(0.30, optimal_price_change)),
                optimal_max_price_decrease=max(0.05, min(0.40, optimal_price_change * 1.2)),
                optimal_min_profit_margin=max(0.05, min(0.30, optimal_margin)),
                predicted_success_score=success_score,
                confidence_interval=confidence_intervals.get('confidence_threshold', (0.6, 0.9)),
                model_accuracy=model_accuracy
            )
            
        except Exception as e:
            self.logger.error(f"Error predicting optimal parameters: {e}")
            # Return safe defaults
            return OptimalParameters(
                rule_id=rule_id,
                optimal_confidence_threshold=0.75,
                optimal_max_price_increase=0.15,
                optimal_max_price_decrease=0.20,
                optimal_min_profit_margin=0.15,
                predicted_success_score=70.0,
                confidence_interval=(0.6, 0.9),
                model_accuracy=0.0
            )
    
    def _prepare_prediction_features(self, rule_id: str, market_context: Dict[str, Any]) -> List[float]:
        """Prepare features for ML prediction."""
        now = datetime.now(timezone.utc)
        
        # Get recent performance context
        historical_success = self._get_historical_success_rate(rule_id, now)
        
        # Extract market context
        price_change = market_context.get('expected_price_change', 0.0)
        margin_change = market_context.get('expected_margin_change', 0.0)
        response_time = market_context.get('market_response_time', 300.0)  # 5 minutes default
        
        return [
            price_change,
            margin_change,
            response_time,
            now.weekday(),
            now.hour,
            now.month,
            historical_success
        ]
    
    def _estimate_success_score(self, predictions: Dict[str, float], market_context: Dict[str, Any]) -> float:
        """Estimate overall success score based on predictions and market context."""
        # Base score from historical performance
        base_score = 70.0
        
        # Adjust based on confidence threshold
        confidence_score = predictions.get('confidence_threshold', 0.75) * 100
        
        # Market volatility adjustment
        volatility = market_context.get('market_volatility', 0.1)
        volatility_penalty = volatility * 20  # Higher volatility reduces confidence
        
        # Competition intensity adjustment
        competition = market_context.get('competitive_intensity', 0.5)
        competition_penalty = competition * 10
        
        final_score = base_score + (confidence_score - 75) * 0.5 - volatility_penalty - competition_penalty
        return max(30.0, min(95.0, final_score))
    
    def _calculate_model_accuracy(self) -> float:
        """Calculate average model accuracy across all trained models."""
        if not self.models:
            return 0.0
            
        # Simplified accuracy calculation
        # In production, this would use proper cross-validation metrics
        recent_performance = self.performance_history[-100:] if len(self.performance_history) > 100 else self.performance_history
        
        if not recent_performance:
            return 0.0
            
        avg_success = np.mean([p.success_score for p in recent_performance])
        return min(0.95, avg_success / 100.0)
    
    def get_rule_insights(self, rule_id: str) -> Dict[str, Any]:
        """Get insights about rule performance and recommendations.
        
        Args:
            rule_id: ID of the pricing rule
            
        Returns:
            Dictionary with performance insights and recommendations
        """
        rule_performance = [p for p in self.performance_history if p.rule_id == rule_id]
        
        if not rule_performance:
            return {
                'rule_id': rule_id,
                'total_executions': 0,
                'average_success_score': 0.0,
                'trend': 'insufficient_data',
                'recommendations': ['Collect more performance data to generate insights']
            }
        
        recent_performance = rule_performance[-30:]  # Last 30 executions
        older_performance = rule_performance[-60:-30] if len(rule_performance) >= 60 else []
        
        avg_success = np.mean([p.success_score for p in recent_performance])
        trend = 'stable'
        
        if older_performance:
            older_avg = np.mean([p.success_score for p in older_performance])
            if avg_success > older_avg + 5:
                trend = 'improving'
            elif avg_success < older_avg - 5:
                trend = 'declining'
        
        # Generate recommendations
        recommendations = []
        
        if avg_success < 60:
            recommendations.append('Consider adjusting confidence thresholds - current performance below target')
        
        if trend == 'declining':
            recommendations.append('Performance declining - review recent market changes')
        
        confidence_variation = np.std([p.confidence_threshold for p in recent_performance])
        if confidence_variation > 0.15:
            recommendations.append('High confidence threshold variation - consider stabilizing parameters')
        
        return {
            'rule_id': rule_id,
            'total_executions': len(rule_performance),
            'average_success_score': avg_success,
            'recent_success_score': avg_success,
            'trend': trend,
            'best_confidence_threshold': np.mean([p.confidence_threshold for p in recent_performance if p.success_score > avg_success]),
            'recommendations': recommendations or ['Performance within acceptable range'],
            'last_updated': max([p.timestamp for p in recent_performance]).isoformat()
        }