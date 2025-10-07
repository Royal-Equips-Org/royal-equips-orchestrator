"""
Health monitoring service with circuit breaker patterns.

Provides dependency health checks with fallback mechanisms
and graceful degradation patterns.
"""

import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

import requests
from flask import current_app
from datetime import timedelta

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, requests blocked
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreaker:
    """Enhanced circuit breaker with adaptive thresholds and intelligent recovery."""

    failure_threshold: int = 5
    recovery_timeout: int = 60
    failure_count: int = 0
    success_count: int = 0
    state: CircuitState = CircuitState.CLOSED
    last_failure_time: float = 0
    last_success_time: float = 0
    minimum_requests: int = 20  # Minimum requests before tripping
    half_open_max_calls: int = 5  # Max calls in half-open state
    half_open_calls: int = 0  # Current calls in half-open state

    def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with adaptive circuit breaker protection."""
        current_time = time.time()

        # Check if we should transition from OPEN to HALF_OPEN
        if (
            self.state == CircuitState.OPEN
            and current_time - self.last_failure_time > self.recovery_timeout
        ):
            self.state = CircuitState.HALF_OPEN
            self.half_open_calls = 0
            logger.info(f"Circuit breaker transitioning to HALF_OPEN for recovery probe")

        # Block requests if circuit is OPEN
        if self.state == CircuitState.OPEN:
            raise Exception("Circuit breaker is OPEN - service temporarily unavailable")

        # In HALF_OPEN state, limit concurrent calls
        if self.state == CircuitState.HALF_OPEN:
            if self.half_open_calls >= self.half_open_max_calls:
                raise Exception("Circuit breaker HALF_OPEN - max probe calls exceeded")
            self.half_open_calls += 1

        try:
            result = func(*args, **kwargs)

            # Success handling
            self.success_count += 1
            self.last_success_time = current_time
            
            if self.state == CircuitState.HALF_OPEN:
                # Need consecutive successes to close circuit
                if self.success_count >= 5:  # 5 consecutive successes
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
                    self.success_count = 0
                    self.half_open_calls = 0
                    logger.info(f"Circuit breaker CLOSED after successful recovery")
            elif self.state == CircuitState.CLOSED:
                # Reset failure count on success in closed state
                if self.failure_count > 0:
                    self.failure_count = max(0, self.failure_count - 1)

            return result

        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = current_time
            self.success_count = 0  # Reset success count on failure

            # Adaptive threshold based on recent request volume
            total_requests = self.failure_count + self.success_count
            
            # Only trip if we have minimum request volume and exceed failure rate
            if total_requests >= self.minimum_requests:
                failure_rate = self.failure_count / total_requests
                
                # Adaptive threshold: 50% failure rate OR 5 consecutive failures
                if failure_rate > 0.5 or self.failure_count >= self.failure_threshold:
                    if self.state != CircuitState.OPEN:
                        self.state = CircuitState.OPEN
                        logger.warning(f"Circuit breaker OPEN - failure rate: {failure_rate:.2%}, "
                                     f"failures: {self.failure_count}/{total_requests}")

            # In HALF_OPEN, any failure immediately opens circuit
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN
                self.half_open_calls = 0
                logger.warning(f"Circuit breaker OPEN - failure during recovery probe")

            raise e

    def get_state_info(self) -> Dict[str, Any]:
        """Get detailed circuit breaker state information."""
        total_requests = self.failure_count + self.success_count
        failure_rate = self.failure_count / total_requests if total_requests > 0 else 0
        
        return {
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "total_requests": total_requests,
            "failure_rate": failure_rate,
            "last_failure_time": self.last_failure_time,
            "last_success_time": self.last_success_time,
            "half_open_calls": self.half_open_calls if self.state == CircuitState.HALF_OPEN else None,
            "next_recovery_attempt": self.last_failure_time + self.recovery_timeout if self.state == CircuitState.OPEN else None
        }


class HealthService:
    """Health monitoring service with dependency checks and empire-level analysis."""

    def __init__(self):
        # Enhanced circuit breakers with adaptive thresholds
        self.circuit_breakers = {
            "shopify": CircuitBreaker(
                failure_threshold=current_app.config.get(
                    "CIRCUIT_BREAKER_FAILURE_THRESHOLD", 5
                ) if current_app else 5,
                recovery_timeout=current_app.config.get(
                    "CIRCUIT_BREAKER_RECOVERY_TIMEOUT", 60
                ) if current_app else 60,
                minimum_requests=20
            ),
            "bigquery": CircuitBreaker(
                failure_threshold=current_app.config.get(
                    "CIRCUIT_BREAKER_FAILURE_THRESHOLD", 5
                ) if current_app else 5,
                recovery_timeout=current_app.config.get(
                    "CIRCUIT_BREAKER_RECOVERY_TIMEOUT", 60
                ) if current_app else 60,
                minimum_requests=10
            ),
            "github": CircuitBreaker(
                failure_threshold=current_app.config.get(
                    "CIRCUIT_BREAKER_FAILURE_THRESHOLD", 5
                ) if current_app else 5,
                recovery_timeout=current_app.config.get(
                    "CIRCUIT_BREAKER_RECOVERY_TIMEOUT", 60
                ) if current_app else 60,
                minimum_requests=15
            ),
            "agent_registry": CircuitBreaker(
                failure_threshold=3,
                recovery_timeout=30,  # Faster recovery for critical service
                minimum_requests=10
            ),
            "metrics_aggregation": CircuitBreaker(
                failure_threshold=8,  # More tolerance for metrics
                recovery_timeout=45,
                minimum_requests=25
            ),
            "revenue_calculation": CircuitBreaker(
                failure_threshold=2,  # Low tolerance for revenue failures
                recovery_timeout=30,
                minimum_requests=5
            )
        }
        self._empire_health_cache = {}
        self._last_empire_scan = None
        self._empire_scan_interval = timedelta(hours=6)  # Scan every 6 hours
        
        # Error budget tracking (99.99% SLO = 4.32 min/month downtime)
        self._error_budget = {
            "monthly_budget_seconds": 259.2,  # 4.32 min in seconds
            "current_month_errors": 0,
            "last_reset": datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        }

    def get_circuit_breaker_status(self) -> Dict[str, Any]:
        """Get detailed status of all circuit breakers."""
        status = {}
        for name, breaker in self.circuit_breakers.items():
            status[name] = breaker.get_state_info()
        return {
            "circuit_breakers": status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "total_breakers": len(self.circuit_breakers),
                "open_breakers": len([b for b in self.circuit_breakers.values() if b.state == CircuitState.OPEN]),
                "half_open_breakers": len([b for b in self.circuit_breakers.values() if b.state == CircuitState.HALF_OPEN]),
                "healthy_breakers": len([b for b in self.circuit_breakers.values() if b.state == CircuitState.CLOSED])
            }
        }

    def get_error_budget_status(self) -> Dict[str, Any]:
        """Get current error budget consumption."""
        current_time = datetime.now(timezone.utc)
        
        # Reset monthly counter if needed
        current_month_start = current_time.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if current_month_start > self._error_budget["last_reset"]:
            self._error_budget["current_month_errors"] = 0
            self._error_budget["last_reset"] = current_month_start
        
        # Calculate consumption rate
        consumption_rate = self._error_budget["current_month_errors"] / self._error_budget["monthly_budget_seconds"]
        
        # Determine burn rate status
        if consumption_rate > 0.9:
            burn_status = "CRITICAL"
        elif consumption_rate > 0.7:
            burn_status = "HIGH"
        elif consumption_rate > 0.5:
            burn_status = "MODERATE"
        else:
            burn_status = "HEALTHY"
        
        return {
            "monthly_budget_seconds": self._error_budget["monthly_budget_seconds"],
            "consumed_seconds": self._error_budget["current_month_errors"],
            "remaining_seconds": max(0, self._error_budget["monthly_budget_seconds"] - self._error_budget["current_month_errors"]),
            "consumption_rate": consumption_rate,
            "burn_status": burn_status,
            "last_reset": self._error_budget["last_reset"].isoformat(),
            "next_reset": (current_month_start + timedelta(days=32)).replace(day=1).isoformat()
        }

    def record_error_budget_consumption(self, duration_seconds: float):
        """Record error budget consumption."""
        self._error_budget["current_month_errors"] += duration_seconds

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
            "timestamp": datetime.now(timezone.utc).isoformat(),
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

            uptime = (datetime.now(timezone.utc) - startup_time).total_seconds()
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
            'timestamp': datetime.now(timezone.utc).isoformat(),
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


# Empire health methods added to HealthService
def _add_empire_health_methods():
    """Add empire health checking methods to HealthService class."""
    
    def check_empire_health(self, force_scan: bool = False) -> Dict[str, Any]:
        """
        Check overall empire health including security and evolution status.
        
        Args:
            force_scan: Force a new empire scan even if cache is valid
            
        Returns:
            Comprehensive empire health report
        """
        try:
            from app.services.empire_scanner import get_empire_scanner
            
            current_time = datetime.now(timezone.utc)
            
            # Check if we need a new scan
            needs_scan = (
                force_scan or 
                self._last_empire_scan is None or
                current_time - self._last_empire_scan > self._empire_scan_interval
            )
            
            if needs_scan:
                logger.info("🔍 Running Empire Health Scan...")
                scanner = get_empire_scanner()
                scan_results = scanner.run_full_empire_scan()
                self._empire_health_cache = scan_results
                self._last_empire_scan = current_time
            else:
                scan_results = self._empire_health_cache
            
            # Build empire health summary
            empire_health = {
                "empire_status": "OPERATIONAL",
                "last_scan": self._last_empire_scan.isoformat() if self._last_empire_scan else None,
                "next_scan_due": (self._last_empire_scan + self._empire_scan_interval).isoformat() if self._last_empire_scan else None,
                "empire_readiness_score": scan_results.get('summary', {}).get('empire_readiness_score', 0),
                "overall_health": scan_results.get('summary', {}).get('overall_empire_health', 'UNKNOWN'),
                "critical_issues": scan_results.get('summary', {}).get('critical_issues', 0),
                "total_recommendations": scan_results.get('summary', {}).get('total_recommendations', 0),
                "security_score": scan_results.get('phases', {}).get('security', {}).get('security_score', 0),
                "performance_score": scan_results.get('phases', {}).get('performance', {}).get('performance_score', 0),
                "code_quality_score": scan_results.get('phases', {}).get('code_health', {}).get('code_quality_score', 0),
                "scan_available": bool(scan_results)
            }
            
            # Determine if empire is ready for evolution
            readiness_score = empire_health["empire_readiness_score"]
            if readiness_score >= 90:
                empire_health["evolution_readiness"] = "READY_FOR_EXPANSION"
            elif readiness_score >= 80:
                empire_health["evolution_readiness"] = "OPTIMIZATION_RECOMMENDED"
            elif readiness_score >= 70:
                empire_health["evolution_readiness"] = "IMPROVEMENTS_NEEDED"
            else:
                empire_health["evolution_readiness"] = "CRITICAL_ISSUES_DETECTED"
            
            return empire_health
            
        except Exception as e:
            logger.error(f"Empire health check failed: {e}")
            return {
                "empire_status": "HEALTH_CHECK_FAILED",
                "error": str(e),
                "empire_readiness_score": 0,
                "overall_health": "UNKNOWN",
                "scan_available": False
            }
    
    def get_empire_recommendations(self) -> List[Dict[str, Any]]:
        """Get current empire evolution recommendations."""
        try:
            if not self._empire_health_cache:
                # Trigger a scan if no cache exists
                self.check_empire_health(force_scan=True)
            
            return self._empire_health_cache.get('recommendations', [])
            
        except Exception as e:
            logger.error(f"Failed to get empire recommendations: {e}")
            return []
    
    def get_empire_scan_results(self) -> Optional[Dict[str, Any]]:
        """Get the latest empire scan results."""
        return self._empire_health_cache
    
    def trigger_empire_evolution_check(self) -> Dict[str, Any]:
        """Trigger immediate empire evolution readiness check."""
        logger.info("🚀 Triggering Empire Evolution Readiness Check...")
        
        try:
            # Force a comprehensive scan
            empire_health = self.check_empire_health(force_scan=True)
            
            evolution_status = {
                "check_timestamp": datetime.now(timezone.utc).isoformat(),
                "empire_health": empire_health,
                "evolution_recommendations": self.get_empire_recommendations(),
                "readiness_assessment": {
                    "security_ready": empire_health.get("security_score", 0) >= 85,
                    "performance_ready": empire_health.get("performance_score", 0) >= 80,
                    "code_quality_ready": empire_health.get("code_quality_score", 0) >= 75,
                    "overall_ready": empire_health.get("empire_readiness_score", 0) >= 85
                }
            }
            
            # Determine next evolution phase
            readiness = evolution_status["readiness_assessment"]
            if all(readiness.values()):
                evolution_status["recommended_phase"] = "AUTONOMOUS_EXPANSION"
                evolution_status["phase_description"] = "Empire is ready for autonomous scaling and evolution"
            elif readiness["overall_ready"]:
                evolution_status["recommended_phase"] = "OPTIMIZATION_PHASE"
                evolution_status["phase_description"] = "Focus on performance and security optimization"
            else:
                evolution_status["recommended_phase"] = "STABILIZATION_PHASE"
                evolution_status["phase_description"] = "Address critical issues before evolution"
            
            return evolution_status
            
        except Exception as e:
            logger.error(f"Empire evolution check failed: {e}")
            return {
                "check_timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(e),
                "recommended_phase": "ERROR_RECOVERY",
                "phase_description": "System error - manual intervention required"
            }
    
    # Add methods to HealthService class
    HealthService.check_empire_health = check_empire_health
    HealthService.get_empire_recommendations = get_empire_recommendations
    HealthService.get_empire_scan_results = get_empire_scan_results
    HealthService.trigger_empire_evolution_check = trigger_empire_evolution_check

# Execute the method addition
_add_empire_health_methods()
