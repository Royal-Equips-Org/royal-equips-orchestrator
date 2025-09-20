#!/usr/bin/env python3
"""
Royal Equips Empire - Comprehensive System Test
Tests all core agents and validates the autonomous e-commerce platform.
"""

import asyncio
import logging
import sys
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def test_product_research_agent():
    """Test ProductResearchAgent functionality."""
    print("\n🔍 Testing ProductResearchAgent...")
    try:
        from orchestrator.agents.product_research import ProductResearchAgent
        
        agent = ProductResearchAgent()
        await agent.initialize()
        await agent.run()
        
        print(f"✅ ProductResearchAgent: {agent.discoveries_count} products discovered")
        print(f"   Performance Score: {agent.performance_score}")
        print(f"   Success Rate: {agent.success_rate}%")
        
        # Test specific methods
        top_products = await agent.get_top_products(3)
        print(f"   Top Products: {len(top_products)} high-scoring products")
        
        return True
        
    except Exception as e:
        print(f"❌ ProductResearchAgent failed: {e}")
        return False

async def test_marketing_automation_agent():
    """Test MarketingAutomationAgent functionality."""
    print("\n📧 Testing MarketingAutomationAgent...")
    try:
        from orchestrator.agents.marketing_automation import MarketingAutomationAgent
        
        agent = MarketingAutomationAgent()
        await agent.initialize()
        await agent.run()
        
        print(f"✅ MarketingAutomationAgent: {agent.discoveries_count} campaigns executed")
        print(f"   Performance Score: {agent.performance_score}")
        print(f"   Success Rate: {agent.success_rate}%")
        print(f"   Campaign Log: {len(agent.campaign_log)} campaigns")
        
        return True
        
    except Exception as e:
        print(f"❌ MarketingAutomationAgent failed: {e}")
        return False

async def test_order_fulfillment_agent():
    """Test OrderFulfillmentAgent functionality."""
    print("\n📦 Testing OrderFulfillmentAgent...")
    try:
        from orchestrator.agents.order_management import OrderFulfillmentAgent
        
        agent = OrderFulfillmentAgent()
        await agent.initialize()
        await agent.run()
        
        print(f"✅ OrderFulfillmentAgent: {agent.discoveries_count} orders processed")
        print(f"   Performance Score: {agent.performance_score}")
        print(f"   Success Rate: {agent.success_rate}%")
        print(f"   High-Risk Orders: {len(agent.high_risk_orders)}")
        
        return True
        
    except Exception as e:
        print(f"❌ OrderFulfillmentAgent failed: {e}")
        return False

async def test_inventory_pricing_agent():
    """Test InventoryPricingAgent functionality."""
    print("\n💰 Testing InventoryPricingAgent...")
    try:
        from orchestrator.agents.inventory_pricing import InventoryPricingAgent
        
        agent = InventoryPricingAgent()
        await agent.initialize()
        await agent.run()
        
        print(f"✅ InventoryPricingAgent: {agent.discoveries_count} pricing actions")
        print(f"   Performance Score: {agent.performance_score}")
        print(f"   Success Rate: {agent.success_rate}%")
        print(f"   Inventory Items: {len(agent.inventory_items)}")
        
        return True
        
    except Exception as e:
        print(f"❌ InventoryPricingAgent failed: {e}")
        return False

async def test_agent_base_functionality():
    """Test AgentBase functionality and health checks."""
    print("\n🏗️ Testing AgentBase functionality...")
    try:
        from orchestrator.agents.product_research import ProductResearchAgent
        
        agent = ProductResearchAgent()
        await agent.initialize()
        
        # Test health check
        health = await agent.health_check()
        print(f"✅ AgentBase Health Check: {health['status']}")
        print(f"   Agent Type: {health['agent_type']}")
        print(f"   Autonomous Mode: {health['autonomous_mode']}")
        
        # Test performance metrics
        await agent._update_performance_metrics()
        print(f"   Performance Score: {await agent.get_performance_score()}")
        print(f"   Success Rate: {await agent.get_success_rate()}%")
        
        return True
        
    except Exception as e:
        print(f"❌ AgentBase functionality failed: {e}")
        return False

async def run_comprehensive_test():
    """Run comprehensive system test."""
    print("🏰 ROYAL EQUIPS EMPIRE - COMPREHENSIVE SYSTEM TEST")
    print("=" * 60)
    print(f"Test started at: {datetime.now().isoformat()}")
    
    tests = [
        test_agent_base_functionality,
        test_product_research_agent,
        test_marketing_automation_agent,
        test_order_fulfillment_agent,
        test_inventory_pricing_agent,
    ]
    
    results = []
    for test in tests:
        try:
            result = await test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            results.append(False)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    success_rate = (passed / total) * 100
    
    print(f"Tests Passed: {passed}/{total}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 SYSTEM STATUS: OPERATIONAL")
        print("   The Royal Equips Empire is ready for autonomous operation!")
    elif success_rate >= 60:
        print("⚠️  SYSTEM STATUS: PARTIALLY OPERATIONAL")
        print("   Some components need attention before full deployment.")
    else:
        print("🚨 SYSTEM STATUS: NEEDS MAINTENANCE")
        print("   Critical components require fixing before deployment.")
    
    print(f"\nTest completed at: {datetime.now().isoformat()}")
    return success_rate >= 80

if __name__ == "__main__":
    success = asyncio.run(run_comprehensive_test())
    sys.exit(0 if success else 1)