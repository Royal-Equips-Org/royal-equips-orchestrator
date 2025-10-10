"""
Central Agent Registry for 100+ Agents Orchestration

This module provides a centralized registry for managing all agents in the Royal Equips Empire.
It enables dynamic agent discovery, registration, health monitoring, and communication with the
Command Center and AIRA orchestration system.

Features:
- Dynamic agent registration and discovery
- Real-time health monitoring
- Agent capability management
- Command Center integration
- AIRA orchestration layer
- Scalable for 100+ concurrent agents
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set


class AgentStatus(Enum):
    """Agent operational status"""
    INITIALIZING = "initializing"
    READY = "ready"
    RUNNING = "running"
    IDLE = "idle"
    ERROR = "error"
    STOPPED = "stopped"
    MAINTENANCE = "maintenance"


class AgentCapability(Enum):
    """Agent capabilities for routing and orchestration"""
    PRODUCT_RESEARCH = "product_research"
    INVENTORY_MANAGEMENT = "inventory_management"
    PRICING_OPTIMIZATION = "pricing_optimization"
    MARKETING_AUTOMATION = "marketing_automation"
    ORDER_FULFILLMENT = "order_fulfillment"
    CUSTOMER_SUPPORT = "customer_support"
    ANALYTICS = "analytics"
    FINANCE = "finance"
    SECURITY = "security"
    DEVOPS = "devops"
    AI_ORCHESTRATION = "ai_orchestration"


@dataclass
class AgentMetadata:
    """Metadata for registered agents"""
    agent_id: str
    name: str
    type: str
    capabilities: List[AgentCapability]
    status: AgentStatus = AgentStatus.INITIALIZING
    version: str = "1.0.0"
    last_heartbeat: datetime = field(default_factory=datetime.now)
    registered_at: datetime = field(default_factory=datetime.now)
    execution_count: int = 0
    error_count: int = 0
    avg_execution_time: float = 0.0
    current_load: float = 0.0
    max_concurrent_tasks: int = 10
    tags: Set[str] = field(default_factory=set)
    metadata: Dict[str, Any] = field(default_factory=dict)


class AgentRegistry:
    """
    Central registry for managing all agents in the Royal Equips Empire.
    Provides agent discovery, health monitoring, and orchestration capabilities.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.agents: Dict[str, AgentMetadata] = {}
        self.capability_index: Dict[AgentCapability, Set[str]] = {
            cap: set() for cap in AgentCapability
        }
        self.health_check_interval = 30  # seconds
        self.heartbeat_timeout = 90  # seconds
        self._monitoring_task: Optional[asyncio.Task] = None

    async def register_agent(
        self,
        agent_id: str,
        name: str,
        agent_type: str,
        capabilities: List[AgentCapability],
        version: str = "1.0.0",
        max_concurrent_tasks: int = 10,
        tags: Optional[Set[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Register a new agent in the registry.
        
        Args:
            agent_id: Unique identifier for the agent
            name: Human-readable agent name
            agent_type: Type classification of the agent
            capabilities: List of capabilities the agent provides
            version: Agent version
            max_concurrent_tasks: Maximum concurrent tasks the agent can handle
            tags: Optional tags for categorization
            metadata: Optional additional metadata
            
        Returns:
            bool: True if registration successful
        """
        try:
            if agent_id in self.agents:
                self.logger.warning(f"Agent {agent_id} already registered, updating metadata")

            agent_meta = AgentMetadata(
                agent_id=agent_id,
                name=name,
                type=agent_type,
                capabilities=capabilities,
                status=AgentStatus.READY,
                version=version,
                max_concurrent_tasks=max_concurrent_tasks,
                tags=tags or set(),
                metadata=metadata or {}
            )

            self.agents[agent_id] = agent_meta

            # Update capability index
            for capability in capabilities:
                self.capability_index[capability].add(agent_id)

            self.logger.info(
                f"Agent registered: {name} ({agent_id}) with capabilities: "
                f"{[c.value for c in capabilities]}"
            )

            return True

        except Exception as e:
            self.logger.error(f"Failed to register agent {agent_id}: {e}", exc_info=True)
            return False

    async def unregister_agent(self, agent_id: str) -> bool:
        """Unregister an agent from the registry."""
        try:
            if agent_id not in self.agents:
                self.logger.warning(f"Agent {agent_id} not found in registry")
                return False

            agent = self.agents[agent_id]

            # Remove from capability index
            for capability in agent.capabilities:
                self.capability_index[capability].discard(agent_id)

            del self.agents[agent_id]

            self.logger.info(f"Agent unregistered: {agent.name} ({agent_id})")
            return True

        except Exception as e:
            self.logger.error(f"Failed to unregister agent {agent_id}: {e}", exc_info=True)
            return False

    async def update_agent_status(self, agent_id: str, status: AgentStatus) -> bool:
        """Update agent operational status."""
        if agent_id not in self.agents:
            self.logger.warning(f"Agent {agent_id} not found in registry")
            return False

        self.agents[agent_id].status = status
        self.agents[agent_id].last_heartbeat = datetime.now(timezone.utc)
        return True

    async def agent_heartbeat(self, agent_id: str, metrics: Optional[Dict[str, Any]] = None) -> bool:
        """
        Record agent heartbeat and update metrics.
        
        Args:
            agent_id: Agent identifier
            metrics: Optional metrics to update (execution_count, error_count, load, etc.)
            
        Returns:
            bool: True if heartbeat recorded successfully
        """
        if agent_id not in self.agents:
            self.logger.warning(f"Agent {agent_id} not found in registry")
            return False

        agent = self.agents[agent_id]
        agent.last_heartbeat = datetime.now(timezone.utc)

        if metrics:
            if 'execution_count' in metrics:
                agent.execution_count = metrics['execution_count']
            if 'error_count' in metrics:
                agent.error_count = metrics['error_count']
            if 'avg_execution_time' in metrics:
                agent.avg_execution_time = metrics['avg_execution_time']
            if 'current_load' in metrics:
                agent.current_load = metrics['current_load']

        return True

    def get_agent(self, agent_id: str) -> Optional[AgentMetadata]:
        """Get agent metadata by ID."""
        return self.agents.get(agent_id)

    def get_all_agents(self) -> List[AgentMetadata]:
        """Get all registered agents."""
        return list(self.agents.values())

    def get_agents_by_capability(self, capability: AgentCapability) -> List[AgentMetadata]:
        """Get all agents that provide a specific capability."""
        agent_ids = self.capability_index.get(capability, set())
        return [self.agents[aid] for aid in agent_ids if aid in self.agents]

    def get_agents_by_status(self, status: AgentStatus) -> List[AgentMetadata]:
        """Get all agents with a specific status."""
        return [agent for agent in self.agents.values() if agent.status == status]

    def get_healthy_agents(self) -> List[AgentMetadata]:
        """Get all agents with healthy status (not ERROR or STOPPED)."""
        return [
            agent for agent in self.agents.values()
            if agent.status not in [AgentStatus.ERROR, AgentStatus.STOPPED]
        ]

    def find_best_agent_for_task(
        self,
        capability: AgentCapability,
        prefer_idle: bool = True
    ) -> Optional[AgentMetadata]:
        """
        Find the best agent to handle a task based on capability and load.
        
        Args:
            capability: Required capability
            prefer_idle: Prefer idle agents over running agents
            
        Returns:
            AgentMetadata of the best available agent, or None
        """
        candidates = self.get_agents_by_capability(capability)

        if not candidates:
            return None

        # Filter healthy agents
        healthy = [a for a in candidates if a.status in [AgentStatus.READY, AgentStatus.IDLE, AgentStatus.RUNNING]]

        if not healthy:
            return None

        # Sort by load and status
        if prefer_idle:
            # Prefer IDLE > READY > RUNNING, then by lowest load
            healthy.sort(key=lambda a: (
                0 if a.status == AgentStatus.IDLE else (1 if a.status == AgentStatus.READY else 2),
                a.current_load
            ))
        else:
            # Just sort by load
            healthy.sort(key=lambda a: a.current_load)

        return healthy[0]

    async def check_agent_health(self):
        """Check health of all registered agents based on heartbeat timeout."""
        now = datetime.now(timezone.utc)
        timeout_threshold = now - timedelta(seconds=self.heartbeat_timeout)

        for agent_id, agent in list(self.agents.items()):
            # Ensure timezone awareness for comparison
            agent_heartbeat = agent.last_heartbeat
            if agent_heartbeat.tzinfo is None:
                agent_heartbeat = agent_heartbeat.replace(tzinfo=timezone.utc)
            
            if agent_heartbeat < timeout_threshold:
                if agent.status not in [AgentStatus.STOPPED, AgentStatus.MAINTENANCE]:
                    self.logger.warning(
                        f"Agent {agent.name} ({agent_id}) heartbeat timeout. "
                        f"Last heartbeat: {agent.last_heartbeat}"
                    )
                    agent.status = AgentStatus.ERROR

    async def start_monitoring(self):
        """Start background health monitoring task."""
        if self._monitoring_task and not self._monitoring_task.done():
            self.logger.warning("Monitoring task already running")
            return

        self._monitoring_task = asyncio.create_task(self._monitor_agents())
        self.logger.info("Agent monitoring started")

    async def stop_monitoring(self):
        """Stop background health monitoring task."""
        if self._monitoring_task and not self._monitoring_task.done():
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
            self.logger.info("Agent monitoring stopped")

    async def _monitor_agents(self):
        """Background task for continuous agent health monitoring."""
        while True:
            try:
                await self.check_agent_health()
                await asyncio.sleep(self.health_check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error in agent monitoring: {e}", exc_info=True)
                await asyncio.sleep(self.health_check_interval)

    def get_registry_stats(self) -> Dict[str, Any]:
        """Get statistics about the agent registry."""
        total = len(self.agents)
        status_counts = {}
        for status in AgentStatus:
            status_counts[status.value] = len(self.get_agents_by_status(status))

        capability_counts = {}
        for capability in AgentCapability:
            capability_counts[capability.value] = len(self.capability_index[capability])

        return {
            'total_agents': total,
            'status_breakdown': status_counts,
            'capability_coverage': capability_counts,
            'healthy_agents': len(self.get_healthy_agents()),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

    def to_dict(self) -> Dict[str, Any]:
        """Serialize registry to dictionary for API responses."""
        return {
            'agents': [
                {
                    'agent_id': agent.agent_id,
                    'name': agent.name,
                    'type': agent.type,
                    'capabilities': [c.value for c in agent.capabilities],
                    'status': agent.status.value,
                    'version': agent.version,
                    'last_heartbeat': agent.last_heartbeat.isoformat(),
                    'registered_at': agent.registered_at.isoformat(),
                    'execution_count': agent.execution_count,
                    'error_count': agent.error_count,
                    'avg_execution_time': agent.avg_execution_time,
                    'current_load': agent.current_load,
                    'max_concurrent_tasks': agent.max_concurrent_tasks,
                    'tags': list(agent.tags),
                    'metadata': agent.metadata
                }
                for agent in self.agents.values()
            ],
            'stats': self.get_registry_stats()
        }


# Global singleton instance
_global_registry: Optional[AgentRegistry] = None


def get_agent_registry() -> AgentRegistry:
    """Get the global agent registry instance."""
    global _global_registry
    if _global_registry is None:
        _global_registry = AgentRegistry()
    return _global_registry


async def register_autogen_agents(registry: AgentRegistry, count: int = 100) -> Dict[str, Any]:
    """
    FASE 2: Register dynamically generated agents to support 100+ agents.
    
    This function registers a configurable number of autogenerated agents
    for RoyalGPT orchestration capabilities.
    
    Args:
        registry: The agent registry instance
        count: Number of agents to generate (default: 100)
    
    Returns:
        Dictionary with registration results
    """
    import os

    # Check if dynamic agent generation is enabled
    if not os.getenv("ENABLE_ROYALGPT_ORCHESTRATION", "true").lower() == "true":
        return {
            "success": False,
            "message": "Dynamic agent generation disabled",
            "registered": 0
        }

    # Get authorized scope (default "*" means all agents)
    authorized_scope = os.getenv("AUTHORIZED_AGENTS_SCOPE", "*")

    registered_count = 0
    failed_count = 0

    for i in range(count):
        try:
            agent_id = f"autogen_agent_{i:03d}"
            success = await registry.register_agent(
                agent_id=agent_id,
                name=f"AutoGen Agent {i}",
                agent_type="autogenerated",
                capabilities=[AgentCapability.AI_ORCHESTRATION],
                version="1.0.0",
                max_concurrent_tasks=10,
                tags={"autogenerated", "royalgpt", "orchestration"},
                metadata={
                    "auto_registered": True,
                    "generation_index": i,
                    "authorized_scope": authorized_scope
                }
            )
            if success:
                registered_count += 1
            else:
                failed_count += 1
        except Exception as e:
            failed_count += 1
            logging.getLogger(__name__).error(f"Failed to register agent {i}: {e}")

    return {
        "success": True,
        "message": f"Registered {registered_count} autogenerated agents",
        "registered": registered_count,
        "failed": failed_count,
        "total": count
    }
