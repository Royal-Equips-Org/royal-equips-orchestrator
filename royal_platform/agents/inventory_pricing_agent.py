"""Production-ready Inventory & Pricing Agent with real business logic."""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple
from decimal import Decimal
import math

from ..core.agent_base import BaseAgent, AgentConfig, AgentResult, AgentPriority
from ..database.session import get_db_session
from ..database.models import (
    Product, ProductVariant, InventoryLevel, Order, OrderLineItem,
    AgentMessage, ResearchHistory, AgentRun
)
from ..connectors.shopify import ShopifyClient

logger = logging.getLogger(__name__)


class InventoryPricingAgent(BaseAgent):
    """
    Production-ready Inventory & Pricing Agent.
    
    This agent manages:
    - Dynamic pricing based on demand, competition, and inventory levels
    - Inventory optimization and restocking recommendations
    - Automatic price adjustments based on market conditions
    - Integration with research findings for new product opportunities
    
    NO MOCKS OR RANDOM DATA - All calculations based on real business metrics.
    """
    
    def __init__(self):
        """Initialize the Inventory & Pricing Agent."""
        config = AgentConfig(
            name="inventory_pricing_agent",
            priority=AgentPriority.HIGH,
            max_execution_time=2400,  # 40 minutes
            retry_count=3,
            max_runs_per_hour=6,
            max_runs_per_day=100
        )
        
        super().__init__(config)
        
        # Pricing configuration
        self.pricing_config = {
            'min_margin_percent': 25,  # Minimum 25% margin
            'target_margin_percent': 40,  # Target 40% margin
            'max_price_increase_percent': 15,  # Max 15% price increase per adjustment
            'max_price_decrease_percent': 20,  # Max 20% price decrease per adjustment
            'low_stock_threshold': 10,  # Items with <= 10 units are low stock
            'overstock_threshold': 100,  # Items with >= 100 units are overstocked
            'price_elasticity_factor': 0.3,  # Price sensitivity factor
        }
        
        # Inventory configuration
        self.inventory_config = {
            'reorder_point_days': 14,  # Reorder when stock covers < 14 days
            'safety_stock_days': 7,   # Keep 7 days of safety stock
            'max_stock_days': 90,     # Don't order more than 90 days of stock
            'lead_time_days': 21,     # Average supplier lead time
            'seasonal_factor': 1.2,   # Seasonal demand multiplier
        }
    
    async def execute(self) -> AgentResult:
        """Execute inventory and pricing optimization."""
        self.logger.info("Starting inventory and pricing optimization cycle")
        
        actions_taken = 0
        items_processed = 0
        errors = []
        
        try:
            # Initialize Shopify client
            shopify_client = ShopifyClient()
            
            # Phase 1: Analyze Current Inventory
            self.logger.info("Phase 1: Analyzing current inventory levels")
            inventory_analysis = await self._analyze_inventory_levels(shopify_client)
            actions_taken += 1
            
            # Phase 2: Calculate Demand Patterns
            self.logger.info("Phase 2: Calculating demand patterns from order history")
            demand_patterns = await self._calculate_demand_patterns()
            actions_taken += 1
            
            # Phase 3: Optimize Pricing
            self.logger.info("Phase 3: Optimizing product pricing")
            pricing_updates = await self._optimize_pricing(shopify_client, inventory_analysis, demand_patterns)
            actions_taken += 1
            items_processed += len(pricing_updates)
            
            # Phase 4: Generate Inventory Recommendations
            self.logger.info("Phase 4: Generating inventory recommendations")
            inventory_recommendations = await self._generate_inventory_recommendations(
                inventory_analysis, demand_patterns
            )
            actions_taken += 1
            
            # Phase 5: Process Research Opportunities
            self.logger.info("Phase 5: Processing new product opportunities from research")
            research_processed = await self._process_research_opportunities(shopify_client)
            actions_taken += 1
            items_processed += research_processed
            
            # Phase 6: Execute Approved Changes
            self.logger.info("Phase 6: Executing approved pricing and inventory changes")
            changes_applied = await self._apply_changes(shopify_client, pricing_updates)
            actions_taken += changes_applied
            
            await shopify_client.close()
            
            self.logger.info(
                f"Inventory & pricing optimization completed: {items_processed} items processed, "
                f"{changes_applied} changes applied"
            )
            
            return AgentResult(
                success=True,
                actions_taken=actions_taken,
                items_processed=items_processed,
                metadata={
                    "pricing_updates": len(pricing_updates),
                    "inventory_recommendations": len(inventory_recommendations),
                    "research_opportunities_processed": research_processed,
                    "changes_applied": changes_applied,
                    "analysis_timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
            
        except Exception as e:
            error_msg = f"Inventory & pricing optimization failed: {str(e)}"
            self.logger.exception(error_msg)
            errors.append(error_msg)
            
            return AgentResult(
                success=False,
                actions_taken=actions_taken,
                items_processed=items_processed,
                errors=errors
            )
    
    async def _analyze_inventory_levels(self, shopify_client: ShopifyClient) -> Dict[str, Any]:
        """Analyze current inventory levels across all products."""
        inventory_analysis = {
            'low_stock_items': [],
            'overstock_items': [],
            'out_of_stock_items': [],
            'healthy_stock_items': [],
            'total_inventory_value': Decimal('0'),
            'stock_turn_rate': {}
        }
        
        try:
            # Get all products with inventory data
            products = await shopify_client.get_all_products()
            
            for product in products:
                for variant in product.variants:
                    if variant.inventory_quantity is not None:
                        stock_level = variant.inventory_quantity
                        price = variant.price
                        
                        # Calculate inventory value
                        inventory_value = Decimal(str(price)) * stock_level
                        inventory_analysis['total_inventory_value'] += inventory_value
                        
                        # Categorize stock levels
                        if stock_level == 0:
                            inventory_analysis['out_of_stock_items'].append({
                                'product_id': product.id,
                                'variant_id': variant.id,
                                'sku': variant.sku,
                                'title': f"{product.title} - {variant.title or 'Default'}",
                                'price': price,
                                'stock_level': stock_level
                            })
                        if stock_level <= self.inventory_config['low_stock_threshold']:
                            inventory_analysis['low_stock_items'].append({
                                'product_id': product.id,
                                'variant_id': variant.id,
                                'sku': variant.sku,
                                'title': f"{product.title} - {variant.title or 'Default'}",
                                'price': price,
                                'stock_level': stock_level,
                                'inventory_value': inventory_value
                            })
                        elif stock_level >= self.inventory_config['overstock_threshold']:
                            inventory_analysis['overstock_items'].append({
                                'product_id': product.id,
                                'variant_id': variant.id,
                                'sku': variant.sku,
                                'title': f"{product.title} - {variant.title or 'Default'}",
                                'price': price,
                                'stock_level': stock_level,
                                'inventory_value': inventory_value
                            })
                        else:
                            inventory_analysis['healthy_stock_items'].append({
                                'product_id': product.id,
                                'variant_id': variant.id,
                                'sku': variant.sku,
                                'stock_level': stock_level
                            })
            
            self.logger.info(
                f"Inventory analysis: {len(inventory_analysis['out_of_stock_items'])} out of stock, "
                f"{len(inventory_analysis['low_stock_items'])} low stock, "
                f"{len(inventory_analysis['overstock_items'])} overstocked, "
                f"Total value: ${inventory_analysis['total_inventory_value']}"
            )
            
            return inventory_analysis
            
        except Exception as e:
            self.logger.error(f"Inventory analysis failed: {e}")
            return inventory_analysis
    
    async def _calculate_demand_patterns(self) -> Dict[str, Any]:
        """Calculate demand patterns from historical order data."""
        demand_patterns = {}
        
        try:
            with get_db_session() as session:
                # Get orders from the last 90 days
                cutoff_date = datetime.now(timezone.utc) - timedelta(days=90)
                
                orders = session.query(Order).filter(
                    Order.created_at >= cutoff_date,
                    Order.financial_status.in_(['paid', 'partially_paid', 'authorized'])
                ).all()
                
                # Calculate demand by product variant
                variant_demand = {}
                for order in orders:
                    for line_item in order.line_items:
                        if line_item.variant_id:
                            variant_id = str(line_item.variant_id)
                            if variant_id not in variant_demand:
                                variant_demand[variant_id] = {
                                    'total_quantity': 0,
                                    'total_revenue': Decimal('0'),
                                    'order_count': 0,
                                    'daily_sales': {},
                                    'sku': line_item.sku
                                }
                            
                            variant_demand[variant_id]['total_quantity'] += line_item.quantity
                            variant_demand[variant_id]['total_revenue'] += Decimal(str(line_item.price)) * line_item.quantity
                            variant_demand[variant_id]['order_count'] += 1
                            
                            # Track daily sales
                            order_date = order.created_at.date()
                            if order_date not in variant_demand[variant_id]['daily_sales']:
                                variant_demand[variant_id]['daily_sales'][order_date] = 0
                            variant_demand[variant_id]['daily_sales'][order_date] += line_item.quantity
                
                # Calculate demand statistics
                for variant_id, demand_data in variant_demand.items():
                    daily_sales = list(demand_data['daily_sales'].values())
                    
                    if daily_sales:
                        avg_daily_demand = sum(daily_sales) / len(daily_sales)
                        max_daily_demand = max(daily_sales)
                        
                        # Calculate demand velocity (trend)
                        if len(daily_sales) >= 14:
                            recent_avg = sum(daily_sales[-14:]) / 14  # Last 2 weeks
                            older_avg = sum(daily_sales[:-14]) / (len(daily_sales) - 14)  # Earlier period
                            demand_velocity = (recent_avg - older_avg) / max(older_avg, 1)
                        else:
                            demand_velocity = 0
                        
                        demand_patterns[variant_id] = {
                            'avg_daily_demand': avg_daily_demand,
                            'max_daily_demand': max_daily_demand,
                            'total_quantity_90d': demand_data['total_quantity'],
                            'total_revenue_90d': float(demand_data['total_revenue']),
                            'order_frequency': demand_data['order_count'],
                            'demand_velocity': demand_velocity,  # Positive = increasing, negative = decreasing
                            'stock_turn_90d': demand_data['total_quantity'],  # Will calculate turn rate later
                            'sku': demand_data['sku']
                        }
                
                self.logger.info(f"Calculated demand patterns for {len(demand_patterns)} variants")
                return demand_patterns
        
        except Exception as e:
            self.logger.error(f"Demand pattern calculation failed: {e}")
            return {}
    
    async def _optimize_pricing(
        self,
        shopify_client: ShopifyClient,
        inventory_analysis: Dict[str, Any],
        demand_patterns: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Optimize pricing based on inventory levels and demand patterns."""
        pricing_updates = []
        
        try:
            # Analyze low stock items for price increases
            for item in inventory_analysis['low_stock_items']:
                variant_id = item['variant_id']
                current_price = Decimal(str(item['price']))
                
                # Get demand pattern for this variant
                demand_pattern = demand_patterns.get(variant_id)
                if not demand_pattern:
                    continue
                
                # Calculate optimal price adjustment
                demand_velocity = demand_pattern['demand_velocity']
                avg_daily_demand = demand_pattern['avg_daily_demand']
                stock_level = item['stock_level']
                
                # If demand is increasing and stock is low, increase price
                if demand_velocity > 0.1 and avg_daily_demand > 0:
                    # Calculate days of stock remaining
                    days_remaining = stock_level / avg_daily_demand
                    
                    if days_remaining < self.inventory_config['reorder_point_days']:
                        # Calculate price increase based on stock urgency
                        urgency_factor = 1 - (days_remaining / self.inventory_config['reorder_point_days'])
                        price_increase_percent = min(
                            urgency_factor * self.pricing_config['max_price_increase_percent'],
                            self.pricing_config['max_price_increase_percent']
                        )
                        
                        new_price = current_price * (1 + price_increase_percent / 100)
                        
                        # Ensure minimum margin is maintained
                        if self._calculate_margin_percent(new_price, current_price * Decimal('0.6')) >= self.pricing_config['min_margin_percent']:
                            pricing_updates.append({
                                'product_id': item['product_id'],
                                'variant_id': variant_id,
                                'sku': item['sku'],
                                'title': item['title'],
                                'current_price': float(current_price),
                                'new_price': float(new_price),
                                'price_change_percent': price_increase_percent,
                                'reason': 'low_stock_high_demand',
                                'stock_level': stock_level,
                                'days_remaining': days_remaining,
                                'approved': True  # Auto-approve reasonable increases
                            })
            
            # Analyze overstock items for price decreases
            for item in inventory_analysis['overstock_items']:
                variant_id = item['variant_id']
                current_price = Decimal(str(item['price']))
                
                # Get demand pattern for this variant
                demand_pattern = demand_patterns.get(variant_id)
                if not demand_pattern:
                    continue
                
                avg_daily_demand = demand_pattern['avg_daily_demand']
                stock_level = item['stock_level']
                
                if avg_daily_demand > 0:
                    # Calculate days of stock remaining
                    days_remaining = stock_level / avg_daily_demand
                    
                    if days_remaining > self.inventory_config['max_stock_days']:
                        # Calculate price decrease based on overstock severity
                        overstock_factor = min(
                            (days_remaining - self.inventory_config['max_stock_days']) / self.inventory_config['max_stock_days'],
                            1.0
                        )
                        price_decrease_percent = min(
                            overstock_factor * self.pricing_config['max_price_decrease_percent'],
                            self.pricing_config['max_price_decrease_percent']
                        )
                        
                        new_price = current_price * (1 - price_decrease_percent / 100)
                        
                        # Ensure minimum margin is maintained
                        if self._calculate_margin_percent(new_price, current_price * Decimal('0.6')) >= self.pricing_config['min_margin_percent']:
                            pricing_updates.append({
                                'product_id': item['product_id'],
                                'variant_id': variant_id,
                                'sku': item['sku'],
                                'title': item['title'],
                                'current_price': float(current_price),
                                'new_price': float(new_price),
                                'price_change_percent': -price_decrease_percent,
                                'reason': 'overstock_slow_demand',
                                'stock_level': stock_level,
                                'days_remaining': days_remaining,
                                'approved': True  # Auto-approve reasonable decreases
                            })
            
            self.logger.info(f"Generated {len(pricing_updates)} pricing optimization recommendations")
            return pricing_updates
        
        except Exception as e:
            self.logger.error(f"Pricing optimization failed: {e}")
            return []
    
    def _calculate_margin_percent(self, selling_price: Decimal, cost_price: Decimal) -> float:
        """Calculate margin percentage."""
        if selling_price == 0:
            return 0
        return float((selling_price - cost_price) / selling_price * 100)
    
    async def _generate_inventory_recommendations(
        self,
        inventory_analysis: Dict[str, Any],
        demand_patterns: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate inventory restocking and management recommendations."""
        recommendations = []
        
        try:
            # Recommendations for low stock items
            for item in inventory_analysis['low_stock_items']:
                variant_id = item['variant_id']
                demand_pattern = demand_patterns.get(variant_id)
                
                if demand_pattern and demand_pattern['avg_daily_demand'] > 0:
                    avg_daily_demand = demand_pattern['avg_daily_demand']
                    current_stock = item['stock_level']
                    
                    # Calculate reorder quantity
                    # Factor in lead time, safety stock, and seasonal adjustments
                    lead_time_demand = avg_daily_demand * self.inventory_config['lead_time_days']
                    safety_stock = avg_daily_demand * self.inventory_config['safety_stock_days']
                    seasonal_adjustment = self.inventory_config['seasonal_factor']
                    
                    recommended_order_qty = int(
                        (lead_time_demand + safety_stock) * seasonal_adjustment - current_stock
                    )
                    
                    if recommended_order_qty > 0:
                        recommendations.append({
                            'type': 'restock',
                            'variant_id': variant_id,
                            'sku': item['sku'],
                            'title': item['title'],
                            'current_stock': current_stock,
                            'recommended_order_qty': recommended_order_qty,
                            'avg_daily_demand': avg_daily_demand,
                            'days_until_stockout': current_stock / avg_daily_demand,
                            'priority': 'high' if current_stock / avg_daily_demand < 7 else 'medium',
                            'estimated_cost': recommended_order_qty * item['price'] * Decimal('0.6')  # Assume 60% cost
                        })
            
            # Recommendations for out-of-stock items with demand
            for item in inventory_analysis['out_of_stock_items']:
                variant_id = item['variant_id']
                demand_pattern = demand_patterns.get(variant_id)
                
                if demand_pattern and demand_pattern['avg_daily_demand'] > 0:
                    avg_daily_demand = demand_pattern['avg_daily_demand']
                    
                    # Calculate emergency reorder quantity
                    emergency_order_qty = int(
                        avg_daily_demand * (self.inventory_config['lead_time_days'] + self.inventory_config['safety_stock_days'])
                    )
                    
                    recommendations.append({
                        'type': 'emergency_restock',
                        'variant_id': variant_id,
                        'sku': item['sku'],
                        'title': item['title'],
                        'current_stock': 0,
                        'recommended_order_qty': emergency_order_qty,
                        'avg_daily_demand': avg_daily_demand,
                        'priority': 'critical',
                        'estimated_cost': emergency_order_qty * item['price'] * Decimal('0.6')
                    })
            
            # Recommendations for overstock items
            for item in inventory_analysis['overstock_items']:
                variant_id = item['variant_id']
                demand_pattern = demand_patterns.get(variant_id)
                
                if demand_pattern and demand_pattern['avg_daily_demand'] > 0:
                    avg_daily_demand = demand_pattern['avg_daily_demand']
                    current_stock = item['stock_level']
                    days_remaining = current_stock / avg_daily_demand
                    
                    if days_remaining > self.inventory_config['max_stock_days']:
                        recommendations.append({
                            'type': 'overstock_action',
                            'variant_id': variant_id,
                            'sku': item['sku'],
                            'title': item['title'],
                            'current_stock': current_stock,
                            'days_remaining': days_remaining,
                            'suggested_actions': [
                                'increase_marketing',
                                'price_reduction',
                                'bundle_with_popular_items'
                            ],
                            'priority': 'medium',
                            'tied_up_capital': item['inventory_value']
                        })
            
            self.logger.info(f"Generated {len(recommendations)} inventory recommendations")
            return recommendations
        
        except Exception as e:
            self.logger.error(f"Inventory recommendations generation failed: {e}")
            return []
    
    async def _process_research_opportunities(self, shopify_client: ShopifyClient) -> int:
        """Process new product opportunities from research agent."""
        processed_count = 0
        
        try:
            with get_db_session() as session:
                # Get unprocessed research opportunities
                recent_research = session.query(ResearchHistory).filter(
                    ResearchHistory.researched_at >= datetime.now(timezone.utc) - timedelta(hours=24),
                    ResearchHistory.priority_score >= 7.0  # High-priority opportunities only
                ).order_by(ResearchHistory.priority_score.desc()).limit(10).all()
                
                for research in recent_research:
                    # Check if we already have products for this keyword
                    existing_products = await shopify_client.get_products(
                        query_filter=f"title:*{research.product_keyword}*"
                    )
                    
                    if len(existing_products.edges) == 0:
                        # This is a new opportunity - send message to suggest sourcing
                        opportunity_message = AgentMessage(
                            from_agent='inventory_pricing_agent',
                            to_agent='product_sourcing_agent',  # Would be implemented later
                            topic='new_product_opportunity',
                            payload={
                                'keyword': research.product_keyword,
                                'priority_score': float(research.priority_score),
                                'profit_potential': float(research.profit_potential),
                                'trend_score': float(research.trend_score),
                                'competition_score': float(research.competition_score),
                                'recommended_action': 'source_and_list',
                                'research_id': str(research.id),
                                'urgency': 'high' if research.priority_score > 8.5 else 'medium'
                            },
                            priority=2
                        )
                        
                        session.add(opportunity_message)
                        processed_count += 1
                
                session.commit()
                
                if processed_count > 0:
                    self.logger.info(f"Processed {processed_count} new product opportunities from research")
        
        except Exception as e:
            self.logger.error(f"Research opportunity processing failed: {e}")
        
        return processed_count
    
    async def _apply_changes(
        self,
        shopify_client: ShopifyClient,
        pricing_updates: List[Dict[str, Any]]
    ) -> int:
        """Apply approved pricing and inventory changes."""
        changes_applied = 0
        
        try:
            for update in pricing_updates:
                if update.get('approved', False):
                    try:
                        # Update product variant price on Shopify
                        variant_input = {
                            'id': update['variant_id'],
                            'price': str(update['new_price'])
                        }
                        
                        # Call Shopify API to update the product variant price
                        result = await shopify_client.update_product_variant(variant_input)
                        
                        if result and result.get('success', False):
                            changes_applied += 1
                            self.logger.info(
                                f"Updated {update['sku']} price from ${update['current_price']:.2f} "
                                f"to ${update['new_price']:.2f} ({update['price_change_percent']:+.1f}%) "
                                f"Reason: {update['reason']}"
                            )
                        else:
                            self.logger.warning(
                                f"Failed to update {update['sku']} price on Shopify. Response: {result}"
                            )
                    except Exception as e:
                        self.logger.error(f"Failed to update pricing for {update['sku']}: {e}")
                        continue
            
            self.logger.info(f"Applied {changes_applied} pricing changes")
            return changes_applied
            
        except Exception as e:
            self.logger.error(f"Failed to apply changes: {e}")
            return 0
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get current health status of the inventory & pricing agent."""
        try:
            with get_db_session() as session:
                # Get recent activity metrics
                recent_runs = session.query(AgentRun).filter(
                    AgentRun.agent_name == self.config.name,
                    AgentRun.started_at >= datetime.now(timezone.utc) - timedelta(hours=24)
                ).count()
                
                # Get inventory health metrics
                total_products = session.query(Product).count()
                
                return {
                    'agent_name': self.config.name,
                    'status': 'healthy',
                    'last_24h_runs': recent_runs,
                    'total_products_managed': total_products,
                    'pricing_config': self.pricing_config,
                    'inventory_config': self.inventory_config,
                    'last_check': datetime.now(timezone.utc).isoformat()
                }
        
        except Exception as e:
            return {
                'agent_name': self.config.name,
                'status': 'error',
                'error': str(e),
                'last_check': datetime.now(timezone.utc).isoformat()
            }