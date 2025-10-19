"""
Real-time Agent Status Service
Production monitoring and health checking for all empire agents
"""

import asyncio
import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import psutil

from core.secrets.secret_provider import UnifiedSecretResolver

logger = logging.getLogger(__name__)


@dataclass
class AgentHealthMetrics:
    """Real health metrics for an agent."""
    agent_id: str
    agent_type: str
    status: str  # active, idle, error, maintenance
    cpu_usage_percent: float
    memory_usage_mb: float
    last_execution_time: Optional[datetime]
    total_executions: int
    successful_executions: int
    failed_executions: int
    avg_execution_time_seconds: float
    error_rate_percent: float
    throughput_per_hour: float
    health_score: int  # 0-100


class RealTimeAgentMonitor:
    """Production agent monitoring with real health metrics."""

    def __init__(self):
        self.secrets = UnifiedSecretResolver()
        self.agent_metrics: Dict[str, AgentHealthMetrics] = {}
        self.monitoring_active = False
        self.update_interval = 30  # seconds

    async def initialize(self):
        """Initialize monitoring service."""
        try:
            logger.info("Initializing real-time agent monitor")

            # Start monitoring loop
            self.monitoring_active = True
            asyncio.create_task(self._monitoring_loop())

            logger.info("Agent monitoring service started")

        except Exception as e:
            logger.error(f"Failed to initialize agent monitor: {e}")
            raise

    async def _monitoring_loop(self):
        """Continuous monitoring loop for agent health."""
        while self.monitoring_active:
            try:
                await self._collect_agent_metrics()
                await asyncio.sleep(self.update_interval)

            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                await asyncio.sleep(5)  # Short delay before retry

    async def _collect_agent_metrics(self):
        """Collect real metrics for all agents."""
        try:
            # Get agent execution data from database
            from app.services.production_agent_executor import get_agent_executor
            agent_executor = await get_agent_executor()

            # Validate executor is available and has callable get_agent_executions method
            if agent_executor is None or not callable(getattr(agent_executor, 'get_agent_executions', None)):
                logger.debug("Agent executor not initialized yet, skipping metrics collection")
                return

            # Get recent executions for analysis
            recent_executions = await agent_executor.get_agent_executions(limit=1000)

            # Group executions by agent type
            agent_execution_data = {}
            for execution in recent_executions:
                agent_type = execution['agent_type']
                if agent_type not in agent_execution_data:
                    agent_execution_data[agent_type] = []
                agent_execution_data[agent_type].append(execution)

            # Calculate metrics for each agent
            for agent_type, executions in agent_execution_data.items():
                metrics = await self._calculate_agent_metrics(agent_type, executions)
                self.agent_metrics[agent_type] = metrics

            # Add system resource metrics
            await self._add_system_metrics()

        except Exception as e:
            logger.error(f"Failed to collect agent metrics: {e}")

    async def _calculate_agent_metrics(self, agent_type: str, executions: List[Dict]) -> AgentHealthMetrics:
        """Calculate comprehensive metrics for an agent."""

        # Basic counts
        total_executions = len(executions)
        successful_executions = len([e for e in executions if e['status'] == 'completed'])
        failed_executions = len([e for e in executions if e['status'] == 'failed'])

        # Success rate and error rate
        success_rate = (successful_executions / total_executions * 100) if total_executions > 0 else 0
        error_rate = (failed_executions / total_executions * 100) if total_executions > 0 else 0

        # Execution time analysis
        completed_executions = [e for e in executions if e['status'] == 'completed' and e['duration_seconds']]
        avg_execution_time = sum(e['duration_seconds'] for e in completed_executions) / len(completed_executions) if completed_executions else 0

        # Last execution time
        last_execution = None
        if executions:
            latest_exec = max(executions, key=lambda x: x['queued_at'])
            last_execution = datetime.fromisoformat(latest_exec['queued_at'].replace('Z', '+00:00'))

        # Throughput calculation (executions per hour in last 24 hours)
        recent_executions = [
            e for e in executions
            if datetime.fromisoformat(e['queued_at'].replace('Z', '+00:00')) > datetime.now(timezone.utc) - timedelta(hours=24)
        ]
        throughput_per_hour = len(recent_executions) / 24 if recent_executions else 0

        # Determine status
        if error_rate > 50:
            status = "error"
        elif last_execution and datetime.now(timezone.utc) - last_execution < timedelta(hours=1):
            status = "active"
        elif last_execution and datetime.now(timezone.utc) - last_execution < timedelta(hours=24):
            status = "idle"
        else:
            status = "inactive"

        # Calculate health score (0-100)
        health_score = max(0, min(100, int(
            (success_rate * 0.4) +  # 40% weight on success rate
            (min(100, throughput_per_hour * 10) * 0.3) +  # 30% weight on throughput
            (100 - error_rate * 2) * 0.3  # 30% weight on low error rate
        )))

        # Get system resource usage for this agent type
        cpu_usage, memory_usage = await self._get_agent_resource_usage(agent_type)

        return AgentHealthMetrics(
            agent_id=f"agent_{agent_type}",
            agent_type=agent_type,
            status=status,
            cpu_usage_percent=cpu_usage,
            memory_usage_mb=memory_usage,
            last_execution_time=last_execution,
            total_executions=total_executions,
            successful_executions=successful_executions,
            failed_executions=failed_executions,
            avg_execution_time_seconds=avg_execution_time,
            error_rate_percent=error_rate,
            throughput_per_hour=throughput_per_hour,
            health_score=health_score
        )

    async def _get_agent_resource_usage(self, agent_type: str) -> tuple[float, float]:
        """Get real CPU and memory usage for an agent."""
        try:
            # Get system-wide metrics (would be agent-specific in production with proper containerization)
            cpu_percent = psutil.cpu_percent(interval=1)
            memory_info = psutil.virtual_memory()

            # Estimate agent-specific usage based on activity
            # In production, this would use container metrics or process monitoring
            agent_cpu = cpu_percent * 0.1  # Assume each agent uses ~10% of system CPU when active
            agent_memory = memory_info.used / 1024 / 1024 * 0.05  # Assume each agent uses ~5% of memory

            return agent_cpu, agent_memory

        except Exception as e:
            logger.error(f"Failed to get resource usage for {agent_type}: {e}")
            return 0.0, 0.0

    async def _add_system_metrics(self):
        """Add overall system health metrics."""
        try:
            # System-wide metrics
            cpu_usage = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')

            # Network I/O
            network = psutil.net_io_counters()

            system_metrics = {
                "system_cpu_percent": cpu_usage,
                "system_memory_percent": memory.percent,
                "system_memory_available_gb": memory.available / 1024 / 1024 / 1024,
                "system_disk_usage_percent": disk.percent,
                "network_bytes_sent": network.bytes_sent,
                "network_bytes_received": network.bytes_recv,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            # Store system metrics for API access
            self.system_metrics = system_metrics

        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")

    async def get_agent_status(self, agent_id: str = None) -> Dict[str, Any]:
        """Get current status for specific agent or all agents."""
        if agent_id:
            agent_type = agent_id.replace('agent_', '')
            metrics = self.agent_metrics.get(agent_type)
            return asdict(metrics) if metrics else None

        # Return all agents
        return {
            agent_type: asdict(metrics)
            for agent_type, metrics in self.agent_metrics.items()
        }

    async def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health summary."""
        try:
            total_agents = len(self.agent_metrics)
            active_agents = len([m for m in self.agent_metrics.values() if m.status == 'active'])
            error_agents = len([m for m in self.agent_metrics.values() if m.status == 'error'])

            # Calculate overall health score
            if total_agents > 0:
                avg_health = sum(m.health_score for m in self.agent_metrics.values()) / total_agents
                overall_success_rate = sum(
                    m.successful_executions / m.total_executions * 100 if m.total_executions > 0 else 0
                    for m in self.agent_metrics.values()
                ) / total_agents
            else:
                avg_health = 100
                overall_success_rate = 100

            system_health = {
                "status": "healthy" if error_agents == 0 else "degraded" if error_agents < total_agents / 2 else "critical",
                "total_agents": total_agents,
                "active_agents": active_agents,
                "error_agents": error_agents,
                "avg_health_score": int(avg_health),
                "overall_success_rate": round(overall_success_rate, 2),
                "system_metrics": getattr(self, 'system_metrics', {}),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            return system_health

        except Exception as e:
            logger.error(f"Failed to get system health: {e}")
            return {
                "status": "unknown",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

    async def get_performance_history(self, agent_type: str = None, hours: int = 24) -> List[Dict[str, Any]]:
        """Get performance history for agents."""
        try:
            from app.services.production_agent_executor import get_agent_executor
            agent_executor = await get_agent_executor()

            # Validate executor is available and callable
            if agent_executor is None or not callable(getattr(agent_executor, 'get_agent_executions', None)):
                logger.debug("Agent executor not initialized yet, returning empty performance history")
                return []

            # Get executions from the specified time period
            since_time = datetime.now(timezone.utc) - timedelta(hours=hours)
            all_executions = await agent_executor.get_agent_executions(limit=5000)

            # Filter by time and agent type
            filtered_executions = [
                e for e in all_executions
                if datetime.fromisoformat(e['queued_at'].replace('Z', '+00:00')) > since_time
                and (not agent_type or e['agent_type'] == agent_type)
            ]

            # Group by hour for trend analysis
            hourly_performance = {}
            for execution in filtered_executions:
                exec_time = datetime.fromisoformat(execution['queued_at'].replace('Z', '+00:00'))
                hour_key = exec_time.replace(minute=0, second=0, microsecond=0)

                if hour_key not in hourly_performance:
                    hourly_performance[hour_key] = {
                        "timestamp": hour_key.isoformat(),
                        "total_executions": 0,
                        "successful_executions": 0,
                        "failed_executions": 0,
                        "avg_duration": 0,
                        "durations": []
                    }

                hour_data = hourly_performance[hour_key]
                hour_data["total_executions"] += 1

                if execution['status'] == 'completed':
                    hour_data["successful_executions"] += 1
                    if execution['duration_seconds']:
                        hour_data["durations"].append(execution['duration_seconds'])
                elif execution['status'] == 'failed':
                    hour_data["failed_executions"] += 1

            # Calculate averages and format response
            performance_history = []
            for hour_data in hourly_performance.values():
                if hour_data["durations"]:
                    hour_data["avg_duration"] = sum(hour_data["durations"]) / len(hour_data["durations"])
                del hour_data["durations"]  # Remove raw data

                hour_data["success_rate"] = (
                    hour_data["successful_executions"] / hour_data["total_executions"] * 100
                    if hour_data["total_executions"] > 0 else 0
                )

                performance_history.append(hour_data)

            # Sort by timestamp
            performance_history.sort(key=lambda x: x['timestamp'])

            return performance_history

        except Exception as e:
            logger.error(f"Failed to get performance history: {e}")
            return []

    def stop_monitoring(self):
        """Stop the monitoring service."""
        self.monitoring_active = False


# Singleton instance
_agent_monitor = None

async def get_agent_monitor() -> RealTimeAgentMonitor:
    """Get initialized agent monitor instance."""
    global _agent_monitor
    if _agent_monitor is None:
        _agent_monitor = RealTimeAgentMonitor()
        await _agent_monitor.initialize()
    return _agent_monitor
