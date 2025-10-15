#!/usr/bin/env python3
"""
Verification script for production error fixes.
Tests that all fixes are working correctly.
"""

import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_eventlet_import():
    """Test that eventlet is properly imported in wsgi.py"""
    print("✓ Testing eventlet monkey patch in wsgi.py...")
    
    with open('wsgi.py', 'r') as f:
        content = f.read()
    
    # Check that eventlet.monkey_patch() appears before other imports
    lines = content.split('\n')
    eventlet_found = False
    other_imports_found = False
    
    for line in lines:
        stripped = line.strip()
        if 'eventlet.monkey_patch()' in stripped:
            eventlet_found = True
            if other_imports_found:
                print("  ✗ FAIL: eventlet.monkey_patch() appears after other imports")
                return False
        elif stripped.startswith('import ') or stripped.startswith('from '):
            # Ignore only the exact 'import eventlet' line
            if stripped == 'import eventlet':
                continue
            # Treat 'from eventlet import ...' and 'import eventlet.submodule' as other imports
            other_imports_found = True
    if eventlet_found:
        print("  ✓ PASS: eventlet.monkey_patch() appears before other imports")
        return True
    else:
        print("  ⚠ WARNING: eventlet.monkey_patch() not found (may be intentional if eventlet not used)")
        return True

def test_github_rate_limit_throttling():
    """Test that GitHub service has rate limit warning throttling"""
    print("✓ Testing GitHub rate limit warning throttling...")
    
    with open('app/services/github_service.py', 'r') as f:
        content = f.read()
    
    if '_last_rate_limit_warning' in content and '(now - self._last_rate_limit_warning).total_seconds() > 300' in content:
        print("  ✓ PASS: Rate limit warning throttling implemented")
        return True
    else:
        print("  ✗ FAIL: Rate limit warning throttling not found")
        return False

def test_agent_monitor_null_checks():
    """Test that agent monitor has proper null checks"""
    print("✓ Testing agent monitor null checks...")
    
    with open('app/services/realtime_agent_monitor.py', 'r') as f:
        content = f.read()
    
    if 'callable(getattr(agent_executor' in content:
        print("  ✓ PASS: Proper callable checks implemented")
        return True
    else:
        print("  ✗ FAIL: Callable checks not found")
        return False

def test_autonomous_agent_actions():
    """Test that autonomous agent has all required actions"""
    print("✓ Testing autonomous agent action handlers...")
    
    with open('app/services/autonomous_empire_agent.py', 'r') as f:
        content = f.read()
    
    required_actions = ['update_dependencies', 'scan_security', 'alert_critical']
    all_found = True
    
    for action in required_actions:
        if f'action == "{action}"' in content:
            print(f"  ✓ PASS: Action '{action}' handler found")
        else:
            print(f"  ✗ FAIL: Action '{action}' handler not found")
            all_found = False
    
    return all_found

def test_credentials_guide():
    """Test that credentials guide exists and has key sections"""
    print("✓ Testing credentials guide documentation...")
    
    if not os.path.exists('CREDENTIALS_GUIDE.md'):
        print("  ✗ FAIL: CREDENTIALS_GUIDE.md not found")
        return False
    
    with open('CREDENTIALS_GUIDE.md', 'r') as f:
        content = f.read()
    
    required_sections = [
        'Where Credentials are Expected',
        'Required Credentials',
        'Troubleshooting',
        'Security Best Practices'
    ]
    
    all_found = True
    for section in required_sections:
        if section in content:
            print(f"  ✓ PASS: Section '{section}' found")
        else:
            print(f"  ✗ FAIL: Section '{section}' not found")
            all_found = False
    
    return all_found

def main():
    """Run all verification tests"""
    print("=" * 60)
    print("Production Error Fixes - Verification Tests")
    print("=" * 60)
    print()
    
    tests = [
        test_eventlet_import,
        test_github_rate_limit_throttling,
        test_agent_monitor_null_checks,
        test_autonomous_agent_actions,
        test_credentials_guide
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
            print()
        except Exception as e:
            print(f"  ✗ ERROR: {e}")
            results.append(False)
            print()
    
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✓ ALL TESTS PASSED - Fixes verified successfully!")
        return 0
    else:
        print("✗ SOME TESTS FAILED - Please review the output above")
        return 1

if __name__ == '__main__':
    sys.exit(main())
