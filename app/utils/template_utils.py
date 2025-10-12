"""
Template utilities for self-healing template system.

Provides fallback template generation when templates are missing or corrupted.
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def create_fallback_index_template(app_name: str = "Royal Equips Orchestrator") -> str:
    """Create a fallback index.html template when the original is missing."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{app_name}</title>
    <link rel="stylesheet" href="/static/styles.css">
    <style>
        .system-recovery {{
            background: linear-gradient(45deg, #ff6b6b, #ffa500);
            color: white;
            padding: 1rem;
            margin: 1rem 0;
            border-radius: 8px;
            text-align: center;
            animation: pulse 2s infinite;
        }}
        @keyframes pulse {{
            0% {{ opacity: 0.8; }}
            50% {{ opacity: 1; }}
            100% {{ opacity: 0.8; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="system-recovery">
            ⚡ System Self-Recovery Mode Active ⚡
        </div>
        
        <header>
            <h1>{app_name}</h1>
            <p class="subtitle">Elite E-commerce Orchestration Platform</p>
        </header>
        
        <main>
            <div class="hero-section">
                <h2>Welcome to Your Command Center</h2>
                <p>System has automatically recovered from a configuration issue. All services are operational.</p>
                
                <div class="cta-section">
                    <a href="/command-center" class="primary-button">
                        🚀 Enter Command Center
                    </a>
                    <a href="/healthz" class="secondary-button">
                        📊 System Health
                    </a>
                </div>
            </div>
            
            <div class="features-section">
                <div class="feature-card">
                    <h3>🛡️ Self-Healing</h3>
                    <p>Automatic recovery from configuration and template issues</p>
                </div>
                <div class="feature-card">
                    <h3>📡 Real-time Monitoring</h3>
                    <p>Live dashboards and system status monitoring</p>
                </div>
                <div class="feature-card">
                    <h3>⚙️ Auto-Evolution</h3>
                    <p>Intelligent system adaptation and optimization</p>
                </div>
            </div>
        </main>
        
        <footer>
            <p>&copy; 2024 {app_name}. Elite operations with enterprise-grade reliability.</p>
        </footer>
    </div>
</body>
</html>"""


def ensure_template_exists(template_path: Path, app_name: str) -> bool:
    """
    Ensure a template exists, creating a fallback if necessary.
    
    Returns:
        True if template exists or was created successfully, False otherwise
    """
    try:
        if template_path.exists() and template_path.stat().st_size > 0:
            return True

        # Only log warning if we're not in the expected production container path pattern
        # to reduce noise during normal container operations
        if "/app/templates/" not in str(template_path):
            logger.warning(f"Template missing or empty: {template_path}")
        else:
            logger.debug(f"Template missing or empty (normal during container init): {template_path}")

        # Create fallback template
        if template_path.name == "index.html":
            fallback_content = create_fallback_index_template(app_name)

            # Ensure parent directory exists
            template_path.parent.mkdir(parents=True, exist_ok=True)

            # Write fallback template
            template_path.write_text(fallback_content, encoding='utf-8')
            logger.info(f"Created fallback template: {template_path}")
            return True

    except Exception as e:
        logger.error(f"Failed to ensure template exists: {e}")
        return False

    return False


def validate_template_directory(template_dir: Path, app_name: str) -> dict:
    """
    Validate and repair template directory structure.
    
    Returns:
        Status dictionary with validation results
    """
    status = {
        'valid': True,
        'templates_checked': 0,
        'templates_created': 0,
        'errors': []
    }

    try:
        # Check main index template
        index_path = template_dir / "index.html"
        status['templates_checked'] += 1

        if not ensure_template_exists(index_path, app_name):
            status['valid'] = False
            status['errors'].append("Failed to ensure index.html template")
        else:
            if not index_path.exists():
                status['templates_created'] += 1

        # Check error templates directory
        error_dir = template_dir / "errors"
        if not error_dir.exists():
            error_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created error templates directory: {error_dir}")

        # Ensure basic error templates exist
        error_templates = {
            "404.html": create_404_template(app_name),
            "500.html": create_500_template(app_name)
        }

        for template_name, template_content in error_templates.items():
            template_path = error_dir / template_name
            status['templates_checked'] += 1

            if not template_path.exists():
                template_path.write_text(template_content, encoding='utf-8')
                status['templates_created'] += 1
                logger.info(f"Created error template: {template_path}")

    except Exception as e:
        status['valid'] = False
        status['errors'].append(str(e))
        logger.error(f"Template directory validation failed: {e}")

    return status


def create_404_template(app_name: str) -> str:
    """Create a 404 error template."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found | {app_name}</title>
    <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
    <div class="container error-page">
        <div class="error-content">
            <div class="error-code">404</div>
            <h1>Page Not Found</h1>
            <p>The requested resource could not be found on this server.</p>
            <div class="error-actions">
                <a href="/" class="primary-button">Return Home</a>
                <a href="/command-center" class="secondary-button">Command Center</a>
            </div>
        </div>
    </div>
</body>
</html>"""


def create_500_template(app_name: str) -> str:
    """Create a 500 error template."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>500 - Server Error | {app_name}</title>
    <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
    <div class="container error-page">
        <div class="error-content">
            <div class="error-code">500</div>
            <h1>Internal Server Error</h1>
            <p>The server encountered an internal error and was unable to complete your request.</p>
            <div class="error-actions">
                <a href="/" class="primary-button">Return Home</a>
                <a href="/healthz" class="secondary-button">System Health</a>
            </div>
        </div>
    </div>
</body>
</html>"""
