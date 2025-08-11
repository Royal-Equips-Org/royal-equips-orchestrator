"""
AI Assistant Service for Royal Equips Control Center.

Provides intelligent assistant capabilities with full knowledge of:
- Application architecture and codebase
- All agents and their operations
- System health and metrics
- Business operations and monitoring
- Executive-level insights and recommendations
"""

import logging
import os
import json
import asyncio
from typing import Dict, List, Optional, Any, AsyncGenerator
from datetime import datetime, timezone
try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    # Create a mock openai module
    class MockOpenAI:
        pass
    openai = MockOpenAI()
try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    # Create a mock OpenAI class
    class OpenAI:
        def __init__(self, *args, **kwargs):
            pass
try:
    from tenacity import retry, stop_after_attempt, wait_exponential
    HAS_TENACITY = True
except ImportError:
    HAS_TENACITY = False
    # Create dummy decorators
    def retry(*args, **kwargs):
        def decorator(func):
            return func
        return decorator
    stop_after_attempt = wait_exponential = lambda *args, **kwargs: None

from app.services.github_service import github_service
from app.services.shopify_service import shopify_service
from app.services.health_service import health_service

logger = logging.getLogger(__name__)

class AIAssistantError(Exception):
    """Custom exception for AI Assistant errors."""
    pass

class ControlCenterAssistant:
    """
    Elite AI assistant with comprehensive knowledge of the Royal Equips platform.
    Designed for executive-level insights and operational excellence.
    """
    
    def __init__(self):
        """Initialize the AI assistant with OpenAI integration."""
        self.api_key = os.getenv('OPENAI_API_KEY')
        
        if not self.api_key:
            logger.warning("OpenAI API key not configured - AI assistant disabled")
            self._enabled = False
        else:
            self._enabled = True
            self.client = OpenAI(api_key=self.api_key)
            
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
        
        # System context about the Royal Equips platform
        self.system_context = self._build_system_context()
        
        # Conversation history for context
        self._conversation_history = []
        self._max_history_length = 20
    
    def is_enabled(self) -> bool:
        """Check if AI assistant is properly configured and enabled."""
        return self._enabled
    
    def _build_system_context(self) -> str:
        """Build comprehensive system context for the AI assistant."""
        return """You are the elite Control Center Assistant for Royal Equips Orchestrator - a sophisticated multi-agent e-commerce automation platform.

PLATFORM OVERVIEW:
Royal Equips Orchestrator is an enterprise-grade automation platform for high-growth e-commerce businesses, specializing in car-tech and accessories. It features a modular multi-agent system that automates every aspect of running a Shopify store.

CORE ARCHITECTURE:
- Flask Backend (WSGI with Gunicorn) for production reliability
- React + TypeScript Control Center with cyberpunk aesthetic
- Multi-agent orchestration system with health monitoring
- WebSocket real-time communication namespaces
- Cloudflare Worker proxy for enhanced performance

KEY AGENTS & SERVICES:
1. Product Research Agent - News scraping and trend discovery
2. Inventory Forecasting Agent - Prophet + Shopify integration
3. Pricing Optimizer Agent - Competitor analysis and dynamic pricing
4. Marketing Automation Agent - Email campaigns and content generation
5. Customer Support Agent - OpenAI-powered chat responses
6. Order Management Agent - Fulfillment and returns processing

MONITORING CAPABILITIES:
- Shopify store operations (products, inventory, orders, webhooks)
- GitHub repository health and deployment tracking
- System metrics (CPU, memory, disk, performance)
- Agent status and operation monitoring
- Business KPIs and executive dashboards

CONTROL CENTER FEATURES:
- God Mode for system overrides
- Emergency stop functionality
- Multi-operational task management
- Workspace and environment support
- Elite business interface for executive users
- Real-time agent and system monitoring
- Voice control capabilities

YOUR ROLE:
You are the executive assistant to a high-level business leader ("lord" status) who monitors and controls all operations from this command center. You have complete knowledge of:
- All system components and their current status
- Business operations and performance metrics
- Agent activities and operational insights
- Technical health and deployment status
- Strategic recommendations for optimal performance

COMMUNICATION STYLE:
- Professional and executive-appropriate
- Concise but comprehensive insights
- Action-oriented recommendations
- Status-aware and context-sensitive
- Capable of both technical details and business strategy

You can access real-time data about all platform components and should provide intelligent, actionable insights for elite business operations."""

    async def _get_current_system_status(self) -> Dict[str, Any]:
        """Gather current system status for context."""
        try:
            status = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'system_health': health_service.get_comprehensive_health() if health_service else {},
                'github_status': github_service.get_repository_health() if github_service.is_authenticated() else {'status': 'not_configured'},
                'shopify_status': shopify_service.get_connection_status() if shopify_service.is_configured() else {'status': 'not_configured'},
                'platform_status': 'operational'
            }
            
            # Add more context as needed
            return status
        except Exception as e:
            logger.error(f"Error gathering system status: {e}")
            return {'error': str(e), 'timestamp': datetime.now(timezone.utc).isoformat()}
    
    def _format_system_status_for_ai(self, status: Dict[str, Any]) -> str:
        """Format system status for AI context."""
        try:
            formatted = f"""
CURRENT SYSTEM STATUS ({status.get('timestamp', 'unknown')}):

System Health: {status.get('system_health', {}).get('status', 'unknown')}
GitHub Repository: {status.get('github_status', {}).get('health_status', 'unknown')}
Shopify Integration: {status.get('shopify_status', {}).get('status', 'unknown')}
Platform Status: {status.get('platform_status', 'unknown')}

Health Metrics:
- Health Score: {status.get('github_status', {}).get('health_score', 'N/A')}
- Open Issues: {status.get('github_status', {}).get('metrics', {}).get('open_issues', 'N/A')}
- Recent Commits: {status.get('github_status', {}).get('metrics', {}).get('recent_commits', 'N/A')}
"""
            return formatted.strip()
        except Exception as e:
            return f"Error formatting status: {str(e)}"
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10)
    )
    async def get_response(self, user_message: str, include_system_status: bool = True) -> Dict[str, Any]:
        """
        Get AI assistant response to user message.
        
        Args:
            user_message: The user's message or question
            include_system_status: Whether to include current system status in context
            
        Returns:
            Dict containing response, status, and metadata
        """
        if not self._enabled:
            return {
                'success': False,
                'error': 'AI Assistant not configured - OpenAI API key required',
                'response': 'AI Assistant is currently unavailable. Please configure OpenAI API key.'
            }
        
        try:
            # Gather current system status if requested
            system_status = {}
            status_context = ""
            
            if include_system_status:
                system_status = await self._get_current_system_status()
                status_context = self._format_system_status_for_ai(system_status)
            
            # Build conversation messages
            messages = [
                {"role": "system", "content": f"{self.system_context}\n\n{status_context}"}
            ]
            
            # Add conversation history for context
            messages.extend(self._conversation_history[-self._max_history_length:])
            
            # Add current user message
            messages.append({"role": "user", "content": user_message})
            
            # Get AI response
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=1000,
                temperature=0.7,
                stream=False
            )
            
            assistant_response = response.choices[0].message.content
            
            # Update conversation history
            self._conversation_history.append({"role": "user", "content": user_message})
            self._conversation_history.append({"role": "assistant", "content": assistant_response})
            
            # Trim history if needed
            if len(self._conversation_history) > self._max_history_length * 2:
                self._conversation_history = self._conversation_history[-self._max_history_length:]
            
            return {
                'success': True,
                'response': assistant_response,
                'model_used': self.model,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'tokens_used': response.usage.total_tokens,
                'system_status_included': include_system_status,
                'conversation_length': len(self._conversation_history) // 2
            }
            
        except Exception as e:
            logger.error(f"AI Assistant error: {e}")
            return {
                'success': False,
                'error': str(e),
                'response': f'I apologize, but I encountered an error: {str(e)}. Please try again or contact system administrator.',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
    
    async def get_streaming_response(self, user_message: str, include_system_status: bool = True) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Get streaming AI assistant response for real-time interaction.
        
        Args:
            user_message: The user's message or question
            include_system_status: Whether to include current system status in context
            
        Yields:
            Dict chunks containing streaming response data
        """
        if not self._enabled:
            yield {
                'type': 'error',
                'data': 'AI Assistant not configured - OpenAI API key required'
            }
            return
        
        try:
            # Gather current system status if requested
            system_status = {}
            status_context = ""
            
            if include_system_status:
                system_status = await self._get_current_system_status()
                status_context = self._format_system_status_for_ai(system_status)
            
            # Build conversation messages
            messages = [
                {"role": "system", "content": f"{self.system_context}\n\n{status_context}"}
            ]
            
            # Add conversation history for context
            messages.extend(self._conversation_history[-self._max_history_length:])
            
            # Add current user message
            messages.append({"role": "user", "content": user_message})
            
            # Get streaming AI response
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=1000,
                temperature=0.7,
                stream=True
            )
            
            full_response = ""
            
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    
                    yield {
                        'type': 'chunk',
                        'data': content,
                        'timestamp': datetime.now(timezone.utc).isoformat()
                    }
            
            # Update conversation history
            self._conversation_history.append({"role": "user", "content": user_message})
            self._conversation_history.append({"role": "assistant", "content": full_response})
            
            # Trim history if needed
            if len(self._conversation_history) > self._max_history_length * 2:
                self._conversation_history = self._conversation_history[-self._max_history_length:]
            
            yield {
                'type': 'complete',
                'data': {
                    'full_response': full_response,
                    'model_used': self.model,
                    'system_status_included': include_system_status,
                    'conversation_length': len(self._conversation_history) // 2
                },
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"AI Assistant streaming error: {e}")
            yield {
                'type': 'error',
                'data': f'I encountered an error: {str(e)}. Please try again.',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
    
    def clear_conversation(self) -> Dict[str, Any]:
        """Clear conversation history."""
        self._conversation_history.clear()
        return {
            'success': True,
            'message': 'Conversation history cleared',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    
    def get_conversation_stats(self) -> Dict[str, Any]:
        """Get conversation statistics."""
        return {
            'enabled': self._enabled,
            'model': self.model,
            'conversation_length': len(self._conversation_history) // 2,
            'max_history_length': self._max_history_length,
            'last_interaction': self._conversation_history[-1]['timestamp'] if self._conversation_history else None
        }
    
    async def get_executive_summary(self) -> Dict[str, Any]:
        """Get executive summary of current platform status and recommendations."""
        if not self._enabled:
            return {
                'success': False,
                'error': 'AI Assistant not available'
            }
        
        try:
            system_status = await self._get_current_system_status()
            
            executive_prompt = """Provide a concise executive summary of the Royal Equips platform status. Include:
1. Overall platform health and operational status
2. Key metrics and performance indicators
3. Any critical issues or alerts requiring attention
4. Strategic recommendations for optimization
5. Action items for executive review

Format this as a professional executive brief suitable for a business leader."""
            
            response = await self.get_response(executive_prompt, include_system_status=True)
            
            if response['success']:
                return {
                    'success': True,
                    'executive_summary': response['response'],
                    'generated_at': response['timestamp'],
                    'system_status': system_status
                }
            else:
                return response
                
        except Exception as e:
            logger.error(f"Error generating executive summary: {e}")
            return {
                'success': False,
                'error': str(e)
            }

# Global AI assistant instance
control_center_assistant = ControlCenterAssistant()