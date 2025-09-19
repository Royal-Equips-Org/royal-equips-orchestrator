"""Base classes and utilities for agents in the Royal Equips Orchestrator.

The AgentBase class defines a simple interface that all agents should
implement. Each agent exposes an asynchronous ``run`` method that can be
invoked by the orchestrator loop. Agents can also expose health checks
and metadata about their purpose and dependencies. This design enables
the orchestrator to manage heterogeneous agents uniformly and to
coordinate execution across them.

Enhanced for the Empire system with autonomous operations, performance tracking,
and advanced status management.
"""

from __future__ import annotations

import abc
import asyncio
import os
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from enum import Enum

logger = logging.getLogger(__name__)

class AgentStatus(Enum):
    """Agent operational status"""
    ACTIVE = "active"
    INACTIVE = "inactive" 
    DEPLOYING = "deploying"
    ERROR = "error"
    MAINTENANCE = "maintenance"

class AgentBase(abc.ABC):
    """Abstract base class for all agents.

    Enhanced for the Royal Equips Empire with autonomous operations,
    performance tracking, and advanced status management.
    """

    def __init__(self, name: str, agent_type: str = "generic", description: str = "") -> None:
        self.name = name
        self.agent_type = agent_type
        self.description = description
        
        # Enhanced status tracking
        self.status = AgentStatus.INACTIVE
        self.autonomous_mode = False
        self.emergency_stop = False
        
        # Performance metrics
        self.performance_score = 0.0
        self.discoveries_count = 0
        self.success_rate = 0.0
        self.last_execution: Optional[datetime] = None
        self.next_scheduled: Optional[datetime] = None
        self.current_task = "Initializing"
        
        # Health indicators
        self.health_indicators = {
            'cpu_usage': 0.0,
            'memory_usage': 0.0,
            'error_rate': 0.0,
            'response_time': 0.0
        }
        
        # Legacy compatibility
        self._last_run: float | None = None

    @property
    def last_run(self) -> float | None:
        """Return the Unix timestamp of the last successful run."""
        return self._last_run

    async def __call__(self) -> None:
        """Alias for :meth:`run` to allow instances to be scheduled directly."""
        await self.run()

    async def initialize(self):
        """Initialize the agent - called once before starting operations"""
        self.status = AgentStatus.DEPLOYING
        self.current_task = "Initializing agent systems"
        
        # Agent-specific initialization
        await self._agent_initialize()
        
        self.status = AgentStatus.ACTIVE
        self.current_task = "Ready for operations"
        logger.info(f"✅ {self.name} initialized successfully")

    async def _agent_initialize(self):
        """Override this method for agent-specific initialization"""
        pass

    async def run(self) -> None:
        """Run the agent's primary task asynchronously.

        Enhanced with status tracking and error handling.
        """
        if self.emergency_stop:
            return
        
        try:
            self.status = AgentStatus.ACTIVE
            self.current_task = "Executing primary task"
            self.last_execution = datetime.now()
            
            # Run agent-specific logic
            await self._execute_task()
            
            # Update performance metrics
            await self._update_performance_metrics()
            
            # Legacy compatibility
            self._last_run = asyncio.get_event_loop().time()
            
        except Exception as e:
            self.status = AgentStatus.ERROR
            self.current_task = f"Error: {str(e)}"
            logger.error(f"❌ {self.name} execution failed: {e}")
            raise

    @abc.abstractmethod
    async def _execute_task(self):
        """Override this method with the agent's primary logic"""
        raise NotImplementedError

    async def start_autonomous_workflow(self):
        """Start autonomous operation workflow - override in subclasses"""
        logger.info(f"🤖 {self.name} autonomous workflow started")
        
        while not self.emergency_stop:
            try:
                if self.autonomous_mode and self.status == AgentStatus.ACTIVE:
                    await self.run()
                
                await asyncio.sleep(300)  # 5-minute default cycle
                
            except Exception as e:
                logger.error(f"❌ {self.name} autonomous workflow error: {e}")
                await asyncio.sleep(600)  # 10-minute error cooldown

    async def enable_autonomous_mode(self):
        """Enable autonomous operation mode"""
        self.autonomous_mode = True
        logger.info(f"🤖 {self.name} autonomous mode enabled")

    async def disable_autonomous_mode(self):
        """Disable autonomous operation mode"""
        self.autonomous_mode = False
        logger.info(f"👤 {self.name} autonomous mode disabled")

    async def emergency_stop(self):
        """Emergency stop all operations"""
        self.emergency_stop = True
        self.autonomous_mode = False
        self.status = AgentStatus.INACTIVE
        self.current_task = "Emergency stop activated"
        logger.critical(f"🚨 {self.name} emergency stop activated")

    async def get_performance_score(self) -> float:
        """Get current performance score"""
        return self.performance_score

    async def get_discoveries_count(self) -> int:
        """Get count of discoveries/results"""
        return self.discoveries_count

    async def get_success_rate(self) -> float:
        """Get success rate percentage"""
        return self.success_rate

    async def get_health_indicators(self) -> Dict[str, float]:
        """Get detailed health indicators"""
        return self.health_indicators.copy()

    async def get_daily_discoveries(self) -> int:
        """Get daily discoveries count - override in subclasses"""
        return 0

    async def _update_performance_metrics(self):
        """Update performance metrics - override in subclasses for specific logic"""
        # Basic performance calculation
        if self.last_execution:
            time_since_last = (datetime.now() - self.last_execution).total_seconds()
            self.performance_score = max(0, 100 - (time_since_last / 3600))  # Decay over time
        
        # Update health indicators
        self.health_indicators['response_time'] = asyncio.get_event_loop().time()

    async def _calculate_success_rate(self):
        """Calculate success rate - override in subclasses"""
        # Placeholder - implement based on agent-specific metrics
        self.success_rate = 95.0 if self.status == AgentStatus.ACTIVE else 0.0

    async def health_check(self) -> dict[str, Any]:
        """Return enhanced health status dictionary."""
        now = asyncio.get_event_loop().time()
        last = self._last_run or now
        
        return {
            "name": self.name,
            "agent_type": self.agent_type,
            "status": self.status.value,
            "autonomous_mode": self.autonomous_mode,
            "performance_score": self.performance_score,
            "success_rate": self.success_rate,
            "discoveries_count": self.discoveries_count,
            "current_task": self.current_task,
            "last_execution": self.last_execution.isoformat() if self.last_execution else None,
            "time_since_last_run": now - last,
            "health_indicators": self.health_indicators,
            "emergency_stop": self.emergency_stop
        }

    async def shutdown(self) -> None:
        """Enhanced shutdown with status updates."""
        self.status = AgentStatus.MAINTENANCE
        self.current_task = "Shutting down"
        
        # Agent-specific cleanup
        await self._agent_shutdown()
        
        self.status = AgentStatus.INACTIVE
        logger.info(f"🛑 {self.name} shutdown completed")

    async def _agent_shutdown(self):
        """Override this method for agent-specific shutdown tasks"""
        pass
