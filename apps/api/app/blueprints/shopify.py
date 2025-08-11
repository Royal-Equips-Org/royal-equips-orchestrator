"""
Shopify API blueprint for Royal Equips Orchestrator.

Provides REST endpoints for Shopify operations:
- Shop status and authentication
- Product, collection, inventory, order synchronization  
- Bulk operations
- Webhook endpoints with HMAC verification
"""

import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from werkzeug.exceptions import BadRequest

from app.services.shopify_service import ShopifyService, ShopifyAPIError, ShopifyAuthError, ShopifyRateLimitError
from app.jobs.shopify_jobs import run_job_async, sync_products_job, sync_inventory_job, sync_orders_job, bulk_operation_job, get_active_jobs, get_job_status
from app.utils.hmac import verify_shopify_webhook, get_shopify_webhook_topics

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
                "timestamp": datetime.now().isoformat()
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
                "timestamp": datetime.now().isoformat()
            }), 200
            
        except ShopifyAuthError as e:
            return jsonify({
                "configured": True,
                "authenticated": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }), 401
            
        except ShopifyAPIError as e:
            return jsonify({
                "configured": True,
                "error": f"Shopify API error: {e}",
                "timestamp": datetime.now().isoformat()
            }), 503
            
    except Exception as e:
        logger.error(f"Error getting Shopify status: {e}")
        return jsonify({
            "configured": False,
            "error": "Internal server error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
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
                    'timestamp': datetime.now().isoformat()
                }, namespace='/ws/shopify')
        except:
            pass
        
        return jsonify({
            "job_id": job_id,
            "status": "started",
            "message": f"Product synchronization started (limit: {limit})",
            "timestamp": datetime.now().isoformat()
        }), 202
        
    except Exception as e:
        logger.error(f"Error starting product sync: {e}")
        return jsonify({
            "error": "Failed to start product sync",
            "message": str(e)
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
                    'timestamp': datetime.now().isoformat()
                }, namespace='/ws/shopify')
        except:
            pass
        
        return jsonify({
            "job_id": job_id,
            "status": "started",
            "message": "Inventory synchronization started",
            "timestamp": datetime.now().isoformat()
        }), 202
        
    except Exception as e:
        logger.error(f"Error starting inventory sync: {e}")
        return jsonify({
            "error": "Failed to start inventory sync",
            "message": str(e)
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
                    'timestamp': datetime.now().isoformat()
                }, namespace='/ws/shopify')
        except:
            pass
        
        return jsonify({
            "job_id": job_id,
            "status": "started", 
            "message": f"Order synchronization started (limit: {limit}, status: {status})",
            "timestamp": datetime.now().isoformat()
        }), 202
        
    except Exception as e:
        logger.error(f"Error starting order sync: {e}")
        return jsonify({
            "error": "Failed to start order sync",
            "message": str(e)
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
                    'timestamp': datetime.now().isoformat()
                }, namespace='/ws/shopify')
        except:
            pass
        
        return jsonify({
            "job_id": job_id,
            "status": "started",
            "message": f"Bulk operation '{operation}' started",
            "timestamp": datetime.now().isoformat()
        }), 202
        
    except Exception as e:
        logger.error(f"Error starting bulk operation: {e}")
        return jsonify({
            "error": "Failed to start bulk operation",
            "message": str(e)
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
            "timestamp": datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting jobs: {e}")
        return jsonify({
            "error": "Failed to get jobs",
            "message": str(e)
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
        logger.error(f"Error getting job {job_id}: {e}")
        return jsonify({
            "error": "Failed to get job status",
            "message": str(e)
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
            logger.warning(f"Invalid HMAC signature for webhook {topic} from {shop_domain}")
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
        webhook_event = {
            'topic': topic,
            'shop_domain': shop_domain,
            'data': webhook_data,
            'headers': dict(request.headers),
            'timestamp': datetime.now().isoformat(),
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
                    'timestamp': datetime.now().isoformat()
                }, namespace='/ws/shopify')
        except:
            pass
        
        logger.info(f"Processed webhook {topic} from {shop_domain}")
        
        return jsonify({
            "status": "received",
            "topic": topic,
            "shop_domain": shop_domain,
            "verified": True,
            "timestamp": datetime.now().isoformat()
        }), 202
        
    except Exception as e:
        logger.error(f"Error processing webhook {topic}: {e}")
        return jsonify({
            "error": "Failed to process webhook",
            "message": str(e)
        }), 500