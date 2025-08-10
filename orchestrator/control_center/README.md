# Control Center - DEPRECATED

⚠️ **NOTICE: This Streamlit-based control center has been deprecated.**

## 🚀 New Command Center Location

The **2050 Cyberpunk Command Center** is now implemented as a React application:

```bash
cd admin/
npm install
npm run dev
```

Access at: http://localhost:3000/admin/

## Features of the New React Command Center

- **Cyberpunk Aesthetic**: Neon glow effects, particle systems, holographic visualizations
- **Real-time Monitoring**: Live agent status, system metrics, performance analytics
- **Three.js Visualizations**: 3D holographic displays and interactive elements
- **WebSocket Integration**: Real-time data streams and instant updates
- **Voice Control**: AI-powered voice commands and responses
- **Multi-screen Support**: Advanced navigation and dashboard layouts

## Legacy Files Removed

The following Streamlit files have been removed as part of the codebase cleanup:
- `holo_app.py` - Holographic Streamlit control center (697 lines)
- `app.py` - Classic Streamlit dashboard (147 lines)
- `theme.py` - Streamlit theming
- `components/` - Streamlit-specific components
- `scripts/run_control_center.py` - Streamlit launcher script

## Migration Notes

All functionality from the legacy Streamlit control centers has been reimplemented in the React interface with enhanced features and performance.