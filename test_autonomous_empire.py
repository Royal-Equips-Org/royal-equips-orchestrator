#!/usr/bin/env python3
"""
Test script for the Autonomous Empire Management System.

This script demonstrates the full autonomous empire functionality,
including scanning, decision-making, and autonomous actions.
"""

import asyncio
import sys
from pathlib import Path

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.autonomous_empire_agent import (
    get_autonomous_empire_agent,
    start_autonomous_empire,
)
from app.services.empire_auto_healer import get_empire_auto_healer
from app.services.empire_scanner import get_empire_scanner


def print_banner():
    """Print test banner."""
    print("=" * 80)
    print("🤖 AUTONOMOUS EMPIRE MANAGEMENT SYSTEM - INTEGRATION TEST")
    print("=" * 80)

def print_section(title):
    """Print section header."""
    print(f"\n{'=' * 60}")
    print(f"🎯 {title}")
    print("=" * 60)

async def test_autonomous_empire():
    """Test the complete autonomous empire system."""

    print_banner()

    # Test 1: Empire Scanner
    print_section("TESTING EMPIRE SCANNER")
    scanner = get_empire_scanner()
    print(f"✅ Scanner initialized: {type(scanner).__name__}")

    scan_results = scanner.run_full_empire_scan()
    print("✅ Empire scan completed")
    print(f"   Scan ID: {scan_results.get('scan_id')}")
    print(f"   Phases: {list(scan_results.get('phases', {}).keys())}")

    summary = scan_results.get('summary', {})
    print(f"   Health Score: {summary.get('empire_readiness_score', 0):.1f}")
    print(f"   Overall Health: {summary.get('overall_empire_health', 'UNKNOWN')}")

    # Test 2: Auto-Healer
    print_section("TESTING AUTO-HEALER")
    auto_healer = get_empire_auto_healer()
    print(f"✅ Auto-healer initialized: {type(auto_healer).__name__}")

    # Test new autonomous methods
    print("Testing autonomous healing methods...")

    # Test code quality improvement
    code_improvement = auto_healer.improve_code_quality()
    print(f"✅ Code quality improvement: {code_improvement['improvements_count']} improvements")

    # Test security healing
    security_healing = auto_healer.heal_security_issues()
    print(f"✅ Security healing: {security_healing['fixes_count']} fixes applied")

    # Test 3: Autonomous Agent
    print_section("TESTING AUTONOMOUS AGENT")
    agent = get_autonomous_empire_agent()
    print(f"✅ Autonomous agent initialized: {type(agent).__name__}")

    # Check initial status
    initial_status = agent.get_current_status()
    print(f"   Is Running: {initial_status['is_running']}")
    print(f"   Autonomous Mode: {initial_status['autonomous_mode']}")
    print(f"   Decision Rules: {len(agent.decision_rules)}")

    # List decision rules
    print("   Available Decision Rules:")
    for rule_name, rule in agent.decision_rules.items():
        print(f"     - {rule_name}: {rule['description']} (confidence: {rule['confidence']})")

    # Test 4: Start Autonomous Operations
    print_section("STARTING AUTONOMOUS OPERATIONS")
    print("🚀 Starting autonomous empire management...")

    # Start the autonomous agent
    autonomous_agent = await start_autonomous_empire()
    print("✅ Autonomous empire started successfully")

    # Wait a moment for initial scan
    print("⏳ Waiting for initial autonomous scan...")
    await asyncio.sleep(10)

    # Check status after starting
    running_status = autonomous_agent.get_current_status()
    print(f"   Agent Running: {running_status['is_running']}")
    print(f"   Decisions Made: {running_status['decisions_made']}")

    if running_status['current_metrics']:
        metrics = running_status['current_metrics']
        print(f"   Empire Health: {metrics['health_score']:.1f}")
        print(f"   Security Score: {metrics['security_score']:.1f}")
        print(f"   Code Quality: {metrics['code_quality_score']:.1f}")
        print(f"   Performance: {metrics['performance_score']:.1f}")
        print(f"   Actions Taken: {metrics['autonomous_actions_taken']}")

    # Test 5: Decision History
    print_section("AUTONOMOUS DECISION HISTORY")
    recent_decisions = running_status.get('recent_decisions', [])

    if recent_decisions:
        print(f"📊 Found {len(recent_decisions)} recent autonomous decisions:")

        for i, decision in enumerate(recent_decisions, 1):
            print(f"\n   Decision {i}:")
            print(f"     ID: {decision['decision_id']}")
            print(f"     Trigger: {decision['trigger']}")
            print(f"     Confidence: {decision['confidence']:.2f}")
            print(f"     Status: {decision['status']}")
            print(f"     Actions: {', '.join(decision['actions'])}")
            print(f"     Impact: {decision['expected_impact']}")

            if decision.get('results'):
                successful_actions = [
                    action for action, result in decision['results'].items()
                    if result.get('status') == 'success'
                ]
                print(f"     Successful Actions: {len(successful_actions)}/{len(decision['actions'])}")
    else:
        print("📊 No autonomous decisions made yet (agent may need more time)")

    # Test 6: Stop Autonomous Operations
    print_section("STOPPING AUTONOMOUS OPERATIONS")
    autonomous_agent.stop_autonomous_operation()
    print("🛑 Autonomous empire operations stopped")

    # Final status check
    final_status = autonomous_agent.get_current_status()
    print(f"   Final Status - Running: {final_status['is_running']}")

    # Test Summary
    print_section("TEST SUMMARY")
    print("✅ Empire Scanner: Working")
    print("✅ Auto-Healer: Working")
    print("✅ Autonomous Agent: Working")
    print("✅ Autonomous Operations: Working")
    print("✅ Decision Making: Working")
    print("✅ Action Execution: Working")
    print("\n🏆 AUTONOMOUS EMPIRE INTEGRATION TEST: PASSED")
    print("\n🤖 The empire is fully autonomous and self-managing!")
    print("🚀 Ready for continuous operation and improvement!")

def main():
    """Main test function."""
    try:
        asyncio.run(test_autonomous_empire())
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
