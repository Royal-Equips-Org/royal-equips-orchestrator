"""
Empire Startup Service - Automatic Autonomous Empire Initialization

This service automatically starts the autonomous empire management system
when the application boots up, ensuring continuous empire monitoring and
improvement without manual intervention.
"""

import asyncio
import logging
import threading
import time

from .autonomous_empire_agent import (
    start_autonomous_empire,
)

logger = logging.getLogger(__name__)

class EmpireStartupService:
    """
    Service responsible for automatically starting the autonomous empire.
    """

    def __init__(self):
        self.startup_completed = False
        self.autonomous_agent = None
        self.startup_thread = None

    def auto_start_empire(self, delay_seconds: int = 10):
        """
        Automatically start the autonomous empire with a delay.
        
        Args:
            delay_seconds: Delay before starting the empire (allows app to fully boot)
        """
        if self.startup_completed:
            logger.info("Empire startup already completed")
            return

        logger.info(f"🚀 Scheduling autonomous empire startup in {delay_seconds} seconds")

        def delayed_startup():
            time.sleep(delay_seconds)
            self._perform_startup()

        self.startup_thread = threading.Thread(target=delayed_startup, daemon=True)
        self.startup_thread.start()

    def _perform_startup(self):
        """Perform the actual empire startup."""
        try:
            logger.info("🏛️ Starting Autonomous Empire Management System")

            # Create event loop for the autonomous agent
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            async def start_empire():
                self.autonomous_agent = await start_autonomous_empire()
                logger.info("✅ Autonomous Empire System started successfully")
                return self.autonomous_agent

            # Start the empire
            self.autonomous_agent = loop.run_until_complete(start_empire())

            # Keep the loop running for the autonomous agent
            def keep_running():
                try:
                    loop.run_forever()
                except Exception as e:
                    logger.error(f"Empire loop error: {e}")

            # Run loop in background thread
            loop_thread = threading.Thread(target=keep_running, daemon=True)
            loop_thread.start()

            self.startup_completed = True

            # Log startup success
            logger.info("🎯 Autonomous Empire is now fully operational")
            logger.info("🔄 Continuous scanning and improvement enabled")
            logger.info("🧠 Intelligent decision-making activated")
            logger.info("⚡ Self-healing and optimization running")

        except Exception as e:
            logger.error(f"❌ Failed to start autonomous empire: {e}")
            # Don't raise - let the application continue running

    def get_startup_status(self) -> dict:
        """Get the current startup status."""
        return {
            'startup_completed': self.startup_completed,
            'autonomous_agent_active': self.autonomous_agent is not None,
            'agent_status': self.autonomous_agent.get_current_status() if self.autonomous_agent else None
        }


# Global startup service instance
_startup_service = None

def get_empire_startup_service() -> EmpireStartupService:
    """Get or create the global empire startup service."""
    global _startup_service
    if _startup_service is None:
        _startup_service = EmpireStartupService()
    return _startup_service

def auto_start_autonomous_empire(delay_seconds: int = 10):
    """
    Convenience function to automatically start the autonomous empire.
    
    This should be called during application initialization.
    """
    startup_service = get_empire_startup_service()
    startup_service.auto_start_empire(delay_seconds)

    logger.info("🤖 Autonomous Empire startup initiated")
    logger.info("📊 Continuous empire monitoring enabled")
    logger.info("🏗️ Self-building and self-managing empire activated")
