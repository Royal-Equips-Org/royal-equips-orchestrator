# Robust Startup System

This document describes the robust startup system for Royal Equips Orchestrator, designed to automatically detect and start the correct application type while providing comprehensive error handling and diagnostics.

## Overview

The startup system consists of several components:

1. **`start.sh`** - Main startup script with auto-detection and fallback logic
2. **`scripts/diagnose_stack.sh`** - Comprehensive stack diagnostics
3. **`scripts/health_check.py`** - Application health monitoring
4. **`scripts/ci_validate.py`** - CI/CD deployment validation

## Quick Start

### Automatic Detection (Recommended)
```bash
./start.sh
```

The script will automatically detect the best available application type and start it.

### Manual Configuration
```bash
export APP_TYPE=fastapi
export APP_PATH=api.main:app
export PORT=8000
./start.sh
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_TYPE` | `auto` | Application type: `auto`, `fastapi`, `streamlit`, `flask`, `python` |
| `APP_PATH` | | Explicit path to application (required for non-auto modes) |
| `PORT` | `8000` | Port to bind the application to |
| `HEALTH_CHECK_RETRIES` | `3` | Number of health check attempts |
| `PROCESS_TIMEOUT` | `30` | Timeout for process startup |

## Application Types

### Flask (Recommended for Production)
- **Detection**: Files containing `from flask import`, `import flask`, or `Flask(`
- **Startup**: Uses `gunicorn` with eventlet workers or `flask run` command
- **Examples**: 
  - `APP_TYPE=flask APP_PATH=wsgi:app`
  - `APP_TYPE=flask APP_PATH=app.py`

### FastAPI (Legacy/Optional)
- **Detection**: Files containing `from fastapi import`, `import fastapi`, or `FastAPI(`
- **Startup**: Uses `uvicorn` or `gunicorn` with uvicorn workers
- **Examples**: 
  - `APP_TYPE=fastapi APP_PATH=api.main:app`
  - `APP_TYPE=fastapi APP_PATH=orchestrator.api:app`

### Streamlit (Interactive Dashboards)
- **Detection**: Files containing `import streamlit` or `from streamlit import`
- **Startup**: Uses `streamlit run` command
- **Examples**:
  - `APP_TYPE=streamlit APP_PATH=dashboard.py`
  - `APP_TYPE=streamlit APP_PATH=orchestrator/control_center/app.py`

### Python (Direct Execution)
- **Detection**: Files containing `if __name__ == "__main__"`
- **Startup**: Uses `python` command
- **Examples**:
  - `APP_TYPE=python APP_PATH=run_server.py`

## Auto-Detection Logic

The auto-detection follows this priority order:

1. **Flask applications** (highest priority for production stability)
   - Checks module-style candidates: `wsgi:app`, `app:create_app`
   - Scans files for Flask imports and patterns
   
2. **FastAPI applications** (legacy support)
   - Checks module-style candidates: `api.main:app`, `orchestrator.api:app`
   - Scans files for FastAPI imports and patterns
   
3. **Streamlit applications**
   - Checks common Streamlit file locations
   - Performs heuristic search for streamlit imports
   
4. **Python scripts** (lowest priority)
   - Looks for scripts with `__main__` sections

## Diagnostics and Troubleshooting

### Stack Diagnosis
```bash
./scripts/diagnose_stack.sh
```

This script provides comprehensive information about:
- Available Python frameworks and servers
- Environment variables
- Repository structure
- Application candidates
- Deployment recommendations

### Health Checks
```bash
# Single health check
python scripts/health_check.py

# Continuous monitoring
HEALTH_CHECK_MAX_CHECKS=10 HEALTH_CHECK_INTERVAL=30 python scripts/health_check.py
```

### CI Validation
```bash
# Validate deployment configuration
python scripts/ci_validate.py

# Validate specific configuration
APP_TYPE=fastapi APP_PATH=api.main:app python scripts/ci_validate.py
```

## Production Deployment

### Render Deployment
The system is optimized for Render deployments:

1. Set environment variables in Render dashboard
2. The `start.sh` script handles auto-detection
3. Health checks ensure service stability
4. Comprehensive logging aids debugging

### Docker Deployment
```dockerfile
# In your Dockerfile
COPY start.sh /app/
RUN chmod +x /app/start.sh
CMD ["/app/start.sh"]
```

### Environment-Specific Configuration
```bash
# Production (Flask with gunicorn)
export APP_TYPE=flask
export APP_PATH=wsgi:app
export PORT=10000

# Development (Streamlit dashboard)  
export APP_TYPE=streamlit
export APP_PATH=dashboard.py
export PORT=8501

# Legacy FastAPI (backward compatibility)
export APP_TYPE=fastapi  
export APP_PATH=api.main:app
export PORT=8000

# Auto-detection (recommended)
export APP_TYPE=auto
```

## Error Handling and Recovery

### Common Issues and Solutions

**"No valid application entrypoint found"**
- Run `./scripts/diagnose_stack.sh` to see available options
- Check that dependencies are installed
- Verify file paths and module names

**"Module cannot be imported"**
- Ensure Python dependencies are installed
- Check `pyproject.toml` or `requirements.txt`
- Verify PYTHONPATH includes project root

**"Port already in use"**
- Change the `PORT` environment variable
- Check running processes with `lsof -i :8000`

**Health checks failing**
- Wait longer for application startup
- Check application logs for errors
- Verify the application exposes health endpoints

### Self-Healing Features

1. **Automatic Framework Detection**: Falls back through framework priority list
2. **Multiple Startup Methods**: Tries different servers (uvicorn, gunicorn)  
3. **Health Check Retries**: Configurable retry logic with backoff
4. **Process Supervision**: Timeout handling and graceful failure
5. **Comprehensive Logging**: Detailed logs for debugging

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Deployment Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.8'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Validate deployment
        run: python scripts/ci_validate.py
```

### Pre-deployment Checks
Before deploying to production:

1. Run `python scripts/ci_validate.py` in your CI pipeline
2. Test both auto-detection and explicit configuration
3. Verify health check endpoints work
4. Test startup script in container environment

## Migration Guide

### From Streamlit-only Setup
```bash
# Old approach
streamlit run orchestrator/control_center/holo_app.py --server.port $PORT

# New robust approach
export APP_TYPE=auto  # Will detect and use FastAPI if available, fallback to Streamlit
./start.sh
```

### From Manual Configuration
```bash
# Old approach  
uvicorn api.main:app --host 0.0.0.0 --port $PORT

# New robust approach
export APP_TYPE=fastapi
export APP_PATH=api.main:app  
./start.sh
```

## Future Enhancements

Planned improvements:
- Container health checks integration
- Load balancer compatibility
- Blue-green deployment support
- Metrics collection and monitoring
- Auto-scaling based on health metrics