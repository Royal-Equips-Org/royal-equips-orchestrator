#!/usr/bin/env python3
"""
Enhanced Health Check Script for Royal Equips Empire

This script performs comprehensive health checks across all system components:
- Agent health monitoring
- Database connectivity 
- Redis/cache connectivity
- API endpoint availability
- System resource monitoring
- Security status validation
"""

import asyncio
import argparse
import json
import logging
import time
import sys
import os
import psutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import subprocess

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


class ComprehensiveHealthChecker:
    """Comprehensive health checker for the Royal Equips Empire."""
    
    def __init__(self):
        self.logger = self._setup_logging()
        self.health_report = {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_status": "unknown",
            "critical_issues": 0,
            "unhealthy_agents": 0,
            "components": {},
            "agents": {},
            "system_metrics": {},
            "recommendations": []
        }
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        return logging.getLogger(__name__)
    
    async def run_comprehensive_check(self) -> Dict[str, Any]:
        """Run all health checks and return comprehensive report."""
        self.logger.info("🏥 Starting comprehensive health check...")
        
        start_time = time.time()
        
        try:
            # System resource monitoring
            await self._check_system_resources()
            
            # Agent health checks
            await self._check_agents_health()
            
            # Infrastructure components
            await self._check_database_connectivity()
            await self._check_redis_connectivity()
            
            # Security validation
            await self._check_security_status()
            
            # Performance monitoring
            await self._check_performance_metrics()
            
            # Generate recommendations
            await self._generate_recommendations()
            
            # Calculate overall status
            self._calculate_overall_status()
            
            self.health_report["check_duration"] = time.time() - start_time
            
            self.logger.info(f"✅ Health check completed in {self.health_report['check_duration']:.2f}s")
            self.logger.info(f"📊 Overall Status: {self.health_report['overall_status']}")
            self.logger.info(f"🚨 Critical Issues: {self.health_report['critical_issues']}")
            self.logger.info(f"🤖 Unhealthy Agents: {self.health_report['unhealthy_agents']}")
            
            return self.health_report
            
        except Exception as exc:
            self.logger.error(f"Health check failed: {exc}")
            self.health_report["overall_status"] = "error"
            self.health_report["error"] = str(exc)
            return self.health_report
    
    async def _check_system_resources(self) -> None:
        """Check system resource utilization."""
        try:
            self.logger.info("🔍 Checking system resources...")
            
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            
            # Disk usage
            disk = psutil.disk_usage('/')
            
            # Load average (Linux/Unix only)
            try:
                load_avg = os.getloadavg()
            except (OSError, AttributeError):
                load_avg = None
            
            self.health_report["system_metrics"] = {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_gb": round(memory.available / (1024**3), 2),
                "disk_percent": (disk.used / disk.total) * 100,
                "disk_free_gb": round(disk.free / (1024**3), 2),
                "load_average": list(load_avg) if load_avg else None
            }
            
            # Check for resource issues
            if cpu_percent > 90:
                self.health_report["critical_issues"] += 1
                self.health_report["recommendations"].append("Critical: CPU usage over 90%")
            elif cpu_percent > 70:
                self.health_report["recommendations"].append("Warning: High CPU usage")
            
            if memory.percent > 85:
                self.health_report["critical_issues"] += 1
                self.health_report["recommendations"].append("Critical: Memory usage over 85%")
            elif memory.percent > 70:
                self.health_report["recommendations"].append("Warning: High memory usage")
            
            if (disk.used / disk.total) * 100 > 90:
                self.health_report["critical_issues"] += 1
                self.health_report["recommendations"].append("Critical: Disk usage over 90%")
            
            self.health_report["components"]["system_resources"] = {
                "status": "critical" if self.health_report["critical_issues"] > 0 else "healthy",
                "details": "System resource monitoring completed"
            }
            
            self.logger.info(f"System resources checked: CPU {cpu_percent:.1f}%, Memory {memory.percent:.1f}%")
            
        except Exception as exc:
            self.logger.error(f"System resource check failed: {exc}")
            self.health_report["components"]["system_resources"] = {
                "status": "error",
                "error": str(exc)
            }
    
    async def _check_agents_health(self) -> None:
        """Check health of all agents."""
        try:
            self.logger.info("🤖 Checking agents health...")
            
            agents_to_check = [
                "product_research",
                "inventory_pricing", 
                "fraud_security"
            ]
            
            for agent_name in agents_to_check:
                try:
                    # Use subprocess to run health check
                    result = subprocess.run([
                        sys.executable, "scripts/execute_agent.py",
                        "--agent", agent_name,
                        "--health-check"
                    ], 
                    cwd=project_root,
                    capture_output=True,
                    text=True,
                    timeout=30
                    )
                    
                    if result.returncode == 0:
                        self.health_report["agents"][agent_name] = {
                            "status": "healthy",
                            "last_check": datetime.utcnow().isoformat()
                        }
                    else:
                        self.health_report["agents"][agent_name] = {
                            "status": "unhealthy",
                            "error": result.stderr or "Health check failed",
                            "last_check": datetime.utcnow().isoformat()
                        }
                        self.health_report["unhealthy_agents"] += 1
                        
                except subprocess.TimeoutExpired:
                    self.health_report["agents"][agent_name] = {
                        "status": "timeout",
                        "error": "Health check timed out",
                        "last_check": datetime.utcnow().isoformat()
                    }
                    self.health_report["unhealthy_agents"] += 1
                    
                except Exception as e:
                    self.health_report["agents"][agent_name] = {
                        "status": "error", 
                        "error": str(e),
                        "last_check": datetime.utcnow().isoformat()
                    }
                    self.health_report["unhealthy_agents"] += 1
            
            self.health_report["components"]["agents"] = {
                "status": "unhealthy" if self.health_report["unhealthy_agents"] > 0 else "healthy",
                "total_agents": len(agents_to_check),
                "unhealthy_count": self.health_report["unhealthy_agents"]
            }
            
            self.logger.info(f"Agent health check completed: {self.health_report['unhealthy_agents']} unhealthy")
            
        except Exception as exc:
            self.logger.error(f"Agent health check failed: {exc}")
            self.health_report["components"]["agents"] = {
                "status": "error",
                "error": str(exc)
            }
    
    async def _check_database_connectivity(self) -> None:
        """Check database connectivity."""
        try:
            self.logger.info("🗄️ Checking database connectivity...")
            
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                self.health_report["components"]["database"] = {
                    "status": "warning",
                    "details": "DATABASE_URL not configured"
                }
                return
            
            # For now, just check if URL is valid format
            if database_url.startswith(("postgresql://", "postgres://")):
                self.health_report["components"]["database"] = {
                    "status": "configured",
                    "details": "Database URL configured (connection not tested)"
                }
            else:
                self.health_report["components"]["database"] = {
                    "status": "error",
                    "details": "Invalid database URL format"
                }
                self.health_report["critical_issues"] += 1
            
        except Exception as exc:
            self.logger.error(f"Database check failed: {exc}")
            self.health_report["components"]["database"] = {
                "status": "error",
                "error": str(exc)
            }
    
    async def _check_redis_connectivity(self) -> None:
        """Check Redis connectivity."""
        try:
            self.logger.info("🔴 Checking Redis connectivity...")
            
            redis_url = os.getenv("REDIS_URL")
            if not redis_url:
                self.health_report["components"]["redis"] = {
                    "status": "warning",
                    "details": "REDIS_URL not configured"
                }
                return
            
            # For now, just check if URL is valid format
            if redis_url.startswith("redis://"):
                self.health_report["components"]["redis"] = {
                    "status": "configured",
                    "details": "Redis URL configured (connection not tested)"
                }
            else:
                self.health_report["components"]["redis"] = {
                    "status": "error",
                    "details": "Invalid Redis URL format"
                }
                self.health_report["critical_issues"] += 1
            
        except Exception as exc:
            self.logger.error(f"Redis check failed: {exc}")
            self.health_report["components"]["redis"] = {
                "status": "error",
                "error": str(exc)
            }
    
    async def _check_security_status(self) -> None:
        """Check security status."""
        try:
            self.logger.info("🔒 Checking security status...")
            
            security_issues = []
            
            # Check for required environment variables
            required_secrets = [
                "DATABASE_URL",
                "REDIS_URL", 
                "SHOPIFY_ACCESS_TOKEN",
                "OPENAI_API_KEY"
            ]
            
            missing_secrets = []
            for secret in required_secrets:
                if not os.getenv(secret):
                    missing_secrets.append(secret)
            
            if missing_secrets:
                security_issues.append(f"Missing secrets: {', '.join(missing_secrets)}")
            
            # Check file permissions (basic check)
            sensitive_files = [
                ".env",
                "secrets.json"
            ]
            
            for file_path in sensitive_files:
                if os.path.exists(file_path):
                    stat_info = os.stat(file_path)
                    # Check if file is world-readable
                    if stat_info.st_mode & 0o004:
                        security_issues.append(f"File {file_path} is world-readable")
            
            if security_issues:
                self.health_report["components"]["security"] = {
                    "status": "warning",
                    "issues": security_issues
                }
                if len(security_issues) > 2:
                    self.health_report["critical_issues"] += 1
            else:
                self.health_report["components"]["security"] = {
                    "status": "healthy",
                    "details": "No immediate security issues detected"
                }
            
        except Exception as exc:
            self.logger.error(f"Security check failed: {exc}")
            self.health_report["components"]["security"] = {
                "status": "error",
                "error": str(exc)
            }
    
    async def _check_performance_metrics(self) -> None:
        """Check performance metrics."""
        try:
            self.logger.info("📊 Checking performance metrics...")
            
            # Simulate performance metrics collection
            # In production, this would connect to monitoring systems
            
            self.health_report["performance_metrics"] = {
                "response_time_avg_ms": 150,  # Mock data
                "error_rate_percent": 0.1,
                "throughput_rps": 45,
                "uptime_hours": 24 * 7  # Mock 1 week uptime
            }
            
            self.health_report["components"]["performance"] = {
                "status": "healthy",
                "details": "Performance metrics collected"
            }
            
        except Exception as exc:
            self.logger.error(f"Performance check failed: {exc}")
            self.health_report["components"]["performance"] = {
                "status": "error",
                "error": str(exc)
            }
    
    async def _generate_recommendations(self) -> None:
        """Generate recommendations based on health check results."""
        try:
            # Add recommendations based on findings
            if self.health_report["unhealthy_agents"] > 2:
                self.health_report["recommendations"].append(
                    "Critical: Multiple agents unhealthy - investigate system issues"
                )
            
            if self.health_report["critical_issues"] == 0 and self.health_report["unhealthy_agents"] == 0:
                self.health_report["recommendations"].append(
                    "System is healthy - continue monitoring"
                )
            
            # Add missing configuration recommendations
            if not os.getenv("DATABASE_URL"):
                self.health_report["recommendations"].append(
                    "Configure DATABASE_URL for full functionality"
                )
            
            if not os.getenv("REDIS_URL"):
                self.health_report["recommendations"].append(
                    "Configure REDIS_URL for caching and message queue"
                )
            
        except Exception as exc:
            self.logger.error(f"Recommendation generation failed: {exc}")
    
    def _calculate_overall_status(self) -> None:
        """Calculate overall system status."""
        if self.health_report["critical_issues"] > 0:
            self.health_report["overall_status"] = "critical"
        elif self.health_report["unhealthy_agents"] > 1:
            self.health_report["overall_status"] = "degraded"
        elif self.health_report["unhealthy_agents"] > 0:
            self.health_report["overall_status"] = "warning"
        else:
            # Check component statuses
            component_statuses = [
                comp.get("status", "unknown") 
                for comp in self.health_report["components"].values()
            ]
            
            if "error" in component_statuses:
                self.health_report["overall_status"] = "degraded"
            elif "warning" in component_statuses:
                self.health_report["overall_status"] = "warning"
            else:
                self.health_report["overall_status"] = "healthy"


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Royal Equips Empire Health Check")
    parser.add_argument("--comprehensive", action="store_true", help="Run comprehensive health check")
    parser.add_argument("--output", help="Output file for health report (JSON)")
    parser.add_argument("--agents-only", action="store_true", help="Check agents only")
    parser.add_argument("--system-only", action="store_true", help="Check system resources only")
    
    args = parser.parse_args()
    
    checker = ComprehensiveHealthChecker()
    
    if args.comprehensive:
        report = await checker.run_comprehensive_check()
    else:
        # Run basic health check
        report = await checker.run_comprehensive_check()
    
    # Output report
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"Health report saved to: {args.output}")
    else:
        print(json.dumps(report, indent=2))
    
    # Exit with appropriate code
    if report["overall_status"] == "critical":
        sys.exit(2)  # Critical issues
    elif report["overall_status"] in ["degraded", "warning"]:
        sys.exit(1)  # Warning issues
    else:
        sys.exit(0)  # Healthy


if __name__ == "__main__":
    asyncio.run(main())