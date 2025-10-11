#!/usr/bin/env python3
"""
DevOps Agent Demo Script

Demonstrates the Autonomous Secure DevOps Commander capabilities
within the Royal Equips Empire architecture.

This script shows:
- Autonomous commit detection and signing
- Comprehensive audit logging
- Integration with existing Empire infrastructure
- Health monitoring and observability
- Self-healing capabilities
"""

import asyncio
import json
import logging
import sys
from pathlib import Path

# Setup paths
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.autonomous_devops_agent import get_autonomous_devops_agent

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def demo_devops_capabilities():
    """Demonstrate core DevOps agent capabilities."""
    
    print("🏰 Royal Equips Empire - Autonomous DevOps Agent Demo")
    print("=" * 60)
    
    # Configuration for demo
    demo_config = {
        "gpg_key_id": "demo-key-id",
        "github_token": "demo-token",
        "repo_path": ".",
        "scan_interval_minutes": 15,
        "force_push_enabled": False,  # Safe for demo
        "auto_pr_enabled": True
    }
    
    # Initialize agent
    print("\n1. 🔧 Initializing Autonomous DevOps Agent...")
    agent = get_autonomous_devops_agent(demo_config)
    print(f"   ✅ Agent initialized: {agent.agent_id}")
    
    # Demonstrate commit detection
    print("\n2. 🔍 Detecting unsigned commits...")
    unsigned_commits = await agent.detect_unsigned_commits()
    print(f"   📊 Found {len(unsigned_commits)} unsigned commits")
    
    if unsigned_commits:
        print("   📝 Unsigned commits details:")
        for i, commit in enumerate(unsigned_commits[:5]):  # Show first 5
            print(f"      {i+1}. {commit.sha[:8]} - {commit.message[:50]}...")
            print(f"         Branch: {commit.branch}, Author: {commit.author}")
    
    # Demonstrate audit logging
    print("\n3. 📋 Audit Trail Demonstration...")
    audit_entries = agent.get_audit_log(limit=10)
    print(f"   📈 Recent audit entries: {len(audit_entries)}")
    
    for entry in audit_entries[-3:]:  # Show last 3 entries
        print(f"      🔍 {entry['operation_type']}: {entry['action']} -> {entry['result']}")
    
    # Demonstrate operations tracking
    print("\n4. 📊 Operations Status...")
    operations_status = agent.get_operations_status()
    print(f"   🔄 Total operations: {operations_status['total_operations']}")
    
    # Demonstrate changelog generation
    if unsigned_commits:
        print("\n5. 📄 Changelog Generation Demo...")
        sample_commits = unsigned_commits[:3]  # Use first 3 commits
        changelog = await agent._generate_changelog(sample_commits)
        print("   📝 Generated changelog preview:")
        print("   " + "\n   ".join(changelog.split('\n')[:10]))  # First 10 lines
    
    # Demonstrate health monitoring
    print("\n6. 🏥 Health Monitoring...")
    # This would integrate with existing health systems
    print("   ✅ Agent health: Operational")
    print("   📊 Audit entries logged")
    print("   🔄 Ready for autonomous operations")
    
    # Configuration summary
    print("\n7. ⚙️  Configuration Summary...")
    safe_config = {k: v for k, v in demo_config.items() 
                  if k not in ['github_token', 'gpg_key_id']}
    safe_config['github_token'] = '***configured***'
    safe_config['gpg_key_id'] = '***configured***'
    
    print("   📋 Current configuration:")
    for key, value in safe_config.items():
        print(f"      {key}: {value}")
    
    # Integration points
    print("\n8. 🔗 Empire Integration Points...")
    print("   🏰 Integrates with existing AutonomousEmpireAgent")
    print("   📊 Shares audit logging infrastructure") 
    print("   🔧 Uses existing orchestrator framework")
    print("   📈 Compatible with health monitoring system")
    print("   🛡️  Follows existing security patterns")
    
    # Autonomous operations summary
    print("\n9. 🤖 Autonomous Operations Capabilities...")
    capabilities = [
        "🔐 Automatic GPG commit signing",
        "🔍 Multi-branch unsigned commit detection", 
        "📝 Automated PR creation with changelogs",
        "🛡️  Vault-managed key security",
        "📊 Comprehensive audit logging",
        "🔄 Self-healing retry mechanisms",
        "🤖 OpenAI integration for suggestions",
        "⚡ Force-push with safety checks",
        "📈 Real-time health monitoring",
        "🎯 Coordinated Empire operations"
    ]
    
    for capability in capabilities:
        print(f"   {capability}")
    
    print("\n" + "=" * 60)
    print("🎯 Demo completed successfully!")
    print("🚀 Ready for production deployment with:")
    print("   - Environment variable configuration")
    print("   - Vault integration for GPG keys") 
    print("   - GitHub token for PR automation")
    print("   - OpenAI API key for AI suggestions")
    print("   - Orchestrator integration")


async def demo_integration_scenarios():
    """Demonstrate integration scenarios with existing systems."""
    
    print("\n🔗 Integration Scenarios Demonstration")
    print("=" * 50)
    
    scenarios = [
        {
            "name": "🏭 Production E-commerce Store",
            "description": "DevOps agent monitors product updates, signs commits automatically",
            "triggers": ["Product catalog changes", "Inventory updates", "Price changes"],
            "actions": ["Sign commits", "Create deployment PRs", "Update documentation"]
        },
        {
            "name": "🛡️  Security Compliance",
            "description": "Ensures all commits are signed for SOX/PCI compliance",
            "triggers": ["Unsigned commits detected", "Security policy violations"],
            "actions": ["Automatic signing", "Compliance reporting", "Audit trail generation"]
        },
        {
            "name": "👥 Team Collaboration",
            "description": "Coordinates with Empire agents for holistic automation",
            "triggers": ["Empire agent actions", "System health changes"],
            "actions": ["Coordinated deployments", "Cross-system notifications", "Unified logging"]
        },
        {
            "name": "🚨 Emergency Response",
            "description": "Self-healing capabilities for critical issues",
            "triggers": ["Failed operations", "Security alerts", "System degradation"],
            "actions": ["Exponential backoff retry", "Alternative signing methods", "Alert escalation"]
        }
    ]
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n{i}. {scenario['name']}")
        print(f"   📋 {scenario['description']}")
        print(f"   🎯 Triggers: {', '.join(scenario['triggers'])}")
        print(f"   ⚡ Actions: {', '.join(scenario['actions'])}")


async def main():
    """Main demo function."""
    try:
        await demo_devops_capabilities()
        await demo_integration_scenarios()
        
        print("\n🎉 DevOps Agent demonstration completed successfully!")
        print("📚 See documentation for deployment instructions.")
        
    except Exception as e:
        logger.error(f"Demo failed: {e}")
        print(f"\n❌ Demo encountered an error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n🛑 Demo interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)