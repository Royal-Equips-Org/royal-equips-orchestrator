"""
Enhanced FastAPI backend for Royal Equips Orchestrator with agents support.

This module provides a production-ready FastAPI application with:
- Agent chat endpoints with SSE streaming
- System health and metrics endpoints
- Command center with one-click access
- Friendly error pages and routing aliases
- Health log filtering to reduce noise
- Proper CORS configuration
- Structured logging and error handling
"""

import os
import uuid
import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from sse_starlette import EventSourceResponse

# Import our configuration and logging utilities
from api.config import settings
from api.utils.logging_setup import setup_logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory storage (TODO: Replace with Redis/Database)
agent_sessions: Dict[str, Dict] = {}
agent_messages: Dict[str, List[Dict]] = {}

# Pydantic models
class AgentSessionCreate(BaseModel):
    """Request model for creating an agent session."""
    pass

class AgentSessionResponse(BaseModel):
    """Response model for agent session creation."""
    session_id: str

class AgentMessage(BaseModel):
    """Request model for sending agent messages."""
    session_id: str
    role: str = Field(..., pattern=r"^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=4000)

class SystemMetrics(BaseModel):
    """System metrics response model."""
    ok: bool
    backend: str
    uptime_seconds: float
    active_sessions: int
    total_messages: int
    timestamp: str

class EventPayload(BaseModel):
    """Event payload model."""
    event_type: str
    data: Dict
    timestamp: Optional[str] = None

# Application lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    logger.info("Starting Royal Equips Orchestrator Backend")
    
    # Set up logging filters early in startup
    setup_logging()
    logger.info("Logging configuration applied, health endpoint noise suppressed")
    
    yield
    logger.info("Shutting down Royal Equips Orchestrator Backend")

# Create FastAPI app
app = FastAPI(
    title="Royal Equips Orchestrator Backend",
    description="Elite backend API for multi-agent e-commerce orchestration",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - allow all origins for now (TODO: tighten per env)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict to specific Worker domains per environment
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Store startup time for uptime calculation
startup_time = datetime.now()

# Custom exception handlers for friendly error pages
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    """Handle 404 errors with a friendly HTML page."""
    return templates.TemplateResponse(
        "errors/404.html", 
        {"request": request, "app_name": settings.app_name},
        status_code=404
    )

@app.exception_handler(500)
async def server_error_handler(request: Request, exc: HTTPException):
    """Handle 500 errors with a friendly HTML page."""
    return templates.TemplateResponse(
        "errors/500.html",
        {"request": request, "app_name": settings.app_name},
        status_code=500
    )

@app.get("/")
async def root(request: Request):
    """Root endpoint with landing page and one-click Command Center access."""
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "app_name": settings.app_name
        }
    )

@app.get("/health")
async def health():
    """Health check endpoint - returns plain text 'ok' for monitoring systems."""
    return PlainTextResponse("ok")

@app.get("/command-center")
async def command_center():
    """Redirect to the configured Command Center URL."""
    return RedirectResponse(url=settings.command_center_url, status_code=307)

@app.get("/control-center")
async def control_center():
    """Alias for command center - redirects to /command-center."""
    return RedirectResponse(url="/command-center", status_code=307)

@app.get("/dashboard")
async def dashboard():
    """Alias for command center - redirects to /command-center."""
    return RedirectResponse(url="/command-center", status_code=307)

@app.get("/metrics", response_model=SystemMetrics)
async def get_metrics():
    """Get system metrics."""
    uptime = (datetime.now() - startup_time).total_seconds()
    total_messages = sum(len(messages) for messages in agent_messages.values())
    
    return SystemMetrics(
        ok=True,
        backend="fastapi",
        uptime_seconds=uptime,
        active_sessions=len(agent_sessions),
        total_messages=total_messages,
        timestamp=datetime.now().isoformat()
    )

@app.get("/jobs")
async def get_jobs():
    """Get list of background jobs (stub implementation)."""
    # TODO: Implement actual job queue integration
    return {
        "jobs": [
            {
                "id": "job_001",
                "name": "Price Sync Agent",
                "status": "running",
                "last_run": datetime.now().isoformat()
            },
            {
                "id": "job_002", 
                "name": "Inventory Forecast",
                "status": "scheduled",
                "next_run": datetime.now().isoformat()
            }
        ],
        "total": 2
    }

@app.post("/events")
async def create_event(payload: EventPayload, background_tasks: BackgroundTasks):
    """Accept and validate event payloads."""
    # Add timestamp if not provided
    if not payload.timestamp:
        payload.timestamp = datetime.now().isoformat()
    
    # Log the event (TODO: Send to event processing system)
    logger.info(f"Received event: {payload.event_type} at {payload.timestamp}")
    
    # Process event in background
    background_tasks.add_task(process_event, payload)
    
    return {
        "status": "accepted",
        "event_id": str(uuid.uuid4()),
        "timestamp": payload.timestamp
    }

async def process_event(payload: EventPayload):
    """Process events in background."""
    # TODO: Implement actual event processing logic
    logger.info(f"Processing event: {payload.event_type}")
    await asyncio.sleep(0.1)  # Simulate processing

# Agent endpoints
@app.post("/agents/session", response_model=AgentSessionResponse)
async def create_agent_session():
    """Create a new agent chat session."""
    session_id = str(uuid.uuid4())
    
    agent_sessions[session_id] = {
        "id": session_id,
        "created_at": datetime.now().isoformat(),
        "status": "active"
    }
    
    agent_messages[session_id] = []
    
    logger.info(f"Created agent session: {session_id}")
    return AgentSessionResponse(session_id=session_id)

@app.post("/agents/message")
async def send_agent_message(message: AgentMessage):
    """Send a message to an agent session."""
    if message.session_id not in agent_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Store the message
    message_data = {
        "id": str(uuid.uuid4()),
        "session_id": message.session_id,
        "role": message.role,
        "content": message.content,
        "timestamp": datetime.now().isoformat()
    }
    
    agent_messages[message.session_id].append(message_data)
    logger.info(f"Message added to session {message.session_id}: {message.role}")
    
    return {"status": "received", "message_id": message_data["id"]}

@app.get("/agents/stream")
async def stream_agent_response(session_id: str):
    """Stream agent responses via Server-Sent Events."""
    if session_id not in agent_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    async def generate_response():
        """Generate streaming response from agent."""
        logger.info(f"Starting stream for session: {session_id}")
        
        # Check if we have OpenAI API key for real responses
        openai_key = os.getenv("OPENAI_API_KEY")
        
        if openai_key:
            # TODO: Implement actual OpenAI streaming
            # For now, simulate intelligent responses
            responses = [
                "I understand you need assistance with your Royal Equips operations.",
                " Let me analyze the current system status and provide you with actionable insights.",
                " Based on the metrics, I recommend focusing on inventory optimization",
                " and implementing the new pricing strategies we discussed.",
                " Would you like me to initiate those processes for you?"
            ]
        else:
            # Canned responses for demo
            responses = [
                "Welcome to the Royal Equips Elite Agent Interface.",
                " I am your AI assistant, ready to help optimize your e-commerce empire.",
                " Current status: All systems operational.",
                " How may I assist you with your operations today?"
            ]
        
        try:
            # Stream response word by word with realistic delays
            for response_chunk in responses:
                for word in response_chunk.split():
                    await asyncio.sleep(0.1)  # Simulate typing speed
                    yield {
                        "event": "message",
                        "data": json.dumps({
                            "type": "delta",
                            "content": word + " ",
                            "session_id": session_id
                        })
                    }
            
            # Send completion signal
            yield {
                "event": "message", 
                "data": json.dumps({
                    "type": "done",
                    "session_id": session_id
                })
            }
            
        except Exception as e:
            logger.error(f"Error in stream generation: {e}")
            yield {
                "event": "error",
                "data": json.dumps({
                    "error": "Stream generation failed",
                    "details": str(e)
                })
            }
    
    return EventSourceResponse(generate_response())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)