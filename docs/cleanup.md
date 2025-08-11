# Flask Migration and Streamlit Cleanup Documentation

## Overview
This document details the complete migration from FastAPI/Streamlit to Flask as the primary backend framework for Royal Equips Orchestrator, including the cleanup of legacy Streamlit code.

## Migration Summary

### Primary Changes
- **Backend Framework**: Migrated from FastAPI to Flask as primary framework  
- **WebSocket Support**: Added Flask-SocketIO with eventlet for real-time features
- **Control Center**: Replaced Streamlit dashboard with modern HTML/JS SPA  
- **API Documentation**: Added Swagger UI at `/docs` using flasgger
- **Deployment**: Updated to use gunicorn with eventlet workers

### Files Modified/Removed

#### Core Application Files Modified
- `app/__init__.py` - Added Swagger documentation initialization
- `app/routes/docs.py` - **NEW** - Swagger API documentation endpoint  
- `start.sh` - Updated to prioritize Flask over FastAPI, use eventlet workers
- `Dockerfile` - Changed to eventlet worker class and correct WSGI entry point
- `render.yaml` - Updated configuration for Flask deployment
- `requirements-flask.txt` - Added missing Flask dependencies (flask-socketio, eventlet, flasgger, psutil, etc.)

#### New Control Center Implementation  
- `app/static/index.html` - **NEW** - Modern Control Center SPA with real-time WebSocket integration
- Cyberpunk theme with live system metrics, agent status, and control functions
- Real-time WebSocket streams for heartbeat, metrics, and control events

#### Files that Remain (Legacy Support)
- `orchestrator/control_center/__init__.py` - Deprecated but preserved for compatibility
- `tests/test_streamlit_imports.py` - Preserved (tests core functionality)
- `api/main.py` - FastAPI app remains functional but secondary

## Replaced Functionality

### Control Center Interface
- **Before**: Streamlit-based dashboard at `orchestrator/control_center/app.py`
- **After**: React + TypeScript SPA served at `/command-center` via Flask
- **Benefits**: 
  - Modern, responsive UI with cyberpunk aesthetic
  - Real-time WebSocket integration
  - Better performance and user experience
  - Mobile-friendly design

### Real-time Updates
- **Before**: Streamlit's built-in state management and auto-refresh
- **After**: WebSocket-based real-time data streams with Flask-SocketIO
- **Benefits**:
  - True real-time updates (2-second intervals)
  - Bidirectional communication
  - Lower latency and better scalability

## Dependencies Cleaned Up

The following Streamlit-related dependencies are no longer required in production:
- `streamlit>=1.32` (still listed in requirements.txt but not used)
- `streamlit-webrtc>=0.47` (still listed but not used)

Note: These remain in requirements.txt for now to avoid breaking any legacy scripts, but can be removed in a future cleanup.

## Migration Benefits

1. **Performance**: React SPA loads faster and provides better user experience
2. **Real-time Data**: WebSocket integration provides true real-time updates
3. **Mobile Support**: Responsive design works on all device sizes  
4. **Maintainability**: Modern React/TypeScript codebase is easier to maintain
5. **Scalability**: Flask + WebSocket scales better than Streamlit for real-time dashboards
6. **Integration**: Better integration with Flask backend and API endpoints

## Testing

All core functionality has been preserved:
- Health endpoints (`/healthz`, `/readyz`)
- Metrics endpoint (`/metrics`) 
- Agent management APIs
- WebSocket real-time streams
- Control endpoints (`/api/control/god-mode`, `/api/control/emergency-stop`)

## Next Steps

Future cleanup opportunities:
1. Remove `orchestrator/control_center/` directory entirely
2. Remove Streamlit dependencies from `requirements.txt`
3. Update any remaining documentation references to Streamlit
4. Remove legacy test files that are Streamlit-specific