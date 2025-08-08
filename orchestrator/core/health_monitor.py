"""Health monitor for the orchestrator.

The ``HealthMonitor`` periodically checks the health of all agents
registered with the orchestrator. If an agent's ``health_check``
returns a status indicating a problem, the monitor will attempt to
restart the task. This helps ensure the orchestrator remains
resilient in the face of transient failures. The monitor can be
extended to publish metrics or alerts to external systems such as
Prometheus, Sentry, or Slack.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Dict, Optional


class HealthMonitor:
    """Periodically collects health information from agents and restarts them."""

    def __init__(self, orchestrator: 'Orchestrator', interval: float = 60.0) -> None:
        self.orchestrator = orchestrator
        self.interval = interval
        self.logger = logging.getLogger(__name__)
        self._task: Optional[asyncio.Task] = None

    async def run(self) -> None:
        """Continuously run health checks and restart failed agents."""
        while True:
            await asyncio.sleep(self.interval)
            statuses: Dict[str, Dict[str, float | str]] = await self.orchestrator.health()
            for name, status in statuses.items():
                if status.get("status") not in {"ok", "never run"}:
                    # If agent reports unhealthy status we can attempt restart
                    self.logger.warning("Agent %s health check failed: %s", name, status)
                    # In this simple implementation we just cancel and restart the task
                    task = self.orchestrator._tasks.get(name)
                    if task:
                        task.cancel()
                    self.orchestrator._tasks[name] = self.orchestrator.loop.create_task(
                        self.orchestrator._run_agent(name)
                    )

    async def shutdown(self) -> None:
        """Cancel the monitor's own loop."""
        if self._task:
            self._task.cancel()
            await asyncio.gather(self._task, return_exceptions=True)
