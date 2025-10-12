"""
Auto-fixing module for Royal Equips Orchestrator.

This module automatically detects and fixes common errors in the codebase,
including missing dependencies, import errors, and configuration issues.
"""

import importlib
import logging
import subprocess
import sys
import time
from functools import wraps
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

class AutoFixer:
    """Automatic error detection and fixing system."""

    def __init__(self):
        self.fix_attempts = {}
        self.max_retries = 3
        self.dependency_map = {
            'aiohttp': 'aiohttp>=3.8.0',
            'flask': 'flask>=3.0',
            'requests': 'requests>=2.31',
            'eventlet': 'eventlet>=0.33',
            'socketio': 'flask-socketio>=5.4',
            'flask_socketio': 'flask-socketio>=5.4',
            'redis': 'redis>=5.0',
            'psutil': 'psutil>=5.9',
            'openai': 'openai>=1.0',
            'github': 'PyGithub>=1.59',
        }

    def safe_import(self, module_name: str, package: Optional[str] = None) -> Tuple[bool, Optional[Any]]:
        """
        Safely import a module with auto-fixing capabilities.
        
        Args:
            module_name: Name of the module to import
            package: Package name for relative imports
            
        Returns:
            Tuple of (success, module_object)
        """
        try:
            module = importlib.import_module(module_name, package)
            return True, module
        except ImportError as e:
            logger.warning(f"Import failed for {module_name}: {e}")

            # Try to auto-fix the import error
            if self._try_fix_import_error(module_name, str(e)):
                try:
                    # Retry the import after fixing
                    module = importlib.import_module(module_name, package)
                    logger.info(f"Successfully imported {module_name} after auto-fix")
                    return True, module
                except ImportError as retry_error:
                    logger.error(f"Import still failed after auto-fix: {retry_error}")

            return False, None

    def _try_fix_import_error(self, module_name: str, error_msg: str) -> bool:
        """
        Attempt to fix an import error by installing missing dependencies.
        
        Args:
            module_name: The module that failed to import
            error_msg: The error message from the import failure
            
        Returns:
            True if fix was attempted, False otherwise
        """
        # Extract the actual missing module from error message
        missing_module = self._extract_missing_module(error_msg)

        if missing_module in self.fix_attempts:
            if self.fix_attempts[missing_module] >= self.max_retries:
                logger.warning(f"Max retries reached for {missing_module}")
                return False
        else:
            self.fix_attempts[missing_module] = 0

        # Try to install the missing dependency
        if missing_module in self.dependency_map:
            package_spec = self.dependency_map[missing_module]
            logger.info(f"Attempting to install missing dependency: {package_spec}")

            try:
                result = subprocess.run(
                    [sys.executable, '-m', 'pip', 'install', package_spec],
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 minute timeout
                )

                if result.returncode == 0:
                    logger.info(f"Successfully installed {package_spec}")
                    self.fix_attempts[missing_module] += 1
                    return True
                else:
                    logger.error(f"Failed to install {package_spec}: {result.stderr}")
            except subprocess.TimeoutExpired:
                logger.error(f"Timeout installing {package_spec}")
            except Exception as e:
                logger.error(f"Exception installing {package_spec}: {e}")

        self.fix_attempts[missing_module] += 1
        return False

    def _extract_missing_module(self, error_msg: str) -> str:
        """Extract the actual missing module name from error message."""
        if "No module named" in error_msg:
            # Extract module name from "No module named 'xxx'" or "No module named xxx"
            parts = error_msg.split("No module named")
            if len(parts) > 1:
                module_part = parts[1].strip()
                # Remove quotes if present
                module_part = module_part.strip("'\"")
                # Take first part if it's a dotted module
                return module_part.split('.')[0]

        return error_msg

    def resilient_blueprint_import(self, import_path: str) -> Optional[Any]:
        """
        Import a blueprint with error resilience.
        
        Args:
            import_path: Import path like 'app.routes.edge_functions'
            
        Returns:
            The imported module or None if failed
        """
        try:
            success, module = self.safe_import(import_path)
            if success:
                return module
            else:
                logger.warning(f"Failed to import {import_path}, blueprint will be skipped")
                return None
        except Exception as e:
            logger.error(f"Unexpected error importing {import_path}: {e}")
            return None

    def create_graceful_import_wrapper(self, import_func):
        """
        Create a wrapper that gracefully handles import failures.
        
        Args:
            import_func: Function that performs imports
            
        Returns:
            Wrapped function with auto-fixing capabilities
        """
        @wraps(import_func)
        def wrapper(*args, **kwargs):
            try:
                return import_func(*args, **kwargs)
            except ImportError as e:
                logger.warning(f"Import error in {import_func.__name__}: {e}")

                # Try to extract and fix the missing module
                missing_module = self._extract_missing_module(str(e))
                if self._try_fix_import_error(missing_module, str(e)):
                    # Retry the function after fixing
                    try:
                        return import_func(*args, **kwargs)
                    except ImportError:
                        logger.error(f"Import still failed after auto-fix in {import_func.__name__}")

                # Return None or appropriate fallback
                return None
            except Exception as e:
                logger.error(f"Unexpected error in {import_func.__name__}: {e}")
                return None

        return wrapper

    def check_and_fix_system_health(self) -> Dict[str, Any]:
        """
        Perform a comprehensive system health check and auto-fix issues.
        
        Returns:
            Dictionary containing health status and fixes applied
        """
        health_report = {
            'timestamp': time.time(),
            'checks_performed': [],
            'fixes_applied': [],
            'errors_detected': [],
            'overall_status': 'healthy'
        }

        # Check critical dependencies
        critical_deps = ['flask', 'requests', 'aiohttp', 'eventlet']
        for dep in critical_deps:
            check_name = f"dependency_{dep}"
            health_report['checks_performed'].append(check_name)

            success, _ = self.safe_import(dep)
            if not success:
                health_report['errors_detected'].append(f"Missing dependency: {dep}")
                health_report['overall_status'] = 'degraded'

                # Auto-fix attempt would have been made in safe_import
                if dep in self.fix_attempts:
                    health_report['fixes_applied'].append(f"Attempted to install {dep}")

        # Check if we can import critical modules
        critical_modules = [
            'app',
            'app.routes.health',
            'app.routes.main'
        ]

        for module in critical_modules:
            check_name = f"module_{module.replace('.', '_')}"
            health_report['checks_performed'].append(check_name)

            try:
                importlib.import_module(module)
            except ImportError as e:
                health_report['errors_detected'].append(f"Cannot import {module}: {e}")
                health_report['overall_status'] = 'unhealthy'

        return health_report


# Global auto-fixer instance
auto_fixer = AutoFixer()

# Convenience functions for easy use
def safe_import(module_name: str, package: Optional[str] = None) -> Tuple[bool, Optional[Any]]:
    """Convenience function for safe module importing."""
    return auto_fixer.safe_import(module_name, package)

def resilient_import(import_path: str) -> Optional[Any]:
    """Convenience function for resilient blueprint importing."""
    return auto_fixer.resilient_blueprint_import(import_path)

def graceful_import_wrapper(import_func):
    """Convenience function for creating graceful import wrappers."""
    return auto_fixer.create_graceful_import_wrapper(import_func)

def health_check() -> Dict[str, Any]:
    """Convenience function for system health check."""
    return auto_fixer.check_and_fix_system_health()
