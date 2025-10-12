# Auto-Fix System for Royal Equips Orchestrator

## Overview

The Auto-Fix System is a robust error detection and remediation module that automatically identifies and resolves common issues in the Royal Equips Orchestrator application. This system was created to address the specific `ModuleNotFoundError: No module named 'aiohttp'` error and provides a comprehensive framework for handling similar issues.

## Problem Solved

The original error occurred because:
1. The `app/routes/edge_functions.py` module imported `aiohttp` 
2. The `requirements-flask.txt` file (used by Docker builds) was missing the `aiohttp>=3.8.0` dependency
3. This caused deployment failures with the error: `ModuleNotFoundError: No module named 'aiohttp'`

## Solution Implemented

### 1. Immediate Fix
- Added `aiohttp>=3.8.0` to `requirements-flask.txt` to resolve the missing dependency

### 2. Comprehensive Auto-Fix System
Created a robust auto-fixing module (`app/utils/auto_fix.py`) with the following capabilities:

#### Auto-Dependency Management
- **Safe Import Function**: Attempts to import modules and auto-installs missing dependencies
- **Dependency Mapping**: Maps module names to their pip package specifications
- **Retry Logic**: Configurable retry attempts with max limits
- **Graceful Fallbacks**: Provides alternative behavior when dependencies are unavailable

#### Blueprint Registration Resilience
- **Resilient Imports**: Blueprint registration continues even if some modules fail to import
- **Comprehensive Logging**: Detailed logging of successful and failed blueprint registrations
- **Health Monitoring**: Post-registration health checks to verify system status

#### Health Monitoring
- **System Health Checks**: Validates critical dependencies and modules
- **Real-time Status**: Live monitoring of auto-fix attempts and system health
- **API Endpoints**: RESTful APIs for health monitoring and diagnostics

## Key Features

### Auto-Fixer Core (`app/utils/auto_fix.py`)
- `AutoFixer` class: Main auto-fixing engine
- `safe_import()`: Safe module importing with auto-installation
- `resilient_import()`: Resilient blueprint importing
- `health_check()`: Comprehensive system health validation

### API Endpoints (`app/routes/auto_fix.py`)
- `GET /api/auto-fix/health`: Comprehensive health status with auto-fix information
- `GET /api/auto-fix/status`: Current auto-fix statistics and capabilities
- `GET /api/auto-fix/test-import?module=<name>`: Test importing specific modules
- `GET /api/auto-fix/force-health-check`: Force a complete health check

### Enhanced Error Handling
- **Edge Functions**: Modified to gracefully handle missing `aiohttp` with sync fallbacks
- **Blueprint Registration**: Resilient registration that continues despite individual failures
- **Logging**: Comprehensive logging of all auto-fix activities

## Usage Examples

### Testing Auto-Fix Capabilities
```bash
# Check overall system health
curl http://localhost:10000/api/auto-fix/health

# Test importing a specific module
curl "http://localhost:10000/api/auto-fix/test-import?module=aiohttp"

# Get auto-fix status and statistics  
curl http://localhost:10000/api/auto-fix/status
```

### Programmatic Usage
```python
from app.utils.auto_fix import safe_import, resilient_import, health_check

# Safe import with auto-installation
success, module = safe_import('aiohttp')
if success:
    # Use the module
    pass

# Resilient blueprint import
blueprint_module = resilient_import('app.routes.edge_functions')
if blueprint_module:
    # Register blueprint
    pass

# Health check
health_report = health_check()
print(f"System status: {health_report['overall_status']}")
```

## Technical Implementation

### Dependency Map
The auto-fixer maintains a mapping of module names to pip package specifications:
```python
dependency_map = {
    'aiohttp': 'aiohttp>=3.8.0',
    'flask': 'flask>=3.0',
    'requests': 'requests>=2.31',
    'eventlet': 'eventlet>=0.33',
    # ... and more
}
```

### Auto-Installation Process
1. Import attempt fails with `ImportError`
2. Extract missing module name from error message
3. Check if module is in dependency map
4. Install package using `pip install` subprocess
5. Retry import operation
6. Log success/failure and update retry counters

### Graceful Degradation
When dependencies are unavailable, the system provides fallback behavior:
- Edge functions use synchronous requests instead of async aiohttp
- Non-critical blueprints are skipped without breaking the application
- Detailed logging explains what features are disabled

## Testing

Comprehensive test suite (`tests/test_auto_fix.py`) covers:
- Auto-fixer initialization and configuration
- Safe import functionality
- Dependency installation simulation
- Health check operations
- Flask application integration
- API endpoint functionality

Run tests with:
```bash
python -m pytest tests/test_auto_fix.py -v
```

## Monitoring and Maintenance

### Health Check Monitoring
The system performs regular health checks that validate:
- Critical dependency availability
- Module import capabilities
- Auto-fix attempt statistics
- Overall system status

### Logging
All auto-fix activities are logged with appropriate levels:
- `INFO`: Successful operations and installations
- `WARNING`: Non-critical failures or fallback usage
- `ERROR`: Critical failures requiring attention

### Metrics
The auto-fix system tracks:
- Number of fix attempts per module
- Success/failure rates
- Retry counts and limits
- Available vs. attempted fixes

## Production Deployment

The auto-fix system is fully integrated into the Docker deployment:
1. `requirements-flask.txt` includes all necessary dependencies
2. Dockerfile builds successfully with aiohttp
3. Gunicorn starts the application without errors
4. All blueprints register successfully
5. Health checks pass

### Environment Variables
No additional environment variables are required. The system works with existing Flask configuration.

### Performance Impact
- Minimal runtime overhead
- Auto-installation only occurs on first import failure
- Health checks are lightweight and cached
- No impact on normal application operation

## Benefits

1. **Self-Healing**: Automatically resolves common dependency issues
2. **Resilience**: Application starts even with partial failures
3. **Visibility**: Clear logging and monitoring of all fix attempts
4. **Maintainability**: Centralized error handling and remediation
5. **Extensibility**: Easy to add new auto-fix capabilities

## Future Enhancements

The auto-fix system can be extended to handle:
- Configuration file errors
- Environment variable validation
- Database connection issues
- External service dependencies
- Performance optimization

This comprehensive auto-fix system ensures the Royal Equips Orchestrator remains robust and self-healing in production environments.