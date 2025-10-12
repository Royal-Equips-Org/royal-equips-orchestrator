"""
Alert Manager for Royal Equips Orchestrator.

Implements intelligent alerting with burn rate monitoring, anomaly detection,
and automated remediation triggers based on business and technical metrics.
"""

import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class AlertCategory(Enum):
    """Alert categories for classification."""
    BUSINESS = "business"
    TECHNICAL = "technical"
    SECURITY = "security"
    PERFORMANCE = "performance"


@dataclass
class Alert:
    """Alert data structure."""
    id: str
    title: str
    description: str
    severity: AlertSeverity
    category: AlertCategory
    metric_name: str
    current_value: float
    threshold_value: float
    timestamp: datetime
    resolution_actions: List[str]
    correlation_id: Optional[str] = None
    source_service: Optional[str] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None


@dataclass
class BurnRateAlert:
    """Specific burn rate alert for SLO monitoring."""
    window: str  # "1h", "6h", "24h"
    error_budget_consumed: float  # percentage
    rate: float  # consumption rate
    alert_type: str  # "fast_burn", "slow_burn"
    triggered_at: datetime


class AlertManager:
    """
    Comprehensive alert management system with intelligent thresholds,
    burn rate monitoring, and automated remediation capabilities.
    """

    def __init__(self):
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.remediation_actions: Dict[str, Callable] = {}
        self.alert_rules: List[Dict[str, Any]] = []
        self._setup_default_rules()

        # SLO and burn rate tracking
        self.slo_target = 99.99  # 99.99% availability
        self.monthly_error_budget = 259.2  # seconds (4.32 minutes)
        self.current_error_budget_consumed = 0.0

        # Anomaly detection state
        self.metric_baselines: Dict[str, Dict[str, float]] = {}
        self.outlier_detection_window = timedelta(minutes=30)

    def _setup_default_rules(self):
        """Setup default alerting rules based on requirements."""
        self.alert_rules = [
            # Business Impact Rules
            {
                "name": "revenue_drop_critical",
                "metric": "revenue_progress",
                "condition": "percentage_drop",
                "threshold": 20,  # 20% drop
                "window": "30min",
                "severity": AlertSeverity.CRITICAL,
                "category": AlertCategory.BUSINESS,
                "actions": ["trigger_revenue_protection_playbook", "boost_top_campaigns", "activate_retargeting"]
            },
            {
                "name": "revenue_drop_warning",
                "metric": "revenue_progress",
                "condition": "percentage_drop",
                "threshold": 10,  # 10% drop
                "window": "30min",
                "severity": AlertSeverity.WARNING,
                "category": AlertCategory.BUSINESS,
                "actions": ["analyze_conversion_funnel", "check_payment_processor"]
            },

            # Agent Availability Rules
            {
                "name": "agent_availability_critical",
                "metric": "agent_availability_percentage",
                "condition": "below_threshold",
                "threshold": 80,  # Below 80%
                "window": "5min",
                "severity": AlertSeverity.CRITICAL,
                "category": AlertCategory.TECHNICAL,
                "actions": ["restart_failed_agents", "scale_agent_instances", "page_tier1_ops"]
            },
            {
                "name": "agent_availability_warning",
                "metric": "agent_availability_percentage",
                "condition": "below_threshold",
                "threshold": 90,  # Below 90%
                "window": "5min",
                "severity": AlertSeverity.WARNING,
                "category": AlertCategory.TECHNICAL,
                "actions": ["check_agent_health", "verify_resource_allocation"]
            },

            # Performance Rules
            {
                "name": "response_time_critical",
                "metric": "response_time_p95",
                "condition": "above_threshold",
                "threshold": 2000,  # 2 seconds P95
                "window": "5min",
                "severity": AlertSeverity.CRITICAL,
                "category": AlertCategory.PERFORMANCE,
                "actions": ["scale_out_services", "enable_performance_mode", "investigate_bottlenecks"]
            },
            {
                "name": "error_rate_critical",
                "metric": "error_rate_percentage",
                "condition": "above_threshold",
                "threshold": 2.0,  # 2% error rate
                "window": "5min",
                "severity": AlertSeverity.CRITICAL,
                "category": AlertCategory.PERFORMANCE,
                "actions": ["rollback_latest_deployment", "isolate_failing_services"]
            },

            # Circuit Breaker Rules
            {
                "name": "circuit_breakers_multiple_open",
                "metric": "open_circuit_breakers",
                "condition": "above_threshold",
                "threshold": 2,  # 2 or more open breakers
                "window": "1min",
                "severity": AlertSeverity.EMERGENCY,
                "category": AlertCategory.TECHNICAL,
                "actions": ["emergency_service_isolation", "activate_degraded_mode", "notify_incident_commander"]
            },

            # Campaign Performance Rules
            {
                "name": "campaign_performance_degraded",
                "metric": "campaign_load_failures_per_minute",
                "condition": "above_threshold",
                "threshold": 5,  # 5 failures per minute
                "window": "5min",
                "severity": AlertSeverity.WARNING,
                "category": AlertCategory.BUSINESS,
                "actions": ["rollback_marketing_service", "pause_underperforming_campaigns"]
            }
        ]

    def evaluate_metrics(self, metrics: Dict[str, Any]) -> List[Alert]:
        """
        Evaluate current metrics against alerting rules.
        
        Args:
            metrics: Current system metrics
            
        Returns:
            List of newly triggered alerts
        """
        new_alerts = []
        current_time = datetime.now()

        for rule in self.alert_rules:
            try:
                alert = self._evaluate_single_rule(rule, metrics, current_time)
                if alert:
                    new_alerts.append(alert)
                    self.active_alerts[alert.id] = alert
                    self.alert_history.append(alert)
                    logger.warning(f"Alert triggered: {alert.title}", extra={
                        "alert_id": alert.id,
                        "severity": alert.severity.value,
                        "metric": alert.metric_name,
                        "current_value": alert.current_value,
                        "threshold": alert.threshold_value
                    })

            except Exception as e:
                logger.error(f"Failed to evaluate rule {rule['name']}: {e}")

        return new_alerts

    def _evaluate_single_rule(self, rule: Dict[str, Any], metrics: Dict[str, Any], current_time: datetime) -> Optional[Alert]:
        """Evaluate a single alerting rule against current metrics."""
        metric_name = rule["metric"]

        if metric_name not in metrics:
            return None

        current_value = metrics[metric_name]
        threshold = rule["threshold"]
        condition = rule["condition"]

        triggered = False

        if condition == "above_threshold" and current_value > threshold:
            triggered = True
        elif condition == "below_threshold" and current_value < threshold:
            triggered = True
        elif condition == "percentage_drop":
            # Check for percentage drop compared to baseline
            baseline = self._get_baseline_value(metric_name, current_value)
            if baseline > 0:
                drop_percentage = ((baseline - current_value) / baseline) * 100
                if drop_percentage > threshold:
                    triggered = True

        if not triggered:
            return None

        # Check if this alert is not already active (avoid spam)
        alert_key = f"{rule['name']}_{metric_name}"
        if alert_key in self.active_alerts and not self.active_alerts[alert_key].resolved:
            return None

        # Create new alert
        alert_id = f"alert_{current_time.strftime('%Y%m%d_%H%M%S')}_{rule['name']}"

        return Alert(
            id=alert_id,
            title=f"{rule['name'].replace('_', ' ').title()}",
            description=f"{metric_name} is {current_value} (threshold: {threshold})",
            severity=rule["severity"],
            category=rule["category"],
            metric_name=metric_name,
            current_value=float(current_value),
            threshold_value=float(threshold),
            timestamp=current_time,
            resolution_actions=rule["actions"],
            source_service="alert_manager"
        )

    def _get_baseline_value(self, metric_name: str, current_value: float) -> float:
        """Get baseline value for percentage-based alerting."""
        if metric_name not in self.metric_baselines:
            # Initialize baseline with current value
            self.metric_baselines[metric_name] = {
                "value": current_value,
                "last_updated": datetime.now()
            }
            return current_value

        baseline_data = self.metric_baselines[metric_name]

        # Update baseline using exponential moving average
        alpha = 0.1  # Smoothing factor
        baseline_data["value"] = (alpha * current_value) + ((1 - alpha) * baseline_data["value"])
        baseline_data["last_updated"] = datetime.now()

        return baseline_data["value"]

    def check_burn_rate(self, error_rate: float, duration_minutes: int) -> Optional[BurnRateAlert]:
        """
        Check error budget burn rate and trigger alerts if thresholds are exceeded.
        
        Args:
            error_rate: Current error rate (percentage)
            duration_minutes: Duration of the current error rate
            
        Returns:
            BurnRateAlert if thresholds are exceeded
        """
        # Calculate error budget consumption for this period
        availability = (100 - error_rate) / 100
        consumed_budget = (1 - availability) * duration_minutes * 60  # in seconds

        # Calculate burn rate (how fast we're consuming monthly budget)
        minutes_in_month = 30 * 24 * 60  # 43,200 minutes
        burn_rate = (consumed_budget / self.monthly_error_budget) * (minutes_in_month / duration_minutes)

        current_time = datetime.now()

        # Fast burn alert: >10% budget consumed in 1 hour
        if duration_minutes <= 60 and burn_rate > 0.1:
            return BurnRateAlert(
                window="1h",
                error_budget_consumed=burn_rate * 100,
                rate=burn_rate,
                alert_type="fast_burn",
                triggered_at=current_time
            )

        # Slow burn alert: >20% budget consumed in 6 hours
        if duration_minutes <= 360 and burn_rate > 0.2:
            return BurnRateAlert(
                window="6h",
                error_budget_consumed=burn_rate * 100,
                rate=burn_rate,
                alert_type="slow_burn",
                triggered_at=current_time
            )

        return None

    def detect_outliers(self, metric_name: str, current_value: float) -> bool:
        """
        Detect outliers using statistical analysis.
        
        Args:
            metric_name: Name of the metric to analyze
            current_value: Current metric value
            
        Returns:
            True if value is considered an outlier
        """
        # For heartbeat intervals - detect if variance > 3x median
        if "heartbeat" in metric_name.lower():
            if metric_name not in self.metric_baselines:
                self.metric_baselines[metric_name] = {"values": [], "median": current_value}
                return False

            baseline_data = self.metric_baselines[metric_name]
            values = baseline_data.get("values", [])

            # Keep rolling window of last 50 values
            values.append(current_value)
            if len(values) > 50:
                values.pop(0)

            if len(values) < 10:  # Need minimum samples
                return False

            # Calculate median and variance
            sorted_values = sorted(values)
            median = sorted_values[len(sorted_values) // 2]

            # Calculate variance from median
            variance = sum(abs(v - median) for v in values) / len(values)

            # Flag as outlier if current value varies >3x median variance
            if abs(current_value - median) > 3 * variance:
                logger.warning(f"Outlier detected for {metric_name}: {current_value} (median: {median}, variance: {variance})")
                return True

        return False

    async def execute_remediation_actions(self, alert: Alert) -> Dict[str, Any]:
        """
        Execute automated remediation actions for an alert.
        
        Args:
            alert: Alert requiring remediation
            
        Returns:
            Results of remediation actions
        """
        results = {
            "alert_id": alert.id,
            "actions_executed": [],
            "actions_failed": [],
            "execution_timestamp": datetime.now().isoformat()
        }

        for action in alert.resolution_actions:
            try:
                if action in self.remediation_actions:
                    await self.remediation_actions[action](alert)
                    results["actions_executed"].append(action)
                    logger.info(f"Executed remediation action: {action} for alert {alert.id}")
                else:
                    # Log action that would be executed
                    logger.info(f"Would execute remediation action: {action} for alert {alert.id}")
                    results["actions_executed"].append(f"{action} (simulated)")

            except Exception as e:
                logger.error(f"Failed to execute remediation action {action}: {e}")
                results["actions_failed"].append({"action": action, "error": str(e)})

        return results

    def get_active_alerts(self, severity: Optional[AlertSeverity] = None) -> List[Dict[str, Any]]:
        """Get currently active alerts, optionally filtered by severity."""
        alerts = [alert for alert in self.active_alerts.values() if not alert.resolved]

        if severity:
            alerts = [alert for alert in alerts if alert.severity == severity]

        return [asdict(alert) for alert in alerts]

    def resolve_alert(self, alert_id: str, resolution_note: str = "") -> bool:
        """Mark an alert as resolved."""
        if alert_id in self.active_alerts:
            self.active_alerts[alert_id].resolved = True
            self.active_alerts[alert_id].resolved_at = datetime.now()
            logger.info(f"Alert resolved: {alert_id} - {resolution_note}")
            return True
        return False

    def get_alert_summary(self) -> Dict[str, Any]:
        """Get summary of alert status."""
        active_alerts = [alert for alert in self.active_alerts.values() if not alert.resolved]

        summary = {
            "total_active": len(active_alerts),
            "by_severity": {
                "emergency": len([a for a in active_alerts if a.severity == AlertSeverity.EMERGENCY]),
                "critical": len([a for a in active_alerts if a.severity == AlertSeverity.CRITICAL]),
                "warning": len([a for a in active_alerts if a.severity == AlertSeverity.WARNING]),
                "info": len([a for a in active_alerts if a.severity == AlertSeverity.INFO])
            },
            "by_category": {
                "business": len([a for a in active_alerts if a.category == AlertCategory.BUSINESS]),
                "technical": len([a for a in active_alerts if a.category == AlertCategory.TECHNICAL]),
                "security": len([a for a in active_alerts if a.category == AlertCategory.SECURITY]),
                "performance": len([a for a in active_alerts if a.category == AlertCategory.PERFORMANCE])
            },
            "timestamp": datetime.now().isoformat()
        }

        return summary


# Global alert manager instance
_alert_manager = None

def get_alert_manager() -> AlertManager:
    """Get or create the global alert manager instance."""
    global _alert_manager
    if _alert_manager is None:
        _alert_manager = AlertManager()
    return _alert_manager
