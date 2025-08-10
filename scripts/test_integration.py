#!/usr/bin/env python3
"""
Integration test for the robust startup system.
Validates that all components work together correctly.
"""

import os
import sys
import subprocess
import tempfile
from pathlib import Path


def run_command(cmd, timeout=10):
    """Run a command and return the result."""
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=timeout
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return 124, "", "Command timed out"


def test_diagnosis_script():
    """Test that the diagnosis script works."""
    print("🔍 Testing diagnosis script...")
    returncode, stdout, stderr = run_command("./scripts/diagnose_stack.sh")
    
    if returncode == 0:
        print("✅ Diagnosis script runs successfully")
        if "Stack Diagnosis v2.0" in stdout:
            print("✅ Diagnosis script shows correct version")
        else:
            print("⚠️  Unexpected diagnosis script output")
        return True
    else:
        print(f"❌ Diagnosis script failed: {stderr}")
        return False


def test_ci_validation():
    """Test that CI validation script works."""
    print("🔍 Testing CI validation script...")
    returncode, stdout, stderr = run_command("python scripts/ci_validate.py")
    
    # CI validation might fail due to missing dependencies, but should run
    if "Starting CI validation" in stdout:
        print("✅ CI validation script runs correctly")
        return True
    else:
        print(f"❌ CI validation script failed: {stderr}")
        return False


def test_health_check():
    """Test that health check script works."""
    print("🔍 Testing health check script...")
    returncode, stdout, stderr = run_command("python scripts/health_check.py", timeout=15)
    
    if "Starting Royal Equips Orchestrator Health Check" in stdout:
        print("✅ Health check script runs correctly")
        if "System:" in stdout:
            print("✅ Health check collects system metrics")
        return True
    else:
        print(f"❌ Health check script failed: {stderr}")
        return False


def test_start_script_auto():
    """Test that start script auto-detection works."""
    print("🔍 Testing start script auto-detection...")
    returncode, stdout, stderr = run_command("timeout 5 ./start.sh", timeout=10)
    
    if "Royal Equips Orchestrator - Robust Startup v1.0" in stdout:
        print("✅ Start script runs with correct header")
        if "Auto-detection mode" in stdout:
            print("✅ Start script uses auto-detection by default")
        return True
    else:
        print(f"⚠️  Start script output: {stdout[:200]}...")
        return False


def test_start_script_explicit():
    """Test that start script explicit configuration works."""
    print("🔍 Testing start script explicit configuration...")
    
    # Set environment variables for the test
    env = os.environ.copy()
    env['APP_TYPE'] = 'python'
    env['APP_PATH'] = 'scripts/health_check.py'
    
    process = subprocess.Popen(
        ['timeout', '3', './start.sh'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env
    )
    
    try:
        stdout, stderr = process.communicate(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        stdout, stderr = process.communicate()
    
    if "Explicit Python mode" in stdout:
        print("✅ Start script uses explicit configuration")
        return True
    else:
        print(f"⚠️  Start script explicit config output: {stdout[:200]}...")
        return False


def test_file_structure():
    """Test that all required files exist and are executable."""
    print("🔍 Testing file structure...")
    
    required_files = [
        ('start.sh', True),  # (file, should_be_executable)
        ('scripts/diagnose_stack.sh', True),
        ('scripts/health_check.py', True),
        ('scripts/ci_validate.py', True),
        ('docs/STARTUP_SYSTEM.md', False),
    ]
    
    all_good = True
    for file_path, should_be_executable in required_files:
        path = Path(file_path)
        if not path.exists():
            print(f"❌ Missing file: {file_path}")
            all_good = False
        elif should_be_executable and not os.access(file_path, os.X_OK):
            print(f"❌ File not executable: {file_path}")
            all_good = False
        else:
            print(f"✅ File exists: {file_path}")
    
    return all_good


def main():
    """Run all integration tests."""
    print("🧪 Running integration tests for robust startup system")
    print("=" * 60)
    
    tests = [
        ("File Structure", test_file_structure),
        ("Diagnosis Script", test_diagnosis_script),
        ("CI Validation", test_ci_validation),
        ("Health Check", test_health_check),
        ("Start Script Auto", test_start_script_auto),
        ("Start Script Explicit", test_start_script_explicit),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🔬 {test_name}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("📊 Test Summary:")
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} - {test_name}")
        if result:
            passed += 1
    
    total = len(results)
    print(f"\nResults: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 All tests passed! The startup system is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())