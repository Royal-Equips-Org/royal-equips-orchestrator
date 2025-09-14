"""
Workspace Management Blueprint for Royal Equips Orchestrator.

Provides API endpoints for:
- Workspace creation and management
- Environment switching and configuration
- Multi-operational task management
- Workspace state monitoring
- Operation tracking and history
"""

import logging
from datetime import datetime

from flask import Blueprint, jsonify, request

from app.services.workspace_service import (
    EnvironmentType,
    WorkspaceType,
    workspace_manager,
)

logger = logging.getLogger(__name__)

workspace_bp = Blueprint("workspace", __name__, url_prefix="/api/workspace")

@workspace_bp.route("/status", methods=["GET"])
def get_workspace_status():
    """
    Get workspace manager status and overview.
    ---
    tags:
      - Workspace
    responses:
      200:
        description: Workspace manager status
        schema:
          type: object
          properties:
            total_workspaces:
              type: integer
            active_workspace_id:
              type: string
            current_environment:
              type: string
            active_operations:
              type: integer
            timestamp:
              type: string
    """
    overview = workspace_manager.get_system_overview()
    return jsonify({
        "status": "operational",
        "overview": overview,
        "timestamp": datetime.utcnow().isoformat()
    })

@workspace_bp.route("/workspaces", methods=["GET"])
def list_workspaces():
    """
    List all workspaces with optional filtering.
    ---
    tags:
      - Workspace
    parameters:
      - name: type
        in: query
        type: string
        enum: ['operations', 'development', 'analytics', 'marketing', 'ecommerce', 'monitoring']
        description: Filter by workspace type
      - name: environment
        in: query
        type: string
        enum: ['development', 'staging', 'production', 'testing']
        description: Filter by environment
    responses:
      200:
        description: List of workspaces
    """
    workspace_type = request.args.get('type')
    environment = request.args.get('environment')

    # Convert string parameters to enums
    workspace_type_filter = None
    environment_filter = None

    if workspace_type:
        try:
            workspace_type_filter = WorkspaceType(workspace_type.lower())
        except ValueError:
            return jsonify({
                "error": f"Invalid workspace type: {workspace_type}",
                "valid_types": [t.value for t in WorkspaceType]
            }), 400

    if environment:
        try:
            environment_filter = EnvironmentType(environment.lower())
        except ValueError:
            return jsonify({
                "error": f"Invalid environment: {environment}",
                "valid_environments": [e.value for e in EnvironmentType]
            }), 400

    workspaces = workspace_manager.list_workspaces(workspace_type_filter, environment_filter)

    return jsonify({
        "workspaces": workspaces,
        "count": len(workspaces),
        "filters": {
            "type": workspace_type,
            "environment": environment
        },
        "timestamp": datetime.utcnow().isoformat()
    })

@workspace_bp.route("/workspaces", methods=["POST"])
def create_workspace():
    """
    Create a new workspace.
    ---
    tags:
      - Workspace
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            name:
              type: string
              description: Workspace name
            type:
              type: string
              enum: ['operations', 'development', 'analytics', 'marketing', 'ecommerce', 'monitoring']
              description: Workspace type
            environment:
              type: string
              enum: ['development', 'staging', 'production', 'testing']
              description: Target environment
            description:
              type: string
              description: Workspace description
            config:
              type: object
              description: Workspace-specific configuration
          required:
            - name
            - type
    responses:
      201:
        description: Workspace created successfully
      400:
        description: Invalid request body
    """
    try:
        data = request.get_json()
        if not data or 'name' not in data or 'type' not in data:
            return jsonify({
                "error": "Missing required fields: 'name' and 'type'"
            }), 400

        name = data['name']
        workspace_type_str = data['type'].lower()
        environment_str = data.get('environment', 'development').lower()
        description = data.get('description', '')
        config = data.get('config', {})

        # Validate workspace type
        try:
            workspace_type = WorkspaceType(workspace_type_str)
        except ValueError:
            return jsonify({
                "error": f"Invalid workspace type: {workspace_type_str}",
                "valid_types": [t.value for t in WorkspaceType]
            }), 400

        # Validate environment
        try:
            environment = EnvironmentType(environment_str)
        except ValueError:
            return jsonify({
                "error": f"Invalid environment: {environment_str}",
                "valid_environments": [e.value for e in EnvironmentType]
            }), 400

        result = workspace_manager.create_workspace(
            name=name,
            workspace_type=workspace_type,
            environment=environment,
            description=description,
            config=config
        )

        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 500

    except Exception as e:
        logger.error(f"Error creating workspace: {e}")
        return jsonify({
            "error": "Failed to create workspace",
            "message": str(e)
        }), 500

@workspace_bp.route("/workspaces/<workspace_id>", methods=["GET"])
def get_workspace_details(workspace_id):
    """
    Get detailed information about a specific workspace.
    ---
    tags:
      - Workspace
    parameters:
      - name: workspace_id
        in: path
        type: string
        required: true
        description: Workspace ID
    responses:
      200:
        description: Workspace details
      404:
        description: Workspace not found
    """
    workspace = workspace_manager.get_workspace(workspace_id)
    if not workspace:
        return jsonify({
            "error": f"Workspace {workspace_id} not found"
        }), 404

    status = workspace.get_status()
    status['is_active'] = workspace_id == workspace_manager.active_workspace_id

    return jsonify({
        "workspace": status,
        "timestamp": datetime.utcnow().isoformat()
    })

@workspace_bp.route("/workspaces/<workspace_id>/activate", methods=["POST"])
def activate_workspace(workspace_id):
    """
    Activate a workspace.
    ---
    tags:
      - Workspace
    parameters:
      - name: workspace_id
        in: path
        type: string
        required: true
        description: Workspace ID to activate
    responses:
      200:
        description: Workspace activated successfully
      404:
        description: Workspace not found
    """
    result = workspace_manager.activate_workspace(workspace_id)

    if result['success']:
        return jsonify(result)
    else:
        status_code = 404 if 'not found' in result['error'].lower() else 500
        return jsonify(result), status_code

@workspace_bp.route("/workspaces/<workspace_id>", methods=["DELETE"])
def delete_workspace(workspace_id):
    """
    Delete a workspace.
    ---
    tags:
      - Workspace
    parameters:
      - name: workspace_id
        in: path
        type: string
        required: true
        description: Workspace ID to delete
    responses:
      200:
        description: Workspace deleted successfully
      400:
        description: Cannot delete active workspace
      404:
        description: Workspace not found
    """
    result = workspace_manager.delete_workspace(workspace_id)

    if result['success']:
        return jsonify(result)
    else:
        if 'not found' in result['error'].lower():
            status_code = 404
        elif 'Cannot delete active workspace' in result['error']:
            status_code = 400
        else:
            status_code = 500
        return jsonify(result), status_code

@workspace_bp.route("/active", methods=["GET"])
def get_active_workspace():
    """
    Get the currently active workspace.
    ---
    tags:
      - Workspace
    responses:
      200:
        description: Active workspace details
      404:
        description: No active workspace
    """
    active_workspace = workspace_manager.get_active_workspace()
    if not active_workspace:
        return jsonify({
            "error": "No active workspace",
            "active_workspace": None
        }), 404

    status = active_workspace.get_status()
    status['is_active'] = True

    return jsonify({
        "active_workspace": status,
        "timestamp": datetime.utcnow().isoformat()
    })

@workspace_bp.route("/operations", methods=["POST"])
def start_operation():
    """
    Start a new operation in a workspace.
    ---
    tags:
      - Workspace
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            operation_type:
              type: string
              description: Type of operation to start
            description:
              type: string
              description: Operation description
            workspace_id:
              type: string
              description: Target workspace ID (uses active workspace if not specified)
          required:
            - operation_type
            - description
    responses:
      201:
        description: Operation started successfully
      400:
        description: Invalid request body
      404:
        description: Workspace not found
    """
    try:
        data = request.get_json()
        if not data or 'operation_type' not in data or 'description' not in data:
            return jsonify({
                "error": "Missing required fields: 'operation_type' and 'description'"
            }), 400

        operation_type = data['operation_type']
        description = data['description']
        workspace_id = data.get('workspace_id')  # Optional

        result = workspace_manager.start_operation(operation_type, description, workspace_id)

        if result['success']:
            return jsonify(result), 201
        else:
            status_code = 404 if 'not found' in result['error'].lower() else 400
            return jsonify(result), status_code

    except Exception as e:
        logger.error(f"Error starting operation: {e}")
        return jsonify({
            "error": "Failed to start operation",
            "message": str(e)
        }), 500

@workspace_bp.route("/operations/<operation_id>/complete", methods=["POST"])
def complete_operation(operation_id):
    """
    Mark an operation as completed.
    ---
    tags:
      - Workspace
    parameters:
      - name: operation_id
        in: path
        type: string
        required: true
        description: Operation ID to complete
      - name: body
        in: body
        schema:
          type: object
          properties:
            result:
              type: string
              default: completed
              description: Operation result/status
            workspace_id:
              type: string
              description: Target workspace ID (uses active workspace if not specified)
    responses:
      200:
        description: Operation completed successfully
      404:
        description: Operation or workspace not found
    """
    try:
        data = request.get_json() or {}
        result = data.get('result', 'completed')
        workspace_id = data.get('workspace_id')  # Optional

        completion_result = workspace_manager.complete_operation(operation_id, result, workspace_id)

        if completion_result['success']:
            return jsonify(completion_result)
        else:
            status_code = 404 if 'not found' in completion_result['error'].lower() else 400
            return jsonify(completion_result), status_code

    except Exception as e:
        logger.error(f"Error completing operation: {e}")
        return jsonify({
            "error": "Failed to complete operation",
            "message": str(e)
        }), 500

@workspace_bp.route("/environments", methods=["GET"])
def get_environments():
    """
    Get environment information and configuration.
    ---
    tags:
      - Workspace
    parameters:
      - name: environment
        in: query
        type: string
        description: Get specific environment info
    responses:
      200:
        description: Environment information
    """
    environment = request.args.get('environment')
    env_info = workspace_manager.get_environment_info(environment)

    return jsonify({
        "environment_info": env_info,
        "timestamp": datetime.utcnow().isoformat()
    })

@workspace_bp.route("/overview", methods=["GET"])
def get_system_overview():
    """
    Get comprehensive workspace system overview.
    ---
    tags:
      - Workspace
    responses:
      200:
        description: System overview with workspace metrics
    """
    overview = workspace_manager.get_system_overview()
    return jsonify(overview)
