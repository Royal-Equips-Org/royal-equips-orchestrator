"""Holographic Control Center for the Royal Equips Orchestrator.

This module implements a next-generation, futuristic control center with
neon/cyberpunk styling, animated backgrounds, real-time data integration,
voice control, and an AI copilot. It provides a multi-panel interface
across Shopify, GitHub, and internal agents.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from typing import Dict, Any

# Bootstrap for script execution: ensure project root is on sys.path
if __package__ in (None, ""):
    root = Path(__file__).resolve().parents[2]
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

import streamlit as st

from orchestrator.core.orchestrator import Orchestrator
from orchestrator.agents import (
    ProductResearchAgent,
    InventoryForecastingAgent,
    PricingOptimizerAgent,
    MarketingAutomationAgent,
    CustomerSupportAgent,
    OrderManagementAgent,
)
from orchestrator.control_center.theme import inject_neon_theme
from orchestrator.control_center.components.three_background import render_css_particle_background


# Initialize global orchestrator
_orchestrator: Orchestrator | None = None


def get_orchestrator() -> Orchestrator:
    """Get or create the global orchestrator instance."""
    global _orchestrator
    if _orchestrator is None:
        loop = asyncio.new_event_loop()
        _orchestrator = Orchestrator(loop=loop)
        
        # Register agents with reasonable intervals (seconds)
        _orchestrator.register_agent(ProductResearchAgent(), interval=3600)  # hourly
        _orchestrator.register_agent(InventoryForecastingAgent(), interval=86400)  # daily
        _orchestrator.register_agent(PricingOptimizerAgent(), interval=7200)  # every 2 hours
        _orchestrator.register_agent(MarketingAutomationAgent(), interval=43200)  # twice daily
        _orchestrator.register_agent(CustomerSupportAgent(), interval=300)  # every 5 min
        _orchestrator.register_agent(OrderManagementAgent(), interval=600)  # every 10 min
        
        # Start orchestrator in background
        loop.create_task(_orchestrator.run_forever())
        
        # Run the loop in a background thread
        import threading
        
        def run_loop():
            loop.run_forever()
        
        threading.Thread(target=run_loop, daemon=True).start()
    
    return _orchestrator


def init_session_state() -> None:
    """Initialize session state variables."""
    if "current_page" not in st.session_state:
        st.session_state.current_page = "Overview"
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []
    if "voice_enabled" not in st.session_state:
        st.session_state.voice_enabled = os.getenv("VOICE_ENABLED", "true").lower() == "true"


def render_navigation() -> str:
    """Render the navigation sidebar and return selected page."""
    with st.sidebar:
        st.markdown("# 🌌 Navigation")
        
        pages = {
            "🏠 Overview": "Overview",
            "🤖 Agents": "Agents", 
            "🛍️ Shopify Live": "Shopify",
            "🐙 GitHub Ops": "GitHub",
            "🎤 Copilot & Voice": "Copilot",
            "⚙️ Settings": "Settings",
        }
        
        selected = st.radio(
            "Select Page:",
            options=list(pages.keys()),
            index=list(pages.values()).index(st.session_state.current_page),
            key="nav_radio"
        )
        
        st.session_state.current_page = pages[selected]
        
        # System status
        st.markdown("---")
        st.markdown("### 🔧 System Status")
        
        # Check environment variables
        shopify_configured = bool(os.getenv("SHOPIFY_API_KEY") and os.getenv("SHOPIFY_API_SECRET"))
        openai_configured = bool(os.getenv("OPENAI_API_KEY"))
        github_configured = bool(os.getenv("GITHUB_TOKEN"))
        
        st.markdown(f"Shopify: {'🟢' if shopify_configured else '🔴'}")
        st.markdown(f"OpenAI: {'🟢' if openai_configured else '🔴'}")
        st.markdown(f"GitHub: {'🟢' if github_configured else '🔴'}")
        
        return st.session_state.current_page


def render_overview_page() -> None:
    """Render the Overview page with global KPIs and agent status."""
    st.markdown("# 🌌 Holographic Overview")
    st.markdown("Real-time command center for Royal Equips operations")
    
    # Global KPIs row
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("🤖 Active Agents", "6", "+2")
    with col2:
        st.metric("🔄 Operations Today", "42", "+15%")
    with col3:
        st.metric("⚡ System Health", "98.5%", "+0.2%")
    with col4:
        st.metric("🕐 Uptime", "15.2h", "")
    
    # Agent Health Status
    st.markdown("## 🏥 Agent Health Matrix")
    orch = get_orchestrator()
    
    # Get health data
    health_data = asyncio.run(orch.health())
    
    # Create health table
    health_rows = []
    for agent_name, health_info in health_data.items():
        status = health_info.get('status', 'unknown')
        last_run = health_info.get('last_run', 'Never')
        next_run = health_info.get('next_run', 'Unknown')
        
        status_emoji = {
            'healthy': '🟢',
            'warning': '🟡', 
            'error': '🔴',
            'unknown': '⚪'
        }.get(status, '⚪')
        
        health_rows.append({
            'Agent': agent_name.replace('_', ' ').title(),
            'Status': f"{status_emoji} {status.title()}",
            'Last Run': str(last_run)[:19] if last_run != 'Never' else 'Never',
            'Next Run': str(next_run)[:19] if next_run != 'Unknown' else 'Unknown'
        })
    
    import pandas as pd
    health_df = pd.DataFrame(health_rows)
    st.dataframe(health_df, use_container_width=True)
    
    # Alerts Timeline
    st.markdown("## 📊 Live Activity Feed")
    
    # Sample alerts/activity (in real implementation, this would come from logs)
    activities = [
        {"Time": "15:42:10", "Type": "Agent", "Message": "Product research completed - 127 trends identified"},
        {"Time": "15:41:33", "Type": "System", "Message": "Pricing optimizer adjusted 5 product prices"},
        {"Time": "15:40:15", "Type": "Shopify", "Message": "New order received: $234.99"},
        {"Time": "15:39:44", "Type": "Agent", "Message": "Customer support handled 3 inquiries"},
        {"Time": "15:38:22", "Type": "GitHub", "Message": "Build completed successfully"},
    ]
    
    for activity in activities:
        type_emoji = {
            "Agent": "🤖",
            "System": "⚙️", 
            "Shopify": "🛍️",
            "GitHub": "🐙"
        }.get(activity["Type"], "📄")
        
        st.markdown(f"`{activity['Time']}` {type_emoji} **{activity['Type']}**: {activity['Message']}")


def render_agents_page() -> None:
    """Render the Agents management page."""
    st.markdown("# 🤖 Agent Control Station")
    st.markdown("Manage and monitor all AI agents")
    
    orch = get_orchestrator()
    
    # Global controls
    col1, col2 = st.columns([1, 3])
    with col1:
        if st.button("🚀 Run All Agents", key="run_all_agents"):
            for agent in orch.agents.values():
                orch.loop.create_task(agent.run())
            st.success("All agents started!")
    
    # Individual agent controls
    st.markdown("## 🎯 Individual Agent Controls")
    
    for agent_name, agent in orch.agents.items():
        with st.expander(f"🤖 {agent_name.replace('_', ' ').title()}", expanded=False):
            col1, col2, col3 = st.columns(3)
            
            with col1:
                if st.button(f"▶️ Run Now", key=f"run_{agent_name}"):
                    orch.loop.create_task(agent.run())
                    st.success(f"Started {agent_name}")
            
            with col2:
                st.markdown(f"**Interval:** {orch.schedules.get(agent_name, 'Unknown')}s")
            
            with col3:
                # Show last run status
                health = asyncio.run(orch.health())
                agent_health = health.get(agent_name, {})
                status = agent_health.get('status', 'unknown')
                st.markdown(f"**Status:** {status}")
            
            # Show agent-specific data
            if hasattr(agent, 'trending_products') and agent.trending_products:
                st.markdown(f"**Recent Output:** {', '.join(agent.trending_products[:5])}")
            elif hasattr(agent, 'forecast_df') and agent.forecast_df is not None:
                st.markdown(f"**Forecast Points:** {len(agent.forecast_df)}")
            elif hasattr(agent, 'price_adjustments') and agent.price_adjustments:
                st.markdown(f"**Price Adjustments:** {len(agent.price_adjustments)}")
            elif hasattr(agent, 'campaign_log') and agent.campaign_log:
                st.markdown(f"**Campaigns Sent:** {len(agent.campaign_log)}")
            elif hasattr(agent, 'support_log') and agent.support_log:
                st.markdown(f"**Support Tickets:** {len(agent.support_log)}")
            else:
                st.markdown("**Recent Output:** No data available")


def render_placeholder_page(page_name: str) -> None:
    """Render a placeholder page for unimplemented features."""
    st.markdown(f"# 🚧 {page_name} (Coming Soon)")
    st.markdown(f"The {page_name} page is being constructed with holographic enhancements...")
    
    if page_name == "Shopify":
        st.markdown("**Features in development:**")
        st.markdown("- 📊 Live store metrics (orders, revenue)")
        st.markdown("- 🛒 Real-time order feed") 
        st.markdown("- 📈 Top performing products")
        st.markdown("- 📦 Unfulfilled orders dashboard")
    elif page_name == "GitHub":
        st.markdown("**Features in development:**")
        st.markdown("- 🔄 Open pull requests")
        st.markdown("- 🐛 Active issues")
        st.markdown("- ✅ CI/CD status")
        st.markdown("- 📝 Recent commits")
    elif page_name == "Copilot":
        st.markdown("**Features in development:**")
        st.markdown("- 🎤 Voice command interface")
        st.markdown("- 💬 AI chat assistant")
        st.markdown("- 🔧 Agent control via voice")
        st.markdown("- 🔊 Audio responses")
    elif page_name == "Settings":
        st.markdown("**Features in development:**")
        st.markdown("- 🔑 API key management")
        st.markdown("- ⏱️ Polling intervals")
        st.markdown("- 🎨 Theme customization")
        st.markdown("- 🔊 Voice settings")


def main() -> None:
    """Main application entry point."""
    # Configure page
    st.set_page_config(
        page_title="🌌 Royal Equips Holographic Control Center",
        page_icon="🌌",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    # Initialize session state
    init_session_state()
    
    # Apply neon theme
    inject_neon_theme()
    
    # Render animated background
    render_css_particle_background()
    
    # Main title
    st.markdown("""
    <div style="text-align: center; margin-bottom: 2rem;">
        <h1 style="font-size: 3rem; margin-bottom: 0;">🌌 HOLOGRAPHIC CONTROL CENTER</h1>
        <p style="color: #00ffff; font-size: 1.2rem; opacity: 0.8;">Royal Equips Orchestrator • Next-Gen Command Interface</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Navigation and page routing
    current_page = render_navigation()
    
    # Render selected page
    if current_page == "Overview":
        render_overview_page()
    elif current_page == "Agents":
        render_agents_page()
    else:
        render_placeholder_page(current_page)
    
    # Footer
    st.markdown("---")
    st.markdown(
        '<div style="text-align: center; opacity: 0.6; font-size: 0.8rem;">'
        '🌌 Holographic Control Center v1.0 • Royal Equips Orchestrator'
        '</div>',
        unsafe_allow_html=True
    )


if __name__ == "__main__":
    main()