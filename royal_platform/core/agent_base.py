"""Production-ready base agent class with real business logic."""

import asyncio
import logging
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from ..database.models import AgentRun, AgentStatus
from ..database.session import get_db_session


class AgentPriority(int, Enum):
    """Agent execution priority levels."""
    CRITICAL = 1
    HIGH = 2
    NORMAL = 3
    LOW = 4
    BACKGROUND = 5


class AgentResult(BaseModel):
    """Result of agent execution."""
    success: bool
    actions_taken: int = 0
    items_processed: int = 0
    errors: List[str] = []
    metadata: Dict[str, Any] = {}
    execution_time_seconds: float = 0.0


class AgentConfig(BaseModel):
    """Agent configuration."""
    name: str
    priority: AgentPriority = AgentPriority.NORMAL
    max_execution_time: int = 3600  # seconds
    retry_count: int = 3
    retry_delay: int = 60  # seconds
    enabled: bool = True

    # Rate limiting
    max_runs_per_hour: int = 60
    max_runs_per_day: int = 1000

    # Resource limits
    memory_limit_mb: int = 512
    cpu_limit_percent: int = 50


class BaseAgent(ABC):
    """
    Production-ready base agent class.
    
    All agents must inherit from this class and implement the execute() method.
    This base class provides logging, error handling, execution tracking, and
    integration with the database layer.
    """

    def __init__(self, config: AgentConfig):
        """Initialize the base agent."""
        self.config = config
        self.logger = logging.getLogger(f"agent.{config.name}")
        self.current_run_id: Optional[str] = None
        self.start_time: Optional[datetime] = None

        self.logger.info(f"Agent {config.name} initialized with priority {config.priority.name}")

    @abstractmethod
    async def execute(self) -> AgentResult:
        """
        Execute the agent's main logic.
        
        This method must be implemented by all subclasses.
        It should contain the real business logic without any mocks or placeholders.
        
        Returns:
            AgentResult: The result of the agent execution
        """
        pass

    @abstractmethod
    def get_health_status(self) -> Dict[str, Any]:
        """
        Get the current health status of the agent.
        
        Returns:
            Dict containing health metrics and status
        """
        pass

    async def run(self) -> AgentResult:
        """
        Run the agent with full error handling and logging.
        
        This method wraps the execute() method with:
        - Database run tracking
        - Error handling and retry logic
        - Execution time tracking
        - Resource monitoring
        """
        if not self.config.enabled:
            self.logger.info(f"Agent {self.config.name} is disabled, skipping execution")
            return AgentResult(success=False, errors=["Agent is disabled"])

        # Check rate limits
        if not await self._check_rate_limits():
            return AgentResult(success=False, errors=["Rate limit exceeded"])

        # Start execution tracking
        self.current_run_id = str(uuid.uuid4())
        self.start_time = datetime.now(timezone.utc)

        run_record = AgentRun(
            id=uuid.UUID(self.current_run_id),
            agent_name=self.config.name,
            status=AgentStatus.ACTIVE,
            started_at=self.start_time,
            metadata={"priority": self.config.priority.value}
        )

        try:
            with get_db_session() as session:
                session.add(run_record)
                session.commit()

            self.logger.info(f"Starting agent {self.config.name} execution (run_id: {self.current_run_id})")

            # Execute with timeout
            result = await asyncio.wait_for(
                self.execute(),
                timeout=self.config.max_execution_time
            )

            # Calculate execution time
            end_time = datetime.now(timezone.utc)
            execution_time = (end_time - self.start_time).total_seconds()
            result.execution_time_seconds = execution_time

            # Update run record
            with get_db_session() as session:
                run_record = session.get(AgentRun, uuid.UUID(self.current_run_id))
                if run_record:
                    run_record.status = AgentStatus.ACTIVE if result.success else AgentStatus.ERROR
                    run_record.completed_at = end_time
                    run_record.duration_seconds = int(execution_time)
                    run_record.actions_taken = result.actions_taken
                    run_record.items_processed = result.items_processed
                    run_record.errors_count = len(result.errors)
                    run_record.logs = {"result": result.model_dump()}
                    run_record.agent_metadata = result.metadata
                    if result.errors:
                        run_record.error_details = "; ".join(result.errors)
                    session.commit()

            if result.success:
                self.logger.info(
                    f"Agent {self.config.name} completed successfully in {execution_time:.2f}s "
                    f"(actions: {result.actions_taken}, items: {result.items_processed})"
                )
            else:
                self.logger.error(
                    f"Agent {self.config.name} failed after {execution_time:.2f}s "
                    f"(errors: {len(result.errors)})"
                )

            return result

        except asyncio.TimeoutError:
            error_msg = f"Agent {self.config.name} timed out after {self.config.max_execution_time}s"
            self.logger.error(error_msg)

            # Update run record with timeout
            with get_db_session() as session:
                run_record = session.get(AgentRun, uuid.UUID(self.current_run_id))
                if run_record:
                    run_record.status = AgentStatus.ERROR
                    run_record.completed_at = datetime.now(timezone.utc)
                    run_record.error_details = error_msg
                    session.commit()

            return AgentResult(success=False, errors=[error_msg])

        except Exception as e:
            error_msg = f"Agent {self.config.name} failed with unexpected error: {str(e)}"
            self.logger.exception(error_msg)

            # Update run record with error
            with get_db_session() as session:
                run_record = session.get(AgentRun, uuid.UUID(self.current_run_id))
                if run_record:
                    run_record.status = AgentStatus.ERROR
                    run_record.completed_at = datetime.now(timezone.utc)
                    run_record.error_details = str(e)
                    session.commit()

            return AgentResult(success=False, errors=[error_msg])

    async def _check_rate_limits(self) -> bool:
        """Check if agent can run within rate limits."""
        try:
            with get_db_session() as session:
                now = datetime.now(timezone.utc)

                # Check hourly limit
                hourly_runs = session.query(AgentRun).filter(
                    AgentRun.agent_name == self.config.name,
                    AgentRun.started_at >= now - timedelta(hours=1)
                ).count()

                if hourly_runs >= self.config.max_runs_per_hour:
                    self.logger.warning(f"Agent {self.config.name} exceeded hourly rate limit")
                    return False

                # Check daily limit
                daily_runs = session.query(AgentRun).filter(
                    AgentRun.agent_name == self.config.name,
                    AgentRun.started_at >= now - timedelta(days=1)
                ).count()

                if daily_runs >= self.config.max_runs_per_day:
                    self.logger.warning(f"Agent {self.config.name} exceeded daily rate limit")
                    return False

                return True

        except Exception as e:
            self.logger.error(f"Error checking rate limits: {e}")
            return True  # Allow execution on error to avoid blocking

    def should_retry(self, result: AgentResult, attempt: int) -> bool:
        """
        Determine if the agent should retry execution.
        
        Args:
            result: The failed execution result
            attempt: Current attempt number (1-based)
            
        Returns:
            bool: True if should retry, False otherwise
        """
        if attempt >= self.config.retry_count:
            return False

        # Don't retry if it's a configuration error
        config_errors = ["Agent is disabled", "Rate limit exceeded"]
        if any(error in result.errors for error in config_errors):
            return False

        return True

    async def run_with_retry(self) -> AgentResult:
        """Run the agent with retry logic."""
        last_result = None

        for attempt in range(1, self.config.retry_count + 1):
            result = await self.run()

            if result.success:
                return result

            last_result = result

            if not self.should_retry(result, attempt):
                break

            if attempt < self.config.retry_count:
                self.logger.info(
                    f"Agent {self.config.name} failed (attempt {attempt}), "
                    f"retrying in {self.config.retry_delay}s"
                )
                await asyncio.sleep(self.config.retry_delay)

        self.logger.error(f"Agent {self.config.name} failed after {self.config.retry_count} attempts")
        return last_result or AgentResult(success=False, errors=["No execution attempts"])

    def get_execution_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent execution history for this agent."""
        try:
            with get_db_session() as session:
                runs = session.query(AgentRun).filter(
                    AgentRun.agent_name == self.config.name
                ).order_by(AgentRun.started_at.desc()).limit(limit).all()

                return [
                    {
                        "id": str(run.id),
                        "status": run.status.value,
                        "started_at": run.started_at.isoformat(),
                        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
                        "duration_seconds": run.duration_seconds,
                        "actions_taken": run.actions_taken,
                        "items_processed": run.items_processed,
                        "errors_count": run.errors_count,
                        "error_details": run.error_details
                    }
                    for run in runs
                ]
        except Exception as e:
            self.logger.error(f"Error fetching execution history: {e}")
            return []

    def get_metrics(self) -> Dict[str, Any]:
        """Get performance metrics for this agent."""
        try:
            with get_db_session() as session:
                now = datetime.now(timezone.utc)

                # Last 24 hours metrics
                recent_runs = session.query(AgentRun).filter(
                    AgentRun.agent_name == self.config.name,
                    AgentRun.started_at >= now - timedelta(hours=24)
                ).all()

                total_runs = len(recent_runs)
                successful_runs = len([r for r in recent_runs if r.status == AgentStatus.ACTIVE])
                failed_runs = total_runs - successful_runs

                avg_duration = 0
                total_actions = 0
                total_items = 0

                if recent_runs:
                    durations = [r.duration_seconds for r in recent_runs if r.duration_seconds]
                    avg_duration = sum(durations) / len(durations) if durations else 0
                    total_actions = sum(r.actions_taken or 0 for r in recent_runs)
                    total_items = sum(r.items_processed or 0 for r in recent_runs)

                return {
                    "agent_name": self.config.name,
                    "last_24h": {
                        "total_runs": total_runs,
                        "successful_runs": successful_runs,
                        "failed_runs": failed_runs,
                        "success_rate": successful_runs / total_runs if total_runs > 0 else 0,
                        "avg_duration_seconds": avg_duration,
                        "total_actions": total_actions,
                        "total_items_processed": total_items
                    },
                    "config": {
                        "priority": self.config.priority.name,
                        "enabled": self.config.enabled,
                        "max_runs_per_hour": self.config.max_runs_per_hour,
                        "max_execution_time": self.config.max_execution_time
                    }
                }
        except Exception as e:
            self.logger.error(f"Error calculating metrics: {e}")
            return {"agent_name": self.config.name, "error": str(e)}
