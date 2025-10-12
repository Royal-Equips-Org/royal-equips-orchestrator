"""
HMAC utilities for Shopify webhook verification.

Provides secure validation of Shopify webhooks using HMAC-SHA256.
"""

import base64
import hashlib
import hmac
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


def verify_shopify_webhook(payload: bytes, signature: str, secret: Optional[str] = None) -> bool:
    """
    Verify Shopify webhook signature using HMAC-SHA256.

    Args:
        payload: Raw webhook payload bytes
        signature: X-Shopify-Hmac-Sha256 header value
        secret: Webhook secret (defaults to SHOPIFY_WEBHOOK_SECRET env var)

    Returns:
        True if signature is valid, False otherwise
    """
    if secret is None:
        secret = os.getenv('SHOPIFY_WEBHOOK_SECRET')

    if not secret:
        logger.error("SHOPIFY_WEBHOOK_SECRET not configured")
        return False

    try:
        # Shopify sends the signature as base64-encoded HMAC-SHA256
        computed_hmac = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).digest()

        # Base64 encode the computed HMAC
        computed_signature = base64.b64encode(computed_hmac).decode('utf-8')

        # Compare signatures using constant-time comparison
        return hmac.compare_digest(computed_signature, signature)

    except Exception as e:
        logger.error(f"HMAC verification failed: {e}")
        return False


def verify_shopify_webhook_legacy(payload: bytes, signature: str, secret: Optional[str] = None) -> bool:
    """
    Verify legacy Shopify webhook signature (for older webhooks).

    Some older Shopify webhooks may use a different format.

    Args:
        payload: Raw webhook payload bytes
        signature: Webhook signature header value
        secret: Webhook secret

    Returns:
        True if signature is valid, False otherwise
    """
    if secret is None:
        secret = os.getenv('SHOPIFY_WEBHOOK_SECRET')

    if not secret:
        logger.error("SHOPIFY_WEBHOOK_SECRET not configured")
        return False

    try:
        # Compute HMAC-SHA256 hash
        computed_hmac = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()

        # Compare with provided signature
        return hmac.compare_digest(computed_hmac, signature)

    except Exception as e:
        logger.error(f"Legacy HMAC verification failed: {e}")
        return False


def get_shopify_webhook_topics() -> list:
    """
    Get list of supported Shopify webhook topics.

    Returns:
        List of webhook topic strings
    """
    return [
        'orders/create',
        'orders/updated',
        'orders/paid',
        'orders/cancelled',
        'orders/fulfilled',
        'orders/partially_fulfilled',
        'order_transactions/create',
        'products/create',
        'products/update',
        'products/delete',
        'collections/create',
        'collections/update',
        'collections/delete',
        'inventory_levels/update',
        'inventory_items/create',
        'inventory_items/update',
        'inventory_items/delete',
        'customers/create',
        'customers/update',
        'customers/delete',
        'app/uninstalled'
    ]
