"""
Validation utilities for Flask routes.
"""

import logging
from functools import wraps
from typing import Any, Dict, Optional

from flask import jsonify, request

logger = logging.getLogger(__name__)


def validate_json(required_fields: Optional[list] = None):
    """Decorator to validate JSON request body.
    
    Args:
        required_fields: List of required field names
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if request has JSON
            if not request.is_json:
                return jsonify({
                    'error': 'Content-Type must be application/json'
                }), 400

            data = request.get_json()

            # Validate required fields
            if required_fields:
                missing_fields = []
                for field in required_fields:
                    if field not in data:
                        missing_fields.append(field)

                if missing_fields:
                    return jsonify({
                        'error': 'Missing required fields',
                        'missing_fields': missing_fields
                    }), 400

            return f(*args, **kwargs)
        return decorated_function
    return decorator


def validate_email(email: str) -> bool:
    """Validate email format.
    
    Args:
        email: Email address to validate
        
    Returns:
        True if valid, False otherwise
    """
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_uuid(uuid_string: str) -> bool:
    """Validate UUID format.
    
    Args:
        uuid_string: UUID string to validate
        
    Returns:
        True if valid, False otherwise
    """
    import re
    pattern = r'^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$'
    return bool(re.match(pattern, uuid_string.lower()))


def sanitize_string(value: str, max_length: int = 1000) -> str:
    """Sanitize string input.
    
    Args:
        value: String to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized string
    """
    if not isinstance(value, str):
        return ""

    # Remove null bytes and control characters
    sanitized = ''.join(char for char in value if ord(char) >= 32 or char in '\n\r\t')

    # Truncate to max length
    return sanitized[:max_length]


def validate_pagination(page: int, per_page: int, max_per_page: int = 100) -> Dict[str, Any]:
    """Validate pagination parameters.
    
    Args:
        page: Page number (1-indexed)
        per_page: Items per page
        max_per_page: Maximum items per page
        
    Returns:
        Dict with validated page and per_page, or error
    """
    errors = []

    if page < 1:
        errors.append("Page must be >= 1")

    if per_page < 1:
        errors.append("Per page must be >= 1")

    if per_page > max_per_page:
        errors.append(f"Per page must be <= {max_per_page}")

    if errors:
        return {'error': True, 'messages': errors}

    return {
        'error': False,
        'page': page,
        'per_page': min(per_page, max_per_page)
    }
