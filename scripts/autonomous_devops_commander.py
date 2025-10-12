#!/usr/bin/env python3
"""
Autonomous Secure DevOps Commander - Deployment Script

This script initializes and runs the Autonomous DevOps Agent within
the Royal Equips Empire infrastructure. It provides:

- Integration with existing orchestrator
- Configuration management
- Health monitoring 
- Service management
- CLI interface for operations
"""

import argparse
import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from app.services.autonomous_devops_agent import get_autonomous_devops_agent
    from app.services.autonomous_empire_agent import AutonomousEmpireAgent
except ImportError as e:
    print(f"Failed to import required services: {e}")
    print("Make sure you're running this from the project root directory")
    sys.exit(1)

logger = logging.getLogger(__name__)


class DevOpsCommander:
    """
    Main controller for the Autonomous DevOps system.
    
    Integrates with the existing Royal Equips Empire architecture
    while providing specialized DevOps automation capabilities.
    """

    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_configuration(config_path)
        self.devops_agent = None
        self.empire_agent = None
        self.is_running = False

        # Setup logging
        self._setup_logging()

        logger.info("🏰 DevOps Commander initialized")

    def _load_configuration(self, config_path: Optional[str]) -> Dict[str, Any]:
        """Load configuration from file or environment."""
        config = {
            # Core DevOps settings
            "gpg_key_id": os.getenv("GPG_KEY_ID"),
            "vault_url": os.getenv("VAULT_URL", ""),
            "github_token": os.getenv("GITHUB_TOKEN"),
            "openai_api_key": os.getenv("OPENAI_API_KEY"),

            # Repository settings
            "repo_path": os.getenv("REPO_PATH", "."),
            "target_branches": os.getenv("TARGET_BRANCHES", "main,master,develop").split(","),

            # Operation settings
            "scan_interval_minutes": int(os.getenv("DEVOPS_SCAN_INTERVAL", "15")),
            "max_retries": int(os.getenv("DEVOPS_MAX_RETRIES", "5")),
            "force_push_enabled": os.getenv("DEVOPS_FORCE_PUSH", "false").lower() == "true",
            "auto_pr_enabled": os.getenv("DEVOPS_AUTO_PR", "true").lower() == "true",
            "vault_enabled": os.getenv("VAULT_ENABLED", "false").lower() == "true",

            # Integration settings
            "empire_integration": os.getenv("EMPIRE_INTEGRATION", "true").lower() == "true",
            "audit_log_path": os.getenv("AUDIT_LOG_PATH", "logs/devops_audit.jsonl"),
            "health_check_port": int(os.getenv("HEALTH_CHECK_PORT", "8181")),

            # Security settings
            "encryption_enabled": os.getenv("ENCRYPTION_ENABLED", "true").lower() == "true",
            "audit_retention_days": int(os.getenv("AUDIT_RETENTION_DAYS", "90")),
            "max_concurrent_operations": int(os.getenv("MAX_CONCURRENT_OPS", "3"))
        }

        # Load from config file if provided
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path) as f:
                    file_config = json.load(f)
                    config.update(file_config)
                logger.info(f"Configuration loaded from {config_path}")
            except Exception as e:
                logger.error(f"Failed to load config file {config_path}: {e}")

        return config

    def _setup_logging(self):
        """Setup comprehensive logging."""
        log_level = getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper())

        # Create logs directory
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)

        # Configure logging
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / "devops_commander.log"),
                logging.StreamHandler(sys.stdout)
            ]
        )

        # Setup audit logging
        audit_handler = logging.FileHandler(self.config["audit_log_path"])
        audit_handler.setFormatter(logging.Formatter('%(message)s'))
        audit_logger = logging.getLogger('audit')
        audit_logger.addHandler(audit_handler)
        audit_logger.setLevel(logging.INFO)

    async def initialize_agents(self):
        """Initialize the DevOps and Empire agents."""
        try:
            # Initialize DevOps agent
            self.devops_agent = get_autonomous_devops_agent(self.config)
            logger.info("✅ Autonomous DevOps Agent initialized")

            # Initialize Empire agent if integration enabled
            if self.config.get("empire_integration", True):
                self.empire_agent = AutonomousEmpireAgent(
                    scan_interval_minutes=self.config["scan_interval_minutes"]
                )
                logger.info("✅ Empire Agent integration enabled")

        except Exception as e:
            logger.error(f"Failed to initialize agents: {e}")
            raise

    async def validate_environment(self) -> Dict[str, Any]:
        """Validate the environment and configuration."""
        validation_results = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "checks": {}
        }

        # Check Git repository
        try:
            import subprocess
            result = subprocess.run(["git", "status"], capture_output=True, text=True)
            validation_results["checks"]["git_repo"] = result.returncode == 0
            if result.returncode != 0:
                validation_results["errors"].append("Not in a Git repository")
                validation_results["valid"] = False
        except FileNotFoundError:
            validation_results["errors"].append("Git not found in PATH")
            validation_results["valid"] = False
            validation_results["checks"]["git_repo"] = False

        # Check GPG availability
        try:
            result = subprocess.run(["gpg", "--version"], capture_output=True, text=True)
            validation_results["checks"]["gpg_available"] = result.returncode == 0
            if result.returncode != 0:
                validation_results["warnings"].append("GPG not available - commit signing disabled")
        except FileNotFoundError:
            validation_results["warnings"].append("GPG not found in PATH - commit signing disabled")
            validation_results["checks"]["gpg_available"] = False

        # Check GitHub token
        if self.config.get("github_token"):
            validation_results["checks"]["github_token"] = True
        else:
            validation_results["warnings"].append("GitHub token not configured - PR creation disabled")
            validation_results["checks"]["github_token"] = False

        # Check OpenAI API key
        if self.config.get("openai_api_key"):
            validation_results["checks"]["openai_api"] = True
        else:
            validation_results["warnings"].append("OpenAI API key not configured - AI suggestions disabled")
            validation_results["checks"]["openai_api"] = False

        # Check vault configuration
        if self.config.get("vault_enabled"):
            if self.config.get("vault_url") and self.config.get("gpg_key_id"):
                validation_results["checks"]["vault_config"] = True
            else:
                validation_results["errors"].append("Vault enabled but URL or GPG key ID missing")
                validation_results["valid"] = False
                validation_results["checks"]["vault_config"] = False
        else:
            validation_results["checks"]["vault_config"] = False

        # Check write permissions
        try:
            log_path = Path(self.config["audit_log_path"])
            log_path.parent.mkdir(parents=True, exist_ok=True)
            test_file = log_path.parent / "test_write.tmp"
            test_file.write_text("test")
            test_file.unlink()
            validation_results["checks"]["write_permissions"] = True
        except Exception as e:
            validation_results["errors"].append(f"Cannot write to log directory: {e}")
            validation_results["valid"] = False
            validation_results["checks"]["write_permissions"] = False

        return validation_results

    async def run_health_check(self) -> Dict[str, Any]:
        """Run comprehensive health check."""
        health_status = {
            "timestamp": asyncio.get_event_loop().time(),
            "status": "healthy",
            "components": {},
            "metrics": {}
        }

        try:
            # Check DevOps agent
            if self.devops_agent:
                health_status["components"]["devops_agent"] = {
                    "status": "running" if self.devops_agent.is_running else "stopped",
                    "operations_count": len(self.devops_agent.operations),
                    "audit_entries": len(self.devops_agent.audit_log)
                }
            else:
                health_status["components"]["devops_agent"] = {"status": "not_initialized"}

            # Check Empire agent
            if self.empire_agent:
                health_status["components"]["empire_agent"] = {
                    "status": "running" if self.empire_agent.is_running else "stopped",
                    "decisions_count": len(self.empire_agent.decisions_made)
                }
            else:
                health_status["components"]["empire_agent"] = {"status": "disabled"}

            # System metrics
            health_status["metrics"] = {
                "config_loaded": bool(self.config),
                "environment_valid": (await self.validate_environment())["valid"]
            }

        except Exception as e:
            health_status["status"] = "unhealthy"
            health_status["error"] = str(e)
            logger.error(f"Health check failed: {e}")

        return health_status

    async def run_single_cycle(self) -> Dict[str, Any]:
        """Run a single DevOps automation cycle."""
        if not self.devops_agent:
            await self.initialize_agents()

        logger.info("🔄 Running single DevOps cycle")
        results = await self.devops_agent.run_autonomous_cycle()

        # Log results to audit trail
        audit_logger = logging.getLogger('audit')
        audit_logger.info(json.dumps({
            "type": "single_cycle_complete",
            "timestamp": asyncio.get_event_loop().time(),
            "results": results
        }))

        return results

    async def start_daemon_mode(self):
        """Start the daemon in autonomous mode."""
        if self.is_running:
            logger.warning("Daemon already running")
            return

        # Validate environment first
        validation = await self.validate_environment()
        if not validation["valid"]:
            logger.error("Environment validation failed:")
            for error in validation["errors"]:
                logger.error(f"  - {error}")
            return

        # Show warnings
        for warning in validation["warnings"]:
            logger.warning(f"  - {warning}")

        # Initialize agents
        await self.initialize_agents()

        self.is_running = True
        logger.info("🚀 Starting Autonomous DevOps Commander daemon")

        try:
            # Start health check server (if configured)
            health_task = None
            if self.config.get("health_check_port"):
                health_task = asyncio.create_task(self._start_health_server())

            # Start DevOps agent daemon
            devops_task = asyncio.create_task(self.devops_agent.start_daemon())

            # Start Empire agent if enabled
            empire_task = None
            if self.empire_agent:
                # Note: Empire agent might have different start method
                empire_task = asyncio.create_task(self._start_empire_agent())

            # Wait for tasks
            tasks = [devops_task]
            if health_task:
                tasks.append(health_task)
            if empire_task:
                tasks.append(empire_task)

            await asyncio.gather(*tasks, return_exceptions=True)

        except KeyboardInterrupt:
            logger.info("Daemon stopped by user")
        finally:
            self.is_running = False
            if self.devops_agent:
                self.devops_agent.stop_daemon()

    async def _start_health_server(self):
        """Start simple health check HTTP server."""
        try:
            from aiohttp import web

            async def health_handler(request):
                health = await self.run_health_check()
                return web.json_response(health)

            async def metrics_handler(request):
                if self.devops_agent:
                    metrics = self.devops_agent.get_operations_status()
                    return web.json_response(metrics)
                return web.json_response({"error": "DevOps agent not initialized"})

            app = web.Application()
            app.router.add_get('/health', health_handler)
            app.router.add_get('/metrics', metrics_handler)

            runner = web.AppRunner(app)
            await runner.setup()

            site = web.TCPSite(runner, 'localhost', self.config["health_check_port"])
            await site.start()

            logger.info(f"Health check server started on port {self.config['health_check_port']}")

            # Keep server running
            while self.is_running:
                await asyncio.sleep(1)

        except ImportError:
            logger.warning("aiohttp not available - health server disabled")
        except Exception as e:
            logger.error(f"Health server failed: {e}")

    async def _start_empire_agent(self):
        """Start the Empire agent (placeholder)."""
        # This would integrate with the existing Empire agent's start method
        logger.info("Empire agent integration - implementation needed")
        while self.is_running:
            await asyncio.sleep(10)

    def stop(self):
        """Stop all agents and services."""
        logger.info("Stopping DevOps Commander")
        self.is_running = False
        if self.devops_agent:
            self.devops_agent.stop_daemon()


async def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Autonomous Secure DevOps Commander",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python autonomous_devops_commander.py --daemon               # Run as daemon
  python autonomous_devops_commander.py --cycle                # Run single cycle
  python autonomous_devops_commander.py --health               # Show health status
  python autonomous_devops_commander.py --validate             # Validate environment
  python autonomous_devops_commander.py --config config.json   # Use custom config
        """
    )

    parser.add_argument("--daemon", action="store_true",
                       help="Run as autonomous daemon")
    parser.add_argument("--cycle", action="store_true",
                       help="Run single automation cycle")
    parser.add_argument("--health", action="store_true",
                       help="Check system health")
    parser.add_argument("--validate", action="store_true",
                       help="Validate environment and configuration")
    parser.add_argument("--config", metavar="PATH",
                       help="Path to configuration file")
    parser.add_argument("--audit", action="store_true",
                       help="Show recent audit log entries")

    args = parser.parse_args()

    if not any([args.daemon, args.cycle, args.health, args.validate, args.audit]):
        parser.print_help()
        return

    # Initialize commander
    commander = DevOpsCommander(args.config)

    try:
        if args.validate:
            validation = await commander.validate_environment()
            print(json.dumps(validation, indent=2))
            if not validation["valid"]:
                sys.exit(1)

        elif args.health:
            health = await commander.run_health_check()
            print(json.dumps(health, indent=2))
            if health["status"] != "healthy":
                sys.exit(1)

        elif args.cycle:
            results = await commander.run_single_cycle()
            print(json.dumps(results, indent=2))

        elif args.audit:
            await commander.initialize_agents()
            if commander.devops_agent:
                logs = commander.devops_agent.get_audit_log(limit=50)
                print(json.dumps(logs, indent=2))
            else:
                print("DevOps agent not initialized")

        elif args.daemon:
            await commander.start_daemon_mode()

    except Exception as e:
        logger.error(f"Command failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
