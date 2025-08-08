"""Orchestrator coordinating multiple agents.

The ``Orchestrator`` class is responsible for registering agents,
scheduling them periodically, handling errors, and exposing a simple
interface for external control. It leverages Python's asyncio event loop
to run agents concurrently with configurable intervals. The orchestrator
maintains a registry of agents keyed by name and can trigger runs
immediately or according to a schedule. A health monitor can plug into
the orchestrator to provide additional fault tolerance.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, Optional

from .agent_base import AgentBase
from .health_monitor import HealthMonitor


class Orchestrator:
    """Central coordinator for agents.

    The orchestrator maintains an asyncio loop, schedules agent runs,
    collects health information, and publishes events to the control
    center. It can run either as a background service or be invoked
    explicitly via ``run_forever``.
    """

    def __init__(self, loop: Optional[asyncio.AbstractEventLoop] = None) -> None:
        self.loop = loop or asyncio.get_event_loop()
        self.agents: Dict[str, AgentBase] = {}
        self.schedules: Dict[str, float] = {}
        self.logger = logging.getLogger(__name__)
        self.health_monitor = HealthMonitor(self)
        self._tasks: Dict[str, asyncio.Task[Any]] = {}

    def register_agent(self, agent: AgentBase, interval: float) -> None:
        """Register an agent to run at a given interval (in seconds)."""
        if agent.name in self.agents:
            raise ValueError(f"Agent {agent.name} already registered")
        self.agents[agent.name] = agent
        self.schedules[agent.name] = interval
        self.logger.info("Registered agent %s with interval %s", agent.name, interval)

    async def _run_agent(self, agent_name: str) -> None:
        """Run the specified agent in a loop according to its schedule."""
        agent = self.agents[agent_name]
        interval = self.schedules[agent_name]
        while True:
            try:
                await agent.run()
            except Exception as exc:
                self.logger.exception("Agent %s raised an exception: %s", agent_name, exc)
            await asyncio.sleep(interval)

    def start(self) -> None:
        """Start running all registered agents concurrently."""
        for name in self.agents:
            self._tasks[name] = self.loop.create_task(self._run_agent(name))
        # Start health monitor loop
        self.loop.create_task(self.health_monitor.run())

    async def run_forever(self) -> None:
        """Start agents and run the event loop forever."""
        self.start()
        try:
            await asyncio.gather(*self._tasks.values())
        except asyncio.CancelledError:
            pass

    async def shutdown(self) -> None:
        """Stop all running tasks and call agent shutdowns."""
        for task in self._tasks.values():
            task.cancel()
        await asyncio.gather(*self._tasks.values(), return_exceptions=True)
        for agent in self.agents.values():
            await agent.shutdown()
        await self.health_monitor.shutdown()

    async def health(self) -> Dict[str, Any]:
        """Return health information for all agents."""
        statuses = {}
        for name, agent in self.agents.items():
            statuses[name] = await agent.health_check()
        return statuses
