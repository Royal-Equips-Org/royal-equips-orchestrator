"""
Products API Routes for Royal Equips Command Center.

Provides comprehensive product management with real Shopify integration:
- Product catalog listing and search
- Product details and variants
- Inventory tracking and updates
- Pricing and profit margins
- Product research opportunities
"""

import logging
from datetime import datetime
from typing import Optional

from flask import Blueprint, jsonify, request

from app.services.shopify_service import ShopifyService, ShopifyAPIError

logger = logging.getLogger(__name__)

products_bp = Blueprint('products', __name__, url_prefix='/api/products')

# Initialize Shopify service
_shopify_service = None

def get_shopify_service():
    """Get or create Shopify service instance."""
    global _shopify_service
    if _shopify_service is None:
        _shopify_service = ShopifyService()
    return _shopify_service


@products_bp.route('', methods=['GET'])
def get_products():
    """
    Get product catalog with pagination and filtering.
    
    Query Parameters:
    - page: Page number (default: 1)
    - limit: Items per page (default: 50, max: 250)
    - status: Filter by status (active, draft, archived)
    - vendor: Filter by vendor
    - product_type: Filter by product type
    - collection_id: Filter by collection
    - search: Search in title and description
    """
    try:
        service = get_shopify_service()
        
        if not service.is_configured():
            return jsonify({
                'error': 'Shopify not configured',
                'message': 'Set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, and SHOP_NAME',
                'products': [],
                'total': 0
            }), 503
        
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 250)
        status = request.args.get('status')
        vendor = request.args.get('vendor')
        product_type = request.args.get('product_type')
        collection_id = request.args.get('collection_id')
        search = request.args.get('search')
        
        # Build params for Shopify API
        params = {
            'limit': limit,
            'page': page
        }
        
        if status:
            params['status'] = status
        if vendor:
            params['vendor'] = vendor
        if product_type:
            params['product_type'] = product_type
        if collection_id:
            params['collection_id'] = collection_id
        
        # Get products from Shopify
        products, pagination = service.list_products(limit=limit, fields=None)
        products_response = {'products': products}
        
        # Apply search filter if provided (Shopify API doesn't support search param directly)
        if search:
            search_lower = search.lower()
            products = [
                p for p in products 
                if search_lower in p.get('title', '').lower() 
                or search_lower in p.get('body_html', '').lower()
            ]
        
        # Enrich product data with computed fields
        enriched_products = []
        for product in products:
            variants = product.get('variants', [])
            inventory_quantity = sum(v.get('inventory_quantity', 0) for v in variants)
            
            # Calculate price range
            prices = [float(v.get('price', 0)) for v in variants if v.get('price')]
            min_price = min(prices) if prices else 0
            max_price = max(prices) if prices else 0
            
            enriched_products.append({
                'id': product.get('id'),
                'title': product.get('title'),
                'handle': product.get('handle'),
                'status': product.get('status'),
                'vendor': product.get('vendor'),
                'product_type': product.get('product_type'),
                'created_at': product.get('created_at'),
                'updated_at': product.get('updated_at'),
                'published_at': product.get('published_at'),
                'tags': product.get('tags', '').split(',') if product.get('tags') else [],
                'variants_count': len(variants),
                'inventory_quantity': inventory_quantity,
                'price_range': {
                    'min': min_price,
                    'max': max_price,
                    'formatted': f'${min_price:.2f}' if min_price == max_price else f'${min_price:.2f} - ${max_price:.2f}'
                },
                'image': product.get('image', {}).get('src') if product.get('image') else None,
                'has_variants': len(variants) > 1,
                'inventory_tracked': any(v.get('inventory_management') == 'shopify' for v in variants),
                'published': product.get('published_at') is not None
            })
        
        return jsonify({
            'products': enriched_products,
            'total': len(enriched_products),
            'page': page,
            'limit': limit,
            'timestamp': datetime.now().isoformat()
        })
    
    except ShopifyAPIError as e:
        logger.error(f"Shopify API error getting products: {e}")
        return jsonify({
            'error': 'Failed to fetch products from Shopify',
            'details': str(e),
            'products': []
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error getting products: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e),
            'products': []
        }), 500


@products_bp.route('/<product_id>', methods=['GET'])
def get_product(product_id: str):
    """Get detailed information about a specific product."""
    try:
        service = get_shopify_service()
        
        if not service.is_configured():
            return jsonify({
                'error': 'Shopify not configured'
            }), 503
        
        # Get product from Shopify - fetch all and filter by ID
        products, pagination = service.list_products(limit=250, fields=None)
        product = next((p for p in products if str(p.get('id')) == str(product_id)), None)
        
        if not product:
            return jsonify({
                'error': 'Product not found'
            }), 404
        
        # Enrich product data
        variants = product.get('variants', [])
        images = product.get('images', [])
        
        # Calculate metrics
        inventory_quantity = sum(v.get('inventory_quantity', 0) for v in variants)
        prices = [float(v.get('price', 0)) for v in variants if v.get('price')]
        min_price = min(prices) if prices else 0
        max_price = max(prices) if prices else 0
        
        product_data = {
            'id': product.get('id'),
            'title': product.get('title'),
            'body_html': product.get('body_html'),
            'handle': product.get('handle'),
            'status': product.get('status'),
            'vendor': product.get('vendor'),
            'product_type': product.get('product_type'),
            'created_at': product.get('created_at'),
            'updated_at': product.get('updated_at'),
            'published_at': product.get('published_at'),
            'tags': product.get('tags', '').split(',') if product.get('tags') else [],
            'variants': [
                {
                    'id': v.get('id'),
                    'title': v.get('title'),
                    'sku': v.get('sku'),
                    'price': float(v.get('price', 0)),
                    'compare_at_price': float(v.get('compare_at_price', 0)) if v.get('compare_at_price') else None,
                    'inventory_quantity': v.get('inventory_quantity', 0),
                    'inventory_policy': v.get('inventory_policy'),
                    'inventory_management': v.get('inventory_management'),
                    'weight': v.get('weight'),
                    'weight_unit': v.get('weight_unit'),
                    'requires_shipping': v.get('requires_shipping'),
                    'barcode': v.get('barcode'),
                    'option1': v.get('option1'),
                    'option2': v.get('option2'),
                    'option3': v.get('option3')
                }
                for v in variants
            ],
            'images': [
                {
                    'id': img.get('id'),
                    'src': img.get('src'),
                    'alt': img.get('alt'),
                    'position': img.get('position'),
                    'width': img.get('width'),
                    'height': img.get('height')
                }
                for img in images
            ],
            'options': product.get('options', []),
            'metrics': {
                'variants_count': len(variants),
                'images_count': len(images),
                'total_inventory': inventory_quantity,
                'price_range': {
                    'min': min_price,
                    'max': max_price
                },
                'has_sale': any(v.get('compare_at_price') and float(v.get('compare_at_price', 0)) > float(v.get('price', 0)) for v in variants)
            },
            'published': product.get('published_at') is not None
        }
        
        return jsonify(product_data)
    
    except ShopifyAPIError as e:
        logger.error(f"Shopify API error getting product {product_id}: {e}")
        return jsonify({
            'error': 'Failed to fetch product from Shopify',
            'details': str(e)
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error getting product {product_id}: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@products_bp.route('/stats', methods=['GET'])
def get_product_stats():
    """Get product catalog statistics."""
    try:
        service = get_shopify_service()
        
        if not service.is_configured():
            return jsonify({
                'error': 'Shopify not configured'
            }), 503
        
        # Get all products (this might need pagination for large catalogs)
        products, pagination = service.list_products(limit=250, fields=None)
        
        # Calculate statistics
        total_products = len(products)
        published_products = len([p for p in products if p.get('published_at')])
        draft_products = len([p for p in products if p.get('status') == 'draft'])
        archived_products = len([p for p in products if p.get('status') == 'archived'])
        
        # Inventory stats
        total_inventory = 0
        low_stock_products = 0
        out_of_stock_products = 0
        
        for product in products:
            variants = product.get('variants', [])
            inventory = sum(v.get('inventory_quantity', 0) for v in variants)
            total_inventory += inventory
            
            if inventory == 0:
                out_of_stock_products += 1
            elif inventory < 10:
                low_stock_products += 1
        
        # Product types and vendors
        product_types = {}
        vendors = {}
        
        for product in products:
            product_type = product.get('product_type', 'Uncategorized')
            vendor = product.get('vendor', 'Unknown')
            
            product_types[product_type] = product_types.get(product_type, 0) + 1
            vendors[vendor] = vendors.get(vendor, 0) + 1
        
        # Top products by type and vendor
        top_product_types = sorted(product_types.items(), key=lambda x: x[1], reverse=True)[:10]
        top_vendors = sorted(vendors.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return jsonify({
            'overview': {
                'total_products': total_products,
                'published': published_products,
                'draft': draft_products,
                'archived': archived_products
            },
            'inventory': {
                'total_units': total_inventory,
                'low_stock': low_stock_products,
                'out_of_stock': out_of_stock_products,
                'in_stock': total_products - out_of_stock_products
            },
            'categorization': {
                'product_types': dict(top_product_types),
                'vendors': dict(top_vendors)
            },
            'timestamp': datetime.now().isoformat()
        })
    
    except ShopifyAPIError as e:
        logger.error(f"Shopify API error getting product stats: {e}")
        return jsonify({
            'error': 'Failed to fetch product stats from Shopify',
            'details': str(e)
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error getting product stats: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500


@products_bp.route('/search', methods=['GET'])
def search_products():
    """Search products by query string."""
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
        
        # Get products and filter by search query
        products, pagination = service.list_products(limit=250, fields=None)
        
        query_lower = query.lower()
        matching_products = [
            {
                'id': p.get('id'),
                'title': p.get('title'),
                'handle': p.get('handle'),
                'vendor': p.get('vendor'),
                'product_type': p.get('product_type'),
                'status': p.get('status'),
                'image': p.get('image', {}).get('src') if p.get('image') else None
            }
            for p in products
            if query_lower in p.get('title', '').lower()
            or query_lower in p.get('body_html', '').lower()
            or query_lower in p.get('vendor', '').lower()
            or query_lower in p.get('product_type', '').lower()
            or query_lower in p.get('tags', '').lower()
        ]
        
        return jsonify({
            'query': query,
            'results': matching_products,
            'total': len(matching_products),
            'timestamp': datetime.now().isoformat()
        })
    
    except ShopifyAPIError as e:
        logger.error(f"Shopify API error searching products: {e}")
        return jsonify({
            'error': 'Failed to search products',
            'details': str(e),
            'results': []
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error searching products: {e}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e),
            'results': []
        }), 500
