"""
Health service implementation for Royal Equips Orchestrator.

Provides comprehensive health checks including:
- Basic liveness checks (/healthz)
- Readiness checks with dependencies (/readyz) 
- Metrics collection (/metrics)
- Secret system validation
"""

import asyncio
import json
import time
import psutil
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

try:
    from fastapi import FastAPI, Response, status
    from fastapi.responses import JSONResponse
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False

from core.secrets.secret_provider import secrets, SecretNotFoundError


@dataclass
class HealthDependency:
    """Health check dependency result."""
    name: str
    status: str  # 'ok', 'error', 'degraded'
    latency: Optional[float] = None
    error: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


@dataclass 
class HealthResponse:
    """Health check response structure."""
    status: str
    timestamp: str
    service: str
    version: str
    uptime: float
    dependencies: Optional[List[HealthDependency]] = None
    cache_stats: Optional[Dict[str, Any]] = None


class HealthService:
    """Health service implementation."""
    
    def __init__(self, service_name: str = "Royal Equips Orchestrator", version: str = "0.1.0"):
        self.service_name = service_name
        self.version = version
        self.start_time = time.time()
    
    def get_uptime(self) -> float:
        """Get service uptime in seconds."""
        return time.time() - self.start_time
    
    async def check_secrets(self) -> HealthDependency:
        """Check secret resolution system health."""
        start_time = time.time()
        
        try:
            # Try to resolve a test secret with fallback
            test_result = await secrets.get_secret_with_fallback(
                'READINESS_TEST_SECRET', 
                'test-fallback'
            )
            
            latency = (time.time() - start_time) * 1000  # Convert to ms
            cache_stats = secrets.get_cache_stats()
            
            return HealthDependency(
                name="secrets",
                status="ok",
                latency=latency,
                details={
                    "cache_size": cache_stats["size"],
                    "test_resolved": "fallback" if test_result == "test-fallback" else "provider"
                }
            )
        except Exception as e:
            return HealthDependency(
                name="secrets",
                status="error",
                error=str(e)
            )
    
    def check_memory(self) -> HealthDependency:
        """Check memory usage."""
        try:
            # Get process memory info
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_percent = process.memory_percent()
            
            # Convert to MB
            memory_mb = {
                "rss": round(memory_info.rss / 1024 / 1024, 2),
                "vms": round(memory_info.vms / 1024 / 1024, 2),
                "percent": round(memory_percent, 2)
            }
            
            # Flag if memory usage is over 80%
            status = "degraded" if memory_percent > 80 else "ok"
            
            return HealthDependency(
                name="memory",
                status=status,
                details=memory_mb
            )
        except Exception as e:
            return HealthDependency(
                name="memory",
                status="error",
                error=str(e)
            )
    
    def check_disk(self) -> HealthDependency:
        """Check disk usage."""
        try:
            disk_usage = psutil.disk_usage('/')
            usage_percent = (disk_usage.used / disk_usage.total) * 100
            
            disk_info = {
                "total_gb": round(disk_usage.total / (1024**3), 2),
                "used_gb": round(disk_usage.used / (1024**3), 2),
                "free_gb": round(disk_usage.free / (1024**3), 2),
                "percent_used": round(usage_percent, 2)
            }
            
            # Flag if disk usage is over 90%
            status = "degraded" if usage_percent > 90 else "ok"
            
            return HealthDependency(
                name="disk",
                status=status,
                details=disk_info
            )
        except Exception as e:
            return HealthDependency(
                name="disk",
                status="error",
                error=str(e)
            )
    
    async def basic_health(self) -> Dict[str, Any]:
        """Basic health check - always returns ok."""
        return {
            "status": "ok",
            "service": self.service_name,
            "version": self.version,
            "timestamp": datetime.now().isoformat(),
            "uptime": self.get_uptime()
        }
    
    async def liveness_check(self) -> Dict[str, Any]:
        """Kubernetes liveness check - simple ok/not ok."""
        return {
            "status": "ok",
            "timestamp": datetime.now().isoformat(),
            "uptime": self.get_uptime()
        }
    
    async def readiness_check(self) -> tuple[Dict[str, Any], int]:
        """Comprehensive readiness check with dependencies."""
        dependencies = []
        overall_status = "ok"
        
        # Check secret system
        secret_dep = await self.check_secrets()
        dependencies.append(secret_dep)
        if secret_dep.status == "error":
            overall_status = "error"
        elif secret_dep.status == "degraded" and overall_status == "ok":
            overall_status = "degraded"
        
        # Check memory
        memory_dep = self.check_memory()
        dependencies.append(memory_dep)
        if memory_dep.status == "error":
            overall_status = "error"
        elif memory_dep.status == "degraded" and overall_status == "ok":
            overall_status = "degraded"
        
        # Check disk
        disk_dep = self.check_disk()
        dependencies.append(disk_dep)
        if disk_dep.status == "error":
            overall_status = "error"
        elif disk_dep.status == "degraded" and overall_status == "ok":
            overall_status = "degraded"
        
        response = HealthResponse(
            status=overall_status,
            service=self.service_name,
            version=self.version,
            timestamp=datetime.now().isoformat(),
            uptime=self.get_uptime(),
            dependencies=dependencies,
            cache_stats=secrets.get_cache_stats()
        )
        
        # Return appropriate HTTP status
        http_status = 200 if overall_status in ["ok", "degraded"] else 503
        
        return asdict(response), http_status
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Collect comprehensive metrics."""
        try:
            # System metrics
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Process metrics
            process = psutil.Process()
            process_info = {
                "cpu_percent": process.cpu_percent(),
                "memory_mb": round(process.memory_info().rss / 1024 / 1024, 2),
                "threads": process.num_threads(),
                "connections": len(process.connections()) if hasattr(process, 'connections') else 0
            }
            
            # Cache metrics
            cache_stats = secrets.get_cache_stats()
            
            return {
                "uptime_seconds": int(self.get_uptime()),
                "system": {
                    "cpu_percent": cpu_percent,
                    "memory_percent": memory.percent,
                    "disk_percent": round((disk.used / disk.total) * 100, 2)
                },
                "process": process_info,
                "cache": cache_stats,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "error": "Failed to collect metrics",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            }


# Global health service instance
health_service = HealthService()


# FastAPI integration (if available)
if FASTAPI_AVAILABLE:
    def create_health_app() -> FastAPI:
        """Create FastAPI app with health endpoints."""
        app = FastAPI(title="Royal Equips Health Service", version="0.1.0")
        
        @app.get("/health")
        async def health():
            """Basic health check."""
            return await health_service.basic_health()
        
        @app.get("/healthz")
        async def healthz():
            """Kubernetes liveness probe."""
            return await health_service.liveness_check()
        
        @app.get("/readyz")
        async def readyz():
            """Kubernetes readiness probe."""
            response_data, status_code = await health_service.readiness_check()
            return JSONResponse(content=response_data, status_code=status_code)
        
        @app.get("/metrics")
        async def metrics():
            """Metrics endpoint."""
            return await health_service.get_metrics()
        
        return app


# Flask integration (fallback)
def create_flask_health_routes(app):
    """Add health routes to Flask app."""
    try:
        from flask import jsonify
        
        @app.route('/health')
        def health():
            """Basic health check."""
            return jsonify(asyncio.run(health_service.basic_health()))
        
        @app.route('/healthz')
        def healthz():
            """Kubernetes liveness probe."""
            return jsonify(asyncio.run(health_service.liveness_check()))
        
        @app.route('/readyz')
        def readyz():
            """Kubernetes readiness probe."""
            response_data, status_code = asyncio.run(health_service.readiness_check())
            return jsonify(response_data), status_code
        
        @app.route('/metrics')
        def metrics():
            """Metrics endpoint."""
            return jsonify(asyncio.run(health_service.get_metrics()))
            
    except ImportError:
        print("Flask not available - skipping Flask health routes")


# Standalone server for testing
async def main():
    """Run standalone health service."""
    if not FASTAPI_AVAILABLE:
        print("FastAPI not available. Install with: pip install fastapi uvicorn")
        return
    
    import uvicorn
    app = create_health_app()
    
    print(f"Starting {health_service.service_name} health service...")
    print("Health endpoints available at:")
    print("  GET /health  - Basic health check")
    print("  GET /healthz - Liveness probe")
    print("  GET /readyz  - Readiness probe") 
    print("  GET /metrics - Metrics collection")
    
    # Run the server
    config = uvicorn.Config(app, host="0.0.0.0", port=8080, log_level="info")
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    asyncio.run(main())