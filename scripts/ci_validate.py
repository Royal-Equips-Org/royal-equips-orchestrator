#!/usr/bin/env python3
"""
CI Validation script for Royal Equips Orchestrator.

This script validates that the configured entrypoint is valid and the application
can be started successfully. It's designed to be run in CI/CD pipelines to catch
deployment issues before they reach production.
"""

import importlib
import importlib.util
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Add current directory to Python path so we can import local modules
sys.path.insert(0, str(Path.cwd()))


def log(level: str, message: str) -> None:
    """Log message with level."""
    print(f"[CI-{level}] {message}", flush=True)


def check_python_module(module_name: str) -> Tuple[bool, Optional[str]]:
    """Check if a Python module can be imported."""
    try:
        spec = importlib.util.find_spec(module_name)
        if spec is None:
            return False, "Module not found"

        # Try to actually import it
        module = importlib.import_module(module_name)
        return True, "Module loaded successfully"
    except ImportError as e:
        return False, f"Import error: {str(e)}"
    except Exception as e:
        return False, f"Unexpected error: {str(e)}"


def check_module_attribute(module_name: str, attr_name: str) -> Tuple[bool, Optional[str]]:
    """Check if a module has a specific attribute (like 'app' for FastAPI)."""
    try:
        module = importlib.import_module(module_name)
        if hasattr(module, attr_name):
            attr = getattr(module, attr_name)
            return True, f"Attribute '{attr_name}' found: {type(attr).__name__}"
        else:
            return False, f"Attribute '{attr_name}' not found in module"
    except Exception as e:
        return False, f"Error accessing attribute: {str(e)}"


def check_file_exists(file_path: str) -> Tuple[bool, Optional[str]]:
    """Check if a file exists and is readable."""
    try:
        path = Path(file_path)
        if not path.exists():
            return False, "File does not exist"
        if not path.is_file():
            return False, "Path is not a file"
        if not os.access(str(path), os.R_OK):
            return False, "File is not readable"
        return True, f"File exists and is readable ({path.stat().st_size} bytes)"
    except Exception as e:
        return False, f"Error checking file: {str(e)}"


def detect_framework_from_file(file_path: str) -> List[str]:
    """Detect which frameworks are used in a Python file."""
    frameworks = []
    try:
        with open(file_path, encoding='utf-8') as f:
            content = f.read()

        # Check for various framework imports
        if any(pattern in content for pattern in ['from fastapi import', 'import fastapi', 'FastAPI(']):
            frameworks.append('FastAPI')
        if any(pattern in content for pattern in ['from streamlit import', 'import streamlit']):
            frameworks.append('Streamlit')
        if any(pattern in content for pattern in ['from flask import', 'import flask', 'Flask(']):
            frameworks.append('Flask')
        if any(pattern in content for pattern in ['from django import', 'import django']):
            frameworks.append('Django')
    except Exception:
        pass

    return frameworks


def validate_fastapi_app(app_spec: str) -> Dict[str, any]:
    """Validate a FastAPI application specification."""
    if ':' not in app_spec:
        return {
            'valid': False,
            'error': 'FastAPI app specification must be in format "module:app"'
        }

    module_name, attr_name = app_spec.split(':', 1)

    # Check module
    module_ok, module_msg = check_python_module(module_name)
    if not module_ok:
        return {
            'valid': False,
            'error': f'Module "{module_name}" cannot be imported: {module_msg}'
        }

    # Check attribute
    attr_ok, attr_msg = check_module_attribute(module_name, attr_name)
    if not attr_ok:
        return {
            'valid': False,
            'error': f'Attribute "{attr_name}" not found in module "{module_name}": {attr_msg}'
        }

    return {
        'valid': True,
        'module': module_name,
        'attribute': attr_name,
        'message': attr_msg
    }


def validate_streamlit_app(file_path: str) -> Dict[str, any]:
    """Validate a Streamlit application file."""
    file_ok, file_msg = check_file_exists(file_path)
    if not file_ok:
        return {
            'valid': False,
            'error': f'Streamlit file "{file_path}" is not accessible: {file_msg}'
        }

    frameworks = detect_framework_from_file(file_path)
    if 'Streamlit' not in frameworks:
        return {
            'valid': False,
            'error': f'File "{file_path}" does not appear to be a Streamlit app (no streamlit imports found)'
        }

    return {
        'valid': True,
        'file': file_path,
        'frameworks': frameworks,
        'message': file_msg
    }


def validate_dependencies() -> Dict[str, any]:
    """Validate that required dependencies are available."""
    dependencies = {
        'streamlit': False,
        'fastapi': False,
        'uvicorn': False,
        'gunicorn': False,
        'flask': False,
    }

    for dep in dependencies:
        available, _ = check_python_module(dep)
        dependencies[dep] = available

    # Check if we have at least one framework and one server
    has_framework = dependencies['fastapi'] or dependencies['streamlit'] or dependencies['flask']
    has_server = dependencies['uvicorn'] or dependencies['gunicorn']

    return {
        'dependencies': dependencies,
        'has_framework': has_framework,
        'has_server': has_server,
        'deployment_ready': has_framework and (dependencies['streamlit'] or has_server)
    }


def main():
    """Main CI validation routine."""
    log("INFO", "🔍 Starting CI validation for Royal Equips Orchestrator")

    # Get environment configuration
    app_type = os.getenv('APP_TYPE', 'auto').lower()
    app_path = os.getenv('APP_PATH', '')

    log("INFO", f"Configuration: APP_TYPE={app_type}, APP_PATH={app_path}")

    # Validate dependencies
    log("INFO", "Validating dependencies...")
    deps_result = validate_dependencies()

    for dep, available in deps_result['dependencies'].items():
        status = "✅" if available else "❌"
        log("INFO", f"  {status} {dep}")

    if not deps_result['deployment_ready']:
        log("ERROR", "❌ Missing required dependencies for deployment")
        log("ERROR", "Required: At least one framework (FastAPI/Streamlit/Flask) + appropriate server")
        return False

    # Validate specific APP_TYPE configurations
    if app_type in ['fastapi', 'api']:
        if not app_path:
            log("ERROR", "❌ APP_TYPE=fastapi requires APP_PATH to be set")
            return False

        log("INFO", f"Validating FastAPI app: {app_path}")
        result = validate_fastapi_app(app_path)
        if result['valid']:
            log("INFO", f"✅ FastAPI app is valid: {result['message']}")
        else:
            log("ERROR", f"❌ FastAPI validation failed: {result['error']}")
            return False

    elif app_type in ['streamlit', 'st']:
        if not app_path:
            log("ERROR", "❌ APP_TYPE=streamlit requires APP_PATH to be set")
            return False

        log("INFO", f"Validating Streamlit app: {app_path}")
        result = validate_streamlit_app(app_path)
        if result['valid']:
            log("INFO", f"✅ Streamlit app is valid: {result['message']}")
        else:
            log("ERROR", f"❌ Streamlit validation failed: {result['error']}")
            return False

    elif app_type == 'auto':
        log("INFO", "Auto-detection mode - validating known good configurations...")

        # Check Flask patterns (current production setup)
        flask_candidates = [
            "wsgi:app",
            "app:create_app"
        ]

        flask_valid = []
        for candidate in flask_candidates:
            result = validate_flask_app(candidate)
            if result['valid']:
                flask_valid.append(candidate)
                log("INFO", f"✅ Flask candidate valid: {candidate}")
            else:
                log("WARN", f"❌ Flask candidate failed: {candidate} - {result.get('error', 'Unknown error')}")

        # Legacy FastAPI check (deprecated)
        # Note: FastAPI endpoints have been removed in favor of Flask
        fastapi_candidates = [
            # "api.main:app",  # Removed - no longer exists
            "orchestrator.api:app"
        ]

        fastapi_valid = []
        for candidate in fastapi_candidates:
            result = validate_fastapi_app(candidate)
            if result['valid']:
                fastapi_valid.append(candidate)
                log("INFO", f"✅ FastAPI candidate valid: {candidate}")
            else:
                log("WARNING", f"⚠️  FastAPI candidate invalid: {candidate} - {result['error']}")

        # Check common Streamlit patterns
        streamlit_candidates = [
            "streamlit_app.py",
            "app.py",
        ]

        streamlit_valid = []
        for candidate in streamlit_candidates:
            result = validate_streamlit_app(candidate)
            if result['valid']:
                streamlit_valid.append(candidate)
                log("INFO", f"✅ Streamlit candidate valid: {candidate}")
            else:
                log("WARNING", f"⚠️  Streamlit candidate invalid: {candidate} - {result['error']}")

        if not fastapi_valid and not streamlit_valid:
            log("ERROR", "❌ No valid application entrypoints found in auto-detection mode")
            return False

        log("INFO", f"✅ Auto-detection found {len(fastapi_valid)} FastAPI + {len(streamlit_valid)} Streamlit valid apps")

    else:
        log("ERROR", f"❌ Unknown APP_TYPE: {app_type}")
        return False

    # Additional validations
    log("INFO", "Performing additional checks...")

    # Check start.sh exists and is executable
    start_script = Path("start.sh")
    if start_script.exists() and os.access("start.sh", os.X_OK):
        log("INFO", "✅ start.sh exists and is executable")
    else:
        log("WARNING", "⚠️  start.sh is missing or not executable")

    # Check diagnosis script exists
    diag_script = Path("scripts/diagnose_stack.sh")
    if diag_script.exists():
        log("INFO", "✅ diagnose_stack.sh exists")
    else:
        log("WARNING", "⚠️  diagnose_stack.sh is missing")

    log("INFO", "✅ All CI validations passed")
    return True


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        log("ERROR", f"❌ Unexpected error during CI validation: {str(e)}")
        sys.exit(1)
