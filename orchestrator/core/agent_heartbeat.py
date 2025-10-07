"""
FASE 3: Agent Heartbeat Monitoring and Verification

This module provides heartbeat monitoring capabilities to ensure all agents
are healthy and responsive. It can be used in CLI, cron jobs, or the
autonomous orchestration loop.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict

from orchestrator.core.agent_registry import AgentStatus, get_agent_registry

logger = logging.getLogger(__name__)


def verify_heartbeats(max_age_seconds: int = 120) -> Dict[str, Any]:
    """
    FASE 3: Verify that all registered agents have recent heartbeats.
    
    This function checks all agents in the registry and identifies those
    with stale heartbeats, indicating potential issues.
    
    Args:
        max_age_seconds: Maximum age of heartbeat before considered stale (default: 120s)
    
    Returns:
        Dictionary with verification results including healthy, stale, and error agents
    """
    registry = get_agent_registry()

    all_agents = registry.get_all_agents()

    healthy_agents = []
    stale_agents = []
    error_agents = []

    current_time = datetime.now(timezone.utc)

    for agent_metadata in all_agents:
        # Calculate time since last heartbeat
        heartbeat_age = (current_time - agent_metadata.last_heartbeat).total_seconds()

        # Categorize agent based on status and heartbeat
        if agent_metadata.status == AgentStatus.ERROR:
            error_agents.append({
                "agent_id": agent_metadata.agent_id,
                "name": agent_metadata.name,
                "status": agent_metadata.status.value,
                "heartbeat_age": heartbeat_age,
                "error_count": agent_metadata.error_count
            })
        elif heartbeat_age > max_age_seconds:
            stale_agents.append({
                "agent_id": agent_metadata.agent_id,
                "name": agent_metadata.name,
                "status": agent_metadata.status.value,
                "heartbeat_age": heartbeat_age,
                "last_heartbeat": agent_metadata.last_heartbeat.isoformat()
            })
        else:
            healthy_agents.append({
                "agent_id": agent_metadata.agent_id,
                "name": agent_metadata.name,
                "status": agent_metadata.status.value,
                "heartbeat_age": heartbeat_age
            })

    # Log summary
    logger.info(
        f"Heartbeat verification: {len(healthy_agents)} healthy, "
        f"{len(stale_agents)} stale, {len(error_agents)} error"
    )

    if stale_agents:
        logger.warning(f"Found {len(stale_agents)} agents with stale heartbeats")
        for agent in stale_agents:
            logger.warning(
                f"  - {agent['agent_id']} ({agent['name']}): "
                f"{agent['heartbeat_age']:.0f}s old"
            )

    if error_agents:
        logger.error(f"Found {len(error_agents)} agents in error state")
        for agent in error_agents:
            logger.error(
                f"  - {agent['agent_id']} ({agent['name']}): "
                f"{agent['error_count']} errors"
            )

    return {
        "timestamp": current_time.isoformat(),
        "total_agents": len(all_agents),
        "healthy": {
            "count": len(healthy_agents),
            "agents": healthy_agents
        },
        "stale": {
            "count": len(stale_agents),
            "agents": stale_agents
        },
        "error": {
            "count": len(error_agents),
            "agents": error_agents
        },
        "overall_status": (
            "healthy" if not stale_agents and not error_agents
            else "degraded" if error_agents
            else "warning"
        )
    }


def get_agent_health_summary() -> Dict[str, Any]:
    """
    Get a summary of agent health across the entire system.
    
    Returns:
        Dictionary with health summary statistics
    """
    registry = get_agent_registry()
    stats = registry.get_registry_stats()

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "registry_stats": stats,
        "heartbeat_check": verify_heartbeats()
    }


async def send_health_alerts(threshold_error_count: int = 5) -> None:
    """
    Send alerts for agents that exceed error thresholds.
    
    This function can be extended to send alerts via:
    - Email
    - Slack
    - PagerDuty
    - Sentry
    
    Args:
        threshold_error_count: Number of errors before alerting
    """
    registry = get_agent_registry()
    all_agents = registry.get_all_agents()

    alerts_sent = 0

    for agent_metadata in all_agents:
        if agent_metadata.error_count >= threshold_error_count:
            logger.critical(
                f"ALERT: Agent {agent_metadata.agent_id} ({agent_metadata.name}) has "
                f"{agent_metadata.error_count} errors - threshold: {threshold_error_count}"
            )

            # Here you would integrate with alerting systems:
            # - send_email_alert(agent_metadata.agent_id, agent_metadata)
            # - send_slack_alert(agent_id, agent_metadata)
            # - create_pagerduty_incident(agent_id, agent_metadata)

            alerts_sent += 1

    if alerts_sent > 0:
        logger.info(f"Sent {alerts_sent} health alerts")
