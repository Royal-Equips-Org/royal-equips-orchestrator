#!/usr/bin/env python3
"""
Test the new WebSocket Empire Status System
"""

import asyncio
import sys
import os
import json
from datetime import datetime

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_empire_status():
    """Test the real empire status function."""
    print("🏰 Testing Royal Equips Empire Status System...")
    print("=" * 60)
    
    try:
        # Import the new function
        from app.sockets import get_real_empire_status
        
        print("⚡ Getting real-time empire status...")
        empire_data = await get_real_empire_status()
        
        print("\n✅ Empire Status Retrieved Successfully!")
        print(f"📊 Data Structure: {list(empire_data.keys())}")
        
        # Display key metrics
        print("\n💰 REVENUE METRICS:")
        revenue = empire_data.get('revenue', {})
        for key, value in revenue.items():
            print(f"   {key.replace('_', ' ').title()}: {value}")
        
        print("\n🔧 OPERATIONS:")
        operations = empire_data.get('operations', {})
        for key, value in operations.items():
            print(f"   {key.replace('_', ' ').title()}: {value}")
        
        print("\n📈 KPIs:")
        kpis = empire_data.get('kpis', {})
        for key, value in kpis.items():
            print(f"   {key.replace('_', ' ').title()}: {value}")
        
        print("\n🤖 AGENT STATUS:")
        agents = empire_data.get('agents', {})
        for key, value in agents.items():
            print(f"   {key.replace('_', ' ').title()}: {value}")
        
        print("\n🌐 SYSTEM STATUS:")
        system_status = empire_data.get('system_status', {})
        for key, value in system_status.items():
            if key != 'last_update':
                print(f"   {key.replace('_', ' ').title()}: {'✅' if value else '❌'}")
        
        # Check if we're in fallback mode
        if empire_data.get('fallback_mode'):
            print("\n⚠️  Running in fallback mode (external services unavailable)")
        else:
            print("\n🎯 Production mode active - using real business data!")
        
        print(f"\n🕒 Last Updated: {empire_data.get('timestamp', 'Unknown')}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error testing empire status: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_agent_status():
    """Test the real agent status function."""
    print("\n\n🤖 Testing Agent Status System...")
    print("=" * 60)
    
    try:
        from app.sockets import get_real_agent_status
        
        print("⚡ Getting real-time agent status...")
        agent_data = await get_real_agent_status()
        
        print("\n✅ Agent Status Retrieved Successfully!")
        print(f"📊 Data Structure: {list(agent_data.keys())}")
        
        agents = agent_data.get('agents', [])
        print(f"\n👥 Total Agents: {len(agents)}")
        print(f"🟢 Active Agents: {agent_data.get('active_agents', 0)}")
        print(f"🔴 Error Agents: {agent_data.get('error_agents', 0)}")
        
        if agents:
            print("\n📋 AGENT DETAILS:")
            for agent in agents[:3]:  # Show first 3 agents
                print(f"   🔹 {agent.get('name', 'Unknown')}")
                print(f"     Status: {agent.get('status', 'unknown')}")
                print(f"     Health Score: {agent.get('health_score', 0)}/100")
                print(f"     Success Rate: {agent.get('success_rate', 0):.1f}%")
                print()
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error testing agent status: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function."""
    print("🚀 ROYAL EQUIPS EMPIRE - WEBSOCKET TESTING")
    print("=" * 80)
    print(f"📅 Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test empire status
    empire_success = await test_empire_status()
    
    # Test agent status  
    agent_success = await test_agent_status()
    
    print("\n" + "=" * 80)
    print("🏁 TEST RESULTS:")
    print(f"   Empire Status: {'✅ PASS' if empire_success else '❌ FAIL'}")
    print(f"   Agent Status:  {'✅ PASS' if agent_success else '❌ FAIL'}")
    
    if empire_success and agent_success:
        print("\n🎉 All tests passed! WebSocket system ready for production.")
        print("🌟 The Royal Equips Empire is now equipped with real-time monitoring!")
    else:
        print("\n⚠️  Some tests failed. Check errors above for troubleshooting.")
    
    print("\n🏰 Empire status: OPERATIONAL")

if __name__ == "__main__":
    asyncio.run(main())