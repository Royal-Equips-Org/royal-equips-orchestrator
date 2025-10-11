"""
Self-healing service for Royal Equips Orchestrator.

Implements autonomous recovery policies, automated remediation actions,
and intelligent system healing based on alert conditions and performance metrics.
"""

import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class HealingAction(Enum):
    """Types of self-healing actions."""
    RESTART_SERVICE = "restart_service"
    SCALE_OUT = "scale_out"
    SCALE_DOWN = "scale_down"
    ROLLBACK_DEPLOYMENT = "rollback_deployment"
    ISOLATE_SERVICE = "isolate_service"
    ENABLE_DEGRADED_MODE = "enable_degraded_mode"
    CLEAR_CACHE = "clear_cache"
    RESET_CIRCUIT_BREAKER = "reset_circuit_breaker"
    REDISTRIBUTE_LOAD = "redistribute_load"
    RESTART_AGENT = "restart_agent"


@dataclass
class HealingPolicy:
    """Self-healing policy configuration."""
    name: str
    trigger_condition: str
    threshold_value: float
    action: HealingAction
    cooldown_minutes: int = 15
    max_attempts_per_hour: int = 3
    success_criteria: str = "metric_improvement"
    description: str = ""


@dataclass
class HealingExecution:
    """Record of a healing action execution."""
    policy_name: str
    action: HealingAction
    trigger_metric: str
    trigger_value: float
    executed_at: datetime
    success: bool
    result_message: str
    recovery_time_seconds: Optional[float] = None


class SelfHealingService:
    """
    Autonomous self-healing service that monitors system health,
    detects issues, and executes remediation actions automatically.
    """
    
    def __init__(self):
        self.healing_policies: List[HealingPolicy] = []
        self.execution_history: List[HealingExecution] = []
        self.action_counters: Dict[str, int] = {}  # Track actions per hour
        self.last_reset: datetime = datetime.now(timezone.utc)
        self.healing_enabled = True
        
        # Setup default healing policies
        self._setup_default_policies()
        
        # Service health tracking
        self.service_health_scores: Dict[str, float] = {}
        self.last_health_check: Dict[str, datetime] = {}
    
    def _setup_default_policies(self):
        """Setup default self-healing policies based on requirements."""
        self.healing_policies = [
            # Service Latency Healing
            HealingPolicy(
                name="high_latency_soft_restart",
                trigger_condition="response_time_p95 > 1500",  # 1.5s threshold
                threshold_value=1500.0,
                action=HealingAction.RESTART_SERVICE,
                cooldown_minutes=10,
                max_attempts_per_hour=2,
                description="Soft restart highest latency service instance"
            ),
            HealingPolicy(
                name="high_latency_scale_out",
                trigger_condition="response_time_p95 > 2000",  # 2s threshold
                threshold_value=2000.0,
                action=HealingAction.SCALE_OUT,
                cooldown_minutes=15,
                max_attempts_per_hour=3,
                description="Scale out +1 replica for latency relief"
            ),
            HealingPolicy(
                name="extreme_latency_isolate",
                trigger_condition="response_time_p95 > 5000",  # 5s threshold
                threshold_value=5000.0,
                action=HealingAction.ISOLATE_SERVICE,
                cooldown_minutes=30,
                max_attempts_per_hour=1,
                description="Isolate service version causing extreme latency"
            ),
            
            # Agent Health Healing
            HealingPolicy(
                name="agent_availability_restart",
                trigger_condition="agent_availability_percentage < 85",
                threshold_value=85.0,
                action=HealingAction.RESTART_AGENT,
                cooldown_minutes=5,
                max_attempts_per_hour=6,
                description="Restart failed agents to restore availability"
            ),
            HealingPolicy(
                name="agent_availability_scale",
                trigger_condition="agent_availability_percentage < 70",
                threshold_value=70.0,
                action=HealingAction.SCALE_OUT,
                cooldown_minutes=10,
                max_attempts_per_hour=4,
                description="Scale agent instances for availability"
            ),
            
            # Circuit Breaker Healing
            HealingPolicy(
                name="circuit_breaker_reset",
                trigger_condition="circuit_breakers_recovery_eligible > 0",
                threshold_value=1.0,
                action=HealingAction.RESET_CIRCUIT_BREAKER,
                cooldown_minutes=5,
                max_attempts_per_hour=10,
                description="Reset circuit breakers showing recovery signs"
            ),
            
            # Error Rate Healing
            HealingPolicy(
                name="high_error_rate_rollback",
                trigger_condition="error_rate_percentage > 2.0",
                threshold_value=2.0,
                action=HealingAction.ROLLBACK_DEPLOYMENT,
                cooldown_minutes=60,
                max_attempts_per_hour=1,
                description="Rollback deployment causing high error rates"
            ),
            HealingPolicy(
                name="moderate_error_rate_clear_cache",
                trigger_condition="error_rate_percentage > 1.0",
                threshold_value=1.0,
                action=HealingAction.CLEAR_CACHE,
                cooldown_minutes=15,
                max_attempts_per_hour=3,
                description="Clear service caches to resolve transient errors"
            ),
            
            # Revenue Protection Healing
            HealingPolicy(
                name="revenue_drop_enable_degraded_mode",
                trigger_condition="revenue_drop_percentage > 15",
                threshold_value=15.0,
                action=HealingAction.ENABLE_DEGRADED_MODE,
                cooldown_minutes=30,
                max_attempts_per_hour=2,
                description="Enable degraded mode to protect revenue streams"
            ),
            
            # Resource Utilization Healing
            HealingPolicy(
                name="high_cpu_scale_out",
                trigger_condition="cpu_utilization > 85",
                threshold_value=85.0,
                action=HealingAction.SCALE_OUT,
                cooldown_minutes=10,
                max_attempts_per_hour=5,
                description="Scale out instances for high CPU utilization"
            ),
            HealingPolicy(
                name="low_utilization_scale_down",
                trigger_condition="cpu_utilization < 20",
                threshold_value=20.0,
                action=HealingAction.SCALE_DOWN,
                cooldown_minutes=30,
                max_attempts_per_hour=2,
                description="Scale down underutilized instances"
            )
        ]
    
    async def monitor_and_heal(self, metrics: Dict[str, Any]) -> List[HealingExecution]:
        """
        Monitor system metrics and execute healing actions when needed.
        
        Args:
            metrics: Current system metrics
            
        Returns:
            List of healing actions executed
        """
        if not self.healing_enabled:
            return []
        
        # Reset hourly counters if needed
        self._reset_hourly_counters()
        
        executed_actions = []
        
        for policy in self.healing_policies:
            try:
                if self._should_execute_policy(policy, metrics):
                    execution = await self._execute_healing_action(policy, metrics)
                    if execution:
                        executed_actions.append(execution)
                        self.execution_history.append(execution)
                        
                        # Update action counter
                        counter_key = f"{policy.name}_{execution.executed_at.hour}"
                        self.action_counters[counter_key] = self.action_counters.get(counter_key, 0) + 1
                        
                        logger.info(f"Self-healing action executed: {policy.name}", extra={
                            "policy": policy.name,
                            "action": policy.action.value,
                            "trigger_metric": execution.trigger_metric,
                            "trigger_value": execution.trigger_value,
                            "success": execution.success
                        })
                        
            except Exception as e:
                logger.error(f"Failed to execute healing policy {policy.name}: {e}")
        
        return executed_actions
    
    def _should_execute_policy(self, policy: HealingPolicy, metrics: Dict[str, Any]) -> bool:
        """Determine if a healing policy should be executed."""
        # Check cooldown period
        last_execution = self._get_last_execution_time(policy.name)
        if last_execution:
            cooldown_end = last_execution + timedelta(minutes=policy.cooldown_minutes)
            if datetime.now(timezone.utc) < cooldown_end:
                return False
        
        # Check hourly rate limit
        current_hour = datetime.now(timezone.utc).hour
        counter_key = f"{policy.name}_{current_hour}"
        if self.action_counters.get(counter_key, 0) >= policy.max_attempts_per_hour:
            return False
        
        # Evaluate trigger condition
        return self._evaluate_trigger_condition(policy, metrics)
    
    def _evaluate_trigger_condition(self, policy: HealingPolicy, metrics: Dict[str, Any]) -> bool:
        """Evaluate if the policy trigger condition is met."""
        condition = policy.trigger_condition
        
        try:
            # Parse simple conditions like "metric > threshold"
            if " > " in condition:
                metric_name, threshold_str = condition.split(" > ")
                metric_name = metric_name.strip()
                threshold = float(threshold_str.strip())
                
                current_value = metrics.get(metric_name, 0)
                return float(current_value) > threshold
                
            elif " < " in condition:
                metric_name, threshold_str = condition.split(" < ")
                metric_name = metric_name.strip()
                threshold = float(threshold_str.strip())
                
                current_value = metrics.get(metric_name, 0)
                return float(current_value) < threshold
            
            # Handle special conditions
            elif condition == "circuit_breakers_recovery_eligible > 0":
                # Check if any circuit breakers are in recovery-eligible state
                cb_status = metrics.get("circuit_breakers", {})
                half_open_breakers = cb_status.get("half_open_breakers", 0)
                return half_open_breakers > 0
            
            elif "revenue_drop_percentage" in condition:
                # Calculate revenue drop percentage from current vs baseline
                current_revenue = metrics.get("current_revenue", 0)
                revenue_baseline = self._get_revenue_baseline()
                if revenue_baseline > 0:
                    drop_percentage = ((revenue_baseline - current_revenue) / revenue_baseline) * 100
                    return drop_percentage > policy.threshold_value
            
        except Exception as e:
            logger.error(f"Failed to evaluate trigger condition '{condition}': {e}")
            return False
        
        return False
    
    async def _execute_healing_action(self, policy: HealingPolicy, metrics: Dict[str, Any]) -> Optional[HealingExecution]:
        """Execute a specific healing action."""
        start_time = datetime.now(timezone.utc)
        
        # Extract trigger metric value
        trigger_metric = self._extract_trigger_metric(policy.trigger_condition)
        trigger_value = metrics.get(trigger_metric, 0)
        
        try:
            success = await self._perform_action(policy.action, metrics)
            
            execution = HealingExecution(
                policy_name=policy.name,
                action=policy.action,
                trigger_metric=trigger_metric,
                trigger_value=float(trigger_value),
                executed_at=start_time,
                success=success,
                result_message=f"Healing action {'succeeded' if success else 'failed'}",
                recovery_time_seconds=(datetime.now(timezone.utc) - start_time).total_seconds()
            )
            
            return execution
            
        except Exception as e:
            return HealingExecution(
                policy_name=policy.name,
                action=policy.action,
                trigger_metric=trigger_metric,
                trigger_value=float(trigger_value),
                executed_at=start_time,
                success=False,
                result_message=f"Execution failed: {str(e)}",
                recovery_time_seconds=(datetime.now(timezone.utc) - start_time).total_seconds()
            )
    
    async def _perform_action(self, action: HealingAction, metrics: Dict[str, Any]) -> bool:
        """
        Perform the actual healing action.
        In a production system, these would trigger real infrastructure changes.
        """
        try:
            if action == HealingAction.RESTART_SERVICE:
                # Simulate service restart
                await asyncio.sleep(0.1)  # Simulate restart time
                logger.info("Simulated service restart for latency healing")
                return True
                
            elif action == HealingAction.SCALE_OUT:
                # Simulate scaling out
                await asyncio.sleep(0.1)
                logger.info("Simulated scaling out +1 replica")
                return True
                
            elif action == HealingAction.SCALE_DOWN:
                # Simulate scaling down
                await asyncio.sleep(0.1)
                logger.info("Simulated scaling down -1 replica")
                return True
                
            elif action == HealingAction.ROLLBACK_DEPLOYMENT:
                # Simulate deployment rollback
                await asyncio.sleep(0.2)
                logger.info("Simulated deployment rollback")
                return True
                
            elif action == HealingAction.ISOLATE_SERVICE:
                # Simulate service isolation
                await asyncio.sleep(0.1)
                logger.info("Simulated service isolation")
                return True
                
            elif action == HealingAction.ENABLE_DEGRADED_MODE:
                # Simulate degraded mode activation
                await asyncio.sleep(0.1)
                logger.info("Simulated degraded mode activation")
                return True
                
            elif action == HealingAction.CLEAR_CACHE:
                # Simulate cache clearing
                await asyncio.sleep(0.05)
                logger.info("Simulated cache clearing")
                return True
                
            elif action == HealingAction.RESET_CIRCUIT_BREAKER:
                # Simulate circuit breaker reset
                await asyncio.sleep(0.05)
                logger.info("Simulated circuit breaker reset")
                return True
                
            elif action == HealingAction.REDISTRIBUTE_LOAD:
                # Simulate load redistribution
                await asyncio.sleep(0.1)
                logger.info("Simulated load redistribution")
                return True
                
            elif action == HealingAction.RESTART_AGENT:
                # Simulate agent restart
                await asyncio.sleep(0.1)
                logger.info("Simulated agent restart")
                return True
                
            else:
                logger.warning(f"Unknown healing action: {action}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to perform healing action {action}: {e}")
            return False
    
    def _extract_trigger_metric(self, condition: str) -> str:
        """Extract the primary metric name from a trigger condition."""
        if " > " in condition:
            return condition.split(" > ")[0].strip()
        elif " < " in condition:
            return condition.split(" < ")[0].strip()
        elif "revenue_drop" in condition:
            return "revenue_drop_percentage"
        elif "circuit_breakers" in condition:
            return "circuit_breakers_recovery_eligible"
        else:
            return "unknown_metric"
    
    def _get_last_execution_time(self, policy_name: str) -> Optional[datetime]:
        """Get the last execution time for a policy."""
        for execution in reversed(self.execution_history):
            if execution.policy_name == policy_name:
                return execution.executed_at
        return None
    
    def _get_revenue_baseline(self) -> float:
        """Get revenue baseline for drop calculation."""
        # This would typically come from a time-series database
        # For now, return a reasonable baseline
        return 3800000.0  # $3.8M baseline
    
    def _reset_hourly_counters(self):
        """Reset action counters every hour."""
        now = datetime.now(timezone.utc)
        if now.hour != self.last_reset.hour:
            # Clear counters for the previous hour
            previous_hour = (now - timedelta(hours=1)).hour
            keys_to_remove = [k for k in self.action_counters.keys() if k.endswith(f"_{previous_hour}")]
            for key in keys_to_remove:
                del self.action_counters[key]
            
            self.last_reset = now
    
    def get_healing_status(self) -> Dict[str, Any]:
        """Get comprehensive self-healing status."""
        recent_executions = [
            execution for execution in self.execution_history
            if execution.executed_at > datetime.now(timezone.utc) - timedelta(hours=24)
        ]
        
        successful_actions = len([e for e in recent_executions if e.success])
        failed_actions = len([e for e in recent_executions if not e.success])
        
        return {
            "healing_enabled": self.healing_enabled,
            "total_policies": len(self.healing_policies),
            "recent_executions_24h": len(recent_executions),
            "successful_actions_24h": successful_actions,
            "failed_actions_24h": failed_actions,
            "success_rate_24h": successful_actions / len(recent_executions) * 100 if recent_executions else 0,
            "current_hour_actions": sum(
                count for key, count in self.action_counters.items()
                if key.endswith(f"_{datetime.now(timezone.utc).hour}")
            ),
            "last_healing_action": recent_executions[-1].executed_at.isoformat() if recent_executions else None,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def enable_healing(self):
        """Enable self-healing actions."""
        self.healing_enabled = True
        logger.info("Self-healing enabled")
    
    def disable_healing(self):
        """Disable self-healing actions."""
        self.healing_enabled = False
        logger.warning("Self-healing disabled")
    
    def get_recent_actions(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get recent healing actions."""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        recent_actions = [
            {
                "policy_name": execution.policy_name,
                "action": execution.action.value,
                "trigger_metric": execution.trigger_metric,
                "trigger_value": execution.trigger_value,
                "executed_at": execution.executed_at.isoformat(),
                "success": execution.success,
                "result_message": execution.result_message,
                "recovery_time_seconds": execution.recovery_time_seconds
            }
            for execution in self.execution_history
            if execution.executed_at > cutoff_time
        ]
        
        return recent_actions


# Global self-healing service instance
_self_healing_service = None

def get_self_healing_service() -> SelfHealingService:
    """Get or create the global self-healing service instance."""
    global _self_healing_service
    if _self_healing_service is None:
        _self_healing_service = SelfHealingService()
    return _self_healing_service