"""Price alert system for real-time competitor monitoring.

This service provides real-time alerts when competitor prices change
significantly, enabling rapid response to market movements.
"""

from __future__ import annotations

import asyncio
import json
import logging
import smtplib
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass

import requests


@dataclass
class PriceAlert:
    """Price alert configuration."""
    product_id: str
    alert_type: str  # "price_drop", "price_increase", "significant_change"
    threshold: float  # Percentage change threshold
    competitor: str
    current_price: float
    previous_price: float
    change_percentage: float
    timestamp: datetime
    severity: str  # "low", "medium", "high", "critical"


@dataclass
class AlertRule:
    """Alert rule configuration."""
    rule_id: str
    product_ids: List[str]  # Products to monitor, empty list = all products
    competitors: List[str]  # Competitors to monitor, empty list = all competitors
    alert_types: List[str]  # Types of alerts to trigger
    threshold: float  # Percentage threshold for alerts
    cooldown_minutes: int  # Minimum minutes between same alerts
    enabled: bool = True
    notification_channels: List[str] = None  # email, webhook, dashboard


class PriceAlertSystem:
    """Real-time price monitoring and alert system."""
    
    def __init__(self, config: Dict[str, Any] = None):
        """Initialize the alert system.
        
        Args:
            config: Configuration dictionary with email, webhook settings
        """
        self.config = config or {}
        self.logger = logging.getLogger(__name__)
        self.alert_rules: Dict[str, AlertRule] = {}
        self.recent_alerts: Dict[str, datetime] = {}  # Alert cooldown tracking
        self.price_history: Dict[str, Dict[str, float]] = {}  # Historical prices
        self.alert_callbacks: List[Callable] = []
        
        # Setup notification channels
        self._setup_email_config()
        self._setup_webhook_config()
    
    def add_alert_rule(self, rule: AlertRule) -> None:
        """Add a new alert rule."""
        self.alert_rules[rule.rule_id] = rule
        self.logger.info(f"Added alert rule: {rule.rule_id}")
    
    def remove_alert_rule(self, rule_id: str) -> None:
        """Remove an alert rule."""
        if rule_id in self.alert_rules:
            del self.alert_rules[rule_id]
            self.logger.info(f"Removed alert rule: {rule_id}")
    
    def add_alert_callback(self, callback: Callable[[PriceAlert], None]) -> None:
        """Add a callback function to be called when alerts trigger."""
        self.alert_callbacks.append(callback)
    
    async def check_price_changes(self, current_prices: Dict[str, Dict[str, float]]) -> List[PriceAlert]:
        """Check for price changes and trigger alerts.
        
        Args:
            current_prices: Dictionary of {product_id: {competitor: price}}
            
        Returns:
            List of triggered alerts
        """
        alerts = []
        
        for product_id, competitor_prices in current_prices.items():
            # Update price history
            if product_id not in self.price_history:
                self.price_history[product_id] = {}
            
            for competitor, current_price in competitor_prices.items():
                previous_price = self.price_history[product_id].get(competitor)
                
                if previous_price is not None:
                    # Calculate price change
                    change_percentage = ((current_price - previous_price) / previous_price) * 100
                    
                    # Check if change meets alert criteria
                    price_alerts = self._evaluate_price_change(
                        product_id, competitor, current_price, previous_price, change_percentage
                    )
                    alerts.extend(price_alerts)
                
                # Update price history
                self.price_history[product_id][competitor] = current_price
        
        # Send notifications for triggered alerts
        for alert in alerts:
            await self._send_alert_notifications(alert)
            
            # Call registered callbacks
            for callback in self.alert_callbacks:
                try:
                    callback(alert)
                except Exception as e:
                    self.logger.error(f"Error in alert callback: {e}")
        
        return alerts
    
    def _evaluate_price_change(
        self, 
        product_id: str, 
        competitor: str, 
        current_price: float, 
        previous_price: float, 
        change_percentage: float
    ) -> List[PriceAlert]:
        """Evaluate if price change should trigger alerts."""
        alerts = []
        
        for rule in self.alert_rules.values():
            if not rule.enabled:
                continue
            
            # Check if rule applies to this product/competitor
            if rule.product_ids and product_id not in rule.product_ids:
                continue
            if rule.competitors and competitor not in rule.competitors:
                continue
            
            # Check if change meets threshold
            abs_change = abs(change_percentage)
            if abs_change < rule.threshold:
                continue
            
            # Check cooldown
            alert_key = f"{rule.rule_id}:{product_id}:{competitor}"
            if self._is_in_cooldown(alert_key, rule.cooldown_minutes):
                continue
            
            # Determine alert type
            alert_type = "significant_change"
            if change_percentage > 0:
                alert_type = "price_increase"
            elif change_percentage < 0:
                alert_type = "price_drop"
            
            # Check if this alert type is enabled for the rule
            if rule.alert_types and alert_type not in rule.alert_types:
                continue
            
            # Determine severity
            severity = self._calculate_alert_severity(abs_change, rule.threshold)
            
            alert = PriceAlert(
                product_id=product_id,
                alert_type=alert_type,
                threshold=rule.threshold,
                competitor=competitor,
                current_price=current_price,
                previous_price=previous_price,
                change_percentage=change_percentage,
                timestamp=datetime.now(),
                severity=severity
            )
            
            alerts.append(alert)
            
            # Update cooldown tracking
            self.recent_alerts[alert_key] = datetime.now()
            
            self.logger.info(f"Price alert triggered: {product_id} - {competitor} changed {change_percentage:.1f}%")
        
        return alerts
    
    def _is_in_cooldown(self, alert_key: str, cooldown_minutes: int) -> bool:
        """Check if alert is in cooldown period."""
        if alert_key not in self.recent_alerts:
            return False
        
        last_alert_time = self.recent_alerts[alert_key]
        cooldown_period = timedelta(minutes=cooldown_minutes)
        
        return (datetime.now() - last_alert_time) < cooldown_period
    
    def _calculate_alert_severity(self, change_percentage: float, threshold: float) -> str:
        """Calculate alert severity based on change magnitude."""
        if change_percentage >= threshold * 3:
            return "critical"
        elif change_percentage >= threshold * 2:
            return "high"
        elif change_percentage >= threshold * 1.5:
            return "medium"
        else:
            return "low"
    
    async def _send_alert_notifications(self, alert: PriceAlert) -> None:
        """Send alert notifications through configured channels."""
        try:
            # Send email notification
            if self.config.get('email_enabled', False):
                await self._send_email_alert(alert)
            
            # Send webhook notification
            if self.config.get('webhook_enabled', False):
                await self._send_webhook_alert(alert)
            
            # Log alert
            self.logger.warning(
                f"PRICE ALERT [{alert.severity.upper()}]: {alert.product_id} - "
                f"{alert.competitor} price {alert.alert_type} by {alert.change_percentage:.1f}% "
                f"(${alert.previous_price:.2f} → ${alert.current_price:.2f})"
            )
            
        except Exception as e:
            self.logger.error(f"Error sending alert notifications: {e}")
    
    async def _send_email_alert(self, alert: PriceAlert) -> None:
        """Send email alert notification."""
        try:
            smtp_config = self.config.get('email', {})
            if not smtp_config:
                return
            
            msg = MIMEMultipart()
            msg['From'] = smtp_config.get('from_address')
            msg['To'] = smtp_config.get('to_address')
            msg['Subject'] = f"🚨 Price Alert: {alert.product_id} - {alert.severity.upper()}"
            
            # Create email body
            body = self._create_email_body(alert)
            msg.attach(MIMEText(body, 'html'))
            
            # Send email
            server = smtplib.SMTP(smtp_config.get('smtp_server'), smtp_config.get('smtp_port', 587))
            server.starttls()
            server.login(smtp_config.get('username'), smtp_config.get('password'))
            server.send_message(msg)
            server.quit()
            
            self.logger.info(f"Email alert sent for {alert.product_id}")
            
        except Exception as e:
            self.logger.error(f"Error sending email alert: {e}")
    
    async def _send_webhook_alert(self, alert: PriceAlert) -> None:
        """Send webhook alert notification."""
        try:
            webhook_config = self.config.get('webhook', {})
            if not webhook_config:
                return
            
            payload = {
                "alert_type": "price_alert",
                "product_id": alert.product_id,
                "competitor": alert.competitor,
                "current_price": alert.current_price,
                "previous_price": alert.previous_price,
                "change_percentage": alert.change_percentage,
                "severity": alert.severity,
                "timestamp": alert.timestamp.isoformat(),
                "alert_details": {
                    "threshold": alert.threshold,
                    "alert_category": alert.alert_type
                }
            }
            
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'Royal-Equips-Price-Monitor/1.0'
            }
            
            # Add custom headers if configured
            if webhook_config.get('headers'):
                headers.update(webhook_config['headers'])
            
            response = requests.post(
                webhook_config['url'],
                json=payload,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            
            self.logger.info(f"Webhook alert sent for {alert.product_id}")
            
        except Exception as e:
            self.logger.error(f"Error sending webhook alert: {e}")
    
    def _create_email_body(self, alert: PriceAlert) -> str:
        """Create HTML email body for alert."""
        severity_colors = {
            "low": "#28a745",
            "medium": "#ffc107", 
            "high": "#fd7e14",
            "critical": "#dc3545"
        }
        
        color = severity_colors.get(alert.severity, "#6c757d")
        
        return f"""
        <html>
        <body>
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: {color};">🚨 Price Alert - {alert.severity.upper()}</h2>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3>Product: {alert.product_id}</h3>
                    <p><strong>Competitor:</strong> {alert.competitor}</p>
                    <p><strong>Alert Type:</strong> {alert.alert_type.replace('_', ' ').title()}</p>
                    
                    <div style="background-color: white; padding: 15px; border-radius: 3px; margin: 10px 0;">
                        <p><strong>Previous Price:</strong> <span style="color: #6c757d;">${alert.previous_price:.2f}</span></p>
                        <p><strong>Current Price:</strong> <span style="color: {color}; font-size: 1.2em;">${alert.current_price:.2f}</span></p>
                        <p><strong>Change:</strong> <span style="color: {color}; font-weight: bold;">{alert.change_percentage:+.1f}%</span></p>
                    </div>
                    
                    <p><strong>Threshold:</strong> {alert.threshold}%</p>
                    <p><strong>Time:</strong> {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                </div>
                
                <div style="color: #6c757d; font-size: 0.9em; border-top: 1px solid #dee2e6; padding-top: 15px;">
                    <p>This alert was triggered by the Royal Equips Price Monitoring System.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _setup_email_config(self) -> None:
        """Setup email configuration from environment or config."""
        # This would typically read from environment variables or config files
        pass
    
    def _setup_webhook_config(self) -> None:
        """Setup webhook configuration."""
        # This would typically read from environment variables or config files
        pass
    
    def get_alert_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get summary of recent alerts."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # This would typically query from a database
        # For now, return a simple summary structure
        return {
            "period_hours": hours,
            "total_alerts": 0,
            "by_severity": {"low": 0, "medium": 0, "high": 0, "critical": 0},
            "by_product": {},
            "by_competitor": {},
            "most_recent": None
        }