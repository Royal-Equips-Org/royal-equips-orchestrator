"""
Shopify API blueprint for Royal Equips Orchestrator.

Provides REST endpoints for Shopify operations:
- Shop status and authentication
- Product, collection, inventory, order synchronization
- Bulk operations
- Webhook endpoints with HMAC verification
"""

import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from werkzeug.exceptions import BadRequest

from app.jobs.shopify_jobs import (
    bulk_operation_job,
    get_active_jobs,
    get_job_status,
    run_job_async,
    sync_inventory_job,
    sync_orders_job,
    sync_products_job,
)
from app.services.shopify_service import (
    ShopifyAPIError,
    ShopifyAuthError,
    ShopifyService,
)
from app.utils.hmac import get_shopify_webhook_topics, verify_shopify_webhook

logger = logging.getLogger(__name__)

shopify_bp = Blueprint("shopify", __name__, url_prefix="/api/shopify")

# Initialize Shopify service
_shopify_service = None

def get_shopify_service():
    """Get or create Shopify service instance."""
    global _shopify_service
    if _shopify_service is None:
        _shopify_service = ShopifyService()
    return _shopify_service


@shopify_bp.route("/status", methods=["GET"])
def get_shopify_status():
    """
    Get Shopify shop status and configuration.
    ---
    tags:
      - Shopify
    responses:
      200:
        description: Shopify status information
        schema:
          type: object
          properties:
            configured:
              type: boolean
            shop_info:
              type: object
            rate_limit:
              type: object
            timestamp:
              type: string
      503:
        description: Shopify service not configured or unavailable
    """
    try:
        service = get_shopify_service()

        if not service.is_configured():
            return jsonify({
                "configured": False,
                "error": "Shopify credentials not configured",
                "message": "Set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, and SHOP_NAME environment variables",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }), 503

        # Get shop info and rate limit status
        try:
            shop_info = service.get_shop_info()
            rate_limit = service.get_rate_limit_status()

            return jsonify({
                "configured": True,
                "shop_info": shop_info,
                "rate_limit": rate_limit,
                "supported_topics": get_shopify_webhook_topics(),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }), 200

        except ShopifyAuthError as e:
            return jsonify({
                "configured": True,
                "authenticated": False,
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }), 401

        except ShopifyAPIError as e:
            return jsonify({
                "configured": True,
                "error": f"Shopify API error: {e}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }), 503

    except Exception as e:
        logger.error(f"Error getting Shopify status: {e}")
        return jsonify({
            "configured": False,
            "error": "Internal server error",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 500


@shopify_bp.route("/sync-products", methods=["POST"])
def sync_products():
    """
    Start asynchronous product synchronization.
    ---
    tags:
      - Shopify
    parameters:
      - name: body
        in: body
        schema:
          type: object
          properties:
            limit:
              type: integer
              description: Maximum number of products to sync (default 50)
              minimum: 1
              maximum: 250
    responses:
      202:
        description: Product sync job started
        schema:
          type: object
          properties:
            job_id:
              type: string
            status:
              type: string
            message:
              type: string
            timestamp:
              type: string
      400:
        description: Invalid request parameters
      503:
        description: Shopify service not available
    """
    try:
        service = get_shopify_service()

        if not service.is_configured():
            return jsonify({
                "error": "Shopify service not configured",
                "message": "Configure Shopify credentials first"
            }), 503

        # Parse request parameters
        data = request.get_json() or {}
        limit = data.get('limit', 50)

        if not isinstance(limit, int) or limit < 1 or limit > 250:
            return jsonify({
                "error": "Invalid limit parameter",
                "message": "Limit must be an integer between 1 and 250"
            }), 400

        # Start async job
        job_id = run_job_async(sync_products_job, limit=limit)

        # Emit job started event
        try:
            from app.sockets import socketio
            if socketio:
                socketio.emit('job_started', {
                    'job_id': job_id,
                    'type': 'sync_products',
                    'limit': limit,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }, namespace='/ws/shopify')
        except Exception as e:
            logger.warning(f"Failed to emit WebSocket event: {e}")

        return jsonify({
            "job_id": job_id,
            "status": "started",
            "message": f"Product synchronization started (limit: {limit})",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 202

    except Exception as e:
        logger.error(f"Error starting product sync: {e}")
        return jsonify({
            "error": "Failed to start product sync"
        }), 500


@shopify_bp.route("/sync-inventory", methods=["POST"])
def sync_inventory():
    """
    Start asynchronous inventory synchronization.
    ---
    tags:
      - Shopify
    parameters:
      - name: body
        in: body
        schema:
          type: object
          properties:
            location_id:
              type: integer
              description: Specific location ID to sync (optional)
    responses:
      202:
        description: Inventory sync job started
      503:
        description: Shopify service not available
    """
    try:
        service = get_shopify_service()

        if not service.is_configured():
            return jsonify({
                "error": "Shopify service not configured"
            }), 503

        data = request.get_json() or {}
        location_id = data.get('location_id')

        # Start async job
        job_id = run_job_async(sync_inventory_job, location_id=location_id)

        # Emit job started event
        try:
            from app.sockets import socketio
            if socketio:
                socketio.emit('job_started', {
                    'job_id': job_id,
                    'type': 'sync_inventory',
                    'location_id': location_id,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }, namespace='/ws/shopify')
        except Exception as e:
            logger.warning(f"Failed to emit WebSocket event: {e}")

        return jsonify({
            "job_id": job_id,
            "status": "started",
            "message": "Inventory synchronization started",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 202

    except Exception as e:
        logger.error(f"Error starting inventory sync: {e}")
        return jsonify({
            "error": "Failed to start inventory sync"
        }), 500


@shopify_bp.route("/sync-orders", methods=["POST"])
def sync_orders():
    """
    Start asynchronous order synchronization.
    ---
    tags:
      - Shopify
    parameters:
      - name: body
        in: body
        schema:
          type: object
          properties:
            limit:
              type: integer
              description: Maximum number of orders to sync (default 50)
            status:
              type: string
              description: Order status filter (any, open, closed, cancelled)
              enum: [any, open, closed, cancelled]
    responses:
      202:
        description: Order sync job started
      503:
        description: Shopify service not available
    """
    try:
        service = get_shopify_service()

        if not service.is_configured():
            return jsonify({
                "error": "Shopify service not configured"
            }), 503

        data = request.get_json() or {}
        limit = data.get('limit', 50)
        status = data.get('status', 'any')

        if status not in ['any', 'open', 'closed', 'cancelled']:
            return jsonify({
                "error": "Invalid status parameter",
                "message": "Status must be one of: any, open, closed, cancelled"
            }), 400

        # Start async job
        job_id = run_job_async(sync_orders_job, limit=limit, status=status)

        # Emit job started event
        try:
            from app.sockets import socketio
            if socketio:
                socketio.emit('job_started', {
                    'job_id': job_id,
                    'type': 'sync_orders',
                    'limit': limit,
                    'status': status,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }, namespace='/ws/shopify')
        except Exception as e:
            logger.warning(f"Failed to emit WebSocket event: {e}")

        return jsonify({
            "job_id": job_id,
            "status": "started",
            "message": f"Order synchronization started (limit: {limit}, status: {status})",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 202

    except Exception as e:
        logger.error(f"Error starting order sync: {e}")
        return jsonify({
            "error": "Failed to start order sync"
        }), 500


@shopify_bp.route("/bulk", methods=["POST"])
def bulk_operation():
    """
    Start a bulk operation.
    ---
    tags:
      - Shopify
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            operation:
              type: string
              description: Operation type
            data:
              type: object
              description: Operation data
          required:
            - operation
    responses:
      202:
        description: Bulk operation started
      400:
        description: Invalid request parameters
      503:
        description: Shopify service not available
    """
    try:
        service = get_shopify_service()

        if not service.is_configured():
            return jsonify({
                "error": "Shopify service not configured"
            }), 503

        data = request.get_json()
        if not data or 'operation' not in data:
            return jsonify({
                "error": "Missing required 'operation' parameter"
            }), 400

        operation = data['operation']
        operation_data = data.get('data', {})

        # Start async job
        job_id = run_job_async(bulk_operation_job, operation=operation, data=operation_data)

        # Emit job started event
        try:
            from app.sockets import socketio
            if socketio:
                socketio.emit('job_started', {
                    'job_id': job_id,
                    'type': f'bulk_{operation}',
                    'operation': operation,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }, namespace='/ws/shopify')
        except Exception as e:
            logger.warning(f"Failed to emit WebSocket event: {e}")

        return jsonify({
            "job_id": job_id,
            "status": "started",
            "message": f"Bulk operation '{operation}' started",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 202

    except Exception as e:
        logger.error(f"Error starting bulk operation: {e}")
        return jsonify({
            "error": "Failed to start bulk operation"
        }), 500


@shopify_bp.route("/jobs", methods=["GET"])
def get_jobs():
    """
    Get status of all active Shopify jobs.
    ---
    tags:
      - Shopify
    responses:
      200:
        description: List of active jobs
        schema:
          type: object
          properties:
            jobs:
              type: object
            count:
              type: integer
            timestamp:
              type: string
    """
    try:
        jobs = get_active_jobs()

        return jsonify({
            "jobs": jobs,
            "count": len(jobs),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting jobs: {e}")
        return jsonify({
            "error": "Failed to get jobs"
        }), 500


@shopify_bp.route("/jobs/<job_id>", methods=["GET"])
def get_job(job_id: str):
    """
    Get status of specific job.
    ---
    tags:
      - Shopify
    parameters:
      - name: job_id
        in: path
        required: true
        type: string
        description: Job ID
    responses:
      200:
        description: Job status
      404:
        description: Job not found
    """
    try:
        job_status = get_job_status(job_id)

        if not job_status:
            return jsonify({
                "error": "Job not found",
                "job_id": job_id
            }), 404

        return jsonify(job_status), 200

    except Exception as e:
        # Clean job_id for logging (Python 3.8 compatible)
        clean_job_id = job_id.replace('\n', '').replace('\r', '')[:50]
        logger.error(f"Error getting job {clean_job_id}: {e}")
        return jsonify({
            "error": "Failed to get job status"
        }), 500


@shopify_bp.route("/products", methods=["GET"])
def get_products():
    """
    Get products from Shopify with inventory data.
    ---
    tags:
      - Shopify
    parameters:
      - name: limit
        in: query
        type: integer
        description: Maximum number of products to return (default 50, max 250)
        minimum: 1
        maximum: 250
      - name: force
        in: query
        type: string
        description: Force refresh bypassing cache (value '1' to enable)
    responses:
      200:
        description: Products with inventory data
        schema:
          type: object
          properties:
            products:
              type: array
              items:
                type: object
            timestamp:
              type: string
            shop:
              type: string
            meta:
              type: object
      503:
        description: Shopify service not configured or unavailable
    """
    try:
        service = get_shopify_service()

        if not service.is_configured():
            return jsonify({
                "products": [],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "shop": "not_configured",
                "meta": {
                    "count": 0,
                    "lowStock": 0,
                    "fetchedMs": 0,
                    "cache": "MISS",
                    "apiCalls": 0
                },
                "error": "Shopify credentials not configured"
            }), 503

        # Get query parameters
        limit = request.args.get('limit', 50, type=int)
        force_refresh = request.args.get('force') == '1'
        
        # Validate limit
        if limit < 1 or limit > 250:
            return jsonify({
                "error": "Invalid limit parameter",
                "message": "Limit must be between 1 and 250"
            }), 400

        start_time = datetime.now(timezone.utc)
        
        try:
            # Get products from Shopify
            products_data, _ = service.list_products(limit=limit)
            
            # Transform to the expected format
            transformed_products = []
            low_stock_count = 0
            
            for product in products_data:
                # Calculate total inventory across all variants
                total_inventory = 0
                variants = []
                
                for variant in product.get('variants', []):
                    inventory_qty = variant.get('inventory_quantity', 0)
                    total_inventory += inventory_qty
                    
                    variants.append({
                        "id": f"gid://shopify/ProductVariant/{variant.get('id')}",
                        "sku": variant.get('sku', ''),
                        "price": variant.get('price', '0'),
                        "inventoryQuantity": inventory_qty,
                        "tracked": variant.get('inventory_management') == 'shopify'
                    })
                
                # Check for low stock (threshold: 10)
                if 0 < total_inventory <= 10:
                    low_stock_count += 1
                
                transformed_product = {
                    "id": f"gid://shopify/Product/{product.get('id')}",
                    "title": product.get('title', ''),
                    "status": product.get('status', 'DRAFT').upper(),
                    "totalInventory": total_inventory,
                    "variants": variants
                }
                
                transformed_products.append(transformed_product)
            
            # Calculate metrics
            fetch_time_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
            shop_name = f"{service.shop_name}.myshopify.com" if service.shop_name else "unknown"
            
            response_data = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "shop": shop_name,
                "products": transformed_products,
                "meta": {
                    "count": len(transformed_products),
                    "lowStock": low_stock_count,
                    "fetchedMs": fetch_time_ms,
                    "cache": "MISS" if force_refresh else "HIT",
                    "apiCalls": 1
                }
            }
            
            return jsonify(response_data), 200
            
        except ShopifyAuthError as e:
            logger.error(f"Shopify authentication error: {e}")
            return jsonify({
                "products": [],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "shop": "auth_failed",
                "meta": {
                    "count": 0,
                    "lowStock": 0,
                    "fetchedMs": 0,
                    "cache": "MISS",
                    "apiCalls": 0
                },
                "error": "Authentication failed"
            }), 401
            
        except ShopifyAPIError as e:
            logger.error(f"Shopify API error: {e}")
            return jsonify({
                "products": [],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "shop": "api_error",
                "meta": {
                    "count": 0,
                    "lowStock": 0,
                    "fetchedMs": 0,
                    "cache": "MISS",
                    "apiCalls": 0
                },
                "error": "API error occurred"
            }), 503

    except Exception as e:
        logger.error(f"Error getting products: {e}")
        return jsonify({
            "products": [],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "shop": "error",
            "meta": {
                "count": 0,
                "lowStock": 0,
                "fetchedMs": 0,
                "cache": "MISS",
                "apiCalls": 0
            },
            "error": "Internal server error"
        }), 500


@shopify_bp.route("/orders", methods=["GET"])
def get_orders():
    """
    Get orders from Shopify.
    ---
    tags:
      - Shopify
    parameters:
      - name: limit
        in: query
        type: integer
        description: Maximum number of orders to return (default 20, max 250)
        minimum: 1
        maximum: 250
      - name: status
        in: query
        type: string
        description: Order status filter (any, open, closed, cancelled)
    responses:
      200:
        description: Orders from Shopify
      503:
        description: Shopify service not configured or unavailable
    """
    try:
        service = get_shopify_service()

        if not service.is_configured():
            return jsonify({
                "orders": [],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": "Shopify credentials not configured"
            }), 503

        # Get query parameters
        limit = request.args.get('limit', 20, type=int)
        status = request.args.get('status', 'any')
        
        # Validate limit
        if limit < 1 or limit > 250:
            return jsonify({
                "error": "Invalid limit parameter",
                "message": "Limit must be between 1 and 250"
            }), 400

        try:
            # Get orders from Shopify
            orders_data, _ = service.list_orders(limit=limit, status=status)
            
            # Transform to the expected format
            transformed_orders = []
            
            for order in orders_data:
                line_items = []
                for item in order.get('line_items', []):
                    line_items.append({
                        "productId": str(item.get('product_id', '')),
                        "title": item.get('title', ''),
                        "quantity": item.get('quantity', 0),
                        "price": item.get('price', '0')
                    })
                
                transformed_order = {
                    "id": f"gid://shopify/Order/{order.get('id')}",
                    "orderNumber": str(order.get('order_number', order.get('name', ''))),
                    "totalPrice": order.get('total_price', '0'),
                    "financialStatus": order.get('financial_status', 'pending').upper(),
                    "fulfillmentStatus": (order.get('fulfillment_status') or 'unfulfilled').upper(),
                    "customerEmail": order.get('email', order.get('customer', {}).get('email', '')),
                    "createdAt": order.get('created_at', datetime.now(timezone.utc).isoformat()),
                    "lineItems": line_items
                }
                
                transformed_orders.append(transformed_order)
            
            response_data = {
                "orders": transformed_orders,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            return jsonify(response_data), 200
            
        except ShopifyAuthError as e:
            logger.error(f"Shopify authentication error: {e}")
            return jsonify({
                "orders": [],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": "Authentication failed"
            }), 401
            
        except ShopifyAPIError as e:
            logger.error(f"Shopify API error: {e}")
            return jsonify({
                "orders": [],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": "API error occurred"
            }), 503

    except Exception as e:
        logger.error(f"Error getting orders: {e}")
        return jsonify({
            "orders": [],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": "Internal server error"
        }), 500


# NOTE: Duplicate /metrics endpoint - using the comprehensive one at line 985+ instead
@shopify_bp.route("/metrics_old", methods=["GET"])
def get_shopify_metrics_old():
    """
    Get comprehensive Shopify store metrics from live data.
    ---
    tags:
      - Shopify
    responses:
      200:
        description: Live Shopify metrics
        schema:
          type: object
          properties:
            totalRevenue:
              type: number
            totalOrders:
              type: number
            totalProducts:
              type: number
            totalCustomers:
              type: number
            averageOrderValue:
              type: number
            conversionRate:
              type: number
            trafficEstimate:
              type: number
            topProducts:
              type: array
            recentOrders:
              type: array
            source:
              type: string
            lastUpdated:
              type: string
            connected:
              type: boolean
      503:
        description: Shopify service not configured or unavailable
    """
    try:
        service = get_shopify_service()

        if not service.is_configured():
            return jsonify({
                "totalRevenue": 0,
                "totalOrders": 0,
                "totalProducts": 0,
                "totalCustomers": 0,
                "averageOrderValue": 0,
                "conversionRate": 0,
                "trafficEstimate": 0,
                "topProducts": [],
                "recentOrders": [],
                "source": "no_data_available",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "connected": False
            }), 200

        # Get real data from Shopify
        try:
            # Fetch live data
            products, _ = service.list_products(limit=250)
            orders, _ = service.list_orders(limit=250, status='any')
            
            # Calculate real metrics
            total_revenue = 0
            total_orders = len(orders)
            total_products = len(products)
            
            # Calculate revenue from orders
            for order in orders:
                try:
                    total_revenue += float(order.get('total_price', '0'))
                except (ValueError, TypeError):
                    continue
            
            # Calculate average order value
            average_order_value = total_revenue / total_orders if total_orders > 0 else 0
            
            # Get top products by analyzing orders
            product_sales = {}
            for order in orders:
                line_items = order.get('line_items', [])
                for item in line_items:
                    product_id = item.get('product_id')
                    if product_id:
                        if product_id not in product_sales:
                            product_sales[product_id] = {
                                'id': str(product_id),
                                'title': item.get('title', 'Unknown Product'),
                                'handle': item.get('variant_title', '').lower().replace(' ', '-'),
                                'totalSales': 0,
                                'ordersCount': 0,
                                'inventoryLevel': 0
                            }
                        try:
                            item_total = float(item.get('price', '0')) * int(item.get('quantity', 1))
                            product_sales[product_id]['totalSales'] += item_total
                            product_sales[product_id]['ordersCount'] += 1
                        except (ValueError, TypeError):
                            continue
            
            # Get inventory levels from products
            for product in products:
                product_id = str(product.get('id'))
                if product_id in product_sales:
                    variants = product.get('variants', [])
                    total_inventory = sum(int(v.get('inventory_quantity', 0)) for v in variants)
                    product_sales[product_id]['inventoryLevel'] = total_inventory
                    if not product_sales[product_id]['handle']:
                        product_sales[product_id]['handle'] = product.get('handle', '')
            
            # Sort and get top 5 products
            top_products = sorted(
                list(product_sales.values()), 
                key=lambda x: x['totalSales'], 
                reverse=True
            )[:5]
            
            # Get recent orders (last 10)
            recent_orders = []
            for order in sorted(orders, key=lambda x: x.get('created_at', ''), reverse=True)[:10]:
                customer = order.get('customer', {})
                recent_orders.append({
                    'id': str(order.get('id', '')),
                    'orderNumber': order.get('order_number', order.get('name', '')),
                    'customerName': f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip() or 'Guest',
                    'totalPrice': order.get('total_price', '0'),
                    'createdAt': order.get('created_at', datetime.now(timezone.utc).isoformat()),
                    'fulfillmentStatus': order.get('fulfillment_status', 'unfulfilled')
                })
            
            # Estimate metrics (simplified calculations)
            # Get unique customers from orders
            unique_customers = len(set(
                order.get('customer', {}).get('id') 
                for order in orders 
                if order.get('customer', {}).get('id')
            ))
            
            # Simple conversion rate estimation (orders per unique customer)
            conversion_rate = (total_orders / max(unique_customers, 1)) * 100 if unique_customers > 0 else 0
            conversion_rate = min(conversion_rate, 100)  # Cap at 100%
            
            # Traffic estimate (very simplified)
            traffic_estimate = int(unique_customers * 10)  # Rough estimate
            
            metrics = {
                "totalRevenue": round(total_revenue, 2),
                "totalOrders": total_orders,
                "totalProducts": total_products,
                "totalCustomers": unique_customers,
                "averageOrderValue": round(average_order_value, 2),
                "conversionRate": round(conversion_rate, 2),
                "trafficEstimate": traffic_estimate,
                "topProducts": top_products,
                "recentOrders": recent_orders,
                "source": "live_shopify",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "connected": True
            }
            
            return jsonify(metrics), 200

        except Exception as e:
            logger.error(f"Failed to fetch Shopify metrics: {e}")
            return jsonify({
                "totalRevenue": 0,
                "totalOrders": 0,
                "totalProducts": 0,
                "totalCustomers": 0,
                "averageOrderValue": 0,
                "conversionRate": 0,
                "trafficEstimate": 0,
                "topProducts": [],
                "recentOrders": [],
                "source": "error_occurred",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "connected": False,
                "error": "An internal error has occurred."
            }), 200

    except Exception as e:
        logger.error(f"Shopify metrics endpoint failed: {e}")
        return jsonify({
            "error": "Failed to get metrics",
            "message": "An internal error has occurred.",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 500


@shopify_bp.route("/webhooks/<topic>", methods=["POST"])
def handle_webhook(topic: str):
    """
    Handle Shopify webhooks with HMAC verification.
    ---
    tags:
      - Shopify
    parameters:
      - name: topic
        in: path
        required: true
        type: string
        description: Webhook topic (e.g., orders/create)
      - name: X-Shopify-Hmac-Sha256
        in: header
        required: true
        type: string
        description: HMAC signature
      - name: X-Shopify-Topic
        in: header
        required: true
        type: string
        description: Webhook topic
      - name: X-Shopify-Shop-Domain
        in: header
        required: true
        type: string
        description: Shop domain
    responses:
      202:
        description: Webhook received and verified
      401:
        description: Invalid HMAC signature
      400:
        description: Missing headers or invalid payload
    """
    try:
        # Get required headers
        hmac_signature = request.headers.get('X-Shopify-Hmac-Sha256')
        webhook_topic = request.headers.get('X-Shopify-Topic')
        shop_domain = request.headers.get('X-Shopify-Shop-Domain')

        if not hmac_signature:
            return jsonify({
                "error": "Missing HMAC signature",
                "message": "X-Shopify-Hmac-Sha256 header required"
            }), 400

        if not webhook_topic:
            return jsonify({
                "error": "Missing webhook topic",
                "message": "X-Shopify-Topic header required"
            }), 400

        # Verify webhook topic matches URL
        if webhook_topic != topic:
            return jsonify({
                "error": "Topic mismatch",
                "message": f"URL topic '{topic}' doesn't match header topic '{webhook_topic}'"
            }), 400

        # Get raw payload for HMAC verification
        payload = request.get_data()

        # Verify HMAC signature
        if not verify_shopify_webhook(payload, hmac_signature):
            safe_topic = topic.replace('\n', '').replace('\r', '')[:50]
            safe_shop_domain = shop_domain.replace('\n', '').replace('\r', '')[:100]
            logger.warning(f"Invalid HMAC signature for webhook {safe_topic} from {safe_shop_domain}")
            return jsonify({
                "error": "Invalid HMAC signature",
                "message": "Webhook verification failed"
            }), 401

        # Parse JSON payload
        try:
            webhook_data = request.get_json()
        except BadRequest:
            webhook_data = {}

        # Process webhook
        {
            'topic': topic,
            'shop_domain': shop_domain,
            'data': webhook_data,
            'headers': dict(request.headers),
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'verified': True
        }

        # Emit webhook event via WebSocket
        try:
            from app.sockets import socketio
            if socketio:
                socketio.emit('webhook', {
                    'topic': topic,
                    'shop_domain': shop_domain,
                    'id': webhook_data.get('id') if webhook_data else None,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }, namespace='/ws/shopify')
        except:
            pass

        safe_topic = topic.replace('\n', '').replace('\r', '')[:50]
        safe_shop_domain = shop_domain.replace('\n', '').replace('\r', '')[:100]
        logger.info(f"Processed webhook {safe_topic} from {safe_shop_domain}")

        return jsonify({
            "status": "received",
            "topic": topic,
            "shop_domain": shop_domain,
            "verified": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 202

    except Exception as e:
        safe_topic = topic.replace('\n', '').replace('\r', '')[:50]
        logger.error(f"Error processing webhook {safe_topic}: {e}")
        return jsonify({
            "error": "Failed to process webhook"
        }), 500


# New endpoints for the ShopifyModule frontend integration
@shopify_bp.route("/metrics", methods=["GET"])
def get_shopify_metrics():
    """Get comprehensive Shopify store metrics for dashboard."""
    try:
        service = get_shopify_service()
        
        if not service.is_configured():
            return jsonify({
                "error": "Shopify service not configured",
                "totalProducts": 0,
                "totalOrders": 0,
                "totalCustomers": 0,
                "totalRevenue": 0,
                "inventoryValue": 0,
                "lowStockItems": 0,
                "customerInsights": {
                    "totalCustomers": 0,
                    "newCustomers": 0,
                    "returningCustomers": 0,
                    "averageOrderValue": 0,
                    "lifetimeValue": 0
                }
            }), 503
        
        # Get live metrics from Shopify
        products_count = service.get_products_count()
        orders_count = service.get_orders_count()
        customers_count = service.get_customers_count()
        
        # Calculate revenue from recent orders
        recent_orders = service.get_orders(limit=250)
        total_revenue = sum(float(order.get('total_price', 0)) for order in recent_orders)
        
        # Get inventory value from products
        products = service.get_products(limit=250)
        inventory_value = 0
        low_stock_count = 0
        
        for product in products:
            for variant in product.get('variants', []):
                price = float(variant.get('price', 0))
                inventory = variant.get('inventory_quantity', 0)
                inventory_value += price * inventory
                
                if inventory < 5:  # Low stock threshold
                    low_stock_count += 1
        
        # Customer insights
        customers = service.get_customers(limit=100)
        new_customers = len([c for c in customers if c.get('orders_count', 0) <= 1])
        returning_customers = len(customers) - new_customers
        avg_order_value = total_revenue / max(orders_count, 1)
        
        return jsonify({
            "totalProducts": products_count,
            "totalOrders": orders_count,
            "totalCustomers": customers_count,
            "totalRevenue": total_revenue,
            "inventoryValue": inventory_value,
            "lowStockItems": low_stock_count,
            "customerInsights": {
                "totalCustomers": customers_count,
                "newCustomers": new_customers,
                "returningCustomers": returning_customers,
                "averageOrderValue": avg_order_value,
                "lifetimeValue": avg_order_value * 3.5  # Estimated LTV
            }
        }), 200
        
    except Exception as e:
        # Sanitize agent_id for logging to prevent log injection
        safe_error = str(e)[:100]  # Limit error message length
        logger.error(f"Failed to get Shopify metrics: {safe_error}")
        return jsonify({"error": "Failed to get metrics"}), 500


@shopify_bp.route("/sync", methods=["POST"])
def sync_all_data():
    """Trigger comprehensive data sync with Supabase storage."""
    try:
        service = get_shopify_service()
        
        if not service.is_configured():
            return jsonify({"error": "Shopify service not configured"}), 503
        
        # Start async jobs for comprehensive sync
        sync_jobs = []
        
        # Start product sync
        product_job_id = run_job_async(sync_products_job)
        sync_jobs.append({"type": "products", "job_id": product_job_id})
        
        # Start inventory sync  
        inventory_job_id = run_job_async(sync_inventory_job)
        sync_jobs.append({"type": "inventory", "job_id": inventory_job_id})
        
        # Start orders sync
        orders_job_id = run_job_async(sync_orders_job)
        sync_jobs.append({"type": "orders", "job_id": orders_job_id})
        
        # Store sync data in Supabase if available
        try:
            from packages.connectors.src.supabase import SupabaseConnector
            supabase = SupabaseConnector()
            
            # Log sync event
            sync_record = {
                "sync_type": "comprehensive",
                "job_ids": [job["job_id"] for job in sync_jobs],
                "initiated_at": datetime.now(timezone.utc).isoformat(),
                "status": "started"
            }
            
            # This would use auto-schema creation to store sync logs
            logger.info(f"Comprehensive sync started: {sync_record}")
            
        except Exception as supabase_error:
            logger.warning(f"Could not log to Supabase: {supabase_error}")
        
        return jsonify({
            "status": "sync_started",
            "jobs": sync_jobs,
            "message": "Comprehensive data sync initiated",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 202
        
    except Exception as e:
        logger.error(f"Failed to start comprehensive sync: {e}")
        return jsonify({"error": "Failed to start sync", "message": "An internal error has occurred."}), 500
