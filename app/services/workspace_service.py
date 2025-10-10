"""
Workspace and Environment Management Service.

Provides multi-operational workspace capabilities for the Royal Equips platform:
- Environment management (development, staging, production)
- Workspace isolation and configuration
- Multi-tenant operational contexts
- Environment-specific settings and monitoring
- Workspace switching and state management
"""

import logging
import os
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

class EnvironmentType(Enum):
    """Supported environment types."""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"

class WorkspaceType(Enum):
    """Supported workspace types."""
    OPERATIONS = "operations"
    DEVELOPMENT = "development"
    ANALYTICS = "analytics"
    MARKETING = "marketing"
    ECOMMERCE = "ecommerce"
    MONITORING = "monitoring"

class WorkspaceStatus(Enum):
    """Workspace status states."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    MAINTENANCE = "maintenance"

class Workspace:
    """Individual workspace configuration and state."""

    def __init__(
        self,
        workspace_id: str,
        name: str,
        workspace_type: WorkspaceType,
        environment: EnvironmentType,
        description: str = "",
        config: Dict[str, Any] = None
    ):
        self.workspace_id = workspace_id
        self.name = name
        self.workspace_type = workspace_type
        self.environment = environment
        self.description = description
        self.config = config or {}
        self.status = WorkspaceStatus.INACTIVE
        self.created_at = datetime.now(timezone.utc)
        self.updated_at = self.created_at
        self.last_accessed = None
        self.access_count = 0

        # Workspace-specific settings
        self.settings = {
            'monitoring_enabled': True,
            'alerts_enabled': True,
            'auto_save': True,
            'theme': 'dark',
            'refresh_interval': 30,
            'max_operations': 10
        }

        # Active operations in this workspace
        self.active_operations = []
        self.operation_history = []

    def activate(self) -> Dict[str, Any]:
        """Activate the workspace."""
        self.status = WorkspaceStatus.ACTIVE
        self.last_accessed = datetime.now(timezone.utc)
        self.access_count += 1
        self.updated_at = datetime.now(timezone.utc)

        logger.info(f"Workspace {self.name} ({self.workspace_id}) activated")
        return {
            'success': True,
            'workspace_id': self.workspace_id,
            'status': self.status.value,
            'activated_at': self.last_accessed.isoformat()
        }

    def deactivate(self) -> Dict[str, Any]:
        """Deactivate the workspace."""
        self.status = WorkspaceStatus.INACTIVE
        self.updated_at = datetime.now(timezone.utc)

        logger.info(f"Workspace {self.name} ({self.workspace_id}) deactivated")
        return {
            'success': True,
            'workspace_id': self.workspace_id,
            'status': self.status.value,
            'deactivated_at': self.updated_at.isoformat()
        }

    def add_operation(self, operation_id: str, operation_type: str, description: str) -> Dict[str, Any]:
        """Add an operation to this workspace."""
        operation = {
            'operation_id': operation_id,
            'operation_type': operation_type,
            'description': description,
            'started_at': datetime.now(timezone.utc).isoformat(),
            'status': 'running'
        }

        self.active_operations.append(operation)
        self.updated_at = datetime.now(timezone.utc)

        logger.info(f"Added operation {operation_id} to workspace {self.name}")
        return operation

    def complete_operation(self, operation_id: str, result: str = "completed") -> Dict[str, Any]:
        """Mark an operation as completed and move to history."""
        for i, operation in enumerate(self.active_operations):
            if operation['operation_id'] == operation_id:
                operation['completed_at'] = datetime.now(timezone.utc).isoformat()
                operation['status'] = 'completed'
                operation['result'] = result

                # Move to history
                self.operation_history.append(operation)
                del self.active_operations[i]

                # Keep history manageable
                if len(self.operation_history) > 100:
                    self.operation_history = self.operation_history[-100:]

                self.updated_at = datetime.now(timezone.utc)
                logger.info(f"Completed operation {operation_id} in workspace {self.name}")
                return operation

        return {'error': f'Operation {operation_id} not found'}

    def get_status(self) -> Dict[str, Any]:
        """Get current workspace status and metrics."""
        return {
            'workspace_id': self.workspace_id,
            'name': self.name,
            'type': self.workspace_type.value,
            'environment': self.environment.value,
            'status': self.status.value,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
            'access_count': self.access_count,
            'settings': self.settings,
            'metrics': {
                'active_operations': len(self.active_operations),
                'total_operations': len(self.operation_history) + len(self.active_operations),
                'uptime': (datetime.now(timezone.utc) - self.created_at).total_seconds() if self.status == WorkspaceStatus.ACTIVE else 0
            },
            'active_operations': self.active_operations,
            'recent_operations': self.operation_history[-5:] if self.operation_history else []
        }

class WorkspaceManager:
    """
    Multi-operational workspace and environment manager.

    Provides:
    - Workspace creation and management
    - Environment isolation
    - Multi-tenant operations
    - Workspace switching and state management
    """

    def __init__(self):
        """Initialize the workspace manager."""
        self.workspaces: Dict[str, Workspace] = {}
        self.active_workspace_id: Optional[str] = None
        self.environments: Dict[str, Dict[str, Any]] = {}

        # Initialize default environments
        self._initialize_default_environments()

        # Create default workspaces
        self._create_default_workspaces()

    def _initialize_default_environments(self):
        """Initialize default environment configurations."""
        current_env = os.getenv('FLASK_ENV', 'development')

        self.environments = {
            EnvironmentType.DEVELOPMENT.value: {
                'name': 'Development',
                'description': 'Local development environment',
                'config': {
                    'debug': True,
                    'monitoring_level': 'verbose',
                    'auto_reload': True,
                    'log_level': 'DEBUG'
                },
                'active': current_env == 'development'
            },
            EnvironmentType.STAGING.value: {
                'name': 'Staging',
                'description': 'Pre-production testing environment',
                'config': {
                    'debug': False,
                    'monitoring_level': 'standard',
                    'auto_reload': False,
                    'log_level': 'INFO'
                },
                'active': current_env == 'staging'
            },
            EnvironmentType.PRODUCTION.value: {
                'name': 'Production',
                'description': 'Live production environment',
                'config': {
                    'debug': False,
                    'monitoring_level': 'critical',
                    'auto_reload': False,
                    'log_level': 'WARNING'
                },
                'active': current_env == 'production'
            },
            EnvironmentType.TESTING.value: {
                'name': 'Testing',
                'description': 'Automated testing environment',
                'config': {
                    'debug': True,
                    'monitoring_level': 'minimal',
                    'auto_reload': False,
                    'log_level': 'ERROR'
                },
                'active': current_env == 'testing'
            }
        }

    def _create_default_workspaces(self):
        """Create default workspaces for different operational contexts."""
        current_env = EnvironmentType(os.getenv('FLASK_ENV', 'development'))

        default_workspaces = [
            {
                'name': 'Elite Command Center',
                'type': WorkspaceType.OPERATIONS,
                'description': 'Executive control center for all platform operations'
            },
            {
                'name': 'E-Commerce Operations',
                'type': WorkspaceType.ECOMMERCE,
                'description': 'Shopify store management and e-commerce operations'
            },
            {
                'name': 'System Monitoring',
                'type': WorkspaceType.MONITORING,
                'description': 'System health, performance, and infrastructure monitoring'
            },
            {
                'name': 'Marketing Command',
                'type': WorkspaceType.MARKETING,
                'description': 'Marketing campaigns, social media, and customer engagement'
            },
            {
                'name': 'Analytics Hub',
                'type': WorkspaceType.ANALYTICS,
                'description': 'Business intelligence, analytics, and reporting'
            },
            {
                'name': 'Development Console',
                'type': WorkspaceType.DEVELOPMENT,
                'description': 'Development tools, debugging, and code management'
            }
        ]

        for workspace_config in default_workspaces:
            workspace_id = str(uuid.uuid4())
            workspace = Workspace(
                workspace_id=workspace_id,
                name=workspace_config['name'],
                workspace_type=workspace_config['type'],
                environment=current_env,
                description=workspace_config['description']
            )

            self.workspaces[workspace_id] = workspace

        # Activate the first workspace as default
        if self.workspaces:
            first_workspace_id = list(self.workspaces.keys())[0]
            self.activate_workspace(first_workspace_id)

    def create_workspace(
        self,
        name: str,
        workspace_type: WorkspaceType,
        environment: EnvironmentType = None,
        description: str = "",
        config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Create a new workspace."""
        if environment is None:
            environment = EnvironmentType(os.getenv('FLASK_ENV', 'development'))

        workspace_id = str(uuid.uuid4())
        workspace = Workspace(
            workspace_id=workspace_id,
            name=name,
            workspace_type=workspace_type,
            environment=environment,
            description=description,
            config=config or {}
        )

        self.workspaces[workspace_id] = workspace
        logger.info(f"Created workspace: {name} ({workspace_id})")

        return {
            'success': True,
            'workspace_id': workspace_id,
            'workspace': workspace.get_status()
        }

    def get_workspace(self, workspace_id: str) -> Optional[Workspace]:
        """Get workspace by ID."""
        return self.workspaces.get(workspace_id)

    def list_workspaces(self, workspace_type: WorkspaceType = None, environment: EnvironmentType = None) -> List[Dict[str, Any]]:
        """List all workspaces with optional filtering."""
        workspaces = []

        for workspace in self.workspaces.values():
            # Apply filters
            if workspace_type and workspace.workspace_type != workspace_type:
                continue
            if environment and workspace.environment != environment:
                continue

            status = workspace.get_status()
            status['is_active'] = workspace.workspace_id == self.active_workspace_id
            workspaces.append(status)

        # Sort by last accessed time
        workspaces.sort(key=lambda w: w.get('last_accessed') or '0000-01-01T00:00:00', reverse=True)
        return workspaces

    def activate_workspace(self, workspace_id: str) -> Dict[str, Any]:
        """Activate a workspace and make it the current active workspace."""
        workspace = self.workspaces.get(workspace_id)
        if not workspace:
            return {
                'success': False,
                'error': f'Workspace {workspace_id} not found'
            }

        # Deactivate current active workspace
        if self.active_workspace_id and self.active_workspace_id != workspace_id:
            current_workspace = self.workspaces.get(self.active_workspace_id)
            if current_workspace:
                current_workspace.deactivate()

        # Activate new workspace
        result = workspace.activate()
        if result['success']:
            self.active_workspace_id = workspace_id

        return result

    def get_active_workspace(self) -> Optional[Workspace]:
        """Get the currently active workspace."""
        if self.active_workspace_id:
            return self.workspaces.get(self.active_workspace_id)
        return None

    def delete_workspace(self, workspace_id: str) -> Dict[str, Any]:
        """Delete a workspace."""
        if workspace_id not in self.workspaces:
            return {
                'success': False,
                'error': f'Workspace {workspace_id} not found'
            }

        workspace = self.workspaces[workspace_id]
        workspace_name = workspace.name

        # Can't delete active workspace
        if workspace_id == self.active_workspace_id:
            return {
                'success': False,
                'error': 'Cannot delete active workspace. Switch to another workspace first.'
            }

        del self.workspaces[workspace_id]
        logger.info(f"Deleted workspace: {workspace_name} ({workspace_id})")

        return {
            'success': True,
            'message': f'Workspace {workspace_name} deleted successfully'
        }

    def start_operation(self, operation_type: str, description: str, workspace_id: str = None) -> Dict[str, Any]:
        """Start a new operation in a workspace."""
        target_workspace_id = workspace_id or self.active_workspace_id

        if not target_workspace_id:
            return {
                'success': False,
                'error': 'No workspace specified and no active workspace'
            }

        workspace = self.workspaces.get(target_workspace_id)
        if not workspace:
            return {
                'success': False,
                'error': f'Workspace {target_workspace_id} not found'
            }

        operation_id = str(uuid.uuid4())
        operation = workspace.add_operation(operation_id, operation_type, description)

        return {
            'success': True,
            'operation_id': operation_id,
            'workspace_id': target_workspace_id,
            'operation': operation
        }

    def complete_operation(self, operation_id: str, result: str = "completed", workspace_id: str = None) -> Dict[str, Any]:
        """Complete an operation in a workspace."""
        target_workspace_id = workspace_id or self.active_workspace_id

        if not target_workspace_id:
            return {
                'success': False,
                'error': 'No workspace specified and no active workspace'
            }

        workspace = self.workspaces.get(target_workspace_id)
        if not workspace:
            return {
                'success': False,
                'error': f'Workspace {target_workspace_id} not found'
            }

        operation = workspace.complete_operation(operation_id, result)

        if 'error' in operation:
            return {
                'success': False,
                'error': operation['error']
            }

        return {
            'success': True,
            'operation': operation,
            'workspace_id': target_workspace_id
        }

    def get_environment_info(self, environment_type: str = None) -> Dict[str, Any]:
        """Get environment information."""
        if environment_type:
            return self.environments.get(environment_type, {'error': 'Environment not found'})

        return {
            'environments': self.environments,
            'current_environment': os.getenv('FLASK_ENV', 'development')
        }

    def get_system_overview(self) -> Dict[str, Any]:
        """Get comprehensive system overview."""
        active_workspace = self.get_active_workspace()

        return {
            'workspace_manager': {
                'total_workspaces': len(self.workspaces),
                'active_workspace_id': self.active_workspace_id,
                'active_workspace': active_workspace.get_status() if active_workspace else None
            },
            'environments': self.environments,
            'current_environment': os.getenv('FLASK_ENV', 'development'),
            'workspaces_by_type': {
                workspace_type.value: len([
                    w for w in self.workspaces.values()
                    if w.workspace_type == workspace_type
                ])
                for workspace_type in WorkspaceType
            },
            'active_operations': sum(
                len(workspace.active_operations)
                for workspace in self.workspaces.values()
            ),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

# Global workspace manager instance
workspace_manager = WorkspaceManager()
