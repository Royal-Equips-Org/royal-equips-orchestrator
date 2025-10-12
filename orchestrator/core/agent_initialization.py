"""
Agent Initialization and Auto-Registration

Automatically discovers and registers all agents in the Royal Equips Empire
with the centralized Agent Registry and AIRA Integration Layer.

This module ensures all agents are connected to the Command Center on startup.
"""

import logging
from typing import Any, Dict, List

from orchestrator.core.agent_registry import (
    AgentCapability,
    get_agent_registry,
)
from orchestrator.core.aira_integration import get_aira_integration

logger = logging.getLogger(__name__)


# Agent configuration mapping
AGENT_CONFIGURATIONS = [
    # E-commerce Core Agents
    {
        'agent_id': 'product_research_agent',
        'name': 'Product Research Agent',
        'type': 'e-commerce',
        'capabilities': [AgentCapability.PRODUCT_RESEARCH, AgentCapability.AI_ORCHESTRATION],
        'max_concurrent_tasks': 5,
        'tags': {'core', 'ai-powered', 'research'}
    },
    {
        'agent_id': 'inventory_forecasting_agent',
        'name': 'Inventory Forecasting Agent',
        'type': 'e-commerce',
        'capabilities': [AgentCapability.INVENTORY_MANAGEMENT, AgentCapability.ANALYTICS],
        'max_concurrent_tasks': 10,
        'tags': {'core', 'forecasting', 'ml'}
    },
    {
        'agent_id': 'inventory_pricing_agent',
        'name': 'Inventory & Pricing Agent',
        'type': 'e-commerce',
        'capabilities': [AgentCapability.INVENTORY_MANAGEMENT, AgentCapability.PRICING_OPTIMIZATION],
        'max_concurrent_tasks': 10,
        'tags': {'core', 'pricing', 'optimization'}
    },
    {
        'agent_id': 'pricing_optimizer_agent',
        'name': 'Pricing Optimizer Agent',
        'type': 'e-commerce',
        'capabilities': [AgentCapability.PRICING_OPTIMIZATION, AgentCapability.ANALYTICS],
        'max_concurrent_tasks': 15,
        'tags': {'core', 'pricing', 'ml', 'optimization'}
    },
    {
        'agent_id': 'marketing_automation_agent',
        'name': 'Marketing Automation Agent',
        'type': 'marketing',
        'capabilities': [AgentCapability.MARKETING_AUTOMATION, AgentCapability.AI_ORCHESTRATION],
        'max_concurrent_tasks': 8,
        'tags': {'marketing', 'automation', 'ai-powered'}
    },
    {
        'agent_id': 'order_fulfillment_agent',
        'name': 'Order Fulfillment Agent',
        'type': 'operations',
        'capabilities': [AgentCapability.ORDER_FULFILLMENT],
        'max_concurrent_tasks': 20,
        'tags': {'core', 'operations', 'fulfillment'}
    },
    {
        'agent_id': 'customer_support_agent',
        'name': 'Customer Support Agent',
        'type': 'support',
        'capabilities': [AgentCapability.CUSTOMER_SUPPORT, AgentCapability.AI_ORCHESTRATION],
        'max_concurrent_tasks': 15,
        'tags': {'support', 'ai-powered', 'customer-facing'}
    },
    {
        'agent_id': 'analytics_agent',
        'name': 'Analytics Agent',
        'type': 'analytics',
        'capabilities': [AgentCapability.ANALYTICS],
        'max_concurrent_tasks': 12,
        'tags': {'analytics', 'reporting', 'intelligence'}
    },

    # Production Agents
    {
        'agent_id': 'production_inventory_agent',
        'name': 'Production Inventory Agent',
        'type': 'production',
        'capabilities': [AgentCapability.INVENTORY_MANAGEMENT, AgentCapability.ANALYTICS],
        'max_concurrent_tasks': 15,
        'tags': {'production', 'inventory', 'real-time'}
    },
    {
        'agent_id': 'production_marketing_agent',
        'name': 'Production Marketing Agent',
        'type': 'production',
        'capabilities': [AgentCapability.MARKETING_AUTOMATION, AgentCapability.ANALYTICS],
        'max_concurrent_tasks': 10,
        'tags': {'production', 'marketing', 'campaigns'}
    },
    {
        'agent_id': 'production_order_fulfillment_agent',
        'name': 'Production Order Fulfillment Agent',
        'type': 'production',
        'capabilities': [AgentCapability.ORDER_FULFILLMENT],
        'max_concurrent_tasks': 25,
        'tags': {'production', 'orders', 'fulfillment'}
    },
    {
        'agent_id': 'production_customer_support_agent',
        'name': 'Production Customer Support Agent',
        'type': 'production',
        'capabilities': [AgentCapability.CUSTOMER_SUPPORT],
        'max_concurrent_tasks': 20,
        'tags': {'production', 'support', 'ai-powered'}
    },
    {
        'agent_id': 'production_analytics_agent',
        'name': 'Production Analytics Agent',
        'type': 'production',
        'capabilities': [AgentCapability.ANALYTICS, AgentCapability.AI_ORCHESTRATION],
        'max_concurrent_tasks': 15,
        'tags': {'production', 'analytics', 'ml'}
    },
    {
        'agent_id': 'production_finance_agent',
        'name': 'Production Finance Agent',
        'type': 'production',
        'capabilities': [AgentCapability.FINANCE, AgentCapability.ANALYTICS],
        'max_concurrent_tasks': 10,
        'tags': {'production', 'finance', 'payments'}
    },

    # Security and DevOps
    {
        'agent_id': 'security_agent',
        'name': 'Security Agent',
        'type': 'security',
        'capabilities': [AgentCapability.SECURITY, AgentCapability.AI_ORCHESTRATION],
        'max_concurrent_tasks': 8,
        'tags': {'security', 'fraud-detection', 'ai-powered'}
    },
    {
        'agent_id': 'devops_agent',
        'name': 'DevOps Agent',
        'type': 'infrastructure',
        'capabilities': [AgentCapability.DEVOPS],
        'max_concurrent_tasks': 5,
        'tags': {'devops', 'infrastructure', 'automation'}
    },

    # Specialized Agents
    {
        'agent_id': 'recommendation_agent',
        'name': 'Recommendation Agent',
        'type': 'ml',
        'capabilities': [AgentCapability.PRODUCT_RESEARCH, AgentCapability.ANALYTICS],
        'max_concurrent_tasks': 12,
        'tags': {'ml', 'recommendations', 'personalization'}
    },
    {
        'agent_id': 'order_management_agent',
        'name': 'Order Management Agent',
        'type': 'operations',
        'capabilities': [AgentCapability.ORDER_FULFILLMENT, AgentCapability.ANALYTICS],
        'max_concurrent_tasks': 18,
        'tags': {'operations', 'orders', 'management'}
    },
]


async def initialize_all_agents() -> Dict[str, Any]:
    """
    Initialize and register all agents with the Agent Registry.
    
    Returns:
        Dict containing initialization results and statistics
    """
    logger.info("Starting agent initialization and registration...")

    registry = get_agent_registry()
    integration = get_aira_integration()

    successful = []
    failed = []

    for config in AGENT_CONFIGURATIONS:
        try:
            success = await registry.register_agent(
                agent_id=config['agent_id'],
                name=config['name'],
                agent_type=config['type'],
                capabilities=config['capabilities'],
                max_concurrent_tasks=config.get('max_concurrent_tasks', 10),
                tags=config.get('tags', set()),
                metadata={
                    'auto_registered': True,
                    'config_version': '1.0'
                }
            )

            if success:
                successful.append(config['agent_id'])
                logger.info(f"✓ Registered: {config['name']} ({config['agent_id']})")
            else:
                failed.append(config['agent_id'])
                logger.error(f"✗ Failed to register: {config['name']} ({config['agent_id']})")

        except Exception as e:
            failed.append(config['agent_id'])
            logger.error(f"✗ Error registering {config['agent_id']}: {e}", exc_info=True)

    # Start background monitoring and task processing
    try:
        await registry.start_monitoring()
        await integration.start_task_processing()
        logger.info("✓ Background monitoring and task processing started")
    except Exception as e:
        logger.error(f"✗ Failed to start background services: {e}", exc_info=True)

    results = {
        'total_agents': len(AGENT_CONFIGURATIONS),
        'successful': len(successful),
        'failed': len(failed),
        'successful_agents': successful,
        'failed_agents': failed,
        'registry_stats': registry.get_registry_stats(),
        'status': 'success' if len(failed) == 0 else 'partial' if len(successful) > 0 else 'failed'
    }

    logger.info(
        f"Agent initialization complete: {len(successful)}/{len(AGENT_CONFIGURATIONS)} agents registered successfully"
    )

    return results


async def shutdown_all_agents() -> None:
    """Gracefully shutdown all agents and stop background services."""
    logger.info("Shutting down agent orchestration system...")

    registry = get_agent_registry()
    integration = get_aira_integration()

    try:
        # Stop background services
        await integration.stop_task_processing()
        await registry.stop_monitoring()
        logger.info("✓ Background services stopped")
    except Exception as e:
        logger.error(f"✗ Error stopping background services: {e}", exc_info=True)

    # Unregister all agents
    all_agents = registry.get_all_agents()
    for agent in all_agents:
        try:
            await registry.unregister_agent(agent.agent_id)
        except Exception as e:
            logger.error(f"✗ Error unregistering {agent.agent_id}: {e}")

    logger.info("Agent orchestration system shutdown complete")


def get_agent_configuration(agent_id: str) -> Dict[str, Any]:
    """Get configuration for a specific agent."""
    for config in AGENT_CONFIGURATIONS:
        if config['agent_id'] == agent_id:
            return config
    return None


def list_all_agent_configurations() -> List[Dict[str, Any]]:
    """Get list of all agent configurations."""
    return AGENT_CONFIGURATIONS.copy()
