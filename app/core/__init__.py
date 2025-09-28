"""
Core utilities for Royal Equips Orchestrator.

This package contains foundational components including:
- Secret management and resolution
- Security and RBAC utilities
- Logging and metrics
"""

from .secret_provider import UnifiedSecretResolver, SecretNotFoundError

__all__ = ['UnifiedSecretResolver', 'SecretNotFoundError']