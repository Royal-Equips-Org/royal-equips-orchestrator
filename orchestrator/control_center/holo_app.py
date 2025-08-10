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

# Bootstrap for script execution: ensure project root is on sys.path
if __package__ in (None, ""):
    root = Path(__file__).resolve().parents[2]
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

import streamlit as st

from orchestrator.agents import (
    CustomerSupportAgent,
    InventoryForecastingAgent,
    MarketingAutomationAgent,
    OrderManagementAgent,
    PricingOptimizerAgent,
    ProductResearchAgent,
)
from orchestrator.control_center.components.three_background import (
    render_css_particle_background,
)
from orchestrator.control_center.theme import inject_neon_theme
from orchestrator.core.orchestrator import Orchestrator

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
                if st.button("▶️ Run Now", key=f"run_{agent_name}"):
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


def render_shopify_page() -> None:
    """Render the Shopify Live page with real-time metrics."""
    st.markdown("# 🛍️ Shopify Live Dashboard")
    st.markdown("Real-time store metrics and order management")

    # Import here to avoid circular imports
    try:
        from orchestrator.integrations.shopify_metrics import (
            format_currency,
            format_order_status,
            get_cached_shopify_metrics,
        )
    except ImportError:
        st.error("Shopify integration not available")
        return

    # Check if Shopify is configured
    shopify_configured = bool(os.getenv("SHOPIFY_API_KEY") and os.getenv("SHOPIFY_API_SECRET"))

    if not shopify_configured:
        st.warning("🔧 Shopify credentials not configured. Set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, and SHOP_NAME.")
        return

    # Fetch metrics
    with st.spinner("📊 Loading Shopify metrics..."):
        metrics = asyncio.run(get_cached_shopify_metrics())

    # KPI Row
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("📦 Orders Today", metrics.orders_today, "")
    with col2:
        st.metric("💰 Revenue Today", format_currency(metrics.revenue_today), "")
    with col3:
        st.metric("⏳ Unfulfilled", metrics.unfulfilled_count, "")
    with col4:
        st.metric("📈 Total Orders", metrics.total_orders, "")

    # Recent Orders
    st.markdown("## 🛒 Recent Orders")
    if metrics.recent_orders:
        order_data = []
        for order in metrics.recent_orders:
            order_data.append({
                "Order #": order.number,
                "Total": format_currency(float(order.total_price)),
                "Customer": order.customer_email,
                "Status": format_order_status(order.fulfillment_status),
                "Items": order.line_items_count,
                "Date": order.created_at.strftime("%m/%d %H:%M")
            })

        import pandas as pd
        df = pd.DataFrame(order_data)
        st.dataframe(df, use_container_width=True)
    else:
        st.info("No recent orders found")

    # Top Products
    st.markdown("## 🏆 Top Products")
    if metrics.top_products:
        product_data = []
        for product in metrics.top_products:
            product_data.append({
                "Product": product.title,
                "Sales": product.total_sales,
                "Revenue": format_currency(product.revenue)
            })

        df = pd.DataFrame(product_data)
        st.dataframe(df, use_container_width=True)
    else:
        st.info("No product data available")

    # Last updated
    st.caption(f"Last updated: {metrics.last_updated.strftime('%Y-%m-%d %H:%M:%S UTC')}")


def render_github_page() -> None:
    """Render the GitHub Ops page with repository status."""
    st.markdown("# 🐙 GitHub Operations")
    st.markdown("Repository status and development activity")

    # Import here to avoid circular imports
    try:
        from orchestrator.integrations.github_client import (
            format_issue_labels,
            format_pr_status,
            format_relative_time,
            get_cached_github_status,
        )
    except ImportError:
        st.error("GitHub integration not available")
        return

    # Check if GitHub is configured
    github_configured = bool(os.getenv("GITHUB_TOKEN"))

    if not github_configured:
        st.warning("🔧 GitHub token not configured. Set GITHUB_TOKEN environment variable.")
        return

    # Fetch status
    with st.spinner("🐙 Loading GitHub status..."):
        status = asyncio.run(get_cached_github_status())

    # Summary metrics
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("🔄 Open PRs", len(status.open_prs), "")
    with col2:
        st.metric("🐛 Open Issues", len(status.open_issues), "")
    with col3:
        st.metric("📝 Recent Commits", len(status.recent_commits), "")
    with col4:
        st.metric("🌿 Default Branch", status.default_branch, "")

    # Pull Requests
    st.markdown("## 🔄 Open Pull Requests")
    if status.open_prs:
        for pr in status.open_prs:
            with st.expander(f"#{pr.number}: {pr.title}", expanded=False):
                col1, col2 = st.columns([2, 1])
                with col1:
                    st.markdown(f"**Author:** {pr.author}")
                    st.markdown(f"**Status:** {format_pr_status(pr)}")
                    st.markdown(f"**Updated:** {format_relative_time(pr.updated_at)}")
                with col2:
                    st.markdown(f"[View PR]({pr.url})")
    else:
        st.info("No open pull requests")

    # Issues
    st.markdown("## 🐛 Open Issues")
    if status.open_issues:
        for issue in status.open_issues:
            with st.expander(f"#{issue.number}: {issue.title}", expanded=False):
                col1, col2 = st.columns([2, 1])
                with col1:
                    st.markdown(f"**Author:** {issue.author}")
                    if issue.labels:
                        st.markdown(f"**Labels:** {format_issue_labels(issue.labels)}")
                    if issue.assignees:
                        st.markdown(f"**Assignees:** {', '.join(issue.assignees)}")
                    st.markdown(f"**Updated:** {format_relative_time(issue.updated_at)}")
                with col2:
                    st.markdown(f"[View Issue]({issue.url})")
    else:
        st.info("No open issues")

    # Recent Commits
    st.markdown("## 📝 Recent Commits")
    if status.recent_commits:
        for commit in status.recent_commits:
            st.markdown(
                f"**`{commit.sha}`** {commit.message} - *{commit.author}* "
                f"({format_relative_time(commit.date)}) [View]({commit.url})"
            )
    else:
        st.info("No recent commits")

    # Last updated
    st.caption(f"Last updated: {status.last_updated.strftime('%Y-%m-%d %H:%M:%S UTC')}")


def render_copilot_page() -> None:
    """Render the Copilot & Voice page."""
    st.markdown("# 🎤 AI Copilot & Voice Control")
    st.markdown("Interact with ARIA, your holographic AI assistant")

    # Import components
    try:
        from orchestrator.ai.assistant import (
            get_assistant,
            render_chat_interface,
            render_sample_commands,
        )
        from orchestrator.control_center.components.voice import (
            render_microphone_button,
            render_text_to_speech_component,
            render_voice_status,
            simulate_voice_command,
        )
    except ImportError as e:
        st.error(f"AI/Voice components not available: {e}")
        return

    # Voice status
    render_voice_status()

    # Initialize assistant
    orch = get_orchestrator()
    assistant = get_assistant(lambda: orch)

    # Two columns: Voice and Chat
    col1, col2 = st.columns([1, 2])

    with col1:
        st.markdown("### 🎤 Voice Control")

        # Voice button
        if render_microphone_button():
            st.success("Voice command detected!")
            # Simulate voice command for demo
            sample_commands = [
                "show agent health",
                "run all agents",
                "show shopify metrics",
                "show github status"
            ]
            import random
            simulated_command = random.choice(sample_commands)
            result = simulate_voice_command(simulated_command)
            st.info(result)

        # Sample commands
        render_sample_commands()

    with col2:
        st.markdown("### 💬 AI Chat")
        # Chat interface
        render_chat_interface(assistant)

    # TTS component (invisible)
    render_text_to_speech_component()


def render_settings_page() -> None:
    """Render the Settings page."""
    st.markdown("# ⚙️ Holographic Settings")
    st.markdown("Configure your control center experience")

    # API Status Section
    st.markdown("## 🔑 API Status")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("### External Services")

        # Shopify
        shopify_ok = bool(os.getenv("SHOPIFY_API_KEY") and os.getenv("SHOPIFY_API_SECRET") and os.getenv("SHOP_NAME"))
        st.markdown(f"**Shopify:** {'🟢 Configured' if shopify_ok else '🔴 Missing credentials'}")

        # OpenAI
        openai_ok = bool(os.getenv("OPENAI_API_KEY"))
        st.markdown(f"**OpenAI:** {'🟢 Configured' if openai_ok else '🔴 Missing API key'}")

        # GitHub
        github_ok = bool(os.getenv("GITHUB_TOKEN"))
        st.markdown(f"**GitHub:** {'🟢 Configured' if github_ok else '🔴 Missing token'}")

    with col2:
        st.markdown("### System Configuration")

        # Voice
        voice_enabled = os.getenv("VOICE_ENABLED", "true").lower() == "true"
        st.markdown(f"**Voice Control:** {'🟢 Enabled' if voice_enabled else '🔴 Disabled'}")

        # Polling
        poll_seconds = os.getenv("POLL_SECONDS", "30")
        st.markdown(f"**Polling Interval:** {poll_seconds}s")

        # Model
        openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        st.markdown(f"**AI Model:** {openai_model}")

    # Settings Form
    st.markdown("## 🎛️ Runtime Settings")

    with st.form("settings_form"):
        # Theme settings
        st.markdown("### 🎨 Theme Settings")
        st.slider(
            "Neon Intensity:",
            min_value=0.5,
            max_value=2.0,
            value=1.0,
            step=0.1,
            help="Adjust the intensity of neon effects"
        )

        st.checkbox(
            "Show Particle Background",
            value=True,
            help="Enable/disable animated particle background"
        )

        # Voice settings
        st.markdown("### 🔊 Voice Settings")

        # Import voice components
        try:
            from orchestrator.control_center.components.voice import (
                render_voice_settings,
            )
            render_voice_settings()
        except ImportError:
            st.warning("Voice settings not available")

        # Data refresh settings
        st.markdown("### 📊 Data Refresh")
        st.checkbox(
            "Auto-refresh Data",
            value=True,
            help="Automatically refresh metrics and status"
        )

        st.slider(
            "Refresh Interval (seconds):",
            min_value=10,
            max_value=300,
            value=30,
            step=10
        )

        # Submit
        submitted = st.form_submit_button("💾 Save Settings")

        if submitted:
            st.success("⚡ Settings updated! (Note: Some changes require restart)")

    # Help & Info
    st.markdown("## ❓ Help & Information")

    with st.expander("🌌 About Holographic Control Center"):
        st.markdown("""
        **Version:** 1.0.0
        **Framework:** Streamlit with custom CSS/JS
        **Theme:** Neon/Cyberpunk with glassmorphism effects
        **AI:** OpenAI GPT-4o-mini with function calling
        **Voice:** Streamlit-WebRTC + OpenAI Whisper

        **Features:**
        - Real-time agent monitoring and control
        - Live Shopify store metrics
        - GitHub repository status
        - Voice command interface
        - AI-powered chat assistant
        - Futuristic holographic UI
        """)

    with st.expander("🔧 Environment Variables"):
        st.code("""
        # Required for Shopify integration
        SHOPIFY_API_KEY=your_shopify_api_key
        SHOPIFY_API_SECRET=your_shopify_api_secret
        SHOP_NAME=your_shop_name

        # Required for AI features
        OPENAI_API_KEY=your_openai_api_key

        # Required for GitHub integration
        GITHUB_TOKEN=your_github_token

        # Optional settings
        VOICE_ENABLED=true
        POLL_SECONDS=30
        OPENAI_MODEL=gpt-4o-mini
        WHISPER_MODEL=whisper-1
        """)


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
    elif current_page == "Shopify":
        render_shopify_page()
    elif current_page == "GitHub":
        render_github_page()
    elif current_page == "Copilot":
        render_copilot_page()
    elif current_page == "Settings":
        render_settings_page()
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
