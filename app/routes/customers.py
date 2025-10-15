"""
Customers API Routes for Royal Equips Command Center.

Provides comprehensive customer management with real Shopify integration:
- Customer listing and search
- Customer profiles and order history
- Customer analytics and segmentation
- Lifetime value calculations
"""

import logging
from datetime import datetime
from typing import Optional

from flask import Blueprint, jsonify, request

from app.services.shopify_service import ShopifyService, ShopifyAPIError

logger = logging.getLogger(__name__)

customers_bp = Blueprint('customers', __name__, url_prefix='/api/customers')

# Initialize Shopify service
_shopify_service = None

def get_shopify_service():
    """Get or create Shopify service instance."""
    global _shopify_service
    if _shopify_service is None:
        _shopify_service = ShopifyService()
    return _shopify_service


@customers_bp.route('', methods=['GET'])
def get_customers():
    """
    Get customers with pagination and filtering.
    
    Query Parameters:
    - page: Page number (default: 1)
    - limit: Items per page (default: 50, max: 250)
    - search: Search by name or email
    """
    try:
        service = get_shopify_service()
        
        if not service.is_configured():
            return jsonify({
                'error': 'Shopify not configured',
                'customers': [],
                'total': 0
            }), 503
        
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 250)
        search = request.args.get('search', '').strip()
        
        # Build params for Shopify API
        params = {
            'limit': limit,
            'page': page
        }
        
        # Get customers from Shopify
        customers, pagination = service.list_customers(limit=limit)
        
        # Apply search filter if provided
        if search:
            search_lower = search.lower()
            customers = [
                c for c in customers 
                if search_lower in c.get('email', '').lower()
                or search_lower in c.get('first_name', '').lower()
                or search_lower in c.get('last_name', '').lower()
            ]
        
        # Enrich customer data
        enriched_customers = []
        for customer in customers:
            enriched_customers.append({
                'id': customer.get('id'),
                'email': customer.get('email'),
                'first_name': customer.get('first_name'),
                'last_name': customer.get('last_name'),
                'full_name': f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip() or 'Guest',
                'phone': customer.get('phone'),
                'created_at': customer.get('created_at'),
                'updated_at': customer.get('updated_at'),
                'orders_count': customer.get('orders_count', 0),
                'total_spent': float(customer.get('total_spent', 0)),
                'state': customer.get('state'),
                'verified_email': customer.get('verified_email'),
                'tax_exempt': customer.get('tax_exempt'),
                'tags': customer.get('tags', '').split(',') if customer.get('tags') else [],
                'currency': customer.get('currency', 'USD'),
                'addresses_count': len(customer.get('addresses', [])),
                'default_address': customer.get('default_address'),
                'marketing_consent': {
                    'state': customer.get('email_marketing_consent', {}).get('state'),
                    'opt_in_level': customer.get('email_marketing_consent', {}).get('opt_in_level'),
                    'consent_updated_at': customer.get('email_marketing_consent', {}).get('consent_updated_at')
                } if customer.get('email_marketing_consent') else None
            })
        
        return jsonify({
            'customers': enriched_customers,
            'total': len(enriched_customers),
            'page': page,
            'limit': limit,
            'timestamp': datetime.now().isoformat()
        })
    
    except ShopifyAPIError as e:
        logger.error(f"Shopify API error getting customers: {e}")
        return jsonify({
            'error': 'Failed to fetch customers from Shopify',
            'details': str(e),
            'customers': []
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error getting customers: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e),
            'customers': []
        }), 500


@customers_bp.route('/<customer_id>', methods=['GET'])
def get_customer(customer_id: str):
    """Get detailed information about a specific customer."""
    try:
        service = get_shopify_service()
        
        if not service.is_configured():
            return jsonify({
                'error': 'Shopify not configured'
            }), 503
        
        # Get customer from Shopify - fetch all and filter by ID
        customers, pagination = service.list_customers(limit=250)
        customer = next((c for c in customers if str(c.get('id')) == str(customer_id)), None)
        
        if not customer:
            return jsonify({
                'error': 'Customer not found'
            }), 404
        
        # Get customer's orders for additional analytics
        orders, orders_pagination = service.list_orders(limit=250, status='any')
        # Filter orders by customer_id
        orders = [o for o in orders if str(o.get('customer', {}).get('id')) == str(customer_id)]
        
        # Calculate customer metrics
        orders_count = len(orders)
        total_spent = sum(float(o.get('total_price', 0)) for o in orders)
        avg_order_value = total_spent / orders_count if orders_count > 0 else 0
        
        # First and last order dates
        first_order = min(orders, key=lambda o: o.get('created_at', '')) if orders else None
        last_order = max(orders, key=lambda o: o.get('created_at', '')) if orders else None
        
        customer_data = {
            'id': customer.get('id'),
            'email': customer.get('email'),
            'first_name': customer.get('first_name'),
            'last_name': customer.get('last_name'),
            'full_name': f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip() or 'Guest',
            'phone': customer.get('phone'),
            'created_at': customer.get('created_at'),
            'updated_at': customer.get('updated_at'),
            'state': customer.get('state'),
            'verified_email': customer.get('verified_email'),
            'tax_exempt': customer.get('tax_exempt'),
            'tags': customer.get('tags', '').split(',') if customer.get('tags') else [],
            'currency': customer.get('currency', 'USD'),
            'note': customer.get('note'),
            'addresses': customer.get('addresses', []),
            'default_address': customer.get('default_address'),
            'marketing_consent': {
                'email': customer.get('email_marketing_consent'),
                'sms': customer.get('sms_marketing_consent')
            },
            'metrics': {
                'orders_count': orders_count,
                'total_spent': total_spent,
                'avg_order_value': avg_order_value,
                'first_order_date': first_order.get('created_at') if first_order else None,
                'last_order_date': last_order.get('created_at') if last_order else None,
                'lifetime_value': total_spent,
                'customer_since_days': (datetime.now() - datetime.fromisoformat(customer.get('created_at', '').replace('Z', '+00:00'))).days if customer.get('created_at') else 0
            },
            'recent_orders': [
                {
                    'id': o.get('id'),
                    'order_number': o.get('order_number'),
                    'created_at': o.get('created_at'),
                    'total_price': float(o.get('total_price', 0)),
                    'financial_status': o.get('financial_status'),
                    'fulfillment_status': o.get('fulfillment_status')
                }
                for o in sorted(orders, key=lambda o: o.get('created_at', ''), reverse=True)[:10]
            ]
        }
        
        return jsonify(customer_data)
    
    except ShopifyAPIError as e:
        logger.error(f"Shopify API error getting customer {customer_id}: {e}")
        return jsonify({
            'error': 'Failed to fetch customer from Shopify',
            'details': str(e)
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error getting customer {customer_id}: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@customers_bp.route('/stats', methods=['GET'])
def get_customer_stats():
    """Get customer statistics and segmentation."""
    try:
        service = get_shopify_service()
        
        if not service.is_configured():
            return jsonify({
                'error': 'Shopify not configured'
            }), 503
        
        # Get customers (might need pagination for large datasets)
        customers, pagination = service.list_customers(limit=250)
        
        total_customers = len(customers)
        
        # Calculate statistics
        verified_emails = len([c for c in customers if c.get('verified_email')])
        marketing_subscribed = len([
            c for c in customers 
            if c.get('email_marketing_consent', {}).get('state') == 'subscribed'
        ])
        
        # Spending segments
        total_spent_values = [float(c.get('total_spent', 0)) for c in customers]
        total_lifetime_value = sum(total_spent_values)
        avg_lifetime_value = total_lifetime_value / total_customers if total_customers > 0 else 0
        
        # Customer segments by spending
        vip_customers = len([c for c in customers if float(c.get('total_spent', 0)) > 1000])
        high_value = len([c for c in customers if 500 < float(c.get('total_spent', 0)) <= 1000])
        medium_value = len([c for c in customers if 100 < float(c.get('total_spent', 0)) <= 500])
        low_value = len([c for c in customers if 0 < float(c.get('total_spent', 0)) <= 100])
        no_orders = len([c for c in customers if float(c.get('total_spent', 0)) == 0])
        
        # Order frequency
        repeat_customers = len([c for c in customers if c.get('orders_count', 0) > 1])
        one_time_customers = len([c for c in customers if c.get('orders_count', 0) == 1])
        
        # Top customers
        top_customers = sorted(
            customers,
            key=lambda c: float(c.get('total_spent', 0)),
            reverse=True
        )[:10]
        
        top_customers_data = [
            {
                'id': c.get('id'),
                'name': f"{c.get('first_name', '')} {c.get('last_name', '')}".strip() or c.get('email', 'Guest'),
                'email': c.get('email'),
                'total_spent': float(c.get('total_spent', 0)),
                'orders_count': c.get('orders_count', 0)
            }
            for c in top_customers
        ]
        
        return jsonify({
            'overview': {
                'total_customers': total_customers,
                'verified_emails': verified_emails,
                'marketing_subscribed': marketing_subscribed
            },
            'lifetime_value': {
                'total': total_lifetime_value,
                'average': avg_lifetime_value,
                'segments': {
                    'vip': vip_customers,
                    'high_value': high_value,
                    'medium_value': medium_value,
                    'low_value': low_value,
                    'no_orders': no_orders
                }
            },
            'engagement': {
                'repeat_customers': repeat_customers,
                'one_time_customers': one_time_customers,
                'retention_rate': (repeat_customers / total_customers * 100) if total_customers > 0 else 0
            },
            'top_customers': top_customers_data,
            'timestamp': datetime.now().isoformat()
        })
    
    except ShopifyAPIError as e:
        logger.error(f"Shopify API error getting customer stats: {e}")
        return jsonify({
            'error': 'Failed to fetch customer stats from Shopify',
            'details': str(e)
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error getting customer stats: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@customers_bp.route('/search', methods=['GET'])
def search_customers():
    """Search customers by query string."""
    try:
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify({
                'error': 'Search query required',
                'results': []
            }), 400
        
        service = get_shopify_service()
        
        if not service.is_configured():
            return jsonify({
                'error': 'Shopify not configured',
                'results': []
            }), 503
        
        # Get customers and filter by search query
        customers, pagination = service.list_customers(limit=250)
        
        query_lower = query.lower()
        matching_customers = [
            {
                'id': c.get('id'),
                'email': c.get('email'),
                'full_name': f"{c.get('first_name', '')} {c.get('last_name', '')}".strip() or 'Guest',
                'phone': c.get('phone'),
                'orders_count': c.get('orders_count', 0),
                'total_spent': float(c.get('total_spent', 0))
            }
            for c in customers
            if query_lower in c.get('email', '').lower()
            or query_lower in c.get('first_name', '').lower()
            or query_lower in c.get('last_name', '').lower()
            or query_lower in c.get('phone', '').lower()
        ]
        
        return jsonify({
            'query': query,
            'results': matching_customers,
            'total': len(matching_customers),
            'timestamp': datetime.now().isoformat()
        })
    
    except ShopifyAPIError as e:
        logger.error(f"Shopify API error searching customers: {e}")
        return jsonify({
            'error': 'Failed to search customers',
            'details': str(e),
            'results': []
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error searching customers: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e),
            'results': []
        }), 500
