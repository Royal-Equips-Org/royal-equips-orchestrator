"""Financial Controller Agent"""
import asyncio
from ..core.agent_base import AgentBase

class FinancialController(AgentBase):
    def __init__(self):
        super().__init__("Financial Controller", "financial_management", "Tax automation and financial reporting")
    
    async def _execute_task(self):
        self.current_task = "Processing financial data"
        await asyncio.sleep(1)
    
    async def get_total_revenue(self) -> float:
        """Get current total revenue"""
        return 2400000.0  # $2.4M for demo