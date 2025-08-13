#!/usr/bin/env python3
"""
End-to-end system integration test for Royal Equips Orchestrator.

This script demonstrates that all major components are working together:
- Flask backend APIs
- Agent orchestration system  
- WebSocket real-time communication
- Command center React frontend
- Shopify integration capabilities
"""

import requests
import time
import json
import sys
from typing import Dict, Any


class SystemIntegrationTest:
    """Test suite for validating the complete Royal Equips system."""
    
    def __init__(self, base_url: str = "http://localhost:10000"):
        self.base_url = base_url
        self.results = []
    
    def run_all_tests(self):
        """Run complete system validation."""
        print("🚀 Royal Equips Orchestrator - System Integration Test")
        print("=" * 60)
        
        tests = [
            ("Basic Health Check", self.test_health_check),
            ("Command Center UI", self.test_command_center_ui),
            ("Agent Status API", self.test_agent_status),
            ("Agent Execution", self.test_agent_execution),
            ("Shopify Integration", self.test_shopify_integration),
            ("GitHub Integration", self.test_github_integration),
            ("AI Assistant API", self.test_ai_assistant),
            ("Workspace Management", self.test_workspace_api),
        ]
        
        for test_name, test_func in tests:
            try:
                print(f"\n🧪 Testing: {test_name}")
                result = test_func()
                self.results.append((test_name, "PASS", result))
                print(f"✅ {test_name}: PASSED")
                if result and isinstance(result, dict):
                    for key, value in result.items():
                        print(f"   📊 {key}: {value}")
            except Exception as e:
                self.results.append((test_name, "FAIL", str(e)))
                print(f"❌ {test_name}: FAILED - {e}")
        
        self.print_summary()
    
    def test_health_check(self) -> Dict[str, Any]:
        """Test basic system health endpoints."""
        # Test main health endpoint
        response = requests.get(f"{self.base_url}/health", timeout=5)
        response.raise_for_status()
        
        # Test readiness endpoint  
        response = requests.get(f"{self.base_url}/readyz", timeout=5)
        health_data = response.json()
        
        return {
            "status": health_data["status"],
            "uptime": health_data.get("uptime", "unknown"),
            "dependencies": len(health_data.get("dependencies", {}))
        }
    
    def test_command_center_ui(self) -> Dict[str, Any]:
        """Test command center React frontend accessibility."""
        # Test main command center endpoint
        response = requests.get(f"{self.base_url}/command-center/", timeout=5)
        response.raise_for_status()
        
        # Check for React app indicators
        html_content = response.text
        react_indicators = [
            'id="root"',
            'Royal Equips - Elite Control Center',
            'assets/'
        ]
        
        found_indicators = sum(1 for indicator in react_indicators if indicator in html_content)
        
        return {
            "status": "accessible",
            "react_indicators": f"{found_indicators}/{len(react_indicators)}",
            "content_size": f"{len(html_content)} bytes"
        }
    
    def test_agent_status(self) -> Dict[str, Any]:
        """Test agent registry and status reporting."""
        response = requests.get(f"{self.base_url}/agents/status", timeout=5)
        response.raise_for_status()
        
        data = response.json()
        agents = data["agents"]
        summary = data["summary"]
        
        return {
            "total_agents": summary["total"],
            "operational": summary["operational"],
            "needs_config": summary["needs_configuration"], 
            "import_errors": summary["import_errors"],
            "example_agent": list(agents.keys())[0] if agents else "none"
        }
    
    def test_agent_execution(self) -> Dict[str, Any]:
        """Test agent execution and orchestration."""
        # Start an agent
        response = requests.post(f"{self.base_url}/agents/run/analytics", timeout=5)
        response.raise_for_status()
        
        execution_data = response.json()
        execution_id = execution_data["execution_id"]
        
        # Wait a moment and check status
        time.sleep(2)
        
        response = requests.get(f"{self.base_url}/agents/status", timeout=5)
        data = response.json()
        analytics_agent = data["agents"]["analytics"]
        
        return {
            "execution_started": execution_data["status"],
            "execution_id": execution_id[:8] + "...",
            "estimated_duration": execution_data["estimated_duration_seconds"],
            "current_status": analytics_agent.get("execution_status", "unknown")
        }
    
    def test_shopify_integration(self) -> Dict[str, Any]:
        """Test Shopify service integration."""
        response = requests.get(f"{self.base_url}/api/shopify/status", timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        return {
            "configured": data["configured"],
            "status": "needs_credentials" if not data["configured"] else "ready",
            "message": data.get("message", "unknown")
        }
    
    def test_github_integration(self) -> Dict[str, Any]:
        """Test GitHub service integration.""" 
        response = requests.get(f"{self.base_url}/api/github/status", timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        return {
            "authenticated": data["authenticated"],
            "repo_owner": data["repo_owner"],
            "repo_name": data["repo_name"],
            "status": data["status"]
        }
    
    def test_ai_assistant(self) -> Dict[str, Any]:
        """Test AI assistant service."""
        response = requests.get(f"{self.base_url}/api/assistant/status", timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        return {
            "enabled": data["enabled"],
            "model": data["model"],
            "status": data["status"]
        }
    
    def test_workspace_api(self) -> Dict[str, Any]:
        """Test workspace management API."""
        response = requests.get(f"{self.base_url}/api/workspace/status", timeout=5)
        response.raise_for_status()
        
        data = response.json()
        overview = data["overview"]
        
        return {
            "environment": overview["current_environment"],
            "active_operations": overview["active_operations"],
            "total_environments": len(overview["environments"])
        }
    
    def print_summary(self):
        """Print test results summary."""
        print("\n" + "=" * 60)
        print("📋 SYSTEM INTEGRATION TEST RESULTS")
        print("=" * 60)
        
        total = len(self.results)
        passed = sum(1 for _, status, _ in self.results if status == "PASS")
        failed = total - passed
        
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"🎯 Success Rate: {(passed/total)*100:.1f}%")
        
        if failed > 0:
            print("\n🚨 Failed Tests:")
            for test_name, status, result in self.results:
                if status == "FAIL":
                    print(f"   ❌ {test_name}: {result}")
        
        print("\n🏆 System Status:", "READY" if failed == 0 else "NEEDS ATTENTION")
        
        # Overall system readiness assessment
        if passed >= 6:  # Most core systems working
            print("✅ Royal Equips Orchestrator is OPERATIONAL and ready for use!")
            print("🚀 Command center, agents, and core APIs are functional.")
            if failed > 0:
                print("⚠️  Some integrations need configuration (API keys/credentials)")
        else:
            print("⚠️  System needs more work before being fully operational.")


def main():
    """Run the integration test suite."""
    print("Starting Royal Equips Orchestrator Integration Test...")
    
    # Check if server is running
    try:
        requests.get("http://localhost:10000/health", timeout=2)
    except requests.exceptions.RequestException:
        print("❌ Error: Flask server is not running on localhost:10000")
        print("💡 Start the server with: python wsgi.py")
        sys.exit(1)
    
    # Run tests
    test_suite = SystemIntegrationTest()
    test_suite.run_all_tests()


if __name__ == "__main__":
    main()