"""Theme configuration for the Holographic Control Center.

This module provides the neon/cyberpunk styling, glassmorphism effects,
and custom Plotly themes for the futuristic control center interface.
"""

from __future__ import annotations

import streamlit as st
from typing import Dict, Any


def inject_neon_theme() -> None:
    """Inject custom CSS for the neon/cyberpunk theme."""
    neon_css = """
    <style>
    /* Import futuristic font */
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
    
    /* Root variables for neon color palette */
    :root {
        --neon-cyan: #00ffff;
        --neon-pink: #ff0080;
        --neon-purple: #8000ff;
        --neon-green: #00ff41;
        --neon-blue: #0080ff;
        --dark-bg: #0a0a0a;
        --glass-bg: rgba(255, 255, 255, 0.05);
        --glass-border: rgba(255, 255, 255, 0.1);
    }
    
    /* Main app styling */
    .stApp {
        background: linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 50%, #0a0a1a 100%);
        font-family: 'Orbitron', monospace;
    }
    
    /* Sidebar styling */
    .css-1d391kg {
        background: rgba(0, 0, 0, 0.8);
        border-right: 1px solid var(--glass-border);
        backdrop-filter: blur(10px);
    }
    
    /* Main content area */
    .main .block-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
    }
    
    /* Headers with glow effects */
    h1, h2, h3 {
        color: var(--neon-cyan);
        text-shadow: 
            0 0 5px var(--neon-cyan),
            0 0 10px var(--neon-cyan),
            0 0 15px var(--neon-cyan);
        font-family: 'Orbitron', monospace;
        font-weight: 700;
    }
    
    h1 {
        font-size: 2.5rem;
        text-align: center;
        margin-bottom: 2rem;
    }
    
    /* Glass panel styling */
    .stContainer, .element-container {
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: 12px;
        backdrop-filter: blur(10px);
        padding: 1rem;
        margin: 0.5rem 0;
        box-shadow: 
            0 8px 32px rgba(0, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    
    /* Metric cards with neon glow */
    [data-testid="metric-container"] {
        background: var(--glass-bg);
        border: 1px solid var(--neon-cyan);
        border-radius: 12px;
        padding: 1rem;
        box-shadow: 
            0 0 20px rgba(0, 255, 255, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
    }
    
    [data-testid="metric-container"] > div {
        color: var(--neon-cyan);
    }
    
    /* Button styling */
    .stButton > button {
        background: linear-gradient(135deg, var(--neon-purple), var(--neon-pink));
        border: none;
        border-radius: 8px;
        color: white;
        font-family: 'Orbitron', monospace;
        font-weight: 600;
        padding: 0.75rem 1.5rem;
        box-shadow: 
            0 0 20px rgba(255, 0, 128, 0.4),
            0 4px 15px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
    }
    
    .stButton > button:hover {
        box-shadow: 
            0 0 30px rgba(255, 0, 128, 0.6),
            0 6px 20px rgba(0, 0, 0, 0.3);
        transform: translateY(-2px);
    }
    
    /* Input fields */
    .stTextInput > div > div > input,
    .stSelectbox > div > div > div,
    .stTextArea > div > div > textarea {
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid var(--neon-blue);
        border-radius: 8px;
        color: var(--neon-cyan);
        font-family: 'Orbitron', monospace;
    }
    
    /* Tables with neon styling */
    .stDataFrame {
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: 12px;
        overflow: hidden;
    }
    
    .stDataFrame table {
        background: transparent;
        color: var(--neon-cyan);
    }
    
    .stDataFrame th {
        background: rgba(0, 255, 255, 0.1);
        border-bottom: 1px solid var(--neon-cyan);
        color: var(--neon-cyan);
        font-family: 'Orbitron', monospace;
        font-weight: 700;
    }
    
    /* Status indicators */
    .status-healthy {
        color: var(--neon-green);
        text-shadow: 0 0 10px var(--neon-green);
    }
    
    .status-warning {
        color: #ffaa00;
        text-shadow: 0 0 10px #ffaa00;
    }
    
    .status-error {
        color: var(--neon-pink);
        text-shadow: 0 0 10px var(--neon-pink);
    }
    
    /* Navigation styling */
    .stSelectbox label, .stRadio label {
        color: var(--neon-cyan);
        font-family: 'Orbitron', monospace;
        font-weight: 600;
    }
    
    /* Chat interface styling */
    .chat-container {
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: 12px;
        padding: 1rem;
        margin: 1rem 0;
        backdrop-filter: blur(10px);
    }
    
    .chat-message {
        padding: 0.5rem;
        margin: 0.5rem 0;
        border-radius: 8px;
        font-family: 'Orbitron', monospace;
    }
    
    .chat-user {
        background: rgba(0, 128, 255, 0.2);
        border: 1px solid var(--neon-blue);
        text-align: right;
    }
    
    .chat-assistant {
        background: rgba(0, 255, 255, 0.2);
        border: 1px solid var(--neon-cyan);
    }
    
    /* Microphone button styling */
    .mic-button {
        background: radial-gradient(circle, var(--neon-pink), var(--neon-purple));
        border: none;
        border-radius: 50%;
        width: 60px;
        height: 60px;
        color: white;
        font-size: 1.5rem;
        box-shadow: 
            0 0 30px rgba(255, 0, 128, 0.5),
            0 4px 15px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
    }
    
    .mic-button:hover {
        box-shadow: 
            0 0 40px rgba(255, 0, 128, 0.7),
            0 6px 20px rgba(0, 0, 0, 0.4);
        transform: scale(1.1);
    }
    
    .mic-button.recording {
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% { box-shadow: 0 0 30px rgba(255, 0, 128, 0.5); }
        50% { box-shadow: 0 0 50px rgba(255, 0, 128, 0.9); }
        100% { box-shadow: 0 0 30px rgba(255, 0, 128, 0.5); }
    }
    
    /* Loading animations */
    .loading-dots {
        display: inline-block;
    }
    
    .loading-dots::after {
        content: '⠋';
        animation: loading 1s infinite;
        color: var(--neon-cyan);
        font-size: 1.2rem;
    }
    
    @keyframes loading {
        0% { content: '⠋'; }
        12.5% { content: '⠙'; }
        25% { content: '⠹'; }
        37.5% { content: '⠸'; }
        50% { content: '⠼'; }
        62.5% { content: '⠴'; }
        75% { content: '⠦'; }
        87.5% { content: '⠧'; }
        100% { content: '⠇'; }
    }
    
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Custom scrollbar */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }
    
    ::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
        border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, var(--neon-purple), var(--neon-pink));
    }
    </style>
    """
    st.markdown(neon_css, unsafe_allow_html=True)


def get_neon_plotly_theme() -> Dict[str, Any]:
    """Get custom Plotly theme with neon styling."""
    return {
        "layout": {
            "paper_bgcolor": "rgba(0,0,0,0)",
            "plot_bgcolor": "rgba(10,10,10,0.8)",
            "font": {
                "family": "Orbitron, monospace",
                "color": "#00ffff",
                "size": 12
            },
            "title": {
                "font": {
                    "family": "Orbitron, monospace",
                    "color": "#00ffff",
                    "size": 18
                }
            },
            "xaxis": {
                "gridcolor": "rgba(0,255,255,0.2)",
                "linecolor": "#00ffff",
                "tickcolor": "#00ffff",
                "tickfont": {"color": "#00ffff"}
            },
            "yaxis": {
                "gridcolor": "rgba(0,255,255,0.2)",
                "linecolor": "#00ffff",
                "tickcolor": "#00ffff",
                "tickfont": {"color": "#00ffff"}
            },
            "legend": {
                "font": {"color": "#00ffff"},
                "bgcolor": "rgba(0,0,0,0.5)",
                "bordercolor": "#00ffff"
            }
        },
        "data": {
            "scatter": [{
                "line": {"color": "#00ffff"},
                "marker": {"color": "#ff0080"}
            }],
            "bar": [{
                "marker": {
                    "color": "#8000ff",
                    "line": {"color": "#00ffff", "width": 1}
                }
            }],
            "line": [{
                "line": {"color": "#00ff41"}
            }]
        }
    }


def create_status_badge(status: str, text: str) -> str:
    """Create a styled status badge."""
    if status == "healthy":
        return f'<span class="status-healthy">🟢 {text}</span>'
    elif status == "warning":
        return f'<span class="status-warning">🟡 {text}</span>'
    elif status == "error":
        return f'<span class="status-error">🔴 {text}</span>'
    else:
        return f'<span>⚪ {text}</span>'


def format_metric_card(title: str, value: str, delta: str = None) -> str:
    """Format a metric card with neon styling."""
    delta_html = ""
    if delta:
        if delta.startswith("+"):
            delta_html = f'<div style="color: #00ff41; font-size: 0.8rem;">↗ {delta}</div>'
        elif delta.startswith("-"):
            delta_html = f'<div style="color: #ff0080; font-size: 0.8rem;">↘ {delta}</div>'
        else:
            delta_html = f'<div style="color: #00ffff; font-size: 0.8rem;">{delta}</div>'
    
    return f"""
    <div style="
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid #00ffff;
        border-radius: 12px;
        padding: 1rem;
        text-align: center;
        backdrop-filter: blur(10px);
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
    ">
        <div style="color: #00ffff; font-size: 0.9rem; opacity: 0.8;">{title}</div>
        <div style="color: #00ffff; font-size: 2rem; font-weight: bold; margin: 0.5rem 0;">{value}</div>
        {delta_html}
    </div>
    """