"""Base classes and utilities for agents in the Royal Equips Orchestrator.

The AgentBase class defines a simple interface that all agents should
implement. Each agent exposes an asynchronous ``run`` method that can be
invoked by the orchestrator loop. Agents can also expose health checks
and metadata about their purpose and dependencies. This design enables
the orchestrator to manage heterogeneous agents uniformly and to
coordinate execution across them.

Agents should be idempotent and free of side effects outside of their
declared state. Any persistent data should be stored via the shared
state manager or external services (e.g. databases, Shopify). Each
agent may hold references to service clients (e.g. HTTP clients) that
are injected at construction time. Agents should avoid blocking
operations by using ``asyncio``-compatible libraries where possible.
"""

from __future__ import annotations

import abc
import asyncio
from typing import Any, Dict, Optional


class AgentBase(abc.ABC):
    """Abstract base class for all agents.

    Agents encapsulate a unit of work, such as forecasting inventory,
    generating marketing campaigns or scraping competitor prices. The
    orchestrator invokes ``run`` on each agent periodically or on
    demand. Agents may maintain internal state across invocations to
    support incremental processing or caching.
    """

    name: str

    def __init__(self, name: str) -> None:
        self.name = name
        self._last_run: Optional[float] = None

    @property
    def last_run(self) -> Optional[float]:
        """Return the Unix timestamp of the last successful run."""
        return self._last_run

    async def __call__(self) -> None:
        """Alias for :meth:`run` to allow instances to be scheduled directly."""
        await self.run()

    async def run(self) -> None:
        """Run the agent's primary task asynchronously.

        Subclasses must override this method. Implementations should
        update ``self._last_run`` to ``time.time()`` upon successful
        completion. Exceptions should be allowed to propagate and will
        be handled by the orchestrator's error handling mechanism.
        """
        self._last_run = asyncio.get_event_loop().time()
        raise NotImplementedError

    async def health_check(self) -> Dict[str, Any]:
        """Return a health status dictionary.

        Agents can override this to provide richer health information. By
        default it reports the time since last run. The orchestrator
        collects these statuses periodically and exposes them via the
        control center.
        """
        now = asyncio.get_event_loop().time()
        last = self._last_run or now
        return {
            "name": self.name,
            "time_since_last_run": now - last,
            "status": "ok" if self._last_run is not None else "never run",
        }

    async def shutdown(self) -> None:
        """Perform any clean-up required before the orchestrator exits.

        Override this method if your agent needs to close open
        connections, flush buffers, or perform other shutdown tasks.
        """
        pass
