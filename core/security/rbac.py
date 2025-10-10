"""
Role-Based Access Control (RBAC) system for Royal Equips Orchestrator

Hierarchical role system with least privilege orientation:
VIEWER < ANALYST < OPERATOR < ADMIN < ROOT
"""

from enum import Enum
from typing import List, Dict, Any, Optional, Protocol
from dataclasses import dataclass
import json
from datetime import datetime


class Role(Enum):
    """User roles in hierarchical order."""
    VIEWER = "VIEWER"
    ANALYST = "ANALYST" 
    OPERATOR = "OPERATOR"
    ADMIN = "ADMIN"
    ROOT = "ROOT"


@dataclass
class User:
    """User with role and permissions."""
    id: str
    email: str
    role: Role
    permissions: Optional[List[str]] = None


@dataclass
class GuardSpec:
    """Authorization guard specification."""
    required: Role
    audit_action: str
    resource: Optional[str] = None


@dataclass
class AuthContext:
    """Authentication context for audit logging."""
    user: User
    timestamp: datetime
    session_id: Optional[str] = None
    request_id: Optional[str] = None


class ForbiddenError(Exception):
    """Authorization failed - insufficient privileges."""
    
    def __init__(
        self, 
        message: str, 
        required: Role, 
        actual: Role, 
        audit: str
    ):
        super().__init__(message)
        self.required = required
        self.actual = actual
        self.audit = audit
        self.status = 403


# Role hierarchy (lower index = lower privilege)
ROLE_HIERARCHY = [Role.VIEWER, Role.ANALYST, Role.OPERATOR, Role.ADMIN, Role.ROOT]


def can(assigned: Role, required: Role) -> bool:
    """Check if assigned role has sufficient privileges for required role."""
    try:
        assigned_index = ROLE_HIERARCHY.index(assigned)
        required_index = ROLE_HIERARCHY.index(required)
        return assigned_index >= required_index
    except ValueError as e:
        raise ValueError(f"Invalid role: assigned={assigned}, required={required}") from e


def get_role_level(role: Role) -> int:
    """Get role level (higher number = higher privilege)."""
    return ROLE_HIERARCHY.index(role)


def get_authorized_roles(required_role: Role) -> List[Role]:
    """Get roles that can access a resource requiring the given role."""
    try:
        required_index = ROLE_HIERARCHY.index(required_role)
        return ROLE_HIERARCHY[required_index:]
    except ValueError:
        return []


def authorize(user_role: Role, spec: GuardSpec) -> None:
    """Check authorization and raise if insufficient privileges."""
    if not can(user_role, spec.required):
        raise ForbiddenError(
            f"Insufficient privileges: required {spec.required.value}, have {user_role.value}",
            spec.required,
            user_role,
            spec.audit_action
        )


class RoleChecker:
    """Utility class for role-based checks."""
    
    def __init__(self, user_role: Role):
        self.user_role = user_role
    
    def can(self, required_role: Role) -> bool:
        """Check if user can access resource requiring given role."""
        return can(self.user_role, required_role)
    
    def can_view(self) -> bool:
        """Check if user has viewer privileges."""
        return can(self.user_role, Role.VIEWER)
    
    def can_analyze(self) -> bool:
        """Check if user has analyst privileges."""
        return can(self.user_role, Role.ANALYST)
    
    def can_operate(self) -> bool:
        """Check if user has operator privileges."""
        return can(self.user_role, Role.OPERATOR)
    
    def can_admin(self) -> bool:
        """Check if user has admin privileges."""
        return can(self.user_role, Role.ADMIN)
    
    def is_root(self) -> bool:
        """Check if user is root."""
        return self.user_role == Role.ROOT
    
    def get_role_level(self) -> int:
        """Get numeric role level."""
        return get_role_level(self.user_role)


@dataclass
class Permission:
    """Fine-grained permission specification."""
    resource: str
    action: str
    conditions: Optional[Dict[str, Any]] = None


def has_permission(user: User, permission: Permission) -> bool:
    """Check if user has specific permission."""
    if not user.permissions:
        return False
    
    permission_string = f"{permission.resource}:{permission.action}"
    return (
        permission_string in user.permissions or 
        "*:*" in user.permissions
    )


def create_audit_log(
    context: AuthContext,
    action: str,
    resource: Optional[str] = None,
    success: bool = True,
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Create audit log entry for RBAC actions."""
    return {
        "level": "info" if success else "warn",
        "event": "rbac_audit",
        "user_id": context.user.id,
        "user_role": context.user.role.value,
        "action": action,
        "resource": resource,
        "success": success,
        "session_id": context.session_id,
        "request_id": context.request_id,
        "timestamp": context.timestamp.isoformat(),
        "details": details
    }


@dataclass
class EscalationRequest:
    """Role escalation request."""
    user_id: str
    current_role: Role
    requested_role: Role
    reason: str
    duration: Optional[int] = None  # in minutes
    approver: Optional[str] = None


def validate_escalation(request: EscalationRequest) -> bool:
    """Validate role escalation request."""
    current_level = get_role_level(request.current_role)
    requested_level = get_role_level(request.requested_role)
    
    # Can't escalate to ROOT or beyond next level
    if request.requested_role == Role.ROOT or requested_level > current_level + 1:
        return False
    
    # Special case: VIEWER can request ANALYST access
    if request.current_role == Role.VIEWER and request.requested_role == Role.ANALYST:
        return True
    
    return requested_level == current_level + 1


# Role definitions for common use cases
ROLE_DEFINITIONS = {
    Role.VIEWER: {
        "name": "Viewer",
        "description": "Read-only access to dashboards and reports",
        "permissions": ["dashboard:read", "reports:read"]
    },
    Role.ANALYST: {
        "name": "Analyst", 
        "description": "Can analyze data and create reports",
        "permissions": ["dashboard:read", "reports:read", "reports:create", "analytics:read"]
    },
    Role.OPERATOR: {
        "name": "Operator",
        "description": "Can execute operations and manage workflows", 
        "permissions": ["dashboard:read", "reports:*", "workflows:execute", "agents:read"]
    },
    Role.ADMIN: {
        "name": "Administrator",
        "description": "Can manage system configuration and users",
        "permissions": ["*:read", "users:*", "settings:*", "agents:*"]
    },
    Role.ROOT: {
        "name": "Root",
        "description": "Full system access including security settings",
        "permissions": ["*:*"]
    }
}


class AuthMiddleware:
    """Authorization middleware for FastAPI/Flask."""
    
    def __init__(self, spec: GuardSpec):
        self.spec = spec
    
    def __call__(self, user: User) -> None:
        """Check authorization for user."""
        if not user:
            raise ValueError("Authentication required")
        
        try:
            authorize(user.role, self.spec)
            
            # Log authorization success
            print(json.dumps({
                "level": "info",
                "event": "authorization_success",
                "user_id": user.id,
                "user_role": user.role.value,
                "required_role": self.spec.required.value,
                "action": self.spec.audit_action,
                "resource": self.spec.resource,
                "timestamp": datetime.now().isoformat()
            }))
            
        except ForbiddenError as error:
            # Log authorization failure
            print(json.dumps({
                "level": "warn",
                "event": "authorization_failure",
                "user_id": user.id,
                "user_role": user.role.value,
                "required_role": self.spec.required.value,
                "action": self.spec.audit_action,
                "resource": self.spec.resource,
                "error": str(error),
                "timestamp": datetime.now().isoformat()
            }))
            raise


# Example usage
def example_usage():
    """Demonstrate RBAC usage."""
    # Create users
    viewer = User(id="user1", email="viewer@royal-equips.com", role=Role.VIEWER)
    admin = User(id="user2", email="admin@royal-equips.com", role=Role.ADMIN)
    
    # Create role checkers
    viewer_check = RoleChecker(viewer.role)
    admin_check = RoleChecker(admin.role)
    
    # Check permissions
    print(f"Viewer can view: {viewer_check.can_view()}")  # True
    print(f"Viewer can admin: {viewer_check.can_admin()}")  # False
    print(f"Admin can admin: {admin_check.can_admin()}")  # True
    
    # Authorization with guards
    try:
        authorize(viewer.role, GuardSpec(Role.ADMIN, "settings:update"))
    except ForbiddenError as e:
        print(f"Authorization failed: {e}")
    
    # Successful authorization
    authorize(admin.role, GuardSpec(Role.ADMIN, "settings:update"))
    print("Admin authorization successful")


if __name__ == "__main__":
    example_usage()