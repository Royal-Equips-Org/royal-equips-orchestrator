"""
Production Empire API Routes
Real business logic integration with Shopify, agents, and analytics
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any

from flask import Blueprint, jsonify, request
from app.services.shopify_graphql_service import get_shopify_service
from app.services.production_agent_executor import get_agent_executor


logger = logging.getLogger(__name__)
empire_bp = Blueprint("empire", __name__, url_prefix="/api/empire")


@empire_bp.route("/status", methods=["GET"])
async def get_empire_status():
    """Get real-time empire status with live metrics."""
    try:
        # Get services
        shopify_service = await get_shopify_service()
        agent_executor = await get_agent_executor()
        
        # Fetch real metrics concurrently
        orders_summary, products_summary, customers_summary = await asyncio.gather(
            shopify_service.get_orders_summary(days=30),
            shopify_service.get_products_summary(),
            shopify_service.get_customers_summary()
        )
        
        # Get agent execution metrics
        recent_executions = await agent_executor.get_agent_executions(limit=100)
        successful_executions = [e for e in recent_executions if e['status'] == 'completed']
        failed_executions = [e for e in recent_executions if e['status'] == 'failed']
        
        # Calculate agent performance metrics
        total_executions = len(recent_executions)
        success_rate = (len(successful_executions) / total_executions * 100) if total_executions > 0 else 0
        avg_execution_time = sum(e['duration_seconds'] for e in successful_executions if e['duration_seconds']) / len(successful_executions) if successful_executions else 0
        
        # Empire status summary
        empire_status = {
            "status": "operational",
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_hours": 24,  # Would track actual uptime
            
            # Revenue metrics
            "revenue": {
                "total_30_days": orders_summary['total_revenue'],
                "total_orders": orders_summary['total_orders'],
                "avg_order_value": orders_summary['avg_order_value'],
                "fulfillment_rate": orders_summary['fulfillment_rate']
            },
            
            # Inventory metrics  
            "inventory": {
                "total_products": products_summary['total_products'],
                "active_products": products_summary['active_products'],
                "total_inventory": products_summary['total_inventory'],
                "avg_inventory_per_product": products_summary['avg_inventory_per_product']
            },
            
            # Customer metrics
            "customers": {
                "total_customers": customers_summary['total_customers'],
                "repeat_customers": customers_summary['repeat_customers'],
                "repeat_rate": customers_summary['repeat_rate'],
                "lifetime_value": customers_summary['customer_lifetime_value']
            },
            
            # Agent performance
            "agents": {
                "total_executions": total_executions,
                "success_rate": success_rate,
                "avg_execution_time": avg_execution_time,
                "active_agents": len(set(e['agent_type'] for e in recent_executions)),
                "failed_executions_24h": len([e for e in failed_executions if 
                    datetime.fromisoformat(e['queued_at'].replace('Z', '+00:00')) > datetime.utcnow() - timedelta(days=1)])
            }
        }
        
        return jsonify(empire_status)
        
    except Exception as e:
        logger.error(f"Failed to get empire status: {e}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500


@empire_bp.route("/agents", methods=["GET"])
async def get_empire_agents():
    """Get real agent status and performance data."""
    try:
        agent_executor = await get_agent_executor()
        
        # Get recent executions for each agent type
        recent_executions = await agent_executor.get_agent_executions(limit=500)
        
        # Group by agent type
        agent_stats = {}
        for execution in recent_executions:
            agent_type = execution['agent_type']
            if agent_type not in agent_stats:
                agent_stats[agent_type] = {
                    'executions': [],
                    'total_executions': 0,
                    'successful_executions': 0,
                    'failed_executions': 0,
                    'total_duration': 0,
                    'last_execution': None
                }
            
            stats = agent_stats[agent_type]
            stats['executions'].append(execution)
            stats['total_executions'] += 1
            
            if execution['status'] == 'completed':
                stats['successful_executions'] += 1
                if execution['duration_seconds']:
                    stats['total_duration'] += execution['duration_seconds']
            elif execution['status'] == 'failed':
                stats['failed_executions'] += 1
            
            # Track latest execution
            if not stats['last_execution'] or execution['queued_at'] > stats['last_execution']:
                stats['last_execution'] = execution['queued_at']
        
        # Agent metadata and capabilities
        agent_metadata = {
            'product_research': {
                'name': 'Product Research Agent',
                'description': 'Discovers trending products and market opportunities',
                'capabilities': ['AutoDS Integration', 'Spocket Integration', 'Trend Analysis', 'Market Intelligence']
            },
            'inventory_forecasting': {
                'name': 'Inventory Forecasting Agent', 
                'description': 'Predicts demand and optimizes inventory levels',
                'capabilities': ['Prophet Forecasting', 'Shopify Analytics', 'Demand Prediction', 'Stock Optimization']
            },
            'marketing_automation': {
                'name': 'Marketing Automation Agent',
                'description': 'Manages campaigns and customer engagement',
                'capabilities': ['Klaviyo Integration', 'Email Campaigns', 'Customer Segmentation', 'A/B Testing']
            },
            'order_management': {
                'name': 'Order Fulfillment Agent',
                'description': 'Processes orders and manages fulfillment',
                'capabilities': ['Risk Assessment', 'Supplier Routing', 'Order Tracking', 'Return Processing']
            },
            'pricing_optimizer': {
                'name': 'Pricing Optimizer Agent',
                'description': 'Optimizes product pricing and margins',
                'capabilities': ['Competitive Analysis', 'Dynamic Pricing', 'Margin Optimization', 'Price Testing']
            },
            'analytics': {
                'name': 'Analytics Agent',
                'description': 'Provides business intelligence and insights',
                'capabilities': ['Revenue Analysis', 'Performance Metrics', 'Custom Reports', 'Data Visualization']
            }
        }
        
        # Build agent list with real performance data
        agents = []
        for agent_type, stats in agent_stats.items():
            metadata = agent_metadata.get(agent_type, {
                'name': f'{agent_type.title()} Agent',
                'description': f'Automated {agent_type.replace("_", " ")} operations',
                'capabilities': ['Automation', 'Analytics', 'Integration']
            })
            
            # Calculate performance metrics
            success_rate = (stats['successful_executions'] / stats['total_executions'] * 100) if stats['total_executions'] > 0 else 0
            avg_execution_time = (stats['total_duration'] / stats['successful_executions']) if stats['successful_executions'] > 0 else 0
            
            # Determine agent status
            if stats['failed_executions'] > 0 and success_rate < 80:
                status = 'error'
            elif stats['total_executions'] > 0 and stats['last_execution']:
                # Check if last execution was recent (within 24 hours)
                last_exec_time = datetime.fromisoformat(stats['last_execution'].replace('Z', '+00:00'))
                if datetime.utcnow() - last_exec_time < timedelta(hours=24):
                    status = 'active'
                else:
                    status = 'idle'
            else:
                status = 'inactive'
            
            agents.append({
                'id': f'agent_{agent_type}',
                'name': metadata['name'],
                'type': agent_type,
                'status': status,
                'performance_score': min(100, max(0, success_rate)),
                'discoveries_count': stats['successful_executions'],
                'success_rate': success_rate,
                'last_execution': stats['last_execution'],
                'health': 'good' if success_rate > 90 else 'warning' if success_rate > 70 else 'critical',
                'emoji': '🚀' if status == 'active' else '⚠️' if status == 'error' else '💤',
                'total_executions': stats['total_executions'],
                'avg_execution_time': avg_execution_time,
                'capabilities': metadata['capabilities'],
                'description': metadata['description']
            })
        
        # Add agents that haven't run yet
        for agent_type, metadata in agent_metadata.items():
            if agent_type not in agent_stats:
                agents.append({
                    'id': f'agent_{agent_type}',
                    'name': metadata['name'],
                    'type': agent_type,
                    'status': 'inactive',
                    'performance_score': 0,
                    'discoveries_count': 0,
                    'success_rate': 0,
                    'last_execution': None,
                    'health': 'good',
                    'emoji': '💤',
                    'total_executions': 0,
                    'avg_execution_time': 0,
                    'capabilities': metadata['capabilities'],
                    'description': metadata['description']
                })
        
        return jsonify(agents)
        
    except Exception as e:
        logger.error(f"Failed to get empire agents: {e}")
        return jsonify([]), 500


@empire_bp.route("/agents/<agent_id>/execute", methods=["POST"])
async def execute_agent(agent_id: str):
    """Execute an agent with real business logic."""
    try:
        data = request.get_json() or {}
        parameters = data.get('parameters', {})
        priority = data.get('priority', 5)
        
        # Extract agent type from agent_id
        agent_type = agent_id.replace('agent_', '')
        
        # Validate agent type
        valid_agents = [
            'product_research', 'inventory_forecasting', 'marketing_automation',
            'order_management', 'pricing_optimizer', 'analytics'
        ]
        
        if agent_type not in valid_agents:
            return jsonify({
                "error": f"Unknown agent type: {agent_type}",
                "valid_agents": valid_agents
            }), 400
        
        # Execute agent
        agent_executor = await get_agent_executor()
        execution_id = await agent_executor.execute_agent(
            agent_id=agent_id,
            agent_type=agent_type,
            parameters=parameters,
            priority=priority
        )
        
        return jsonify({
            "success": True,
            "execution_id": execution_id,
            "agent_id": agent_id,
            "agent_type": agent_type,
            "status": "queued",
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to execute agent {agent_id}: {e}")
        return jsonify({
            "error": f"Failed to execute agent: {str(e)}"
        }), 500


@empire_bp.route("/metrics", methods=["GET"])
async def get_empire_metrics():
    """Get comprehensive empire performance metrics."""
    try:
        shopify_service = await get_shopify_service()
        agent_executor = await get_agent_executor()
        
        # Get business metrics
        orders_summary = await shopify_service.get_orders_summary(days=7)  # Last 7 days
        products_summary = await shopify_service.get_products_summary()
        customers_summary = await shopify_service.get_customers_summary()
        inventory_alerts = await shopify_service.get_inventory_alerts()
        
        # Get agent performance metrics
        recent_executions = await agent_executor.get_agent_executions(limit=1000)
        
        # Calculate agent metrics
        total_executions = len(recent_executions)
        successful_executions = len([e for e in recent_executions if e['status'] == 'completed'])
        
        # System performance metrics
        metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "period": "last_7_days",
            
            # Business KPIs
            "revenue": {
                "weekly_revenue": orders_summary['total_revenue'],
                "weekly_orders": orders_summary['total_orders'],
                "avg_order_value": orders_summary['avg_order_value'],
                "fulfillment_rate": orders_summary['fulfillment_rate']
            },
            
            # Product performance
            "products": {
                "active_products": products_summary['active_products'],
                "total_inventory": products_summary['total_inventory'],
                "low_stock_alerts": len(inventory_alerts)
            },
            
            # Customer metrics
            "customers": {
                "total_customers": customers_summary['total_customers'],
                "repeat_rate": customers_summary['repeat_rate'],
                "avg_lifetime_value": customers_summary['customer_lifetime_value']
            },
            
            # Operational metrics
            "operations": {
                "total_agent_executions": total_executions,
                "successful_executions": successful_executions,
                "automation_success_rate": (successful_executions / total_executions * 100) if total_executions > 0 else 0,
                "active_alerts": len(inventory_alerts)
            }
        }
        
        return jsonify(metrics)
        
    except Exception as e:
        logger.error(f"Failed to get empire metrics: {e}")
        return jsonify({
            "error": f"Failed to get metrics: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }), 500


@empire_bp.route("/alerts", methods=["GET"])
async def get_empire_alerts():
    """Get system alerts and notifications."""
    try:
        shopify_service = await get_shopify_service()
        agent_executor = await get_agent_executor()
        
        alerts = []
        
        # Inventory alerts
        inventory_alerts = await shopify_service.get_inventory_alerts()
        for alert in inventory_alerts:
            alerts.append({
                "id": f"inv_{alert['product_id']}",
                "type": "inventory",
                "level": alert['alert_level'],
                "title": f"Low Stock: {alert['title']}",
                "message": f"Only {alert['current_inventory']} units remaining",
                "timestamp": datetime.utcnow().isoformat(),
                "data": alert
            })
        
        # Agent failure alerts
        failed_executions = await agent_executor.get_agent_executions(status='failed', limit=10)
        for execution in failed_executions:
            # Only alert on recent failures (last 24 hours)
            exec_time = datetime.fromisoformat(execution['queued_at'].replace('Z', '+00:00'))
            if datetime.utcnow() - exec_time < timedelta(hours=24):
                alerts.append({
                    "id": f"agent_{execution['execution_id']}",
                    "type": "agent_failure",
                    "level": "warning",
                    "title": f"Agent Execution Failed: {execution['agent_type']}",
                    "message": execution['error_message'] or "Unknown error",
                    "timestamp": execution['queued_at'],
                    "data": execution
                })
        
        # Sort by timestamp (newest first)
        alerts.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify(alerts)
        
    except Exception as e:
        logger.error(f"Failed to get empire alerts: {e}")
        return jsonify([]), 500