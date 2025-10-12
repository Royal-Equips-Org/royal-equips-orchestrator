"""
Auto-fix health check route for Royal Equips Orchestrator.

Provides endpoints for monitoring auto-fix activities and system health.
"""

import logging
from flask import Blueprint, jsonify, request
from app.utils.auto_fix import health_check, auto_fixer

logger = logging.getLogger(__name__)

auto_fix_bp = Blueprint('auto_fix', __name__, url_prefix='/api/auto-fix')

@auto_fix_bp.route('/health')
def get_auto_fix_health():
    """Get comprehensive system health status with auto-fix information."""
    try:
        health_report = health_check()
        
        # Add auto-fixer specific information
        health_report['auto_fixer'] = {
            'fix_attempts': auto_fixer.fix_attempts,
            'max_retries': auto_fixer.max_retries,
            'available_fixes': list(auto_fixer.dependency_map.keys())
        }
        
        return jsonify(health_report)
    except Exception as e:
        logger.error(f"Auto-fix health check error: {e}")
        return jsonify({
            'error': str(e),
            'overall_status': 'error'
        }), 500

@auto_fix_bp.route('/status')
def get_auto_fix_status():
    """Get current auto-fix status and statistics."""
    try:
        return jsonify({
            'fix_attempts': auto_fixer.fix_attempts,
            'max_retries': auto_fixer.max_retries,
            'dependency_map_size': len(auto_fixer.dependency_map),
            'available_dependencies': list(auto_fixer.dependency_map.keys())
        })
    except Exception as e:
        logger.error(f"Auto-fix status error: {e}")
        return jsonify({'error': str(e)}), 500

@auto_fix_bp.route('/test-import')
def test_import():
    """Test importing a specific module with auto-fixing."""
    try:
        module_name = request.args.get('module')
        if not module_name:
            return jsonify({'error': 'module parameter required'}), 400
        
        from app.utils.auto_fix import safe_import
        success, module = safe_import(module_name)
        
        return jsonify({
            'module': module_name,
            'success': success,
            'available': module is not None,
            'type': str(type(module)) if module else None
        })
    except Exception as e:
        logger.error(f"Test import error: {e}")
        return jsonify({'error': str(e)}), 500

@auto_fix_bp.route('/force-health-check')
def force_health_check():
    """Force a comprehensive health check and return results."""
    try:
        health_report = health_check()
        return jsonify(health_report)
    except Exception as e:
        logger.error(f"Forced health check error: {e}")
        return jsonify({'error': str(e)}), 500