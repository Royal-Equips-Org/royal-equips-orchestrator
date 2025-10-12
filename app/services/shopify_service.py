"""
Shopify Service for Royal Equips Orchestrator.

Handles Shopify Admin API operations:
- Authentication and API calls
- Products, collections, inventory, orders
- Rate limit monitoring and exponential backoff
- Error handling with custom exceptions
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import requests

try:
    from tenacity import (
        retry,
        retry_if_exception_type,
        stop_after_attempt,
        wait_exponential,
    )
    HAS_TENACITY = True
except ImportError:
    HAS_TENACITY = False
    # Create dummy decorators
    def retry(*args, **kwargs):
        def decorator(func):
            return func
        return decorator
    stop_after_attempt = wait_exponential = retry_if_exception_type = lambda *args, **kwargs: None

logger = logging.getLogger(__name__)


class ShopifyRateLimitError(Exception):
    """Raised when Shopify rate limit is exceeded."""
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


class ShopifyAuthError(Exception):
    """Raised when Shopify authentication fails."""
    pass


class ShopifyAPIError(Exception):
    """Raised for general Shopify API errors."""
    def __init__(self, message: str, status_code: Optional[int] = None, response_data: Optional[dict] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_data = response_data


class ShopifyService:
    """
    Service for interacting with Shopify Admin API.

    Provides methods for products, collections, inventory, orders
    with built-in rate limiting and error handling.
    """
    _instance = None
    _initialized = False
    _logged_warning = False  # Track if we've already logged the warning

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ShopifyService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self.api_key = os.getenv('SHOPIFY_API_KEY')
        self.api_secret = os.getenv('SHOPIFY_API_SECRET')
        self.shop_name = os.getenv('SHOP_NAME')

        if not all([self.api_key, self.api_secret, self.shop_name]):
            # Only log once per application startup
            if not ShopifyService._logged_warning:
                logger.error("Shopify credentials not configured - SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOP_NAME required. No mock mode in production.")
                ShopifyService._logged_warning = True
            self._configured = False
        else:
            self._configured = True

        self.base_url = f"https://{self.shop_name}.myshopify.com/admin/api/2024-01" if self.shop_name else ""
        self.session = requests.Session()
        self.session.auth = (self.api_key, self.api_secret or '')

        # Rate limit tracking
        self._rate_limit_used = 0
        self._rate_limit_bucket = 40  # Default Shopify bucket size
        self._last_rate_limit_check = datetime.now()
        
        self._initialized = True

    def is_configured(self) -> bool:
        """Check if service is properly configured."""
        return self._configured

    def get_shop_info(self) -> Dict[str, Any]:
        """Get shop information and verify authentication."""
        if not self.is_configured():
            raise ShopifyAuthError("Shopify credentials not configured")

        try:
            response = self._make_request('GET', '/shop.json')
            shop_data = response.get('shop', {})

            return {
                'shop_name': shop_data.get('name'),
                'domain': shop_data.get('domain'),
                'plan_name': shop_data.get('plan_name'),
                'currency': shop_data.get('currency'),
                'timezone': shop_data.get('timezone'),
                'primary_location_id': shop_data.get('primary_location_id'),
                'created_at': shop_data.get('created_at')
            }

        except requests.exceptions.RequestException as e:
            raise ShopifyAuthError(f"Failed to authenticate with Shopify: {e}")

    def get_rate_limit_status(self) -> Dict[str, Any]:
        """Get current rate limit status."""
        return {
            'used': self._rate_limit_used,
            'bucket': self._rate_limit_bucket,
            'remaining': max(0, self._rate_limit_bucket - self._rate_limit_used),
            'usage_percent': (self._rate_limit_used / self._rate_limit_bucket * 100) if self._rate_limit_bucket > 0 else 0,
            'last_check': self._last_rate_limit_check.isoformat()
        }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(ShopifyRateLimitError)
    )
    def list_products(self, limit: int = 50, fields: Optional[str] = None) -> Tuple[List[Dict], Dict]:
        """
        List products from Shopify.

        Args:
            limit: Number of products to retrieve (max 250)
            fields: Comma-separated list of fields to include

        Returns:
            Tuple of (products_list, pagination_info)
        """
        params = {'limit': min(limit, 250)}
        if fields:
            params['fields'] = fields

        response = self._make_request('GET', '/products.json', params=params)

        return response.get('products', []), self._extract_pagination_info(response)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(ShopifyRateLimitError)
    )
    def list_collections(self, limit: int = 50) -> Tuple[List[Dict], Dict]:
        """List collections from Shopify."""
        params = {'limit': min(limit, 250)}
        response = self._make_request('GET', '/collections.json', params=params)

        return response.get('collections', []), self._extract_pagination_info(response)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(ShopifyRateLimitError)
    )
    def update_inventory(self, inventory_item_id: int, location_id: int, available: int) -> Dict[str, Any]:
        """
        Update inventory level for a specific item and location.

        Args:
            inventory_item_id: Shopify inventory item ID
            location_id: Shopify location ID
            available: New available quantity

        Returns:
            Updated inventory level data
        """
        data = {
            'location_id': location_id,
            'inventory_item_id': inventory_item_id,
            'available': available
        }

        response = self._make_request('POST', '/inventory_levels/set.json', json_data=data)
        return response.get('inventory_level', {})

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(ShopifyRateLimitError)
    )
    def list_orders(self, limit: int = 50, status: str = 'any', financial_status: Optional[str] = None) -> Tuple[List[Dict], Dict]:
        """
        List orders from Shopify.

        Args:
            limit: Number of orders to retrieve (max 250)
            status: Order status filter (any, open, closed, cancelled)
            financial_status: Financial status filter

        Returns:
            Tuple of (orders_list, pagination_info)
        """
        params = {
            'limit': min(limit, 250),
            'status': status
        }
        if financial_status:
            params['financial_status'] = financial_status

        response = self._make_request('GET', '/orders.json', params=params)

        return response.get('orders', []), self._extract_pagination_info(response)

    def _make_request(self, method: str, endpoint: str, params: Optional[Dict] = None, json_data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Make authenticated request to Shopify API with rate limit handling.

        Args:
            method: HTTP method
            endpoint: API endpoint (should start with /)
            params: URL parameters
            json_data: JSON payload for POST/PUT requests

        Returns:
            Response JSON data

        Raises:
            ShopifyRateLimitError: When rate limited
            ShopifyAuthError: When authentication fails
            ShopifyAPIError: For other API errors
        """
        if not self.is_configured():
            raise ShopifyAuthError("Shopify service not configured")

        url = f"{self.base_url}{endpoint}"

        try:
            logger.info(f"Shopify API request: {method} {url}")

            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=json_data,
                timeout=30
            )

            # Update rate limit tracking
            self._update_rate_limit_from_headers(response.headers)

            # Handle rate limiting
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 2))
                logger.warning(f"Shopify rate limit hit, retry after {retry_after}s")
                raise ShopifyRateLimitError(f"Rate limit exceeded, retry after {retry_after}s", retry_after)

            # Handle authentication errors
            if response.status_code == 401:
                raise ShopifyAuthError("Authentication failed - check API credentials")

            if response.status_code == 403:
                raise ShopifyAuthError("Access forbidden - check API permissions/scopes")

            # Handle other errors
            if not response.ok:
                error_data = None
                try:
                    error_data = response.json()
                except:
                    pass

                raise ShopifyAPIError(
                    f"Shopify API error: {response.status_code} {response.reason}",
                    status_code=response.status_code,
                    response_data=error_data
                )

            return response.json()

        except requests.exceptions.Timeout:
            raise ShopifyAPIError("Request timeout - Shopify API may be slow")
        except requests.exceptions.ConnectionError:
            raise ShopifyAPIError("Connection error - unable to reach Shopify API")
        except requests.exceptions.RequestException as e:
            raise ShopifyAPIError(f"Request failed: {e}")

    def _update_rate_limit_from_headers(self, headers: Dict[str, str]) -> None:
        """Update rate limit tracking from response headers."""
        try:
            # Shopify uses X-Shopify-Shop-Api-Call-Limit header
            limit_header = headers.get('X-Shopify-Shop-Api-Call-Limit', '0/40')

            if '/' in limit_header:
                used, bucket = limit_header.split('/')
                self._rate_limit_used = int(used)
                self._rate_limit_bucket = int(bucket)
                self._last_rate_limit_check = datetime.now()

                logger.debug(f"Rate limit updated: {used}/{bucket}")

        except (ValueError, AttributeError) as e:
            logger.warning(f"Failed to parse rate limit headers: {e}")

    def _extract_pagination_info(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Extract pagination information from API response."""
        # For now, return basic info - can be enhanced with Link headers parsing
        return {
            'has_next': False,  # Would need to parse Link headers
            'has_previous': False,
            'count': len(response.get('products', response.get('collections', response.get('orders', []))))
        }

# Global Shopify service instance
shopify_service = ShopifyService()
