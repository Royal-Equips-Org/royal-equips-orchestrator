"""Minimal FastAPI entry point for Royal Equips Orchestrator.

This module provides a minimal, working FastAPI app with a health endpoint.
If a more complete orchestrator API exists elsewhere, this serves as a fallback
to ensure the service can always boot and pass health checks.
"""

from fastapi import FastAPI

app = FastAPI(title="Royal Equips Orchestrator API")


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/")
def root():
    """Root endpoint."""
    return {"message": "Royal Equips Orchestrator API", "status": "running"}
