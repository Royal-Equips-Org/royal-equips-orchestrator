"""
Orchestrator integration for running agents.

This module provides integration between Flask API endpoints and the agent system,
with support for real agent instances and execution tracking.
"""

import logging
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Global registry for active agent executions
active_executions: Dict[str, Dict[str, Any]] = {}

# Global agent instances cache
_agent_instances: Dict[str, Any] = {}


def _get_or_create_agent(agent_id: str) -> Optional[Any]:
    """Get or create an agent instance by ID."""
    if agent_id in _agent_instances:
        return _agent_instances[agent_id]

    try:
        # Map agent IDs to their implementations
        if agent_id == 'security_fraud':
            from orchestrator.agents.security import SecurityAgent
            agent = SecurityAgent(name='security_fraud')
            _agent_instances[agent_id] = agent
            return agent

        elif agent_id == 'production-analytics':
            from orchestrator.agents.production_analytics import (
                ProductionAnalyticsAgent,
            )
            agent = ProductionAnalyticsAgent()
            _agent_instances[agent_id] = agent
            return agent

        elif agent_id == 'product_research':
            from orchestrator.agents.product_research import ProductResearchAgent
            agent = ProductResearchAgent()
            _agent_instances[agent_id] = agent
            return agent

        elif agent_id == 'inventory_pricing':
            from orchestrator.agents.inventory_pricing import InventoryPricingAgent
            agent = InventoryPricingAgent()
            _agent_instances[agent_id] = agent
            return agent

        elif agent_id == 'marketing_automation':
            from orchestrator.agents.marketing_automation import (
                MarketingAutomationAgent,
            )
            agent = MarketingAutomationAgent()
            _agent_instances[agent_id] = agent
            return agent

        elif agent_id == 'customer_support':
            from orchestrator.agents.customer_support import CustomerSupportAgent
            agent = CustomerSupportAgent()
            _agent_instances[agent_id] = agent
            return agent

        elif agent_id == 'order_management':
            from orchestrator.agents.order_management import OrderManagementAgent
            agent = OrderManagementAgent()
            _agent_instances[agent_id] = agent
            return agent

        logger.warning(f"Unknown agent ID: {agent_id}")
        return None

    except ImportError as e:
        logger.error(f"Failed to import agent {agent_id}: {e}")
        return None
    except Exception as e:
        logger.exception(f"Failed to create agent {agent_id}: {e}")
        return None


class SimpleOrchestrator:
    """Simple orchestrator for executing agents with real agent instance support."""

    def __init__(self):
        self.running = False

    def start_agent(self, agent_id: str) -> Dict[str, Any]:
        """Start an agent execution."""
        try:
            # Create execution record
            execution_id = str(uuid.uuid4())
            execution_record = {
                'execution_id': execution_id,
                'agent_id': agent_id,
                'status': 'running',
                'started_at': datetime.now(timezone.utc).isoformat(),
                'progress': 0,
                'estimated_duration': self._get_estimated_duration(agent_id)
            }

            active_executions[execution_id] = execution_record

            # Start execution in background thread
            thread = threading.Thread(
                target=self._execute_agent,
                args=(execution_id, agent_id),
                daemon=True
            )
            thread.start()

            # Sanitize agent_id for logging to prevent log injection
            safe_agent_id = agent_id.replace('\n', '').replace('\r', '')[:50]
            logger.info(f"Started agent {safe_agent_id} with execution ID {execution_id}")
            return execution_record

        except Exception as e:
            safe_agent_id = agent_id.replace('\n', '').replace('\r', '')[:50]
            safe_error = str(e)[:100]
            logger.error(f"Failed to start agent {safe_agent_id}: {safe_error}")
            raise

    def stop_agent(self, agent_id: str) -> bool:
        """Stop a running agent."""
        try:
            # Find active executions for this agent
            stopped_count = 0
            for _execution_id, record in list(active_executions.items()):
                if record['agent_id'] == agent_id and record['status'] == 'running':
                    record['status'] = 'stopped'
                    record['stopped_at'] = datetime.now(timezone.utc).isoformat()
                    stopped_count += 1

            # Sanitize agent_id for logging to prevent log injection
            safe_agent_id = agent_id.replace('\n', '').replace('\r', '')[:50]
            logger.info(f"Stopped {stopped_count} executions for agent {safe_agent_id}")
            return stopped_count > 0

        except Exception as e:
            safe_agent_id = agent_id.replace('\n', '').replace('\r', '')[:50]
            safe_error = str(e)[:100]
            logger.error(f"Failed to stop agent {safe_agent_id}: {safe_error}")
            return False

    def get_agent(self, agent_id: str) -> Optional[Any]:
        """Get an agent instance by ID.

        Args:
            agent_id: The agent identifier (e.g., 'security_fraud')

        Returns:
            Agent instance or None if not found
        """
        return _get_or_create_agent(agent_id)

    def get_agent_status(self, agent_id: str) -> str:
        """Get current status of an agent."""
        for record in active_executions.values():
            if record['agent_id'] == agent_id and record['status'] == 'running':
                return 'running'
        return 'idle'

    def get_execution_info(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific execution."""
        return active_executions.get(execution_id)

    def get_all_agents_health(self) -> Dict[str, Dict[str, Any]]:
        """Get health status for all registered agents.
        
        Returns:
            Dict mapping agent_id to health data including status, uptime, etc.
        """
        # List of known agents
        known_agents = [
            'product_research',
            'inventory_pricing',
            'marketing_automation',
            'customer_support',
            'order_management',
            'production-analytics',
            'security_fraud',
        ]
        
        health_data = {}
        for agent_id in known_agents:
            status = self.get_agent_status(agent_id)
            
            # Count recent executions
            recent_executions = [
                exec_record for exec_record in active_executions.values()
                if exec_record['agent_id'] == agent_id
            ]
            
            health_data[agent_id] = {
                'status': status,
                'health_score': 100.0 if status != 'error' else 0.0,
                'total_executions': len(recent_executions),
                'active_executions': len([e for e in recent_executions if e['status'] == 'running']),
                'last_activity': datetime.now(timezone.utc).isoformat(),
            }
        
        return health_data

    def _execute_agent(self, execution_id: str, agent_id: str) -> None:
        """Execute an agent in the background."""
        try:
            record = active_executions[execution_id]
            duration = record['estimated_duration']

            # Simulate agent execution with progress updates
            steps = 10
            for i in range(steps + 1):
                if record['status'] != 'running':
                    # Agent was stopped
                    break

                # Update progress
                progress = int((i / steps) * 100)
                record['progress'] = progress

                # Emit progress via WebSocket if available
                try:
                    from app.sockets import socketio
                    if socketio:
                        socketio.emit('agent_progress', {
                            'execution_id': execution_id,
                            'agent_id': agent_id,
                            'progress': progress,
                            'status': 'running' if i < steps else 'completed',
                            'timestamp': datetime.now(timezone.utc).isoformat()
                        }, namespace='/ws/system')
                except Exception as ws_error:
                    logger.warning(f"Failed to emit progress update: {ws_error}")

                # Sleep for a portion of the estimated duration
                time.sleep(duration / steps)

            # Mark as completed if not stopped
            if record['status'] == 'running':
                record['status'] = 'completed'
                record['completed_at'] = datetime.now(timezone.utc).isoformat()
                record['progress'] = 100

                # Final completion event
                try:
                    from app.sockets import socketio
                    if socketio:
                        socketio.emit('agent_execution', {
                            'execution_id': execution_id,
                            'agent_id': agent_id,
                            'status': 'completed',
                            'timestamp': datetime.now(timezone.utc).isoformat()
                        }, namespace='/ws/system')
                except Exception:
                    pass

                logger.info(f"Agent {agent_id} execution {execution_id} completed")

        except Exception as e:
            safe_agent_id = agent_id.replace('\n', '').replace('\r', '')[:50]
            safe_error = str(e)[:100]
            logger.error(f"Error executing agent {safe_agent_id}: {safe_error}")
            record = active_executions.get(execution_id)
            if record:
                record['status'] = 'error'
                record['error'] = safe_error  # Store sanitized error
                record['failed_at'] = datetime.now(timezone.utc).isoformat()

    def _get_estimated_duration(self, agent_id: str) -> int:
        """Get estimated duration for an agent execution."""
        durations = {
            "product_research": 30,
            "inventory_forecasting": 60,
            "pricing_optimizer": 45,
            "marketing_automation": 20,
            "customer_support": 10,
            "order_management": 15,
            "product_recommendation": 25,
            "analytics": 35,
            "security_fraud": 20
        }
        return durations.get(agent_id, 30)


# Global orchestrator instance
orchestrator = SimpleOrchestrator()


def get_orchestrator() -> SimpleOrchestrator:
    """Get the global orchestrator instance."""
    return orchestrator
