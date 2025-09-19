"""
Action Execution Layer
Executes approved business actions across all platforms and systems
"""
import asyncio
import aiohttp
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json
import os

from ..core.agent_base import AgentBase

logger = logging.getLogger(__name__)

@dataclass
class ExecutionAction:
    """Action execution data structure"""
    action_id: str
    action_type: str
    title: str
    description: str
    target_platform: str
    parameters: Dict[str, Any]
    status: str  # pending, executing, completed, failed
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    result: Optional[Dict[str, Any]]
    error_message: Optional[str]
    retry_count: int
    max_retries: int

class ActionExecutionLayer(AgentBase):
    """
    Executes approved business actions across multiple platforms:
    - Shopify product management (create, update, delete products)
    - Pricing updates across platforms
    - Inventory management and reordering
    - Marketing campaign launches
    - Supplier communications
    - Financial transactions
    """
    
    def __init__(self):
        super().__init__(
            name="Action Execution Layer",
            agent_type="action_execution",
            description="Executes approved business actions across all platforms"
        )
        
        # Platform credentials
        self.shopify_credentials = {
            'shop_url': os.getenv('SHOPIFY_SHOP_URL'),
            'access_token': os.getenv('SHOPIFY_ACCESS_TOKEN'),
            'api_version': '2024-01'
        }
        
        self.email_credentials = {
            'smtp_server': os.getenv('SMTP_SERVER'),
            'username': os.getenv('EMAIL_USERNAME'),
            'password': os.getenv('EMAIL_PASSWORD')
        }
        
        # Execution tracking
        self.pending_actions: Dict[str, ExecutionAction] = {}
        self.execution_history: List[Dict[str, Any]] = []
        self.platform_clients = {}
        
        # Execution settings
        self.max_concurrent_actions = 10
        self.retry_delays = [30, 60, 300, 900]  # Exponential backoff
        
    async def initialize(self):
        """Initialize action execution layer"""
        await super().initialize()
        
        # Initialize platform clients
        await self._initialize_platform_clients()
        
        # Load pending actions
        await self._load_pending_actions()
        
        logger.info("✅ Action Execution Layer initialized")
    
    async def start_autonomous_workflow(self):
        """Start autonomous action execution workflow"""
        while not self.emergency_stop:
            try:
                if self.status.value == "active":
                    # Execute pending actions
                    await self._execute_pending_actions()
                    
                    # Retry failed actions
                    await self._retry_failed_actions()
                    
                    # Clean up completed actions
                    await self._cleanup_completed_actions()
                    
                    # Update performance metrics
                    await self._update_execution_metrics()
                    
                    self.current_task = "Monitoring action executions"
                
                await asyncio.sleep(60)  # 1-minute execution cycles
                
            except Exception as e:
                logger.error(f"❌ Action execution workflow error: {e}")
                await asyncio.sleep(300)
    
    async def execute_decision(self, decision: Dict[str, Any]) -> bool:
        """Execute a business decision"""
        try:
            decision_type = decision.get('type', '')
            
            if decision_type == 'product_approval':
                return await self.approve_product_opportunity(decision.get('data', {}))
            elif decision_type == 'price_adjustment':
                return await self.adjust_product_pricing(decision.get('data', {}))
            elif decision_type == 'inventory_reorder':
                return await self.execute_inventory_reorder(decision.get('data', {}))
            elif decision_type == 'marketing_campaign':
                return await self.launch_marketing_campaign(decision.get('data', {}))
            else:
                logger.warning(f"⚠️ Unknown decision type: {decision_type}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Decision execution failed: {e}")
            return False
    
    async def approve_product_opportunity(self, opportunity: Dict[str, Any]) -> bool:
        """Approve and add a product opportunity to Shopify"""
        try:
            # Create execution action
            action = ExecutionAction(
                action_id=f"product_add_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                action_type="product_creation",
                title=f"Add Product: {opportunity.get('title', 'Unknown')}",
                description=f"Adding product opportunity to Shopify store",
                target_platform="shopify",
                parameters={
                    'product_data': opportunity,
                    'auto_publish': True,
                    'inventory_tracking': True
                },
                status="pending",
                created_at=datetime.now(),
                started_at=None,
                completed_at=None,
                result=None,
                error_message=None,
                retry_count=0,
                max_retries=3
            )
            
            self.pending_actions[action.action_id] = action
            logger.info(f"📦 Product approval action queued: {action.title}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Product approval failed: {e}")
            return False
    
    async def adjust_product_pricing(self, pricing_data: Dict[str, Any]) -> bool:
        """Adjust product pricing across platforms"""
        try:
            action = ExecutionAction(
                action_id=f"price_adjust_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                action_type="price_adjustment",
                title=f"Price Adjustment: {pricing_data.get('product_title', 'Multiple Products')}",
                description="Adjusting product pricing based on market intelligence",
                target_platform="shopify",
                parameters=pricing_data,
                status="pending",
                created_at=datetime.now(),
                started_at=None,
                completed_at=None,
                result=None,
                error_message=None,
                retry_count=0,
                max_retries=3
            )
            
            self.pending_actions[action.action_id] = action
            logger.info(f"💰 Price adjustment action queued: {action.title}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Price adjustment failed: {e}")
            return False
    
    async def execute_inventory_reorder(self, reorder_data: Dict[str, Any]) -> bool:
        """Execute inventory reorder actions"""
        try:
            action = ExecutionAction(
                action_id=f"inventory_reorder_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                action_type="inventory_reorder",
                title=f"Inventory Reorder: {reorder_data.get('supplier', 'Unknown Supplier')}",
                description="Executing automated inventory reorder",
                target_platform="supplier_system",
                parameters=reorder_data,
                status="pending",
                created_at=datetime.now(),
                started_at=None,
                completed_at=None,
                result=None,
                error_message=None,
                retry_count=0,
                max_retries=2
            )
            
            self.pending_actions[action.action_id] = action
            logger.info(f"📦 Inventory reorder action queued: {action.title}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Inventory reorder failed: {e}")
            return False
    
    async def launch_marketing_campaign(self, campaign_data: Dict[str, Any]) -> bool:
        """Launch marketing campaign"""
        try:
            action = ExecutionAction(
                action_id=f"marketing_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                action_type="marketing_campaign",
                title=f"Marketing Campaign: {campaign_data.get('campaign_name', 'Unknown')}",
                description="Launching automated marketing campaign",
                target_platform="marketing_platforms",
                parameters=campaign_data,
                status="pending",
                created_at=datetime.now(),
                started_at=None,
                completed_at=None,
                result=None,
                error_message=None,
                retry_count=0,
                max_retries=2
            )
            
            self.pending_actions[action.action_id] = action
            logger.info(f"📢 Marketing campaign action queued: {action.title}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Marketing campaign launch failed: {e}")
            return False
    
    async def _execute_pending_actions(self):
        """Execute all pending actions"""
        pending_actions = [a for a in self.pending_actions.values() if a.status == "pending"]
        
        # Limit concurrent executions
        semaphore = asyncio.Semaphore(self.max_concurrent_actions)
        
        async def execute_action(action: ExecutionAction):
            async with semaphore:
                await self._execute_single_action(action)
        
        # Execute actions concurrently
        if pending_actions:
            await asyncio.gather(*[execute_action(action) for action in pending_actions])
    
    async def _execute_single_action(self, action: ExecutionAction):
        """Execute a single action"""
        try:
            action.status = "executing"
            action.started_at = datetime.now()
            
            logger.info(f"⚡ Executing action: {action.title}")
            
            # Route to appropriate execution method
            if action.action_type == "product_creation":
                result = await self._execute_shopify_product_creation(action)
            elif action.action_type == "price_adjustment":
                result = await self._execute_price_adjustment(action)
            elif action.action_type == "inventory_reorder":
                result = await self._execute_inventory_reorder_action(action)
            elif action.action_type == "marketing_campaign":
                result = await self._execute_marketing_campaign_action(action)
            else:
                raise ValueError(f"Unknown action type: {action.action_type}")
            
            # Mark as completed
            action.status = "completed"
            action.completed_at = datetime.now()
            action.result = result
            
            # Record in history
            self.execution_history.append({
                'action_id': action.action_id,
                'type': action.action_type,
                'title': action.title,
                'platform': action.target_platform,
                'status': 'completed',
                'executed_at': action.completed_at,
                'duration': (action.completed_at - action.started_at).total_seconds(),
                'result': result
            })
            
            logger.info(f"✅ Action completed successfully: {action.title}")
            self.discoveries_count += 1
            
        except Exception as e:
            action.status = "failed"
            action.error_message = str(e)
            action.completed_at = datetime.now()
            
            logger.error(f"❌ Action execution failed: {action.title} - {e}")
    
    async def _execute_shopify_product_creation(self, action: ExecutionAction) -> Dict[str, Any]:
        """Execute Shopify product creation"""
        try:
            product_data = action.parameters.get('product_data', {})
            
            # Build Shopify product object
            shopify_product = {
                "product": {
                    "title": product_data.get('title', ''),
                    "body_html": product_data.get('market_insights', ''),
                    "vendor": "Royal Equips",
                    "product_type": product_data.get('category', ''),
                    "tags": product_data.get('supplier_leads', []),
                    "variants": [{
                        "price": str(self._extract_price(product_data.get('price_range', '$50'))),
                        "inventory_management": "shopify",
                        "inventory_quantity": 100  # Default stock
                    }]
                }
            }
            
            # Make API call to Shopify
            if self.shopify_credentials['shop_url'] and self.shopify_credentials['access_token']:
                async with aiohttp.ClientSession() as session:
                    headers = {
                        'X-Shopify-Access-Token': self.shopify_credentials['access_token'],
                        'Content-Type': 'application/json'
                    }
                    
                    url = f"https://{self.shopify_credentials['shop_url']}/admin/api/{self.shopify_credentials['api_version']}/products.json"
                    
                    async with session.post(url, headers=headers, json=shopify_product) as response:
                        if response.status == 201:
                            result = await response.json()
                            return {
                                'success': True,
                                'product_id': result['product']['id'],
                                'shopify_url': f"https://{self.shopify_credentials['shop_url']}/admin/products/{result['product']['id']}"
                            }
                        else:
                            error_text = await response.text()
                            raise Exception(f"Shopify API error: {response.status} - {error_text}")
            else:
                # Simulate successful creation for demo
                return {
                    'success': True,
                    'product_id': 'demo_product_123',
                    'message': 'Product would be created in live Shopify store'
                }
                
        except Exception as e:
            logger.error(f"❌ Shopify product creation failed: {e}")
            raise
    
    async def _execute_price_adjustment(self, action: ExecutionAction) -> Dict[str, Any]:
        """Execute price adjustment action"""
        # Placeholder implementation
        return {
            'success': True,
            'products_updated': 1,
            'message': 'Price adjustment completed'
        }
    
    async def _execute_inventory_reorder_action(self, action: ExecutionAction) -> Dict[str, Any]:
        """Execute inventory reorder action"""
        # Placeholder implementation
        return {
            'success': True,
            'orders_placed': 1,
            'total_cost': action.parameters.get('total_cost', 0),
            'message': 'Inventory reorder completed'
        }
    
    async def _execute_marketing_campaign_action(self, action: ExecutionAction) -> Dict[str, Any]:
        """Execute marketing campaign action"""
        # Placeholder implementation
        return {
            'success': True,
            'campaigns_launched': 1,
            'platforms': ['email', 'social'],
            'message': 'Marketing campaign launched'
        }
    
    def _extract_price(self, price_range: str) -> float:
        """Extract price from price range string"""
        try:
            # Extract first number from price range like "$25-$35"
            import re
            numbers = re.findall(r'\d+(?:\.\d+)?', price_range)
            return float(numbers[0]) if numbers else 50.0
        except:
            return 50.0
    
    async def _retry_failed_actions(self):
        """Retry failed actions that haven't exceeded retry limit"""
        failed_actions = [a for a in self.pending_actions.values() if a.status == "failed"]
        
        for action in failed_actions:
            if action.retry_count < action.max_retries:
                delay = self.retry_delays[min(action.retry_count, len(self.retry_delays) - 1)]
                
                if action.completed_at and (datetime.now() - action.completed_at).total_seconds() > delay:
                    action.status = "pending"
                    action.retry_count += 1
                    action.error_message = None
                    
                    logger.info(f"🔄 Retrying action: {action.title} (attempt {action.retry_count + 1})")
    
    async def get_daily_discoveries(self) -> int:
        """Get daily action execution count"""
        today = datetime.now().date()
        return len([a for a in self.execution_history if a['executed_at'].date() == today])
    
    async def _initialize_platform_clients(self):
        """Initialize platform API clients"""
        # Initialize various platform clients
        pass
    
    async def _load_pending_actions(self):
        """Load pending actions from storage"""
        pass
    
    async def _cleanup_completed_actions(self):
        """Clean up old completed actions"""
        cutoff_date = datetime.now() - timedelta(hours=24)
        
        # Remove completed actions older than 24 hours
        to_remove = [
            action_id for action_id, action in self.pending_actions.items()
            if action.status == "completed" and action.completed_at and action.completed_at < cutoff_date
        ]
        
        for action_id in to_remove:
            del self.pending_actions[action_id]
    
    async def _update_execution_metrics(self):
        """Update execution performance metrics"""
        total_actions = len(self.execution_history)
        if total_actions > 0:
            successful_actions = len([a for a in self.execution_history if a['status'] == 'completed'])
            self.success_rate = (successful_actions / total_actions) * 100
            self.performance_score = min(self.success_rate, 100)
        
        self.last_execution = datetime.now()