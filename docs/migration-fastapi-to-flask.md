# FastAPI to Flask Migration Guide

## Overview

This document details the migration of the Royal Equips Orchestrator from FastAPI (ASGI) to Flask (WSGI) with Gunicorn. The migration was driven by deployment stability issues with FastAPI/uvicorn and the need for a more production-ready WSGI solution.

## Migration Summary

### Why Migrate?

**Problems with FastAPI Deployment:**
- ASGI server dependency conflicts (uvicorn/gunicorn)
- Deployment failures on Render platform
- Complex async/await patterns for simple HTTP operations
- Heavy dependency chain for production deployment

**Benefits of Flask + Gunicorn:**
- Mature, battle-tested WSGI deployment
- Simpler synchronous request handling
- Lighter dependency footprint
- Better error isolation with worker processes
- Excellent production track record

### High-Level Changes

| Component | Before (FastAPI) | After (Flask) |
|-----------|------------------|---------------|
| **Framework** | FastAPI 0.110+ | Flask 3.1+ |
| **Server** | uvicorn/gunicorn | Gunicorn |
| **Protocol** | ASGI | WSGI |
| **Request Handling** | async/await | synchronous |
| **Routing** | FastAPI decorators | Flask Blueprints |
| **Validation** | Pydantic models | Flask request validation |
| **Streaming** | EventSourceResponse | Flask Response streaming |
| **CORS** | FastAPI CORS middleware | Flask-CORS |
| **Error Handling** | FastAPI exception handlers | Flask error handlers |

## Detailed Migration

### 1. Application Structure

**Before:**
```
api/
├── main.py          # FastAPI app with all routes
├── config.py        # Pydantic settings
└── utils/
    └── logging_setup.py
```

**After:**
```
app/
├── __init__.py      # Flask app factory
├── config.py        # Flask config classes
├── routes/          # Modular blueprints
│   ├── main.py      # Root routes
│   ├── health.py    # Health endpoints
│   ├── agents.py    # Agent endpoints
│   ├── metrics.py   # Metrics endpoints
│   └── errors.py    # Error handlers
└── services/
    └── health_service.py  # Business logic
wsgi.py              # WSGI entry point
```

### 2. Application Initialization

**Before (FastAPI):**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup/shutdown logic
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, ...)
```

**After (Flask):**
```python
from flask import Flask
from flask_cors import CORS

def create_app(config=None):
    app = Flask(__name__)
    app.config.from_object(get_config(config))
    
    CORS(app, ...)
    register_blueprints(app)
    return app
```

### 3. Route Definitions

**Before (FastAPI):**
```python
@app.get("/health")
async def health():
    return PlainTextResponse("ok")

@app.get("/metrics", response_model=SystemMetrics)
async def get_metrics():
    return SystemMetrics(...)

@app.post("/agents/session", response_model=AgentSessionResponse)
async def create_agent_session():
    return AgentSessionResponse(session_id=str(uuid.uuid4()))
```

**After (Flask):**
```python
from flask import Blueprint

health_bp = Blueprint('health', __name__)

@health_bp.route('/healthz')
def liveness():
    return "ok", 200, {'Content-Type': 'text/plain'}

@health_bp.route('/metrics')
def get_metrics():
    return jsonify({...})

@agents_bp.route('/session', methods=['POST'])
def create_agent_session():
    return jsonify({"session_id": str(uuid.uuid4())}), 201
```

### 4. Request Handling

**Before (FastAPI with Pydantic):**
```python
class AgentMessage(BaseModel):
    session_id: str
    role: str = Field(..., pattern=r"^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=4000)

@app.post("/agents/message")
async def send_agent_message(message: AgentMessage):
    # Automatic validation by Pydantic
    return {"status": "received"}
```

**After (Flask with manual validation):**
```python
@agents_bp.route('/message', methods=['POST'])
def send_agent_message():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400
    
    session_id = data.get('session_id')
    role = data.get('role')
    content = data.get('content')
    
    # Manual validation
    if not session_id:
        return jsonify({"error": "session_id is required"}), 400
    if role not in ['user', 'assistant']:
        return jsonify({"error": "role must be 'user' or 'assistant'"}), 400
    
    return jsonify({"status": "received"}), 200
```

### 5. Server-Sent Events (Streaming)

**Before (FastAPI):**
```python
from sse_starlette import EventSourceResponse

@app.get("/agents/stream")
async def stream_agent_response(session_id: str):
    async def generate_response():
        for chunk in response_chunks:
            await asyncio.sleep(0.1)
            yield {
                "event": "message",
                "data": json.dumps(chunk)
            }
    
    return EventSourceResponse(generate_response())
```

**After (Flask):**
```python
from flask import Response
import time

@agents_bp.route('/stream')
def stream_agent_response():
    session_id = request.args.get('session_id')
    
    def generate_response():
        for chunk in response_chunks:
            time.sleep(0.1)
            yield f"event: message\ndata: {json.dumps(chunk)}\n\n"
    
    return Response(
        generate_response(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    )
```

### 6. Error Handling

**Before (FastAPI):**
```python
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=404,
        content={"error": "Not Found"}
    )
```

**After (Flask):**
```python
def register_error_handlers(app):
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({
            'error': 'Not Found',
            'status_code': 404
        }), 404
```

### 7. Configuration

**Before (Pydantic Settings):**
```python
from pydantic import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Royal Equips"
    command_center_url: str = "/docs"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

**After (Flask Config Classes):**
```python
import os

class Config:
    APP_NAME = os.getenv('APP_NAME', 'Royal Equips Orchestrator')
    COMMAND_CENTER_URL = os.getenv('COMMAND_CENTER_URL', '/docs')

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
```

### 8. Testing

**Before (FastAPI TestClient):**
```python
from fastapi.testclient import TestClient

def test_health():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
```

**After (Flask Test Client):**
```python
import pytest
from app import create_app

@pytest.fixture
def client():
    app = create_app('testing')
    return app.test_client()

def test_health(client):
    response = client.get('/healthz')
    assert response.status_code == 200
```

## Deployment Changes

### Docker Configuration

**Before:**
```dockerfile
# Could use either uvicorn or gunicorn with UvicornWorker
CMD ["./start.sh"]  # Complex startup script
```

**After:**
```dockerfile
# Simple, direct Gunicorn command
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "--workers", "2", "wsgi:app"]
```

### Render Configuration

**Before:**
```yaml
healthCheckPath: /health
# Complex FastAPI + uvicorn configuration
startCommand: ./start.sh
```

**After:**
```yaml
healthCheckPath: /healthz
# Simple Docker-based deployment
env: docker
```

## Backward Compatibility

### Maintained Endpoints

All existing endpoints maintain the same URLs and response formats:

- `/health` → Still works (legacy compatibility)
- `/healthz` → New primary health endpoint
- `/metrics` → Same JSON response format
- `/agents/*` → All agent endpoints unchanged
- `/events` → Same event processing interface
- `/jobs` → Same job listing format

### Response Formats

JSON responses maintain identical structure:

```json
// Agent session creation - unchanged
{"session_id": "uuid-string"}

// Metrics response - unchanged structure  
{
  "ok": true,
  "backend": "flask",  // Updated to reflect new backend
  "uptime_seconds": 123.45,
  "active_sessions": 5
}
```

### Client Compatibility

Existing clients require no changes:
- Same HTTP methods and URLs
- Same request/response formats
- Same authentication (when implemented)
- Same error responses

## Benefits Realized

### 1. Deployment Reliability
- Eliminated ASGI server conflicts
- Simplified Docker configuration
- Reduced deployment failures
- Better error diagnostics

### 2. Performance Characteristics
- Lower memory usage per worker
- Better worker isolation
- Predictable request handling
- Easier to debug and profile

### 3. Operational Simplicity
- Fewer moving parts in production
- Standard WSGI deployment patterns
- Better monitoring/observability tools
- Simpler scaling strategies

### 4. Development Experience
- Faster test execution
- Simpler debugging (no async complexity)
- Better IDE support
- More predictable behavior

## Migration Checklist

- [x] Create Flask application structure
- [x] Port all endpoints with identical functionality
- [x] Implement health and readiness checks
- [x] Add circuit breaker patterns
- [x] Create comprehensive test suite
- [x] Update Docker configuration
- [x] Update CI/CD pipelines
- [x] Create migration documentation
- [x] Verify backward compatibility
- [x] Performance testing
- [x] Deploy to staging environment

## Rollback Plan

If issues arise, rollback is straightforward:

1. **Immediate:** Revert to previous Docker image
2. **Configuration:** Switch Render back to FastAPI configuration
3. **Code:** Git revert to last known good FastAPI commit
4. **Dependencies:** No database migrations to reverse

## Future Considerations

### Potential Enhancements
- Add Flask-RESTful for API structure
- Implement Flask-Login for authentication
- Add Flask-Limiter for rate limiting
- Consider Flask-SocketIO for WebSocket support

### Performance Optimization
- Redis session storage
- Connection pooling
- Response caching
- Background task queues (Celery)

### Monitoring Integration
- Prometheus metrics export
- Sentry error tracking
- Custom health check extensions
- Performance monitoring (APM)

## Conclusion

The migration from FastAPI to Flask has successfully addressed the deployment stability issues while maintaining full backward compatibility. The new architecture is simpler, more reliable, and better suited for production deployment while preserving all existing functionality.