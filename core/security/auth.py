"""Authentication and authorization decorators for Flask routes.

This module provides decorators for protecting API endpoints with
authentication and authorization checks.
"""

import asyncio
import os
from functools import wraps
from typing import Any, Callable

from flask import jsonify, request


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
    
    Args:
        req: Flask request object (defaults to current request)
    
    Returns:
        bool: True if authorized, False otherwise
    """
    if req is None:
        req = request

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
