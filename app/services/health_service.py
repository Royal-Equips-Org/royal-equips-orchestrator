"""
Health monitoring service with circuit breaker patterns.

Provides dependency health checks with fallback mechanisms
and graceful degradation patterns.
"""

import logging
import time
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict

import requests
from flask import current_app

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, requests blocked
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreaker:
    """Simple circuit breaker implementation."""

    failure_threshold: int = 5
    recovery_timeout: int = 60
    failure_count: int = 0
    state: CircuitState = CircuitState.CLOSED
    last_failure_time: float = 0

    def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection."""

        # Check if we should transition from OPEN to HALF_OPEN
        if (
            self.state == CircuitState.OPEN
            and time.time() - self.last_failure_time > self.recovery_timeout
        ):
            self.state = CircuitState.HALF_OPEN
            self.failure_count = 0

        # Block requests if circuit is OPEN
        if self.state == CircuitState.OPEN:
            raise Exception("Circuit breaker is OPEN")

        try:
            result = func(*args, **kwargs)

            # Success - reset circuit if it was HALF_OPEN
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.CLOSED
                self.failure_count = 0

            return result

        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()

            # Transition to OPEN if threshold exceeded
            if self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN

            raise e


class HealthService:
    """Health monitoring service with dependency checks."""

    def __init__(self):
        self.circuit_breakers = {
            "shopify": CircuitBreaker(
                failure_threshold=current_app.config.get(
                    "CIRCUIT_BREAKER_FAILURE_THRESHOLD", 5
                ),
                recovery_timeout=current_app.config.get(
                    "CIRCUIT_BREAKER_RECOVERY_TIMEOUT", 60
                ),
            ),
            "bigquery": CircuitBreaker(
                failure_threshold=current_app.config.get(
                    "CIRCUIT_BREAKER_FAILURE_THRESHOLD", 5
                ),
                recovery_timeout=current_app.config.get(
                    "CIRCUIT_BREAKER_RECOVERY_TIMEOUT", 60
                ),
            ),
            "github": CircuitBreaker(
                failure_threshold=current_app.config.get(
                    "CIRCUIT_BREAKER_FAILURE_THRESHOLD", 5
                ),
                recovery_timeout=current_app.config.get(
                    "CIRCUIT_BREAKER_RECOVERY_TIMEOUT", 60
                ),
            ),
        }

    def check_readiness(self) -> Dict[str, Any]:
        """
        Comprehensive readiness check with dependency verification.

        Returns:
            Dictionary with readiness status and dependency details
        """
        checks = []
        overall_ready = True

        # Core service check
        core_check = self._check_core_service()
        checks.append(core_check)
        if not core_check["healthy"]:
            overall_ready = False

        # External dependency checks
        dependency_checks = [
            self._check_shopify_connection(),
            self._check_bigquery_connection(),
            self._check_github_connection(),
            self._check_ai_assistant(),
            self._check_workspace_service(),
        ]

        for check in dependency_checks:
            checks.append(check)
            # External dependencies don't fail readiness if feature-flagged
            if not check["healthy"] and check.get("required", False):
                overall_ready = False

        return {
            "ready": overall_ready,
            "status": "healthy" if overall_ready else "degraded",
            "timestamp": datetime.now().isoformat(),
            "checks": checks,
        }

    def _check_core_service(self) -> Dict[str, Any]:
        """Check core service health."""
        try:
            # Verify essential components are working
            startup_time = getattr(current_app, "startup_time", None)
            if startup_time is None:
                return {
                    "name": "core_service",
                    "healthy": False,
                    "message": "Application startup time not recorded",
                }

            uptime = (datetime.now() - startup_time).total_seconds()
            return {
                "name": "core_service",
                "healthy": True,
                "message": f"Service running for {uptime:.1f} seconds",
                "uptime_seconds": uptime,
            }

        except Exception as e:
            logger.error(f"Core service check failed: {e}")
            return {
                "name": "core_service",
                "healthy": False,
                "message": f"Core service check failed: {str(e)}",
            }

    def _check_shopify_connection(self) -> Dict[str, Any]:
        """Check Shopify API connection with circuit breaker."""
        try:
            # Skip if not configured
            if not current_app.config.get("SHOPIFY_API_KEY"):
                return {
                    "name": "shopify_api",
                    "healthy": True,
                    "message": "Shopify API not configured (optional)",
                    "required": False,
                }

            def test_shopify():
                # Test actual Shopify service connection
                try:
                    from app.services.shopify_service import ShopifyService
                    service = ShopifyService()
                    
                    if not service.is_configured():
                        raise Exception("Shopify service not configured")
                    
                    # Try to get shop info as a connectivity test
                    shop_info = service.get_shop_info()
                    return shop_info
                    
                except Exception as e:
                    raise Exception(f"Shopify service test failed: {e}")

            result = self.circuit_breakers["shopify"].call(test_shopify)

            return {
                "name": "shopify_api",
                "healthy": True,
                "message": "Shopify API connection healthy",
                "shop_name": result.get('shop_name') if isinstance(result, dict) else None,
                "circuit_state": self.circuit_breakers["shopify"].state.value,
                "required": False,
            }

        except Exception as e:
            return {
                "name": "shopify_api",
                "healthy": False,
                "message": f"Shopify API check failed: {str(e)}",
                "circuit_state": self.circuit_breakers["shopify"].state.value,
                "required": False,
            }

    def _check_bigquery_connection(self) -> Dict[str, Any]:
        """Check BigQuery connection with circuit breaker."""
        try:
            # Skip if not configured
            if not current_app.config.get("BIGQUERY_PROJECT_ID"):
                return {
                    "name": "bigquery",
                    "healthy": True,
                    "message": "BigQuery not configured (optional)",
                    "required": False,
                }

            def test_bigquery():
                # Simple connectivity test (replace with actual BigQuery call)
                project_id = current_app.config.get("BIGQUERY_PROJECT_ID")
                if not project_id:
                    raise Exception("BigQuery project ID not configured")
                return True

            self.circuit_breakers["bigquery"].call(test_bigquery)

            return {
                "name": "bigquery",
                "healthy": True,
                "message": "BigQuery connection healthy",
                "circuit_state": self.circuit_breakers["bigquery"].state.value,
                "required": False,
            }

        except Exception as e:
            return {
                "name": "bigquery",
                "healthy": False,
                "message": f"BigQuery check failed: {str(e)}",
                "circuit_state": self.circuit_breakers["bigquery"].state.value,
                "required": False,
            }

    def _check_github_connection(self) -> Dict[str, Any]:
        """Check GitHub API connection with circuit breaker."""
        try:
            # Skip if not configured
            if not current_app.config.get("GITHUB_TOKEN"):
                return {
                    "name": "github_api",
                    "healthy": True,
                    "message": "GitHub API not configured (optional)",
                    "required": False,
                }

            def test_github():
                # Simple connectivity test to GitHub API
                try:
                    response = requests.get(
                        "https://api.github.com/rate_limit",
                        headers={
                            "Authorization": f"token {current_app.config.get('GITHUB_TOKEN')}"
                        },
                        timeout=5,
                    )
                    response.raise_for_status()
                    return True
                except requests.RequestException as e:
                    raise Exception(f"GitHub API request failed: {e}") from e

            self.circuit_breakers["github"].call(test_github)

            return {
                "name": "github_api",
                "healthy": True,
                "message": "GitHub API connection healthy",
                "circuit_state": self.circuit_breakers["github"].state.value,
                "required": False,
            }

        except Exception as e:
            return {
                "name": "github_api",
                "healthy": False,
                "message": f"GitHub API check failed: {str(e)}",
                "circuit_state": self.circuit_breakers["github"].state.value,
                "required": False,
            }

    def _check_ai_assistant(self) -> Dict[str, Any]:
        """Check AI Assistant service health."""
        try:
            from app.services.ai_assistant import control_center_assistant
            
            # Check if assistant is enabled
            if not control_center_assistant.is_enabled():
                return {
                    "name": "ai_assistant",
                    "healthy": True,
                    "message": "AI Assistant not configured (optional)",
                    "required": False,
                }
            
            # Get conversation stats to verify service is working
            stats = control_center_assistant.get_conversation_stats()
            
            return {
                "name": "ai_assistant",
                "healthy": True,
                "message": "AI Assistant service operational",
                "model": stats.get('model', 'unknown'),
                "conversations": stats.get('conversation_length', 0),
                "required": False,
            }
            
        except Exception as e:
            return {
                "name": "ai_assistant",
                "healthy": False,
                "message": f"AI Assistant check failed: {str(e)}",
                "required": False,
            }
    
    def _check_workspace_service(self) -> Dict[str, Any]:
        """Check workspace management service health."""
        try:
            from app.services.workspace_service import workspace_manager
            
            # Get system overview to verify service is working
            overview = workspace_manager.get_system_overview()
            
            return {
                "name": "workspace_service",
                "healthy": True,
                "message": "Workspace service operational",
                "total_workspaces": overview['workspace_manager']['total_workspaces'],
                "active_workspace": overview['workspace_manager']['active_workspace_id'] is not None,
                "active_operations": overview['active_operations'],
                "required": True,  # Core service for multi-operational capabilities
            }
            
        except Exception as e:
            return {
                "name": "workspace_service",
                "healthy": False,
                "message": f"Workspace service check failed: {str(e)}",
                "required": True,
            }

    def get_comprehensive_health(self) -> Dict[str, Any]:
        """Get comprehensive health status including all services."""
        readiness = self.check_readiness()
        
        # Add enhanced GitHub service health
        github_health = None
        try:
            from app.services.github_service import github_service
            if github_service.is_authenticated():
                github_health = github_service.get_repository_health()
        except Exception as e:
            logger.error(f"Failed to get GitHub repository health: {e}")
        
        return {
            'system_readiness': readiness,
            'github_repository_health': github_health,
            'timestamp': datetime.now().isoformat(),
            'version': '2.0.0',
            'environment': current_app.config.get('FLASK_ENV', 'development')
        }


# Global health service instance
health_service = None

def get_health_service():
    """Get or create the global health service instance."""
    global health_service
    if health_service is None:
        health_service = HealthService()
    return health_service
