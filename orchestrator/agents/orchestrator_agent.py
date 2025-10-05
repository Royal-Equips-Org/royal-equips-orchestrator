"""
FASE 2: Background Orchestrator Agent for 100+ Agent Management

This agent continuously monitors and executes ready agents based on their
schedules, priorities, and health status. It provides autonomous orchestration
for the entire Royal Equips Empire agent ecosystem.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List

from orchestrator.core.agent_base import AgentBase, AgentStatus
from orchestrator.core.agent_registry import AgentStatus as RegistryAgentStatus
from orchestrator.core.agent_registry import get_agent_registry

logger = logging.getLogger(__name__)


class RoyalOrchestratorAgent(AgentBase):
    """
    Background orchestrator agent that manages execution of all registered agents.
    
    This agent runs continuously in the background, monitoring agent health,
    scheduling executions, and coordinating the entire agent ecosystem for
    RoyalGPT orchestration capabilities.
    """

    def __init__(self) -> None:
        super().__init__(
            name="royal_orchestrator_agent",
            agent_type="orchestrator",
            description="Background orchestrator managing 100+ agents for RoyalGPT"
        )

        self.registry = get_agent_registry()
        self.execution_interval = int(os.getenv("ORCHESTRATOR_INTERVAL_SECONDS", "10"))
        self.max_concurrent_executions = int(os.getenv("ORCHESTRATOR_MAX_CONCURRENT", "10"))
        self.enabled = os.getenv("ENABLE_ROYALGPT_ORCHESTRATION", "true").lower() == "true"

        # Tracking
        self.total_executions = 0
        self.successful_executions = 0
        self.failed_executions = 0
        self.last_cycle_time = datetime.now()

        self.status = AgentStatus.ACTIVE if self.enabled else AgentStatus.INACTIVE
        self.autonomous_mode = True

    async def run(self) -> Dict[str, Any]:
        """
        Main execution loop for the orchestrator agent.
        
        Continuously monitors and executes ready agents based on their
        schedules and priorities.
        
        Returns:
            Dictionary with execution results
        """
        if not self.enabled:
            logger.info("RoyalGPT orchestration is disabled")
            return {
                "success": False,
                "message": "Orchestrator disabled",
                "executions": 0
            }

        self.status = AgentStatus.ACTIVE
        logger.info(f"🚀 Starting Royal Orchestrator Agent (interval: {self.execution_interval}s)")

        try:
            while not self.emergency_stop:
                cycle_start = datetime.now()

                # Get all ready agents from registry
                ready_agents = await self._get_ready_agents()

                if ready_agents:
                    logger.info(f"Found {len(ready_agents)} agents ready for execution")

                    # Execute agents with concurrency control
                    results = await self._execute_agents(ready_agents)

                    # Update statistics
                    self.total_executions += len(results)
                    self.successful_executions += sum(1 for r in results if r.get("success"))
                    self.failed_executions += sum(1 for r in results if not r.get("success"))

                    logger.info(
                        f"Cycle complete: {len(results)} executions "
                        f"(success: {sum(1 for r in results if r.get('success'))}, "
                        f"failed: {sum(1 for r in results if not r.get('success'))})"
                    )
                else:
                    logger.debug("No agents ready for execution in this cycle")

                # Update cycle time
                self.last_cycle_time = datetime.now()
                self.last_execution = self.last_cycle_time

                # Calculate next execution
                cycle_duration = (datetime.now() - cycle_start).total_seconds()
                sleep_time = max(0, self.execution_interval - cycle_duration)

                self.next_scheduled = datetime.now() + timedelta(seconds=sleep_time)

                # Sleep until next cycle
                await asyncio.sleep(sleep_time)

        except Exception as e:
            logger.error(f"Orchestrator agent error: {e}", exc_info=True)
            self.status = AgentStatus.ERROR
            return {
                "success": False,
                "error": str(e),
                "total_executions": self.total_executions
            }

        return {
            "success": True,
            "total_executions": self.total_executions,
            "successful": self.successful_executions,
            "failed": self.failed_executions
        }

    async def _get_ready_agents(self) -> List[str]:
        """
        Get list of agents that are ready for execution.
        
        An agent is considered ready if:
        - Status is READY or IDLE
        - Not currently running
        - Heartbeat is recent (not stale)
        
        Returns:
            List of agent IDs ready for execution
        """
        ready_agents = []

        try:
            all_agents = self.registry.get_all_agents()

            for agent_metadata in all_agents:
                # Check if agent is in a ready state
                if agent_metadata.status in [RegistryAgentStatus.READY, RegistryAgentStatus.IDLE]:
                    # Check heartbeat freshness
                    time_since_heartbeat = (datetime.now() - agent_metadata.last_heartbeat).total_seconds()

                    if time_since_heartbeat < self.registry.heartbeat_timeout:
                        # Check if agent should execute based on custom logic
                        if await self._should_execute_agent(agent_metadata):
                            ready_agents.append(agent_metadata.agent_id)
                    else:
                        logger.warning(
                            f"Agent {agent_metadata.agent_id} heartbeat stale "
                            f"({time_since_heartbeat:.0f}s ago)"
                        )
        except Exception as e:
            logger.error(f"Error getting ready agents: {e}", exc_info=True)

        return ready_agents

    async def _should_execute_agent(self, agent_metadata: Any) -> bool:
        """
        Determine if an agent should execute based on custom logic.
        
        Can be extended with:
        - Schedule-based execution
        - Priority-based selection
        - Load balancing
        - Resource availability checks
        
        Args:
            agent_metadata: Agent metadata from registry
        
        Returns:
            True if agent should execute
        """
        # For now, basic logic: execute if load is below threshold
        if agent_metadata.current_load >= 0.9:  # 90% load threshold
            logger.debug(f"Agent {agent_metadata.agent_id} at high load ({agent_metadata.current_load:.2f})")
            return False

        # Skip autogenerated agents unless they have specific tasks
        if agent_metadata.type == "autogenerated":
            # Only execute autogenerated agents if they have pending tasks
            # This would be extended with task queue integration
            return False

        return True

    async def _execute_agents(self, agent_ids: List[str]) -> List[Dict[str, Any]]:
        """
        Execute multiple agents with concurrency control.
        
        Args:
            agent_ids: List of agent IDs to execute
        
        Returns:
            List of execution results
        """
        results = []

        # Execute agents in batches to control concurrency
        for i in range(0, len(agent_ids), self.max_concurrent_executions):
            batch = agent_ids[i:i + self.max_concurrent_executions]

            # Execute batch concurrently
            batch_tasks = [self._execute_single_agent(agent_id) for agent_id in batch]
            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)

            # Process results
            for agent_id, result in zip(batch, batch_results):
                if isinstance(result, Exception):
                    logger.error(f"Agent {agent_id} execution failed: {result}")
                    results.append({
                        "agent_id": agent_id,
                        "success": False,
                        "error": str(result)
                    })
                else:
                    results.append(result)

        return results

    async def _execute_single_agent(self, agent_id: str) -> Dict[str, Any]:
        """
        Execute a single agent and update its status.
        
        Args:
            agent_id: Agent ID to execute
        
        Returns:
            Execution result dictionary
        """
        try:
            logger.debug(f"Executing agent: {agent_id}")

            # Update agent status to RUNNING
            await self.registry.update_agent_status(agent_id, RegistryAgentStatus.RUNNING)

            # Note: Actual agent execution would happen here
            # For now, we just simulate successful execution
            # In a full implementation, this would:
            # 1. Get the actual agent instance
            # 2. Call its run() method
            # 3. Handle results and errors

            # Simulate execution time
            await asyncio.sleep(0.1)

            # Update agent status back to IDLE
            await self.registry.update_agent_status(agent_id, RegistryAgentStatus.IDLE)

            # Send heartbeat
            await self.registry.agent_heartbeat(agent_id, {
                "last_execution": datetime.now().isoformat(),
                "status": "completed"
            })

            return {
                "agent_id": agent_id,
                "success": True,
                "executed_at": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Failed to execute agent {agent_id}: {e}", exc_info=True)

            # Update agent status to ERROR
            await self.registry.update_agent_status(agent_id, RegistryAgentStatus.ERROR)

            return {
                "agent_id": agent_id,
                "success": False,
                "error": str(e)
            }

    def get_health_status(self) -> Dict[str, Any]:
        """
        Get health status of the orchestrator agent.
        
        Returns:
            Dictionary with health status and statistics
        """
        return {
            "agent_name": self.name,
            "status": self.status.value,
            "enabled": self.enabled,
            "autonomous_mode": self.autonomous_mode,
            "statistics": {
                "total_executions": self.total_executions,
                "successful_executions": self.successful_executions,
                "failed_executions": self.failed_executions,
                "success_rate": (
                    self.successful_executions / self.total_executions
                    if self.total_executions > 0 else 0
                )
            },
            "configuration": {
                "execution_interval": self.execution_interval,
                "max_concurrent_executions": self.max_concurrent_executions
            },
            "last_cycle_time": self.last_cycle_time.isoformat() if self.last_cycle_time else None,
            "next_scheduled": self.next_scheduled.isoformat() if self.next_scheduled else None
        }

    def stop(self) -> None:
        """Stop the orchestrator agent gracefully."""
        logger.info("Stopping Royal Orchestrator Agent")
        self.emergency_stop = True
        self.status = AgentStatus.INACTIVE
