#!/usr/bin/env python3
"""
Royal Equips Empire Startup Script
Initializes and starts the autonomous e-commerce empire
"""
import asyncio
import logging
import sys
from pathlib import Path

# Add orchestrator to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from orchestrator.api.empire_api import app
from orchestrator.services.empire_orchestrator import empire

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('empire.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

async def start_empire():
    """Start the Royal Equips Empire"""
    try:
        logger.info("🏰 Starting Royal Equips Empire...")

        # Initialize empire
        await empire.initialize_empire()

        # Start autonomous operations
        await empire.start_autonomous_operations()

        logger.info("✅ Royal Equips Empire started successfully!")
        logger.info(f"📊 Empire Status: {len(empire.agents)} agents initialized")
        logger.info(f"🎯 Target: ${empire.metrics.target_revenue:,.0f}")
        logger.info(f"💰 Current Revenue: ${empire.metrics.current_revenue:,.0f}")
        logger.info("🤖 Autonomous operations active")

        # Keep empire running
        while not empire.emergency_stop:
            await asyncio.sleep(60)

            # Log status every minute
            active_agents = len([a for a in empire.agents.values() if a.status.value == "active"])
            logger.info(f"👑 Empire Status: {active_agents}/{len(empire.agents)} agents active, ${empire.metrics.current_revenue:,.0f} revenue")

    except KeyboardInterrupt:
        logger.info("🛑 Empire shutdown requested")
    except Exception as e:
        logger.error(f"❌ Empire startup failed: {e}")
        raise
    finally:
        # Shutdown empire
        logger.info("🏰 Shutting down Royal Equips Empire...")
        for agent in empire.agents.values():
            await agent.shutdown()
        logger.info("✅ Empire shutdown completed")

def start_api_server():
    """Start the Empire API server"""
    import uvicorn

    logger.info("🌐 Starting Royal Equips Empire API server...")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=False
    )

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Royal Equips Empire")
    parser.add_argument("--mode", choices=['empire', 'api', 'both'], default='both',
                      help="Start empire, API, or both")
    parser.add_argument("--debug", action='store_true', help="Enable debug logging")

    args = parser.parse_args()

    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    if args.mode == 'empire':
        asyncio.run(start_empire())
    elif args.mode == 'api':
        start_api_server()
    else:
        # Start both empire and API
        import threading

        # Start API in background thread
        api_thread = threading.Thread(target=start_api_server, daemon=True)
        api_thread.start()

        # Start empire in main thread
        asyncio.run(start_empire())
