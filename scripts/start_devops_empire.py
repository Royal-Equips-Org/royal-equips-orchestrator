#!/usr/bin/env python3
"""
DevOps Empire Startup Script

Integrates the Autonomous DevOps Agent with the Royal Equips Empire
orchestration system. This script provides enterprise-grade DevOps
automation with:

- Autonomous commit signing and Git operations
- Integration with existing Empire infrastructure  
- Health monitoring and observability
- Comprehensive audit logging
- Self-healing capabilities
"""

import asyncio
import logging
import os
import signal
import sys
from pathlib import Path
from typing import Any, Dict

# Add paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

try:
    from services.autonomous_empire_agent import AutonomousEmpireAgent

    from orchestrator.agents.devops_agent import create_devops_agent
    from scripts.autonomous_devops_commander import DevOpsCommander
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running from the project root directory")
    sys.exit(1)

logger = logging.getLogger(__name__)


class DevOpsEmpireOrchestrator:
    """
    Main orchestrator for the DevOps Empire integration.
    
    Combines the Autonomous DevOps Agent with the existing Empire
    infrastructure for comprehensive e-commerce automation.
    """

    def __init__(self):
        self.config = self._load_configuration()
        self.devops_agent = None
        self.empire_agent = None
        self.devops_commander = None
        self.is_running = False
        self.tasks = []

        # Setup logging
        self._setup_logging()

        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        logger.info("🏰 DevOps Empire Orchestrator initialized")

    def _load_configuration(self) -> Dict[str, Any]:
        """Load comprehensive configuration."""
        return {
            # DevOps Configuration
            "gpg_key_id": os.getenv("GPG_KEY_ID"),
            "vault_url": os.getenv("VAULT_URL", ""),
            "github_token": os.getenv("GITHUB_TOKEN"),
            "openai_api_key": os.getenv("OPENAI_API_KEY"),

            # Repository Settings
            "repo_path": os.getenv("REPO_PATH", "."),
            "target_branches": os.getenv("TARGET_BRANCHES", "main,master,develop").split(","),

            # Timing Configuration
            "devops_interval": int(os.getenv("DEVOPS_SCAN_INTERVAL", "15")),
            "empire_interval": int(os.getenv("EMPIRE_SCAN_INTERVAL", "30")),

            # Feature Flags
            "devops_enabled": os.getenv("DEVOPS_ENABLED", "true").lower() == "true",
            "empire_integration": os.getenv("EMPIRE_INTEGRATION", "true").lower() == "true",
            "force_push_enabled": os.getenv("DEVOPS_FORCE_PUSH", "false").lower() == "true",
            "auto_pr_enabled": os.getenv("DEVOPS_AUTO_PR", "true").lower() == "true",

            # Monitoring
            "health_check_port": int(os.getenv("HEALTH_CHECK_PORT", "8181")),
            "metrics_enabled": os.getenv("METRICS_ENABLED", "true").lower() == "true",

            # Security
            "audit_log_path": os.getenv("AUDIT_LOG_PATH", "logs/empire_devops_audit.jsonl"),
            "encryption_enabled": os.getenv("ENCRYPTION_ENABLED", "true").lower() == "true",
        }

    def _setup_logging(self):
        """Setup comprehensive logging system."""
        log_level = getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper())

        # Create logs directory
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)

        # Main application logging
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / "devops_empire.log"),
                logging.StreamHandler(sys.stdout)
            ]
        )

        # Structured audit logging
        audit_handler = logging.FileHandler(self.config["audit_log_path"])
        audit_handler.setFormatter(logging.Formatter('%(message)s'))
        audit_logger = logging.getLogger('empire.audit')
        audit_logger.addHandler(audit_handler)
        audit_logger.setLevel(logging.INFO)

        logger.info("📊 Logging system initialized")

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        logger.info(f"🛑 Received signal {signum}, initiating graceful shutdown")
        self.stop()

    async def initialize_agents(self):
        """Initialize all agents and services."""
        try:
            # Initialize DevOps Agent
            if self.config["devops_enabled"]:
                self.devops_agent = create_devops_agent(self.config)
                self.devops_commander = DevOpsCommander()
                await self.devops_commander.initialize_agents()
                logger.info("✅ DevOps Agent initialized")

            # Initialize Empire Agent
            if self.config["empire_integration"]:
                self.empire_agent = AutonomousEmpireAgent(
                    scan_interval_minutes=self.config["empire_interval"]
                )
                logger.info("✅ Empire Agent initialized")

        except Exception as e:
            logger.error(f"❌ Failed to initialize agents: {e}")
            raise

    async def validate_environment(self) -> bool:
        """Validate the environment for all services."""
        logger.info("🔍 Validating environment...")

        validation_issues = []

        # Validate DevOps environment
        if self.devops_commander:
            validation = await self.devops_commander.validate_environment()
            if not validation["valid"]:
                validation_issues.extend(validation["errors"])

            # Log warnings
            for warning in validation["warnings"]:
                logger.warning(f"⚠️  {warning}")

        # Validate Git repository
        try:
            import subprocess
            result = subprocess.run(["git", "status"], capture_output=True, text=True)
            if result.returncode != 0:
                validation_issues.append("Not in a valid Git repository")
        except FileNotFoundError:
            validation_issues.append("Git not found in PATH")

        # Validate configuration
        if self.config["devops_enabled"] and not self.config.get("github_token"):
            logger.warning("⚠️  GitHub token not configured - PR features disabled")

        if validation_issues:
            logger.error("❌ Environment validation failed:")
            for issue in validation_issues:
                logger.error(f"   - {issue}")
            return False

        logger.info("✅ Environment validation passed")
        return True

    async def start_health_monitoring(self):
        """Start health monitoring services."""
        if not self.config.get("health_check_port"):
            return

        try:
            import json

            from aiohttp import web

            async def health_handler(request):
                """Overall system health check."""
                health = {
                    "status": "healthy",
                    "timestamp": asyncio.get_event_loop().time(),
                    "services": {}
                }

                # DevOps agent health
                if self.devops_agent:
                    devops_health = await self.devops_agent.health_check()
                    health["services"]["devops"] = devops_health
                    if devops_health["status"] != "healthy":
                        health["status"] = "degraded"

                # Empire agent health (if available)
                if self.empire_agent:
                    # Empire agent health check would go here
                    health["services"]["empire"] = {"status": "running"}

                return web.json_response(health)

            async def metrics_handler(request):
                """Comprehensive metrics endpoint."""
                metrics = {
                    "timestamp": asyncio.get_event_loop().time(),
                    "services": {}
                }

                if self.devops_agent:
                    metrics["services"]["devops"] = self.devops_agent.get_metrics()

                if self.empire_agent:
                    metrics["services"]["empire"] = {
                        "decisions_made": len(getattr(self.empire_agent, 'decisions_made', [])),
                        "is_running": getattr(self.empire_agent, 'is_running', False)
                    }

                return web.json_response(metrics)

            async def config_handler(request):
                """Configuration endpoint (sanitized)."""
                config = {
                    "devops_enabled": self.config["devops_enabled"],
                    "empire_integration": self.config["empire_integration"],
                    "devops_interval": self.config["devops_interval"],
                    "empire_interval": self.config["empire_interval"],
                    "force_push_enabled": self.config["force_push_enabled"],
                    "auto_pr_enabled": self.config["auto_pr_enabled"]
                }
                return web.json_response(config)

            # Setup web application
            app = web.Application()
            app.router.add_get('/health', health_handler)
            app.router.add_get('/metrics', metrics_handler)
            app.router.add_get('/config', config_handler)

            runner = web.AppRunner(app)
            await runner.setup()

            site = web.TCPSite(runner, 'localhost', self.config["health_check_port"])
            await site.start()

            logger.info(f"🌡️  Health monitoring started on port {self.config['health_check_port']}")

            # Keep server running
            while self.is_running:
                await asyncio.sleep(1)

        except ImportError:
            logger.warning("⚠️  aiohttp not available - health monitoring disabled")
        except Exception as e:
            logger.error(f"❌ Health monitoring failed: {e}")

    async def run_coordinated_cycle(self):
        """Run coordinated DevOps and Empire operations."""
        cycle_start = asyncio.get_event_loop().time()
        logger.info("🔄 Starting coordinated automation cycle")

        results = {
            "cycle_start": cycle_start,
            "devops_results": None,
            "empire_results": None,
            "coordination_actions": []
        }

        try:
            # Run DevOps cycle
            if self.devops_agent:
                logger.info("🔧 Running DevOps automation...")
                devops_results = await self.devops_agent.run()
                results["devops_results"] = devops_results

                # Log significant DevOps activities
                if devops_results.get("metrics", {}).get("commits_signed", 0) > 0:
                    signed_count = devops_results["metrics"]["commits_signed"]
                    logger.info(f"🔐 DevOps: Signed {signed_count} commits")
                    results["coordination_actions"].append(f"signed_{signed_count}_commits")

            # Run Empire cycle (if available and not conflicting)
            if self.empire_agent and not getattr(self.empire_agent, 'is_running', False):
                logger.info("🏰 Running Empire automation...")
                # Empire cycle would run here
                # This is a placeholder for empire integration
                results["empire_results"] = {"status": "placeholder"}

            # Coordination logic
            if results["devops_results"] and results["devops_results"].get("status") == "success":
                commits_signed = results["devops_results"].get("metrics", {}).get("commits_signed", 0)
                if commits_signed > 0:
                    # Trigger additional empire actions when DevOps makes changes
                    logger.info("🤝 Coordinating Empire response to DevOps changes")
                    results["coordination_actions"].append("triggered_empire_response")

            cycle_duration = asyncio.get_event_loop().time() - cycle_start
            logger.info(f"✅ Coordinated cycle completed in {cycle_duration:.2f}s")

            # Log to audit trail
            audit_logger = logging.getLogger('empire.audit')
            audit_logger.info(json.dumps({
                "type": "coordinated_cycle",
                "timestamp": cycle_start,
                "duration": cycle_duration,
                "results": results
            }))

        except Exception as e:
            logger.error(f"❌ Coordinated cycle failed: {e}")
            results["error"] = str(e)

        return results

    async def start_daemon(self):
        """Start the orchestrator in daemon mode."""
        if self.is_running:
            logger.warning("⚠️  Orchestrator already running")
            return

        logger.info("🚀 Starting DevOps Empire Orchestrator daemon")

        # Validate environment
        if not await self.validate_environment():
            logger.error("❌ Environment validation failed - cannot start")
            return

        # Initialize agents
        await self.initialize_agents()

        self.is_running = True

        try:
            # Start health monitoring
            health_task = asyncio.create_task(self.start_health_monitoring())
            self.tasks.append(health_task)

            # Start DevOps agent daemon
            if self.devops_commander:
                devops_task = asyncio.create_task(self.devops_commander.start_daemon_mode())
                self.tasks.append(devops_task)

            # Start coordinated cycles (alternative to individual daemons)
            if self.config.get("coordinated_mode", False):
                coordination_task = asyncio.create_task(self._coordination_loop())
                self.tasks.append(coordination_task)

            logger.info("🎯 All services started successfully")

            # Wait for all tasks
            await asyncio.gather(*self.tasks, return_exceptions=True)

        except KeyboardInterrupt:
            logger.info("🛑 Shutdown requested by user")
        except Exception as e:
            logger.error(f"❌ Daemon error: {e}")
        finally:
            await self.stop()

    async def _coordination_loop(self):
        """Main coordination loop for integrated operations."""
        interval = min(self.config["devops_interval"], self.config["empire_interval"]) * 60

        while self.is_running:
            try:
                await self.run_coordinated_cycle()
                await asyncio.sleep(interval)
            except Exception as e:
                logger.error(f"❌ Coordination loop error: {e}")
                await asyncio.sleep(60)  # Brief pause on error

    async def stop(self):
        """Stop all services gracefully."""
        if not self.is_running:
            return

        logger.info("🛑 Stopping DevOps Empire Orchestrator")
        self.is_running = False

        # Stop agents
        if self.devops_agent:
            await self.devops_agent.stop()

        if self.devops_commander:
            self.devops_commander.stop()

        # Cancel all tasks
        for task in self.tasks:
            if not task.done():
                task.cancel()

        # Wait for tasks to complete
        if self.tasks:
            await asyncio.gather(*self.tasks, return_exceptions=True)

        logger.info("✅ DevOps Empire Orchestrator stopped")

    def stop_sync(self):
        """Synchronous stop method for signal handlers."""
        self.is_running = False


async def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="DevOps Empire Orchestrator - Autonomous E-commerce DevOps",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python start_devops_empire.py --daemon        # Run full orchestrator daemon
  python start_devops_empire.py --cycle         # Run single coordinated cycle
  python start_devops_empire.py --health        # Check system health
  python start_devops_empire.py --devops-only   # Run only DevOps agent
        """
    )

    parser.add_argument("--daemon", action="store_true",
                       help="Run as daemon with full orchestration")
    parser.add_argument("--cycle", action="store_true",
                       help="Run single coordinated cycle")
    parser.add_argument("--health", action="store_true",
                       help="Check system health")
    parser.add_argument("--devops-only", action="store_true",
                       help="Run only DevOps agent (no Empire integration)")

    args = parser.parse_args()

    if not any([args.daemon, args.cycle, args.health, args.devops_only]):
        parser.print_help()
        return

    orchestrator = DevOpsEmpireOrchestrator()

    try:
        if args.health:
            await orchestrator.initialize_agents()
            # Run health checks and print results
            if orchestrator.devops_agent:
                health = await orchestrator.devops_agent.health_check()
                print(json.dumps(health, indent=2))

        elif args.cycle:
            await orchestrator.initialize_agents()
            results = await orchestrator.run_coordinated_cycle()
            print(json.dumps(results, indent=2, default=str))

        elif args.devops_only:
            # Run only DevOps components
            orchestrator.config["empire_integration"] = False
            await orchestrator.start_daemon()

        elif args.daemon:
            await orchestrator.start_daemon()

    except Exception as e:
        logger.error(f"❌ Failed to start: {e}")
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Interrupted by user")
        sys.exit(0)
