"""
AIRA Integration Layer - Connects All Agents to AIRA Orchestration

This module provides the integration layer between the Agent Registry and AIRA,
enabling centralized orchestration of 100+ agents through the Command Center.

Features:
- Agent-to-AIRA communication
- Task routing and distribution
- Real-time status updates
- Command Center event streaming
- Automated agent coordination
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from orchestrator.core.agent_registry import (
    AgentCapability,
    get_agent_registry,
)


class TaskPriority(Enum):
    """Task priority levels"""
    CRITICAL = "critical"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class TaskStatus(Enum):
    """Task execution status"""
    PENDING = "pending"
    ASSIGNED = "assigned"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class AgentTask:
    """Task to be executed by an agent"""
    task_id: str
    capability: AgentCapability
    priority: TaskPriority
    parameters: Dict[str, Any]
    assigned_agent: Optional[str] = None
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now(timezone.utc)


class AIRAIntegration:
    """
    AIRA Integration Layer for centralized agent orchestration.
    Connects all agents to AIRA and the Command Center.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.registry = get_agent_registry()
        self.pending_tasks: Dict[str, AgentTask] = {}
        self.active_tasks: Dict[str, AgentTask] = {}
        self.completed_tasks: Dict[str, AgentTask] = {}
        self.event_subscribers: List[Callable] = []
        self._task_processor: Optional[asyncio.Task] = None

    async def submit_task(
        self,
        task_id: str,
        capability: AgentCapability,
        parameters: Dict[str, Any],
        priority: TaskPriority = TaskPriority.NORMAL
    ) -> AgentTask:
        """
        Submit a new task for agent execution.
        
        Args:
            task_id: Unique task identifier
            capability: Required agent capability
            parameters: Task parameters
            priority: Task priority level
            
        Returns:
            AgentTask instance
        """
        task = AgentTask(
            task_id=task_id,
            capability=capability,
            priority=priority,
            parameters=parameters
        )

        self.pending_tasks[task_id] = task

        self.logger.info(
            f"Task submitted: {task_id} (capability: {capability.value}, priority: {priority.value})"
        )

        await self._emit_event('task_submitted', {
            'task_id': task_id,
            'capability': capability.value,
            'priority': priority.value
        })

        # Try immediate assignment
        await self._assign_task(task)

        return task

    async def _assign_task(self, task: AgentTask) -> bool:
        """
        Assign a task to the best available agent.
        
        Args:
            task: Task to assign
            
        Returns:
            bool: True if task was assigned successfully
        """
        # Find best agent for this task
        agent = self.registry.find_best_agent_for_task(task.capability, prefer_idle=True)

        if not agent:
            self.logger.warning(
                f"No available agent found for task {task.task_id} "
                f"(capability: {task.capability.value})"
            )
            return False

        # Assign task
        task.assigned_agent = agent.agent_id
        task.status = TaskStatus.ASSIGNED

        # Move from pending to active
        if task.task_id in self.pending_tasks:
            del self.pending_tasks[task.task_id]
        self.active_tasks[task.task_id] = task

        self.logger.info(
            f"Task {task.task_id} assigned to agent {agent.name} ({agent.agent_id})"
        )

        await self._emit_event('task_assigned', {
            'task_id': task.task_id,
            'agent_id': agent.agent_id,
            'agent_name': agent.name
        })

        return True

    async def start_task(self, task_id: str) -> bool:
        """Mark a task as started."""
        if task_id not in self.active_tasks:
            self.logger.warning(f"Task {task_id} not found in active tasks")
            return False

        task = self.active_tasks[task_id]
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.now(timezone.utc)

        await self._emit_event('task_started', {
            'task_id': task_id,
            'agent_id': task.assigned_agent
        })

        return True

    async def complete_task(
        self,
        task_id: str,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> bool:
        """
        Mark a task as completed or failed.
        
        Args:
            task_id: Task identifier
            result: Task result if successful
            error: Error message if failed
            
        Returns:
            bool: True if task was updated successfully
        """
        if task_id not in self.active_tasks:
            self.logger.warning(f"Task {task_id} not found in active tasks")
            return False

        task = self.active_tasks[task_id]
        task.completed_at = datetime.now(timezone.utc)

        if error:
            task.status = TaskStatus.FAILED
            task.error = error
            self.logger.error(f"Task {task_id} failed: {error}")
        else:
            task.status = TaskStatus.COMPLETED
            task.result = result
            self.logger.info(f"Task {task_id} completed successfully")

        # Move from active to completed
        del self.active_tasks[task_id]
        self.completed_tasks[task_id] = task

        await self._emit_event('task_completed', {
            'task_id': task_id,
            'status': task.status.value,
            'agent_id': task.assigned_agent,
            'duration': (task.completed_at - task.started_at).total_seconds() if task.started_at else None,
            'error': error
        })

        return True

    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a pending or active task."""
        task = None

        if task_id in self.pending_tasks:
            task = self.pending_tasks[task_id]
            del self.pending_tasks[task_id]
        elif task_id in self.active_tasks:
            task = self.active_tasks[task_id]
            del self.active_tasks[task_id]
        else:
            self.logger.warning(f"Task {task_id} not found")
            return False

        task.status = TaskStatus.CANCELLED
        task.completed_at = datetime.now(timezone.utc)
        self.completed_tasks[task_id] = task

        await self._emit_event('task_cancelled', {
            'task_id': task_id
        })

        return True

    def get_task(self, task_id: str) -> Optional[AgentTask]:
        """Get task by ID from any queue."""
        return (
            self.pending_tasks.get(task_id) or
            self.active_tasks.get(task_id) or
            self.completed_tasks.get(task_id)
        )

    def get_agent_tasks(self, agent_id: str) -> List[AgentTask]:
        """Get all tasks assigned to a specific agent."""
        tasks = []
        for task in list(self.active_tasks.values()) + list(self.completed_tasks.values()):
            if task.assigned_agent == agent_id:
                tasks.append(task)
        return tasks

    async def process_pending_tasks(self):
        """Process all pending tasks and try to assign them."""
        for task_id in list(self.pending_tasks.keys()):
            task = self.pending_tasks.get(task_id)
            if task:
                await self._assign_task(task)

    def subscribe_to_events(self, callback: Callable):
        """Subscribe to AIRA integration events."""
        if callback not in self.event_subscribers:
            self.event_subscribers.append(callback)

    def unsubscribe_from_events(self, callback: Callable):
        """Unsubscribe from AIRA integration events."""
        if callback in self.event_subscribers:
            self.event_subscribers.remove(callback)

    async def _emit_event(self, event_type: str, data: Dict[str, Any]):
        """Emit an event to all subscribers."""
        event = {
            'type': event_type,
            'data': data,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

        for callback in self.event_subscribers:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)
            except Exception as e:
                self.logger.error(f"Error in event subscriber: {e}", exc_info=True)

    async def start_task_processing(self):
        """Start background task processing."""
        if self._task_processor and not self._task_processor.done():
            self.logger.warning("Task processor already running")
            return

        self._task_processor = asyncio.create_task(self._process_tasks_loop())
        self.logger.info("Task processing started")

    async def stop_task_processing(self):
        """Stop background task processing."""
        if self._task_processor and not self._task_processor.done():
            self._task_processor.cancel()
            try:
                await self._task_processor
            except asyncio.CancelledError:
                pass
            self.logger.info("Task processing stopped")

    async def _process_tasks_loop(self):
        """Background loop for processing pending tasks."""
        while True:
            try:
                await self.process_pending_tasks()
                await asyncio.sleep(5)  # Check every 5 seconds
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error in task processing loop: {e}", exc_info=True)
                await asyncio.sleep(5)

    def get_statistics(self) -> Dict[str, Any]:
        """Get task processing statistics."""
        return {
            'pending_tasks': len(self.pending_tasks),
            'active_tasks': len(self.active_tasks),
            'completed_tasks': len(self.completed_tasks),
            'total_agents': len(self.registry.get_all_agents()),
            'healthy_agents': len(self.registry.get_healthy_agents()),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

    def to_dict(self) -> Dict[str, Any]:
        """Serialize integration state to dictionary."""
        return {
            'pending_tasks': [self._task_to_dict(t) for t in self.pending_tasks.values()],
            'active_tasks': [self._task_to_dict(t) for t in self.active_tasks.values()],
            'recent_completed': [
                self._task_to_dict(t)
                for t in sorted(
                    self.completed_tasks.values(),
                    key=lambda x: x.completed_at or datetime.min,
                    reverse=True
                )[:20]  # Last 20 completed tasks
            ],
            'statistics': self.get_statistics()
        }

    def _task_to_dict(self, task: AgentTask) -> Dict[str, Any]:
        """Convert task to dictionary."""
        return {
            'task_id': task.task_id,
            'capability': task.capability.value,
            'priority': task.priority.value,
            'status': task.status.value,
            'assigned_agent': task.assigned_agent,
            'created_at': task.created_at.isoformat(),
            'started_at': task.started_at.isoformat() if task.started_at else None,
            'completed_at': task.completed_at.isoformat() if task.completed_at else None,
            'parameters': task.parameters,
            'result': task.result,
            'error': task.error
        }


# Global singleton instance
_global_integration: Optional[AIRAIntegration] = None


def get_aira_integration() -> AIRAIntegration:
    """Get the global AIRA integration instance."""
    global _global_integration
    if _global_integration is None:
        _global_integration = AIRAIntegration()
    return _global_integration
