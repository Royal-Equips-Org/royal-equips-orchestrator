"""
Real-time inventory updates via WebSocket for the Royal Equips Command Center.
Provides live inventory data, forecasting updates, and optimization alerts.
"""
import asyncio
import json
import logging
from datetime import timezone, datetime
from typing import Dict, Any, Optional

from flask import request
from flask_socketio import Namespace, emit, join_room, leave_room

from orchestrator.agents.production_inventory import ProductionInventoryAgent
from orchestrator.core.orchestrator import Orchestrator
from app.orchestrator_bridge import get_orchestrator

logger = logging.getLogger(__name__)


class InventoryNamespace(Namespace):
    """WebSocket namespace for real-time inventory management updates."""
    
    def __init__(self, namespace: str = '/inventory'):
        super().__init__(namespace)
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.inventory_agent: Optional[ProductionInventoryAgent] = None
        
    async def get_inventory_agent(self) -> Optional[ProductionInventoryAgent]:
        """Get or create the inventory agent instance."""
        if not self.inventory_agent:
            try:
                orchestrator = get_orchestrator()
                agents = orchestrator.agents
                
                # Find the inventory agent
                for agent in agents:
                    if isinstance(agent, ProductionInventoryAgent):
                        self.inventory_agent = agent
                        break
                
                if not self.inventory_agent:
                    logger.warning("ProductionInventoryAgent not found in orchestrator")
                    
            except Exception as e:
                logger.error(f"Failed to get inventory agent: {e}")
                
        return self.inventory_agent

    def on_connect(self):
        """Handle client connection to inventory namespace."""
        client_id = request.sid
        self.active_sessions[client_id] = {
            'connected_at': datetime.now(timezone.utc),
            'subscriptions': set(),
            'last_heartbeat': datetime.now(timezone.utc)
        }
        
        logger.info(f"Inventory client connected: {client_id}")
        
        # Send initial connection confirmation
        emit('connection_status', {
            'status': 'connected',
            'namespace': 'inventory',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'client_id': client_id
        })

    def on_disconnect(self):
        """Handle client disconnection."""
        client_id = request.sid
        if client_id in self.active_sessions:
            session_info = self.active_sessions.pop(client_id)
            logger.info(f"Inventory client disconnected: {client_id}, "
                       f"session duration: {datetime.now(timezone.utc) - session_info['connected_at']}")

    def on_subscribe_dashboard(self, data: Dict[str, Any]):
        """Subscribe to real-time dashboard updates."""
        client_id = request.sid
        if client_id not in self.active_sessions:
            return
            
        self.active_sessions[client_id]['subscriptions'].add('dashboard')
        join_room('dashboard')
        
        logger.info(f"Client {client_id} subscribed to inventory dashboard")
        
        # Send current dashboard data immediately
        asyncio.create_task(self._send_dashboard_data(client_id))

    def on_subscribe_forecasting(self, data: Dict[str, Any]):
        """Subscribe to ML forecasting updates."""
        client_id = request.sid
        if client_id not in self.active_sessions:
            return
            
        self.active_sessions[client_id]['subscriptions'].add('forecasting')
        join_room('forecasting')
        
        logger.info(f"Client {client_id} subscribed to inventory forecasting")

    def on_subscribe_optimization(self, data: Dict[str, Any]):
        """Subscribe to optimization recommendation updates."""
        client_id = request.sid
        if client_id not in self.active_sessions:
            return
            
        self.active_sessions[client_id]['subscriptions'].add('optimization')
        join_room('optimization')
        
        logger.info(f"Client {client_id} subscribed to inventory optimization")

    def on_subscribe_suppliers(self, data: Dict[str, Any]):
        """Subscribe to supplier performance updates."""
        client_id = request.sid
        if client_id not in self.active_sessions:
            return
            
        self.active_sessions[client_id]['subscriptions'].add('suppliers')
        join_room('suppliers')
        
        logger.info(f"Client {client_id} subscribed to supplier updates")

    def on_unsubscribe(self, data: Dict[str, Any]):
        """Unsubscribe from specific room."""
        client_id = request.sid
        room = data.get('room')
        
        if client_id in self.active_sessions and room:
            self.active_sessions[client_id]['subscriptions'].discard(room)
            leave_room(room)
            logger.info(f"Client {client_id} unsubscribed from {room}")

    def on_heartbeat(self, data: Dict[str, Any]):
        """Handle client heartbeat."""
        client_id = request.sid
        if client_id in self.active_sessions:
            self.active_sessions[client_id]['last_heartbeat'] = datetime.now(timezone.utc)
            
        emit('heartbeat_ack', {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'active_sessions': len(self.active_sessions)
        })

    def on_request_agent_status(self, data: Dict[str, Any]):
        """Handle agent status requests."""
        asyncio.create_task(self._send_agent_status(request.sid))

    def on_execute_inventory_cycle(self, data: Dict[str, Any]):
        """Handle inventory cycle execution requests."""
        asyncio.create_task(self._execute_inventory_cycle(request.sid, data))

    def on_generate_forecast(self, data: Dict[str, Any]):
        """Handle forecast generation requests."""
        asyncio.create_task(self._generate_forecast(request.sid, data))

    def on_run_optimization(self, data: Dict[str, Any]):
        """Handle optimization execution requests."""
        asyncio.create_task(self._run_optimization(request.sid, data))

    async def _send_dashboard_data(self, client_id: str):
        """Send current dashboard data to a specific client."""
        try:
            agent = await self.get_inventory_agent()
            if not agent:
                emit('error', {
                    'message': 'Inventory agent not available',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }, room=client_id)
                return

            # Get dashboard data from agent
            dashboard_data = await agent.get_dashboard_data()
            
            emit('dashboard_update', {
                'data': dashboard_data,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, room=client_id)
            
            logger.debug(f"Sent dashboard data to client {client_id}")
            
        except Exception as e:
            logger.error(f"Failed to send dashboard data to {client_id}: {e}")
            emit('error', {
                'message': f'Failed to load dashboard data: {str(e)}',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, room=client_id)

    async def _send_agent_status(self, client_id: str):
        """Send agent status to client."""
        try:
            agent = await self.get_inventory_agent()
            if not agent:
                emit('agent_status', {
                    'status': 'unavailable',
                    'message': 'Inventory agent not found'
                }, room=client_id)
                return

            status = await agent.get_health_status()
            emit('agent_status', status, room=client_id)
            
        except Exception as e:
            logger.error(f"Failed to get agent status for {client_id}: {e}")
            emit('agent_status', {
                'status': 'error',
                'message': str(e)
            }, room=client_id)

    async def _execute_inventory_cycle(self, client_id: str, data: Dict[str, Any]):
        """Execute inventory management cycle."""
        try:
            agent = await self.get_inventory_agent()
            if not agent:
                emit('cycle_error', {
                    'message': 'Inventory agent not available'
                }, room=client_id)
                return

            emit('cycle_started', {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'message': 'Starting inventory management cycle...'
            }, room=client_id)

            # Execute the cycle
            result = await agent.run()
            
            emit('cycle_completed', {
                'result': result,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, room=client_id)
            
            # Broadcast updated dashboard data to all dashboard subscribers
            await self.broadcast_dashboard_update()
            
        except Exception as e:
            logger.error(f"Failed to execute inventory cycle: {e}")
            emit('cycle_error', {
                'message': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, room=client_id)

    async def _generate_forecast(self, client_id: str, data: Dict[str, Any]):
        """Generate demand forecast."""
        try:
            agent = await self.get_inventory_agent()
            if not agent:
                emit('forecast_error', {
                    'message': 'Inventory agent not available'
                }, room=client_id)
                return

            emit('forecast_started', {
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, room=client_id)

            # Generate forecast data
            forecast_data = await agent.generate_demand_forecast(
                days_ahead=data.get('days_ahead', 30),
                products=data.get('products', [])
            )
            
            emit('forecast_completed', {
                'data': forecast_data,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, room=client_id)
            
            # Broadcast to forecasting subscribers
            self.server.emit('forecast_update', {
                'data': forecast_data,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, namespace=self.namespace, room='forecasting')
            
        except Exception as e:
            logger.error(f"Failed to generate forecast: {e}")
            emit('forecast_error', {
                'message': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, room=client_id)

    async def _run_optimization(self, client_id: str, data: Dict[str, Any]):
        """Run inventory optimization."""
        try:
            agent = await self.get_inventory_agent()
            if not agent:
                emit('optimization_error', {
                    'message': 'Inventory agent not available'
                }, room=client_id)
                return

            emit('optimization_started', {
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, room=client_id)

            # Run optimization
            optimization_data = await agent.optimize_inventory_levels()
            
            emit('optimization_completed', {
                'data': optimization_data,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, room=client_id)
            
            # Broadcast to optimization subscribers
            self.server.emit('optimization_update', {
                'data': optimization_data,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, namespace=self.namespace, room='optimization')
            
        except Exception as e:
            logger.error(f"Failed to run optimization: {e}")
            emit('optimization_error', {
                'message': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, room=client_id)

    async def broadcast_dashboard_update(self):
        """Broadcast dashboard update to all subscribed clients."""
        try:
            agent = await self.get_inventory_agent()
            if not agent:
                return

            dashboard_data = await agent.get_dashboard_data()
            
            self.server.emit('dashboard_update', {
                'data': dashboard_data,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, namespace=self.namespace, room='dashboard')
            
            logger.debug("Broadcasted dashboard update to all subscribers")
            
        except Exception as e:
            logger.error(f"Failed to broadcast dashboard update: {e}")

    async def broadcast_low_stock_alert(self, product_data: Dict[str, Any]):
        """Broadcast low stock alert to all connected clients."""
        alert_data = {
            'type': 'low_stock_alert',
            'product': product_data,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'severity': 'warning'
        }
        
        self.server.emit('inventory_alert', alert_data, namespace=self.namespace)
        logger.info(f"Broadcasted low stock alert for product: {product_data.get('name', 'Unknown')}")

    async def broadcast_out_of_stock_alert(self, product_data: Dict[str, Any]):
        """Broadcast out of stock alert to all connected clients."""
        alert_data = {
            'type': 'out_of_stock_alert',
            'product': product_data,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'severity': 'critical'
        }
        
        self.server.emit('inventory_alert', alert_data, namespace=self.namespace)
        logger.warning(f"Broadcasted out of stock alert for product: {product_data.get('name', 'Unknown')}")

    async def broadcast_reorder_recommendation(self, recommendation_data: Dict[str, Any]):
        """Broadcast reorder recommendation to optimization subscribers."""
        self.server.emit('reorder_recommendation', {
            'data': recommendation_data,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }, namespace=self.namespace, room='optimization')
        
        logger.info(f"Broadcasted reorder recommendation for {recommendation_data.get('product_count', 0)} products")

    async def broadcast_supplier_performance_update(self, supplier_data: Dict[str, Any]):
        """Broadcast supplier performance update."""
        self.server.emit('supplier_performance_update', {
            'data': supplier_data,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }, namespace=self.namespace, room='suppliers')
        
        logger.info(f"Broadcasted supplier performance update for {len(supplier_data.get('suppliers', []))} suppliers")

    def get_connected_clients_count(self) -> int:
        """Get count of currently connected clients."""
        return len(self.active_sessions)

    def get_subscription_stats(self) -> Dict[str, int]:
        """Get statistics about client subscriptions."""
        stats = {
            'dashboard': 0,
            'forecasting': 0,
            'optimization': 0,
            'suppliers': 0
        }
        
        for session in self.active_sessions.values():
            for subscription in session.get('subscriptions', set()):
                if subscription in stats:
                    stats[subscription] += 1
        
        return stats


# Global instance for the namespace
inventory_namespace = InventoryNamespace('/inventory')


def get_inventory_namespace() -> InventoryNamespace:
    """Get the global inventory namespace instance."""
    return inventory_namespace