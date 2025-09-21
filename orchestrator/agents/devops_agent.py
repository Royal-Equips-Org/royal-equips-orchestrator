"""
DevOps Agent for Royal Equips Orchestrator

Integrates the Autonomous DevOps Agent with the existing orchestrator framework.
This provides a bridge between the standalone DevOps commander and the 
orchestrator's agent management system.
"""

import asyncio
import logging
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from dataclasses import asdict

from orchestrator.core.agent_base import BaseAgent

# Import the DevOps service
try:
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent.parent / "app"))
    from services.autonomous_devops_agent import get_autonomous_devops_agent
    DEVOPS_AVAILABLE = True
except ImportError as e:
    DEVOPS_AVAILABLE = False
    logging.warning(f"DevOps agent not available: {e}")

logger = logging.getLogger(__name__)


class DevOpsAgent(BaseAgent):
    """
    DevOps Agent for the Royal Equips Orchestrator.
    
    Provides autonomous Git operations, commit signing, and repository management
    integrated with the orchestrator's scheduling and monitoring system.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__()
        
        self.config = config or {}
        self.devops_service = None
        self.last_cycle_results = None
        self.initialization_error = None
        
        # Agent metadata
        self.agent_name = "DevOps Agent"
        self.description = "Autonomous secure DevOps operations and Git management"
        self.version = "1.0.0"
        
        # Initialize the DevOps service if available
        if DEVOPS_AVAILABLE:
            try:
                self.devops_service = get_autonomous_devops_agent(self.config)
                logger.info("✅ DevOps Agent initialized successfully")
            except Exception as e:
                self.initialization_error = str(e)
                logger.error(f"❌ Failed to initialize DevOps service: {e}")
        else:
            self.initialization_error = "DevOps service not available"
    
    async def run(self) -> Dict[str, Any]:
        """
        Execute the DevOps agent cycle.
        
        This method is called by the orchestrator on a scheduled basis.
        """
        if not self.devops_service:
            return {
                "status": "error",
                "error": self.initialization_error or "DevOps service not available",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "agent": self.agent_name
            }
        
        try:
            logger.info("🔄 Running DevOps agent cycle")
            
            # Run the autonomous DevOps cycle
            cycle_results = await self.devops_service.run_autonomous_cycle()
            self.last_cycle_results = cycle_results
            
            # Transform results for orchestrator compatibility
            orchestrator_results = {
                "status": "success" if cycle_results.get("status") == "completed" else "warning",
                "timestamp": cycle_results.get("start_time"),
                "agent": self.agent_name,
                "cycle_id": cycle_results.get("cycle_id"),
                "metrics": {
                    "unsigned_commits_found": cycle_results.get("unsigned_commits_found", 0),
                    "commits_signed": cycle_results.get("commits_signed", 0),
                    "branches_processed": cycle_results.get("branches_processed", 0),
                    "prs_created": cycle_results.get("prs_created", 0)
                },
                "execution_time": self._calculate_execution_time(cycle_results),
                "errors": cycle_results.get("errors", [])
            }
            
            # Log significant activities
            if cycle_results.get("commits_signed", 0) > 0:
                logger.info(f"✅ Signed {cycle_results['commits_signed']} commits across {cycle_results['branches_processed']} branches")
            
            if cycle_results.get("prs_created", 0) > 0:
                logger.info(f"📝 Created {cycle_results['prs_created']} PRs with changelogs")
            
            if cycle_results.get("status") == "no_action_needed":
                logger.debug("ℹ️ No unsigned commits found - repository is compliant")
            
            return orchestrator_results
            
        except Exception as e:
            logger.error(f"❌ DevOps agent execution failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "agent": self.agent_name
            }
    
    def _calculate_execution_time(self, cycle_results: Dict[str, Any]) -> Optional[float]:
        """Calculate execution time from cycle results."""
        try:
            start_time = datetime.fromisoformat(cycle_results.get("start_time", "").replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(cycle_results.get("end_time", "").replace('Z', '+00:00'))
            return (end_time - start_time).total_seconds()
        except (ValueError, TypeError):
            return None
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check for the DevOps agent.
        
        Returns comprehensive health information for monitoring.
        """
        health_status = {
            "agent": self.agent_name,
            "version": self.version,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "healthy",
            "checks": {},
            "metrics": {},
            "details": {}
        }
        
        try:
            # Check service availability
            if not DEVOPS_AVAILABLE:
                health_status["status"] = "unhealthy"
                health_status["checks"]["service_available"] = False
                health_status["details"]["error"] = "DevOps service not available"
                return health_status
            
            if not self.devops_service:
                health_status["status"] = "unhealthy" 
                health_status["checks"]["service_initialized"] = False
                health_status["details"]["error"] = self.initialization_error
                return health_status
            
            health_status["checks"]["service_available"] = True
            health_status["checks"]["service_initialized"] = True
            
            # Check Git repository
            try:
                import subprocess
                result = subprocess.run(["git", "status"], capture_output=True, text=True)
                health_status["checks"]["git_repository"] = result.returncode == 0
                if result.returncode != 0:
                    health_status["details"]["git_error"] = result.stderr
            except FileNotFoundError:
                health_status["checks"]["git_repository"] = False
                health_status["details"]["git_error"] = "Git not found in PATH"
            
            # Check GPG availability
            try:
                result = subprocess.run(["gpg", "--version"], capture_output=True, text=True)
                health_status["checks"]["gpg_available"] = result.returncode == 0
            except FileNotFoundError:
                health_status["checks"]["gpg_available"] = False
            
            # Service metrics
            if self.devops_service:
                operations_status = self.devops_service.get_operations_status()
                audit_log = self.devops_service.get_audit_log(limit=1)
                
                health_status["metrics"]["total_operations"] = operations_status["total_operations"]
                health_status["metrics"]["audit_entries"] = len(audit_log)
                health_status["metrics"]["is_running"] = self.devops_service.is_running
                
                # Last execution info
                if self.last_cycle_results:
                    health_status["details"]["last_execution"] = {
                        "status": self.last_cycle_results.get("status"),
                        "time": self.last_cycle_results.get("start_time"),
                        "commits_signed": self.last_cycle_results.get("commits_signed", 0)
                    }
            
            # Configuration validation
            config_issues = []
            if not self.config.get("github_token"):
                config_issues.append("GitHub token not configured")
            if not self.config.get("gpg_key_id"):
                config_issues.append("GPG key ID not configured")
            
            health_status["checks"]["configuration_valid"] = len(config_issues) == 0
            if config_issues:
                health_status["details"]["config_issues"] = config_issues
            
            # Overall health determination
            critical_checks = ["service_available", "service_initialized", "git_repository"]
            unhealthy_checks = [check for check in critical_checks if not health_status["checks"].get(check, False)]
            
            if unhealthy_checks:
                health_status["status"] = "unhealthy"
                health_status["details"]["failed_checks"] = unhealthy_checks
            elif not health_status["checks"].get("configuration_valid", True):
                health_status["status"] = "degraded"
            
        except Exception as e:
            health_status["status"] = "unhealthy"
            health_status["details"]["health_check_error"] = str(e)
            logger.error(f"Health check failed: {e}")
        
        return health_status
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get detailed metrics for monitoring and dashboards."""
        if not self.devops_service:
            return {"error": "DevOps service not available"}
        
        try:
            # Get operations status and audit log
            operations = self.devops_service.get_operations_status()
            recent_audit = self.devops_service.get_audit_log(limit=100)
            
            # Calculate metrics
            metrics = {
                "total_operations": operations["total_operations"],
                "total_audit_entries": len(self.devops_service.get_audit_log()),
                "recent_audit_entries": len(recent_audit),
                "service_running": self.devops_service.is_running,
                "last_cycle": self.last_cycle_results,
                "operations_by_type": {},
                "operations_by_status": {},
                "recent_activity": []
            }
            
            # Analyze operations
            for op_id, operation in operations["operations"].items():
                op_type = operation["operation_type"]
                op_status = operation["status"]
                
                if op_type not in metrics["operations_by_type"]:
                    metrics["operations_by_type"][op_type] = 0
                metrics["operations_by_type"][op_type] += 1
                
                if op_status not in metrics["operations_by_status"]:
                    metrics["operations_by_status"][op_status] = 0
                metrics["operations_by_status"][op_status] += 1
            
            # Recent activity summary
            for entry in recent_audit[-10:]:  # Last 10 entries
                metrics["recent_activity"].append({
                    "timestamp": entry["timestamp"],
                    "operation": entry["operation_type"],
                    "action": entry["action"],
                    "result": entry["result"]
                })
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to collect metrics: {e}")
            return {"error": str(e)}
    
    def get_configuration(self) -> Dict[str, Any]:
        """Get current configuration (sanitized for security)."""
        safe_config = self.config.copy()
        
        # Remove sensitive keys
        sensitive_keys = ["github_token", "openai_api_key", "vault_url"]
        for key in sensitive_keys:
            if key in safe_config:
                safe_config[key] = "***configured***" if safe_config[key] else "not_configured"
        
        return {
            "agent_name": self.agent_name,
            "version": self.version,
            "configuration": safe_config,
            "service_available": DEVOPS_AVAILABLE,
            "service_initialized": self.devops_service is not None
        }
    
    async def stop(self):
        """Stop the DevOps agent and cleanup resources."""
        if self.devops_service:
            self.devops_service.stop_daemon()
            logger.info("DevOps agent stopped")
    
    def __str__(self) -> str:
        return f"{self.agent_name} v{self.version}"
    
    def __repr__(self) -> str:
        return f"DevOpsAgent(initialized={self.devops_service is not None})"


# Factory function for orchestrator integration
def create_devops_agent(config: Optional[Dict[str, Any]] = None) -> DevOpsAgent:
    """
    Create and configure a DevOps agent for the orchestrator.
    
    Args:
        config: Optional configuration dictionary
        
    Returns:
        Configured DevOpsAgent instance
    """
    return DevOpsAgent(config)


# Register with orchestrator (if orchestrator registration system exists)
def register_agent():
    """Register the DevOps agent with the orchestrator system."""
    # This would integrate with the orchestrator's agent registry
    # Implementation depends on the orchestrator's architecture
    pass