"""REST API fallback client for operations not available in GraphQL."""

import asyncio
import logging
import os
import warnings
from typing import Any, Dict, List, Optional

import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ShopifyRESTConfig(BaseModel):
    """Configuration for Shopify REST client."""

    shop_name: str = Field(..., description="Shopify shop name")
    access_token: str = Field(..., description="Shopify access token")
    api_version: str = Field(default="2024-10", description="REST API version")
    timeout: int = Field(default=30, description="Request timeout in seconds")

    @property
    def rest_endpoint(self) -> str:
        """Get REST API endpoint URL."""
        return f"https://{self.shop_name}.myshopify.com/admin/api/{self.api_version}"


class ShopifyRESTClient:
    """
    REST API fallback client for Shopify operations not available in GraphQL.
    
    Note: This is a DEPRECATED fallback. All new functionality should use GraphQL.
    REST endpoints are only used when GraphQL doesn't provide equivalent functionality.
    """

    def __init__(self, config: Optional[ShopifyRESTConfig] = None):
        """Initialize the REST client with deprecation warning."""
        warnings.warn(
            "ShopifyRESTClient is deprecated. Use GraphQL client for all new operations. "
            "This client should only be used for legacy operations not yet available in GraphQL.",
            DeprecationWarning,
            stacklevel=2
        )

        if config is None:
            config = ShopifyRESTConfig(
                shop_name=os.environ["SHOPIFY_SHOP_NAME"],
                access_token=os.environ["SHOPIFY_ACCESS_TOKEN"]
            )

        self.config = config
        self.client = httpx.AsyncClient(timeout=self.config.timeout)

        logger.warning(f"Shopify REST client initialized for shop: {self.config.shop_name} (DEPRECATED)")

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make REST API request with error handling."""

        url = f"{self.config.rest_endpoint}/{endpoint.lstrip('/')}"
        headers = {
            "X-Shopify-Access-Token": self.config.access_token,
            "Content-Type": "application/json"
        }

        logger.warning(f"Using deprecated REST API: {method} {endpoint}")

        try:
            response = await self.client.request(
                method=method,
                url=url,
                json=data,
                params=params,
                headers=headers
            )
            response.raise_for_status()
            return response.json()

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                # Handle rate limiting
                retry_after = int(e.response.headers.get("Retry-After", 1))
                logger.warning(f"REST API rate limited, waiting {retry_after}s")
                await asyncio.sleep(retry_after)
                # Retry once
                response = await self.client.request(
                    method=method,
                    url=url,
                    json=data,
                    params=params,
                    headers=headers
                )
                response.raise_for_status()
                return response.json()
            else:
                logger.error(f"REST API error: {e.response.status_code} - {e.response.text}")
                raise

    # Legacy webhook management (not available in GraphQL yet)
    async def create_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create webhook via REST API.
        
        @deprecated Use webhook management tools or Admin API when GraphQL equivalent is available.
        """
        warnings.warn(
            "create_webhook via REST is deprecated. Migrate to GraphQL when available.",
            DeprecationWarning
        )

        response = await self._make_request("POST", "/webhooks.json", {"webhook": webhook_data})
        return response.get("webhook", {})

    async def list_webhooks(self) -> List[Dict[str, Any]]:
        """
        List webhooks via REST API.
        
        @deprecated Use webhook management tools when GraphQL equivalent is available.
        """
        warnings.warn(
            "list_webhooks via REST is deprecated. Migrate to GraphQL when available.",
            DeprecationWarning
        )

        response = await self._make_request("GET", "/webhooks.json")
        return response.get("webhooks", [])

    async def delete_webhook(self, webhook_id: str) -> bool:
        """
        Delete webhook via REST API.
        
        @deprecated Use webhook management tools when GraphQL equivalent is available.
        """
        warnings.warn(
            "delete_webhook via REST is deprecated. Migrate to GraphQL when available.",
            DeprecationWarning
        )

        try:
            await self._make_request("DELETE", f"/webhooks/{webhook_id}.json")
            return True
        except Exception as e:
            logger.error(f"Failed to delete webhook {webhook_id}: {e}")
            return False

    # Legacy script tag management (GraphQL alternative: Online Store 2.0)
    async def create_script_tag(self, script_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create script tag via REST API.
        
        @deprecated Use Online Store 2.0 or App Blocks instead.
        """
        warnings.warn(
            "Script tags are deprecated. Use Online Store 2.0 App Blocks instead.",
            DeprecationWarning
        )

        response = await self._make_request("POST", "/script_tags.json", {"script_tag": script_data})
        return response.get("script_tag", {})

    # Legacy discount management (partial GraphQL support)
    async def create_discount_code(self, price_rule_id: str, discount_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create discount code via REST API.
        
        @deprecated Use GraphQL discount mutations when fully available.
        """
        warnings.warn(
            "REST discount codes are deprecated. Use GraphQL discount mutations.",
            DeprecationWarning
        )

        response = await self._make_request(
            "POST",
            f"/price_rules/{price_rule_id}/discount_codes.json",
            {"discount_code": discount_data}
        )
        return response.get("discount_code", {})

    # Legacy transaction endpoints (limited GraphQL support)
    async def create_transaction(self, order_id: str, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create transaction via REST API.
        
        @deprecated Use GraphQL payment mutations when available.
        """
        warnings.warn(
            "REST transactions are deprecated. Use GraphQL payment mutations when available.",
            DeprecationWarning
        )

        response = await self._make_request(
            "POST",
            f"/orders/{order_id}/transactions.json",
            {"transaction": transaction_data}
        )
        return response.get("transaction", {})

    # Legacy fulfillment services (partial GraphQL support)
    async def create_fulfillment_service(self, service_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create fulfillment service via REST API.
        
        @deprecated Use GraphQL fulfillment mutations when fully available.
        """
        warnings.warn(
            "REST fulfillment services have limited GraphQL support. Migrate when possible.",
            DeprecationWarning
        )

        response = await self._make_request(
            "POST",
            "/fulfillment_services.json",
            {"fulfillment_service": service_data}
        )
        return response.get("fulfillment_service", {})

    async def close(self) -> None:
        """Close the HTTP client."""
        await self.client.aclose()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
