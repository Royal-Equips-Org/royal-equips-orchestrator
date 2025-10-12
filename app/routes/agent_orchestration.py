"""
Agent Orchestration API Routes - Command Center Integration

Provides REST API endpoints for the Command Center to interact with the
Agent Registry and AIRA Integration Layer for 100+ agents orchestration.
"""

import logging
from datetime import datetime

from flask import Blueprint, jsonify, request

from orchestrator.core.agent_registry import (
    AgentCapability,
    get_agent_registry,
)
from orchestrator.core.aira_integration import TaskPriority, get_aira_integration

logger = logging.getLogger(__name__)

agent_orchestration_bp = Blueprint('agent_orchestration', __name__)


@agent_orchestration_bp.route('/api/orchestration/agents', methods=['GET'])
def get_all_agents():
    """Get all registered agents."""
    try:
        registry = get_agent_registry()
        return jsonify(registry.to_dict()), 200
    except Exception as e:
        logger.error(f"Error fetching agents: {e}", exc_info=True)
        return jsonify({'error': 'An internal error has occurred.'}), 500


@agent_orchestration_bp.route('/api/orchestration/agents/<agent_id>', methods=['GET'])
def get_agent_details(agent_id: str):
    """Get detailed information about a specific agent."""
    try:
        registry = get_agent_registry()
        agent = registry.get_agent(agent_id)

        if not agent:
            return jsonify({'error': f'Agent {agent_id} not found'}), 404

        integration = get_aira_integration()
        agent_tasks = integration.get_agent_tasks(agent_id)

        return jsonify({
            'agent': {
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
            },
            'tasks': {
                'total': len(agent_tasks),
                'recent': [integration._task_to_dict(t) for t in agent_tasks[:10]]
            }
        }), 200
    except Exception as e:
        logger.error(f"Error fetching agent {agent_id}: {e}", exc_info=True)
        return jsonify({'error': 'An internal error has occurred.'}), 500


@agent_orchestration_bp.route('/api/orchestration/agents/by-capability/<capability>', methods=['GET'])
def get_agents_by_capability(capability: str):
    """Get all agents with a specific capability."""
    try:
        registry = get_agent_registry()

        # Parse capability
        try:
            cap = AgentCapability(capability)
        except ValueError:
            return jsonify({
                'error': f'Invalid capability: {capability}',
                'valid_capabilities': [c.value for c in AgentCapability]
            }), 400

        agents = registry.get_agents_by_capability(cap)

        return jsonify({
            'capability': capability,
            'count': len(agents),
            'agents': [
                {
                    'agent_id': a.agent_id,
                    'name': a.name,
                    'status': a.status.value,
                    'current_load': a.current_load,
                    'last_heartbeat': a.last_heartbeat.isoformat()
                }
                for a in agents
            ]
        }), 200
    except Exception as e:
        logger.error(f"Error fetching agents by capability: {e}", exc_info=True)
        return jsonify({'error': 'An internal error has occurred.'}), 500


@agent_orchestration_bp.route('/api/orchestration/stats', methods=['GET'])
def get_orchestration_stats():
    """Get comprehensive orchestration statistics."""
    try:
        registry = get_agent_registry()
        integration = get_aira_integration()

        return jsonify({
            'registry_stats': registry.get_registry_stats(),
            'task_stats': integration.get_statistics(),
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Error fetching orchestration stats: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@agent_orchestration_bp.route('/api/orchestration/tasks', methods=['GET'])
def get_all_tasks():
    """Get all tasks (pending, active, and recently completed)."""
    try:
        integration = get_aira_integration()
        return jsonify(integration.to_dict()), 200
    except Exception as e:
        logger.error(f"Error fetching tasks: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@agent_orchestration_bp.route('/api/orchestration/tasks', methods=['POST'])
def submit_task():
    """Submit a new task for agent execution."""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Validate required fields
        required = ['task_id', 'capability', 'parameters']
        missing = [f for f in required if f not in data]
        if missing:
            return jsonify({'error': f'Missing required fields: {missing}'}), 400

        # Parse capability
        try:
            capability = AgentCapability(data['capability'])
        except ValueError:
            return jsonify({
                'error': f'Invalid capability: {data["capability"]}',
                'valid_capabilities': [c.value for c in AgentCapability]
            }), 400

        # Parse priority
        priority_str = data.get('priority', 'normal')
        try:
            priority = TaskPriority(priority_str)
        except ValueError:
            return jsonify({
                'error': f'Invalid priority: {priority_str}',
                'valid_priorities': [p.value for p in TaskPriority]
            }), 400

        # Submit task
        integration = get_aira_integration()

        # Run async function in sync context
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        task = loop.run_until_complete(
            integration.submit_task(
                task_id=data['task_id'],
                capability=capability,
                parameters=data['parameters'],
                priority=priority
            )
        )
        loop.close()

        return jsonify({
            'message': 'Task submitted successfully',
            'task': integration._task_to_dict(task)
        }), 201
    except Exception as e:
        logger.error(f"Error submitting task: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@agent_orchestration_bp.route('/api/orchestration/tasks/<task_id>', methods=['GET'])
def get_task_details(task_id: str):
    """Get details about a specific task."""
    try:
        integration = get_aira_integration()
        task = integration.get_task(task_id)

        if not task:
            return jsonify({'error': f'Task {task_id} not found'}), 404

        return jsonify({
            'task': integration._task_to_dict(task)
        }), 200
    except Exception as e:
        logger.error(f"Error fetching task {task_id}: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@agent_orchestration_bp.route('/api/orchestration/tasks/<task_id>/cancel', methods=['POST'])
def cancel_task(task_id: str):
    """Cancel a pending or active task."""
    try:
        integration = get_aira_integration()

        # Run async function in sync context
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success = loop.run_until_complete(integration.cancel_task(task_id))
        loop.close()

        if not success:
            return jsonify({'error': f'Task {task_id} not found or cannot be cancelled'}), 404

        return jsonify({
            'message': f'Task {task_id} cancelled successfully'
        }), 200
    except Exception as e:
        safe_task_id = task_id.replace('\r', '').replace('\n', '')
        logger.error(f"Error cancelling task {safe_task_id}: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@agent_orchestration_bp.route('/api/orchestration/health', methods=['GET'])
def check_orchestration_health():
    """Check health of the orchestration system."""
    try:
        registry = get_agent_registry()
        integration = get_aira_integration()

        healthy_agents = registry.get_healthy_agents()
        total_agents = len(registry.get_all_agents())

        health_percentage = (len(healthy_agents) / total_agents * 100) if total_agents > 0 else 0

        return jsonify({
            'status': 'healthy' if health_percentage >= 80 else 'degraded' if health_percentage >= 50 else 'unhealthy',
            'health_percentage': round(health_percentage, 2),
            'total_agents': total_agents,
            'healthy_agents': len(healthy_agents),
            'pending_tasks': len(integration.pending_tasks),
            'active_tasks': len(integration.active_tasks),
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Error checking orchestration health: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': "An internal error has occurred.",
            'timestamp': datetime.now().isoformat()
        }), 500


@agent_orchestration_bp.route('/api/orchestration/capabilities', methods=['GET'])
def list_capabilities():
    """List all available agent capabilities."""
    return jsonify({
        'capabilities': [
            {
                'name': cap.value,
                'display_name': cap.value.replace('_', ' ').title(),
                'description': f'Agents capable of {cap.value.replace("_", " ")}'
            }
            for cap in AgentCapability
        ]
    }), 200
