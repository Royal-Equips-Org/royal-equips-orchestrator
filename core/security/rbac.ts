/**
 * Role-Based Access Control (RBAC) system for Royal Equips Orchestrator
 * 
 * Hierarchical role system with least privilege orientation:
 * VIEWER < ANALYST < OPERATOR < ADMIN < ROOT
 */

export type Role = 'VIEWER' | 'ANALYST' | 'OPERATOR' | 'ADMIN' | 'ROOT';

export interface User {
  id: string;
  email: string;
  role: Role;
  permissions?: string[];
}

export interface GuardSpec {
  required: Role;
  auditAction: string;
  resource?: string;
}

export interface AuthContext {
  user: User;
  timestamp: number;
  sessionId?: string;
  requestId?: string;
}

export class ForbiddenError extends Error {
  constructor(
    message: string,
    public required: Role,
    public actual: Role,
    public audit: string
  ) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

// Role hierarchy (lower index = lower privilege)
const ROLE_HIERARCHY: Role[] = ['VIEWER', 'ANALYST', 'OPERATOR', 'ADMIN', 'ROOT'];

/**
 * Check if assigned role has sufficient privileges for required role
 */
export function can(assigned: Role, required: Role): boolean {
  const assignedIndex = ROLE_HIERARCHY.indexOf(assigned);
  const requiredIndex = ROLE_HIERARCHY.indexOf(required);
  
  if (assignedIndex === -1 || requiredIndex === -1) {
    throw new Error(`Invalid role: assigned=${assigned}, required=${required}`);
  }
  
  return assignedIndex >= requiredIndex;
}

/**
 * Get role level (higher number = higher privilege)
 */
export function getRoleLevel(role: Role): number {
  return ROLE_HIERARCHY.indexOf(role);
}

/**
 * Get roles that can access a resource requiring the given role
 */
export function getAuthorizedRoles(requiredRole: Role): Role[] {
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);
  if (requiredIndex === -1) return [];
  
  return ROLE_HIERARCHY.slice(requiredIndex);
}

/**
 * Check authorization and throw if insufficient privileges
 */
export function authorize(userRole: Role, spec: GuardSpec): void {
  if (!can(userRole, spec.required)) {
    const error = new ForbiddenError(
      `Insufficient privileges: required ${spec.required}, have ${userRole}`,
      spec.required,
      userRole,
      spec.auditAction
    );
    
    // Add status for HTTP responses
    (error as any).status = 403;
    throw error;
  }
}

/**
 * Create authorization middleware for Express/Fastify
 */
export function createAuthGuard(spec: GuardSpec) {
  return (req: any, res: any, next: any) => {
    try {
      const user = req.user as User;
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      authorize(user.role, spec);
      
      // Log authorization success
      console.log(JSON.stringify({
        level: 'info',
        event: 'authorization_success',
        user_id: user.id,
        user_role: user.role,
        required_role: spec.required,
        action: spec.auditAction,
        resource: spec.resource,
        timestamp: new Date().toISOString()
      }));
      
      next();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        // Log authorization failure
        console.warn(JSON.stringify({
          level: 'warn',
          event: 'authorization_failure',
          user_id: req.user?.id,
          user_role: req.user?.role,
          required_role: spec.required,
          action: spec.auditAction,
          resource: spec.resource,
          error: error.message,
          timestamp: new Date().toISOString()
        }));
        
        return res.status(403).json({
          error: 'Forbidden',
          message: error.message,
          required_role: spec.required
        });
      }
      
      // Unexpected error
      console.error(JSON.stringify({
        level: 'error',
        event: 'authorization_error',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }));
      
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authorization check failed'
      });
    }
  };
}

/**
 * React hook for role-based UI rendering
 */
export function useRoleCheck(userRole: Role) {
  return {
    can: (requiredRole: Role) => can(userRole, requiredRole),
    canView: () => can(userRole, 'VIEWER'),
    canAnalyze: () => can(userRole, 'ANALYST'),
    canOperate: () => can(userRole, 'OPERATOR'),
    canAdmin: () => can(userRole, 'ADMIN'),
    isRoot: () => userRole === 'ROOT',
    getRoleLevel: () => getRoleLevel(userRole)
  };
}

/**
 * Role-based component wrapper
 */
export interface RoleGuardProps {
  required: Role;
  userRole: Role;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ required, userRole, children, fallback = null }: RoleGuardProps) {
  if (!can(userRole, required)) {
    return fallback as React.ReactElement;
  }
  return children as React.ReactElement;
}

/**
 * Permission-based guards for fine-grained control
 */
export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export function hasPermission(user: User, permission: Permission): boolean {
  // Basic implementation - extend as needed
  if (!user.permissions) return false;
  
  const permissionString = `${permission.resource}:${permission.action}`;
  return user.permissions.includes(permissionString) || user.permissions.includes('*:*');
}

/**
 * Create audit log entry for RBAC actions
 */
export function createAuditLog(
  context: AuthContext,
  action: string,
  resource?: string,
  success: boolean = true,
  details?: Record<string, any>
) {
  return {
    level: success ? 'info' : 'warn',
    event: 'rbac_audit',
    user_id: context.user.id,
    user_role: context.user.role,
    action,
    resource,
    success,
    session_id: context.sessionId,
    request_id: context.requestId,
    timestamp: new Date().toISOString(),
    details
  };
}

/**
 * Role escalation utilities (for temporary privilege elevation)
 */
export interface EscalationRequest {
  userId: string;
  currentRole: Role;
  requestedRole: Role;
  reason: string;
  duration?: number; // in minutes
  approver?: string;
}

export function validateEscalation(request: EscalationRequest): boolean {
  // Only allow escalation to next level or analyst->operator
  const currentLevel = getRoleLevel(request.currentRole);
  const requestedLevel = getRoleLevel(request.requestedRole);
  
  // Can't escalate to ROOT or beyond next level
  if (request.requestedRole === 'ROOT' || requestedLevel > currentLevel + 1) {
    return false;
  }
  
  // Special case: VIEWER can request ANALYST access
  if (request.currentRole === 'VIEWER' && request.requestedRole === 'ANALYST') {
    return true;
  }
  
  return requestedLevel === currentLevel + 1;
}

// Export default role definitions for common use cases
export const ROLE_DEFINITIONS = {
  VIEWER: {
    name: 'Viewer',
    description: 'Read-only access to dashboards and reports',
    permissions: ['dashboard:read', 'reports:read']
  },
  ANALYST: {
    name: 'Analyst',
    description: 'Can analyze data and create reports',
    permissions: ['dashboard:read', 'reports:read', 'reports:create', 'analytics:read']
  },
  OPERATOR: {
    name: 'Operator',
    description: 'Can execute operations and manage workflows',
    permissions: ['dashboard:read', 'reports:*', 'workflows:execute', 'agents:read']
  },
  ADMIN: {
    name: 'Administrator',
    description: 'Can manage system configuration and users',
    permissions: ['*:read', 'users:*', 'settings:*', 'agents:*']
  },
  ROOT: {
    name: 'Root',
    description: 'Full system access including security settings',
    permissions: ['*:*']
  }
} as const;