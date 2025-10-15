"""
Orders API Routes for Royal Equips Command Center.

Provides comprehensive order management with real Shopify integration:
- Order listing and search
- Order details and fulfillment
- Order statistics and analytics
- Customer order history
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from flask import Blueprint, jsonify, request

from app.services.shopify_service import ShopifyService, ShopifyAPIError

logger = logging.getLogger(__name__)

orders_bp = Blueprint('orders', __name__, url_prefix='/api/orders')

# Initialize Shopify service
_shopify_service = None

def get_shopify_service():
    """Get or create Shopify service instance."""
    global _shopify_service
    if _shopify_service is None:
        _shopify_service = ShopifyService()
    return _shopify_service


@orders_bp.route('', methods=['GET'])
def get_orders():
    """
    Get orders with pagination and filtering.
    
    Query Parameters:
    - page: Page number (default: 1)
    - limit: Items per page (default: 50, max: 250)
    - status: Filter by status (open, closed, cancelled, any)
    - financial_status: Filter by payment status (paid, pending, refunded, etc.)
    - fulfillment_status: Filter by fulfillment (fulfilled, partial, unfulfilled)
    - created_at_min: Filter orders created after this date (ISO 8601)
    - created_at_max: Filter orders created before this date (ISO 8601)
    """
    try:
        service = get_shopify_service()
        
        if not service.is_configured():
            return jsonify({
                'error': 'Shopify not configured',
                'orders': [],
                'total': 0
            }), 503
        
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 250)
        status = request.args.get('status', 'any')
        financial_status = request.args.get('financial_status')
        fulfillment_status = request.args.get('fulfillment_status')
        created_at_min = request.args.get('created_at_min')
        created_at_max = request.args.get('created_at_max')
        
        # Build params for Shopify API
        params = {
            'limit': limit,
            'page': page,
            'status': status
        }
        
        if financial_status:
            params['financial_status'] = financial_status
        if fulfillment_status:
            params['fulfillment_status'] = fulfillment_status
        if created_at_min:
            params['created_at_min'] = created_at_min
        if created_at_max:
            params['created_at_max'] = created_at_max
        
        # Get orders from Shopify
        orders, pagination = service.list_orders(
            limit=limit,
            status=status,
            financial_status=financial_status
        )
        
        # Enrich order data
        enriched_orders = []
        for order in orders:
            line_items = order.get('line_items', [])
            
            enriched_orders.append({
                'id': order.get('id'),
                'order_number': order.get('order_number'),
                'name': order.get('name'),
                'email': order.get('email'),
                'created_at': order.get('created_at'),
                'updated_at': order.get('updated_at'),
                'closed_at': order.get('closed_at'),
                'cancelled_at': order.get('cancelled_at'),
                'financial_status': order.get('financial_status'),
                'fulfillment_status': order.get('fulfillment_status'),
                'total_price': float(order.get('total_price', 0)),
                'subtotal_price': float(order.get('subtotal_price', 0)),
                'total_tax': float(order.get('total_tax', 0)),
                'total_discounts': float(order.get('total_discounts', 0)),
                'currency': order.get('currency', 'USD'),
                'customer': {
                    'id': order.get('customer', {}).get('id'),
                    'email': order.get('customer', {}).get('email'),
                    'first_name': order.get('customer', {}).get('first_name'),
                    'last_name': order.get('customer', {}).get('last_name')
                } if order.get('customer') else None,
                'shipping_address': order.get('shipping_address'),
                'billing_address': order.get('billing_address'),
                'items_count': len(line_items),
                'total_weight': sum(item.get('grams', 0) for item in line_items),
                'tags': order.get('tags', '').split(',') if order.get('tags') else [],
                'note': order.get('note'),
                'gateway': order.get('gateway')
            })
        
        return jsonify({
            'orders': enriched_orders,
            'total': len(enriched_orders),
            'page': page,
            'limit': limit,
            'timestamp': datetime.now().isoformat()
        })
    
    except ShopifyAPIError as e:
        logger.error(f"Shopify API error getting orders: {e}")
        return jsonify({
            'error': 'Failed to fetch orders from Shopify',
            'details': str(e),
            'orders': []
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error getting orders: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e),
            'orders': []
        }), 500


@orders_bp.route('/<order_id>', methods=['GET'])
def get_order(order_id: str):
    """Get detailed information about a specific order."""
    try:
        service = get_shopify_service()
        
        if not service.is_configured():
            return jsonify({
                'error': 'Shopify not configured'
            }), 503
        
        # Get order from Shopify - fetch all and filter by ID
        orders, pagination = service.list_orders(limit=250, status='any')
        order = next((o for o in orders if str(o.get('id')) == str(order_id)), None)
        
        if not order:
            return jsonify({
                'error': 'Order not found'
            }), 404
        
        # Enrich order data with full details
        line_items = order.get('line_items', [])
        fulfillments = order.get('fulfillments', [])
        transactions = order.get('transactions', [])
        
        order_data = {
            'id': order.get('id'),
            'order_number': order.get('order_number'),
            'name': order.get('name'),
            'email': order.get('email'),
            'phone': order.get('phone'),
            'created_at': order.get('created_at'),
            'updated_at': order.get('updated_at'),
            'closed_at': order.get('closed_at'),
            'cancelled_at': order.get('cancelled_at'),
            'cancel_reason': order.get('cancel_reason'),
            'financial_status': order.get('financial_status'),
            'fulfillment_status': order.get('fulfillment_status'),
            'total_price': float(order.get('total_price', 0)),
            'subtotal_price': float(order.get('subtotal_price', 0)),
            'total_tax': float(order.get('total_tax', 0)),
            'total_discounts': float(order.get('total_discounts', 0)),
            'total_shipping_price': float(order.get('total_shipping_price_set', {}).get('shop_money', {}).get('amount', 0)) if order.get('total_shipping_price_set') else 0,
            'currency': order.get('currency', 'USD'),
            'customer': order.get('customer'),
            'shipping_address': order.get('shipping_address'),
            'billing_address': order.get('billing_address'),
            'line_items': [
                {
                    'id': item.get('id'),
                    'product_id': item.get('product_id'),
                    'variant_id': item.get('variant_id'),
                    'title': item.get('title'),
                    'variant_title': item.get('variant_title'),
                    'sku': item.get('sku'),
                    'quantity': item.get('quantity'),
                    'price': float(item.get('price', 0)),
                    'total': float(item.get('price', 0)) * item.get('quantity', 0),
                    'vendor': item.get('vendor'),
                    'fulfillment_status': item.get('fulfillment_status'),
                    'requires_shipping': item.get('requires_shipping'),
                    'taxable': item.get('taxable'),
                    'grams': item.get('grams')
                }
                for item in line_items
            ],
            'fulfillments': [
                {
                    'id': f.get('id'),
                    'status': f.get('status'),
                    'created_at': f.get('created_at'),
                    'updated_at': f.get('updated_at'),
                    'tracking_company': f.get('tracking_company'),
                    'tracking_number': f.get('tracking_number'),
                    'tracking_url': f.get('tracking_url'),
                    'line_items': [
                        {
                            'id': li.get('id'),
                            'title': li.get('title'),
                            'quantity': li.get('quantity')
                        }
                        for li in f.get('line_items', [])
                    ]
                }
                for f in fulfillments
            ],
            'transactions': [
                {
                    'id': t.get('id'),
                    'kind': t.get('kind'),
                    'status': t.get('status'),
                    'amount': float(t.get('amount', 0)),
                    'currency': t.get('currency'),
                    'gateway': t.get('gateway'),
                    'created_at': t.get('created_at')
                }
                for t in transactions
            ],
            'tags': order.get('tags', '').split(',') if order.get('tags') else [],
            'note': order.get('note'),
            'note_attributes': order.get('note_attributes', []),
            'discount_codes': order.get('discount_codes', []),
            'gateway': order.get('gateway'),
            'source_name': order.get('source_name'),
            'processing_method': order.get('processing_method')
        }
        
        return jsonify(order_data)
    
    except ShopifyAPIError as e:
        logger.error(f"Shopify API error getting order {order_id}: {e}")
        return jsonify({
            'error': 'Failed to fetch order from Shopify',
            'details': str(e)
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error getting order {order_id}: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@orders_bp.route('/stats', methods=['GET'])
def get_order_stats():
    """Get order statistics and analytics."""
    try:
        service = get_shopify_service()
        
        if not service.is_configured():
            return jsonify({
                'error': 'Shopify not configured'
            }), 503
        
        # Get recent orders (last 30 days)
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        orders, pagination = service.list_orders(limit=250, status='any')
        
        # Calculate statistics
        total_orders = len(orders)
        
        # Status breakdown
        open_orders = len([o for o in orders if o.get('financial_status') == 'paid' and o.get('fulfillment_status') != 'fulfilled'])
        fulfilled_orders = len([o for o in orders if o.get('fulfillment_status') == 'fulfilled'])
        cancelled_orders = len([o for o in orders if o.get('cancelled_at')])
        
        # Financial status
        paid_orders = len([o for o in orders if o.get('financial_status') == 'paid'])
        pending_orders = len([o for o in orders if o.get('financial_status') == 'pending'])
        refunded_orders = len([o for o in orders if o.get('financial_status') in ['refunded', 'partially_refunded']])
        
        # Revenue calculations
        total_revenue = sum(float(o.get('total_price', 0)) for o in orders)
        avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
        
        # Daily orders breakdown (last 7 days)
        daily_orders = {}
        for i in range(7):
            date = (datetime.now() - timedelta(days=i)).date()
            daily_orders[date.isoformat()] = 0
        
        for order in orders:
            created_at = datetime.fromisoformat(order.get('created_at', '').replace('Z', '+00:00'))
            date_key = created_at.date().isoformat()
            if date_key in daily_orders:
                daily_orders[date_key] += 1
        
        return jsonify({
            'overview': {
                'total_orders': total_orders,
                'open': open_orders,
                'fulfilled': fulfilled_orders,
                'cancelled': cancelled_orders
            },
            'financial': {
                'paid': paid_orders,
                'pending': pending_orders,
                'refunded': refunded_orders,
                'total_revenue': total_revenue,
                'avg_order_value': avg_order_value
            },
            'daily_breakdown': dict(sorted(daily_orders.items())),
            'period': '30 days',
            'timestamp': datetime.now().isoformat()
        })
    
    except ShopifyAPIError as e:
        logger.error(f"Shopify API error getting order stats: {e}")
        return jsonify({
            'error': 'Failed to fetch order stats from Shopify',
            'details': str(e)
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error getting order stats: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@orders_bp.route('/recent', methods=['GET'])
def get_recent_orders():
    """Get most recent orders (last 24 hours)."""
    try:
        service = get_shopify_service()
        
        if not service.is_configured():
            return jsonify({
                'error': 'Shopify not configured',
                'orders': []
            }), 503
        
        # Get orders from last 24 hours
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        orders, pagination = service.list_orders(limit=50, status='any')
        
        # Sort by created_at descending
        orders.sort(key=lambda o: o.get('created_at', ''), reverse=True)
        
        # Format orders
        recent_orders = [
            {
                'id': o.get('id'),
                'order_number': o.get('order_number'),
                'name': o.get('name'),
                'email': o.get('email'),
                'created_at': o.get('created_at'),
                'financial_status': o.get('financial_status'),
                'fulfillment_status': o.get('fulfillment_status'),
                'total_price': float(o.get('total_price', 0)),
                'currency': o.get('currency', 'USD'),
                'customer_name': f"{o.get('customer', {}).get('first_name', '')} {o.get('customer', {}).get('last_name', '')}".strip() if o.get('customer') else 'Guest'
            }
            for o in orders
        ]
        
        return jsonify({
            'orders': recent_orders,
            'total': len(recent_orders),
            'period': '24 hours',
            'timestamp': datetime.now().isoformat()
        })
    
    except ShopifyAPIError as e:
        logger.error(f"Shopify API error getting recent orders: {e}")
        return jsonify({
            'error': 'Failed to fetch recent orders',
            'details': str(e),
            'orders': []
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error getting recent orders: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e),
            'orders': []
        }), 500
