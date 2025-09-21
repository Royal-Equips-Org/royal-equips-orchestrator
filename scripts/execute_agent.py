#!/usr/bin/env python3

"""
Enhanced Agent execution script for Royal Equips Empire
"""

import asyncio
import argparse
import sys
import os
import logging
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from orchestrator.core.orchestrator import Orchestrator
from orchestrator.agents import ProductResearchAgent


async def execute_agent(agent_name: str, timeout: int = 300) -> bool:
    """Execute a specific agent with comprehensive monitoring."""
    try:
        # Set up logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        logger = logging.getLogger(__name__)
        
        logger.info(f"🚀 Starting execution of agent: {agent_name}")
        start_time = time.time()
        
        # Create orchestrator
        orchestrator = Orchestrator()
        
        # Register agent based on name
        agent = await _get_agent_instance(agent_name, logger)
        if not agent:
            logger.error(f"❌ Unknown or unavailable agent: {agent_name}")
            return False
        
        # Register with orchestrator
        orchestrator.register_agent(agent, interval=3600)  # 1 hour default
        
        # Pre-execution health check
        try:
            health = await agent.health_check()
            logger.info(f"🏥 Pre-execution health check: {json.dumps(health, default=str)}")
        except Exception as e:
            logger.warning(f"⚠️ Pre-execution health check failed: {e}")
        
        # Execute the agent with monitoring
        try:
            await asyncio.wait_for(agent.run(), timeout=timeout)
            execution_time = time.time() - start_time
            logger.info(f"✅ Agent {agent_name} executed successfully in {execution_time:.2f}s")
            
            # Post-execution health check
            try:
                health = await agent.health_check()
                logger.info(f"🏥 Post-execution health check: {json.dumps(health, default=str)}")
            except Exception as e:
                logger.warning(f"⚠️ Post-execution health check failed: {e}")
            
            return True
            
        except asyncio.TimeoutError:
            logger.error(f"⏰ Agent {agent_name} execution timed out after {timeout} seconds")
            return False
        except Exception as e:
            logger.error(f"💥 Agent {agent_name} execution failed: {e}")
            return False
            
    except Exception as e:
        print(f"💥 Failed to execute agent {agent_name}: {e}")
        return False


async def _get_agent_instance(agent_name: str, logger: logging.Logger):
    """Get agent instance based on name with error handling."""
    try:
        if agent_name == "product_research":
            from orchestrator.agents.product_research import ProductResearchAgent
            return ProductResearchAgent()
            
        elif agent_name == "inventory_pricing":
            from orchestrator.agents.inventory_pricing import InventoryPricingAgent
            return InventoryPricingAgent()
            
        elif agent_name == "order_fulfillment":
            try:
                from orchestrator.agents.order_management import OrderManagementAgent
                return OrderManagementAgent()
            except ImportError:
                logger.warning("OrderManagementAgent not available, using fallback")
                return None
                
        elif agent_name == "fraud_security":
            from orchestrator.agents.security import SecurityAgent
            return SecurityAgent()
            
        elif agent_name == "analytics":
            try:
                from orchestrator.agents.analytics import AnalyticsAgent
                return AnalyticsAgent()
            except ImportError:
                logger.warning("AnalyticsAgent not available, using fallback")
                return None
                
        elif agent_name == "marketing_automation":
            try:
                from orchestrator.agents.marketing_automation import MarketingAutomationAgent
                return MarketingAutomationAgent()
            except ImportError:
                logger.warning("MarketingAutomationAgent not available, using fallback")
                return None
                
        elif agent_name == "customer_support":
            try:
                from orchestrator.agents.customer_support import CustomerSupportAgent
                return CustomerSupportAgent()
            except ImportError:
                logger.warning("CustomerSupportAgent not available, using fallback")
                return None
                
        elif agent_name == "content_creation":
            try:
                from orchestrator.agents.content import ContentCreationAgent
                return ContentCreationAgent()
            except ImportError:
                logger.warning("ContentCreationAgent not available, using fallback")
                return None
                
        elif agent_name == "competitor_analysis":
            try:
                from orchestrator.agents.competitor import CompetitorAnalysisAgent
                return CompetitorAnalysisAgent()
            except ImportError:
                logger.warning("CompetitorAnalysisAgent not available, using fallback")
                return None
                
        elif agent_name == "supplier_management":
            try:
                from orchestrator.agents.supplier import SupplierManagementAgent
                return SupplierManagementAgent()
            except ImportError:
                logger.warning("SupplierManagementAgent not available, using fallback")
                return None
                
        else:
            logger.error(f"Unknown agent name: {agent_name}")
            return None
            
    except Exception as e:
        logger.error(f"Failed to instantiate agent {agent_name}: {e}")
        return None


async def list_available_agents() -> Dict[str, Dict[str, Any]]:
    """List all available agents with their status."""
    agents_info = {}
    
    agent_configs = {
        "product_research": {"tier": 1, "description": "Product research and trend analysis"},
        "inventory_pricing": {"tier": 1, "description": "Inventory management and dynamic pricing"},
        "order_fulfillment": {"tier": 1, "description": "Order processing and fulfillment"},
        "fraud_security": {"tier": 1, "description": "Security monitoring and fraud detection"},
        "analytics": {"tier": 1, "description": "Business analytics and reporting"},
        "marketing_automation": {"tier": 2, "description": "Marketing campaign automation"},
        "customer_support": {"tier": 2, "description": "Automated customer support"},
        "content_creation": {"tier": 2, "description": "Content generation and optimization"},
        "competitor_analysis": {"tier": 2, "description": "Competitor monitoring and analysis"},
        "supplier_management": {"tier": 2, "description": "Supplier relationship management"}
    }
    
    for agent_name, config in agent_configs.items():
        try:
            agent = await _get_agent_instance(agent_name, logging.getLogger(__name__))
            agents_info[agent_name] = {
                "available": agent is not None,
                "tier": config["tier"],
                "description": config["description"],
                "status": "ready" if agent else "not_implemented"
            }
        except Exception as e:
            agents_info[agent_name] = {
                "available": False,
                "tier": config["tier"],
                "description": config["description"],
                "status": f"error: {str(e)}"
            }
    
    return agents_info


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Execute Royal Equips Empire agents")
    parser.add_argument("--agent", help="Agent name to execute")
    parser.add_argument("--timeout", type=int, default=300, help="Execution timeout in seconds")
    parser.add_argument("--list", action="store_true", help="List available agents")
    parser.add_argument("--health-check", action="store_true", help="Run health check only")
    
    args = parser.parse_args()
    
    if args.list:
        # List available agents
        agents_info = asyncio.run(list_available_agents())
        print("🤖 Available Royal Equips Empire Agents:")
        print("=" * 50)
        
        for tier in [1, 2, 3]:
            tier_agents = {name: info for name, info in agents_info.items() if info["tier"] == tier}
            if tier_agents:
                tier_names = {1: "Critical", 2: "Growth", 3: "Scaling"}
                print(f"\n📊 Tier {tier} ({tier_names[tier]}) Agents:")
                for name, info in tier_agents.items():
                    status_emoji = "✅" if info["available"] else "❌"
                    print(f"  {status_emoji} {name}: {info['description']}")
                    if not info["available"]:
                        print(f"    Status: {info['status']}")
        
        sys.exit(0)
    
    if not args.agent:
        print("❌ Error: --agent is required (use --list to see available agents)")
        sys.exit(1)
    
    if args.health_check:
        # Run health check only
        success = asyncio.run(run_health_check(args.agent))
    else:
        # Execute the agent
        success = asyncio.run(execute_agent(args.agent, args.timeout))
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


async def run_health_check(agent_name: str) -> bool:
    """Run health check for a specific agent."""
    try:
        logger = logging.getLogger(__name__)
        agent = await _get_agent_instance(agent_name, logger)
        
        if not agent:
            print(f"❌ Agent {agent_name} not available")
            return False
        
        health = await agent.health_check()
        print(f"🏥 Health check for {agent_name}:")
        print(json.dumps(health, indent=2, default=str))
        
        return health.get("status") == "ok"
        
    except Exception as e:
        print(f"💥 Health check failed for {agent_name}: {e}")
        return False


if __name__ == "__main__":
    main()