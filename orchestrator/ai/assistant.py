"""AI Assistant for the Holographic Control Center.

This module provides chat orchestration using OpenAI ChatCompletions,
intent detection, tool functions for orchestrator actions, and maintains
conversation state.
"""

from __future__ import annotations

import os
import asyncio
import json
import logging
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable, Tuple
from dataclasses import dataclass

import streamlit as st

logger = logging.getLogger(__name__)

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI not available - AI assistant features disabled")


@dataclass
class ChatMessage:
    """Represents a chat message."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None


@dataclass  
class CommandResult:
    """Represents the result of executing a command."""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class IntentParser:
    """Simple intent parser for voice/chat commands."""
    
    def __init__(self) -> None:
        self.intent_patterns = {
            "run_all_agents": [
                r"run all agents",
                r"start all agents", 
                r"execute all agents",
                r"trigger all"
            ],
            "run_agent": [
                r"run (\w+) agent",
                r"start (\w+) agent",
                r"execute (\w+)",
                r"trigger (\w+)"
            ],
            "show_shopify": [
                r"show shopify",
                r"shopify metrics",
                r"store status",
                r"orders today"
            ],
            "show_github": [
                r"show github",
                r"github status",
                r"repository status", 
                r"pull requests",
                r"open issues"
            ],
            "agent_health": [
                r"agent health",
                r"health status",
                r"system status",
                r"how are agents"
            ],
            "navigate": [
                r"go to (\w+)",
                r"open (\w+) page",
                r"show (\w+) page",
                r"navigate to (\w+)"
            ]
        }
    
    def parse_intent(self, text: str) -> Tuple[str, Dict[str, Any]]:
        """Parse user input to determine intent and extract parameters."""
        text = text.lower().strip()
        
        for intent, patterns in self.intent_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text)
                if match:
                    params = {}
                    if match.groups():
                        if intent == "run_agent":
                            params["agent_name"] = match.group(1)
                        elif intent == "navigate":
                            params["page"] = match.group(1)
                    
                    return intent, params
        
        return "unknown", {}


class AssistantTools:
    """Tool functions that the assistant can call."""
    
    def __init__(self, orchestrator_getter: Callable) -> None:
        self.get_orchestrator = orchestrator_getter
    
    async def run_all_agents(self) -> CommandResult:
        """Run all agents."""
        try:
            orch = self.get_orchestrator()
            for agent in orch.agents.values():
                orch.loop.create_task(agent.run())
            
            return CommandResult(
                success=True,
                message=f"Started {len(orch.agents)} agents",
                data={"agent_count": len(orch.agents)}
            )
        except Exception as e:
            return CommandResult(
                success=False,
                message=f"Failed to run agents: {e}"
            )
    
    async def run_agent(self, agent_name: str) -> CommandResult:
        """Run a specific agent."""
        try:
            orch = self.get_orchestrator()
            
            # Find agent by name (flexible matching)
            target_agent = None
            for name, agent in orch.agents.items():
                if agent_name.lower() in name.lower():
                    target_agent = agent
                    break
            
            if not target_agent:
                return CommandResult(
                    success=False,
                    message=f"Agent '{agent_name}' not found. Available: {', '.join(orch.agents.keys())}"
                )
            
            orch.loop.create_task(target_agent.run())
            
            return CommandResult(
                success=True,
                message=f"Started {agent_name} agent",
                data={"agent_name": agent_name}
            )
        except Exception as e:
            return CommandResult(
                success=False,
                message=f"Failed to run agent {agent_name}: {e}"
            )
    
    async def get_agent_health(self) -> CommandResult:
        """Get agent health status."""
        try:
            orch = self.get_orchestrator()
            health_data = await orch.health()
            
            healthy_count = sum(1 for info in health_data.values() 
                              if info.get('status') == 'healthy')
            
            return CommandResult(
                success=True,
                message=f"System health: {healthy_count}/{len(health_data)} agents healthy",
                data=health_data
            )
        except Exception as e:
            return CommandResult(
                success=False,
                message=f"Failed to get health status: {e}"
            )
    
    async def get_shopify_metrics(self) -> CommandResult:
        """Get Shopify metrics."""
        try:
            # Import here to avoid circular imports
            from orchestrator.integrations.shopify_metrics import get_cached_shopify_metrics
            
            metrics = await get_cached_shopify_metrics()
            
            return CommandResult(
                success=True,
                message=f"Shopify: {metrics.orders_today} orders today, ${metrics.revenue_today:.2f} revenue",
                data={
                    "orders_today": metrics.orders_today,
                    "revenue_today": metrics.revenue_today,
                    "unfulfilled_count": metrics.unfulfilled_count
                }
            )
        except Exception as e:
            return CommandResult(
                success=False,
                message=f"Failed to get Shopify metrics: {e}"
            )
    
    async def get_github_status(self) -> CommandResult:
        """Get GitHub repository status."""
        try:
            # Import here to avoid circular imports
            from orchestrator.integrations.github_client import get_cached_github_status
            
            status = await get_cached_github_status()
            
            return CommandResult(
                success=True,
                message=f"GitHub: {len(status.open_prs)} open PRs, {len(status.open_issues)} open issues",
                data={
                    "open_prs": len(status.open_prs),
                    "open_issues": len(status.open_issues),
                    "recent_commits": len(status.recent_commits)
                }
            )
        except Exception as e:
            return CommandResult(
                success=False,
                message=f"Failed to get GitHub status: {e}"
            )


class HolographicAssistant:
    """AI Assistant for the Holographic Control Center."""
    
    def __init__(self, orchestrator_getter: Callable) -> None:
        self.tools = AssistantTools(orchestrator_getter)
        self.intent_parser = IntentParser()
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        
        # System prompt
        self.system_prompt = """You are ARIA (Autonomous Robotics Intelligence Assistant), the AI copilot for the Royal Equips Holographic Control Center. You are a highly advanced, futuristic AI with personality.

Your capabilities:
- Monitor and control AI agents in the Royal Equips orchestrator
- Access real-time data from Shopify and GitHub
- Execute commands via function calls
- Provide insights and recommendations
- Maintain a professional but friendly tone with a slight futuristic edge

When users ask you to perform actions, use the available tool functions. Always provide clear, actionable responses.

Current system context:
- You're running in a holographic control center with neon/cyberpunk aesthetics
- You can control agents: product_research, inventory_forecasting, pricing_optimizer, marketing_automation, customer_support, order_management
- You have access to Shopify metrics and GitHub repository status
- Respond with appropriate technical terminology and futuristic flair"""
    
    def is_available(self) -> bool:
        """Check if the assistant is available."""
        return OPENAI_AVAILABLE and bool(os.getenv("OPENAI_API_KEY"))
    
    async def process_command(self, user_input: str) -> CommandResult:
        """Process a user command using intent parsing and tool execution."""
        if not self.is_available():
            return CommandResult(
                success=False,
                message="AI assistant not available - missing OpenAI API key"
            )
        
        # Parse intent
        intent, params = self.intent_parser.parse_intent(user_input)
        
        # Execute command based on intent
        if intent == "run_all_agents":
            return await self.tools.run_all_agents()
        elif intent == "run_agent" and params.get("agent_name"):
            return await self.tools.run_agent(params["agent_name"])
        elif intent == "agent_health":
            return await self.tools.get_agent_health()
        elif intent == "show_shopify":
            return await self.tools.get_shopify_metrics()
        elif intent == "show_github":
            return await self.tools.get_github_status()
        elif intent == "navigate" and params.get("page"):
            return CommandResult(
                success=True,
                message=f"Navigate to {params['page']} page",
                data={"action": "navigate", "page": params["page"]}
            )
        else:
            # Use LLM for complex queries
            return await self._llm_response(user_input)
    
    async def _llm_response(self, user_input: str) -> CommandResult:
        """Generate response using OpenAI Chat Completions."""
        if not self.is_available():
            return CommandResult(
                success=False,
                message="LLM not available"
            )
        
        try:
            client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": user_input}
            ]
            
            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            
            return CommandResult(
                success=True,
                message=response.choices[0].message.content,
                data={"type": "llm_response"}
            )
            
        except Exception as e:
            logger.error(f"LLM request failed: {e}")
            return CommandResult(
                success=False,
                message=f"Failed to process request: {e}"
            )
    
    async def chat(self, user_input: str, conversation_history: List[ChatMessage]) -> ChatMessage:
        """Process chat input and return assistant response."""
        result = await self.process_command(user_input)
        
        # Create response message
        response_content = result.message
        if result.data and result.data.get("type") != "llm_response":
            # Add structured data context for command results
            response_content += f"\n\n*Command executed with result: {result.success}*"
        
        return ChatMessage(
            role="assistant",
            content=response_content,
            timestamp=datetime.now(),
            metadata=result.data
        )


def get_assistant(orchestrator_getter: Callable) -> HolographicAssistant:
    """Get the holographic assistant instance."""
    return HolographicAssistant(orchestrator_getter)


def render_chat_interface(assistant: HolographicAssistant) -> None:
    """Render the chat interface."""
    st.subheader("💬 Chat with ARIA")
    
    if not assistant.is_available():
        st.error("🤖 AI Assistant unavailable - missing OpenAI API key")
        return
    
    # Initialize chat history in session state
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = [
            ChatMessage(
                role="assistant",
                content="🌌 Hello! I'm ARIA, your holographic control center AI. How can I assist you today?",
                timestamp=datetime.now()
            )
        ]
    
    # Display chat history
    for message in st.session_state.chat_history:
        with st.chat_message(message.role):
            st.write(message.content)
            if message.metadata:
                with st.expander("📊 Data", expanded=False):
                    st.json(message.metadata)
    
    # Chat input
    if prompt := st.chat_input("Enter command or ask a question..."):
        # Add user message
        user_message = ChatMessage(
            role="user",
            content=prompt,
            timestamp=datetime.now()
        )
        st.session_state.chat_history.append(user_message)
        
        # Display user message
        with st.chat_message("user"):
            st.write(prompt)
        
        # Get assistant response
        with st.spinner("🤖 ARIA is thinking..."):
            response = await assistant.chat(prompt, st.session_state.chat_history)
        
        # Add and display assistant response
        st.session_state.chat_history.append(response)
        with st.chat_message("assistant"):
            st.write(response.content)
            if response.metadata:
                with st.expander("📊 Data", expanded=False):
                    st.json(response.metadata)
        
        # Handle navigation commands
        if (response.metadata and 
            response.metadata.get("action") == "navigate" and 
            response.metadata.get("page")):
            page_map = {
                "overview": "Overview",
                "agents": "Agents",
                "shopify": "Shopify",
                "github": "GitHub",
                "copilot": "Copilot",
                "settings": "Settings"
            }
            target_page = page_map.get(response.metadata["page"].lower())
            if target_page:
                st.session_state.current_page = target_page
                st.rerun()


# Sample commands for the interface
SAMPLE_COMMANDS = [
    "run all agents",
    "show agent health",
    "run pricing optimizer",
    "show shopify metrics", 
    "show github status",
    "what's the system status?",
    "how many orders today?",
    "are there any open pull requests?",
]


def render_sample_commands() -> None:
    """Render sample voice/chat commands."""
    st.subheader("🎯 Sample Commands")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**System Control:**")
        for cmd in SAMPLE_COMMANDS[:4]:
            if st.button(f"💬 {cmd}", key=f"sample_{cmd.replace(' ', '_')}"):
                st.session_state.sample_command = cmd
    
    with col2:
        st.markdown("**Data Queries:**")
        for cmd in SAMPLE_COMMANDS[4:]:
            if st.button(f"❓ {cmd}", key=f"sample_{cmd.replace(' ', '_')}"):
                st.session_state.sample_command = cmd