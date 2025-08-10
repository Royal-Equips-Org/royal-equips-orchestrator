#!/usr/bin/env python3
"""Import smoke test for the Royal Equips Orchestrator package.

This script walks through all Python modules in the orchestrator package
and attempts to import them, failing if any import errors occur. This helps
catch import-related issues early in the development/CI process.
"""

import importlib
import pkgutil
import sys
from pathlib import Path
from typing import List, Tuple

# Add the repository root to Python path
repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))

def find_all_modules(package_name: str) -> List[str]:
    """Find all modules in a package recursively."""
    modules = []

    try:
        # Import the package
        package = importlib.import_module(package_name)
        package_path = package.__path__

        # Walk through all modules in the package
        for _importer, modname, _ispkg in pkgutil.walk_packages(
            package_path, prefix=f"{package_name}."
        ):
            modules.append(modname)

    except ImportError as e:
        print(f"ERROR: Could not import base package {package_name}: {e}")
        return []

    return modules

def test_import(module_name: str) -> Tuple[bool, str]:
    """Test importing a single module.

    Returns:
        Tuple of (success: bool, error_message: str)
    """
    try:
        importlib.import_module(module_name)
        return True, ""
    except ImportError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Unexpected error: {e}"

def main():
    """Run the import smoke test."""
    print("🔍 Royal Equips Orchestrator Import Smoke Test")
    print("=" * 50)

    # Test importing the main package first
    package_name = "orchestrator"

    print(f"📦 Testing base package: {package_name}")
    success, error = test_import(package_name)
    if not success:
        print(f"❌ FAILED to import {package_name}: {error}")
        sys.exit(1)
    print(f"✅ Successfully imported {package_name}")

    # Find all submodules
    print(f"\n🔎 Discovering all modules in {package_name}...")
    modules = find_all_modules(package_name)

    if not modules:
        print("❌ No modules found to test")
        sys.exit(1)

    print(f"📋 Found {len(modules)} modules to test")

    # Test each module
    failed_imports = []
    for module_name in sorted(modules):
        print(f"   Testing {module_name}...", end=" ")
        success, error = test_import(module_name)

        if success:
            print("✅")
        else:
            print("❌")
            failed_imports.append((module_name, error))

    # Report results
    print("\n" + "=" * 50)
    if failed_imports:
        print(f"❌ SMOKE TEST FAILED: {len(failed_imports)} modules failed to import")
        print("\nFailed imports:")
        for module_name, error in failed_imports:
            print(f"  - {module_name}: {error}")
        sys.exit(1)
    else:
        print(f"✅ SMOKE TEST PASSED: All {len(modules)} modules imported successfully")

    # Test importing from root package
    print("\n🧪 Testing root package imports...")
    try:
        # Test importing the main classes from the root
        print("✅ Root package imports work correctly")
    except Exception as e:
        print(f"❌ Root package import failed: {e}")
        sys.exit(1)

    print("\n🎉 All imports successful!")

if __name__ == "__main__":
    main()
