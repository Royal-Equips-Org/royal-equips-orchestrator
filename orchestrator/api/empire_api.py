"""
Royal Equips Empire API
Exposes empire management endpoints for the command center UI
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import asyncio
import logging
from datetime import datetime

from ..services.empire_orchestrator import empire, EmpireOrchestrator

logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="Royal Equips Empire API",
    description="API for managing the autonomous e-commerce empire",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class DecisionRequest(BaseModel):
    type: str
    title: str
    description: str
    confidence_score: float
    revenue_impact: float
    risk_level: str
    data_sources: List[str]
    recommended_action: str

class EmpireCommand(BaseModel):
    command: str
    parameters: Optional[Dict[str, Any]] = None

# Global empire instance
empire_instance: Optional[EmpireOrchestrator] = None

@app.on_event("startup")
async def startup_empire():
    """Initialize empire on startup"""
    global empire_instance
    try:
        empire_instance = empire
        await empire_instance.initialize_empire()
        await empire_instance.start_autonomous_operations()
        logger.info("🏰 Royal Equips Empire API started successfully")
    except Exception as e:
        logger.error(f"❌ Failed to start empire: {e}")

@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "🏰 Royal Equips Empire API",
        "status": "operational",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/empire/status")
async def get_empire_status():
    """Get comprehensive empire status"""
    if not empire_instance:
        raise HTTPException(status_code=503, detail="Empire not initialized")
    
    try:
        status = await empire_instance.get_empire_status()
        return status
    except Exception as e:
        logger.error(f"❌ Failed to get empire status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/empire/metrics")
async def get_empire_metrics():
    """Get empire performance metrics"""
    if not empire_instance:
        raise HTTPException(status_code=503, detail="Empire not initialized")
    
    try:
        return {
            "metrics": empire_instance.metrics.__dict__,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Failed to get empire metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agents/status")
async def get_agents_status():
    """Get status of all agents"""
    if not empire_instance:
        raise HTTPException(status_code=503, detail="Empire not initialized")
    
    try:
        agent_statuses = []
        for agent_name, agent in empire_instance.agents.items():
            status = await agent.health_check()
            agent_statuses.append(status)
        
        return {
            "agents": agent_statuses,
            "total_agents": len(agent_statuses),
            "active_agents": len([a for a in agent_statuses if a.get('status') == 'active']),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Failed to get agents status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/market/opportunities")
async def get_market_opportunities():
    """Get current market opportunities"""
    if not empire_instance:
        raise HTTPException(status_code=503, detail="Empire not initialized")
    
    try:
        collector = empire_instance.agents.get('multi_platform_collector')
        if collector:
            opportunities = await collector.get_product_opportunities(limit=10)
            return {
                "opportunities": opportunities,
                "count": len(opportunities),
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {"opportunities": [], "count": 0}
    except Exception as e:
        logger.error(f"❌ Failed to get market opportunities: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/empire/command")
async def execute_empire_command(command: EmpireCommand, background_tasks: BackgroundTasks):
    """Execute empire command"""
    if not empire_instance:
        raise HTTPException(status_code=503, detail="Empire not initialized")
    
    try:
        if command.command == "enable_autopilot":
            background_tasks.add_task(empire_instance.enable_autopilot)
            return {"message": "Autopilot enabling", "status": "processing"}
        
        elif command.command == "disable_autopilot":
            background_tasks.add_task(empire_instance.disable_autopilot)
            return {"message": "Autopilot disabling", "status": "processing"}
        
        elif command.command == "emergency_stop":
            background_tasks.add_task(empire_instance.emergency_stop_all)
            return {"message": "Emergency stop activated", "status": "stopping"}
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown command: {command.command}")
    
    except Exception as e:
        logger.error(f"❌ Failed to execute command: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/decisions/evaluate")
async def evaluate_decision(decision: DecisionRequest):
    """Evaluate a business decision"""
    if not empire_instance:
        raise HTTPException(status_code=503, detail="Empire not initialized")
    
    try:
        decision_engine = empire_instance.agents.get('decision_engine')
        if decision_engine:
            result = await decision_engine.evaluate_decision(decision.dict())
            return {
                "decision_id": result.decision_id,
                "auto_executable": result.auto_executable,
                "requires_approval": result.requires_approval,
                "confidence_score": result.confidence_score,
                "status": "evaluated"
            }
        else:
            raise HTTPException(status_code=503, detail="Decision engine not available")
    
    except Exception as e:
        logger.error(f"❌ Failed to evaluate decision: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/products/approve/{product_id}")
async def approve_product(product_id: str):
    """Approve a product opportunity"""
    if not empire_instance:
        raise HTTPException(status_code=503, detail="Empire not initialized")
    
    try:
        execution_layer = empire_instance.agents.get('execution_layer')
        if execution_layer:
            # Get product data (simplified for demo)
            product_data = {
                'id': product_id,
                'title': f'Approved Product {product_id}',
                'category': 'electronics',
                'price_range': '$50-$75'
            }
            
            success = await execution_layer.approve_product_opportunity(product_data)
            if success:
                empire_instance.metrics.approved_products += 1
                return {"message": "Product approved and queued for creation", "status": "approved"}
            else:
                raise HTTPException(status_code=500, detail="Failed to approve product")
        else:
            raise HTTPException(status_code=503, detail="Execution layer not available")
    
    except Exception as e:
        logger.error(f"❌ Failed to approve product: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/trends")
async def get_market_trends():
    """Get market trend analysis"""
    if not empire_instance:
        raise HTTPException(status_code=503, detail="Empire not initialized")
    
    try:
        market_intelligence = empire_instance.agents.get('market_intelligence')
        if market_intelligence:
            trends = await market_intelligence.analyze_current_trends()
            return {
                "trends": trends,
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {"trends": {}, "message": "Market intelligence not available"}
    
    except Exception as e:
        logger.error(f"❌ Failed to get market trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """API health check"""
    return {
        "status": "healthy",
        "empire_initialized": empire_instance is not None,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)