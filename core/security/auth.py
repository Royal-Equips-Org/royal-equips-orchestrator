"""Authentication and authorization decorators for Flask routes.

This module provides decorators for protecting API endpoints with
authentication and authorization checks.
"""

import asyncio
import os
from functools import wraps
from typing import Any, Callable

from flask import jsonify, request

# Import secret resolver for secure credential management from Cloudflare/deployment variables
try:
    from core.secrets.secret_provider import UnifiedSecretResolver
    _secret_resolver = UnifiedSecretResolver()
except ImportError:
    _secret_resolver = None


def require_auth(f: Callable[..., Any]) -> Callable[..., Any]:
    """Decorator to require authentication for a route.

    In development/testing, this allows all requests.
    In production, this should validate JWT tokens or API keys.
    Handles both sync and async route functions.
    """
    # If the function is async, return an async wrapper
    if asyncio.iscoroutinefunction(f):
        @wraps(f)
        async def async_decorated_function(*args: Any, **kwargs: Any) -> Any:
            # TODO: Implement actual authentication in production
            return await f(*args, **kwargs)
        return async_decorated_function
    else:
        @wraps(f)
        def sync_decorated_function(*args: Any, **kwargs: Any) -> Any:
            # TODO: Implement actual authentication in production
            return f(*args, **kwargs)
        return sync_decorated_function


def require_admin(f: Callable[..., Any]) -> Callable[..., Any]:
    """Decorator to require admin privileges for a route.

    In development/testing, this allows all requests.
    In production, this should validate admin role from JWT or database.
    Handles both sync and async route functions.
    """
    # If the function is async, return an async wrapper
    if asyncio.iscoroutinefunction(f):
        @wraps(f)
        async def async_decorated_function(*args: Any, **kwargs: Any) -> Any:
            # TODO: Implement actual admin authorization in production
            return await f(*args, **kwargs)
        return async_decorated_function
    else:
        @wraps(f)
        def sync_decorated_function(*args: Any, **kwargs: Any) -> Any:
            # TODO: Implement actual admin authorization in production
            return f(*args, **kwargs)
        return sync_decorated_function


def is_royalgpt_authorized(req: Any = None) -> bool:
    """
    FASE 2: Check if request is authorized for RoyalGPT orchestration.

    Validates the Authorization header against the configured API key.
    Uses UnifiedSecretResolver to fetch API key from Cloudflare/deployment variables.

    Args:
        req: Flask request object (defaults to current request)

    Returns:
        bool: True if authorized, False otherwise
    """
    if req is None:
        req = request

    # Try to get API key from secret resolver (Cloudflare/deployment variables)
    api_key = None
    if _secret_resolver:
        try:
            import asyncio
            try:
                secret_result = asyncio.run(
                    _secret_resolver.get_secret_with_fallback("API_KEY_ROYALGPT", None)
                )
                api_key = secret_result
            except RuntimeError:
                # If there's already a running event loop (e.g., in async context), fallback to environment variable
                pass
        except Exception:
            # Fallback to environment variable
            pass

    # Fallback to direct environment variable if secret resolver fails
    if not api_key:
        api_key = os.getenv("API_KEY_ROYALGPT", "")

    # If no API key is configured, allow all requests (dev mode)
    if not api_key:
        return True

    # Check Authorization header
    auth_header = req.headers.get("Authorization", "")

    # Support both "Bearer <token>" and plain token
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    else:
        token = auth_header

    return token == api_key


def require_royalgpt_auth(f: Callable[..., Any]) -> Callable[..., Any]:
    """
    FASE 2: Decorator to require RoyalGPT authentication for protected endpoints.

    Validates API key from Authorization header.
    Handles both sync and async route functions.
    """
    if asyncio.iscoroutinefunction(f):
        @wraps(f)
        async def async_decorated_function(*args: Any, **kwargs: Any) -> Any:
            if not is_royalgpt_authorized():
                return jsonify({
                    "error": "Unauthorized",
                    "message": "Valid RoyalGPT API key required"
                }), 401
            return await f(*args, **kwargs)
        return async_decorated_function
    else:
        @wraps(f)
        def sync_decorated_function(*args: Any, **kwargs: Any) -> Any:
            if not is_royalgpt_authorized():
                return jsonify({
                    "error": "Unauthorized",
                    "message": "Valid RoyalGPT API key required"
                }), 401
            return f(*args, **kwargs)
        return sync_decorated_function
