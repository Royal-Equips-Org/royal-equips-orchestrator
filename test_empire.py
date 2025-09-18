#!/usr/bin/env python3
"""
Test the Royal Equips Empire System
"""
import sys
import asyncio
import logging
from pathlib import Path

# Add orchestrator to path
sys.path.insert(0, str(Path(__file__).parent))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_empire():
    """Test empire initialization and basic functionality"""
    try:
        logger.info("🧪 Testing Royal Equips Empire...")
        
        from orchestrator.services.empire_orchestrator import EmpireOrchestrator
        logger.info("✅ Empire orchestrator imported successfully")
        
        # Create empire instance
        empire = EmpireOrchestrator()
        logger.info(f"🏰 Empire instance created: {empire.name}")
        logger.info(f"📊 Target revenue: ${empire.metrics.target_revenue:,.0f}")
        logger.info(f"🤖 Initial agents: {empire.metrics.total_agents}")
        
        # Test initialization
        await empire.initialize_empire()
        logger.info(f"✅ Empire initialized with {empire.metrics.total_agents} agents")
        
        # Test agent status
        status = await empire.get_empire_status()
        logger.info(f"📈 Empire status retrieved: {len(status['agent_statuses'])} agents")
        
        # Test market opportunities
        collector = empire.agents.get('multi_platform_collector')
        if collector:
            opportunities = await collector.get_product_opportunities(limit=3)
            logger.info(f"🔍 Found {len(opportunities)} market opportunities")
        
        logger.info("🎉 Empire test completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Empire test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_empire())