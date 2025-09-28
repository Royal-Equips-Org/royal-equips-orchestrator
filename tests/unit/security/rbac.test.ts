/**
 * Tests for RBAC system
 * 
 * Tests cover:
 * - Role hierarchy and permissions
 * - Authorization guards
 * - Role checking utilities
 * - Permission validation
 * - Audit logging
 */

import {
  Role,
  can,
  getRoleLevel,
  getAuthorizedRoles,
  authorize,
  ForbiddenError,
  useRoleCheck,
  hasPermission,
  validateEscalation,
  GuardSpec,
  User,
  EscalationRequest
} from '../../../core/security/rbac';

describe('RBAC System', () => {
  describe('Role Hierarchy', () => {
    it('should correctly identify role levels', () => {
      expect(getRoleLevel('VIEWER')).toBe(0);
      expect(getRoleLevel('ANALYST')).toBe(1);
      expect(getRoleLevel('OPERATOR')).toBe(2);
      expect(getRoleLevel('ADMIN')).toBe(3);
      expect(getRoleLevel('ROOT')).toBe(4);
    });

    it('should validate can() function correctly', () => {
      // ROOT can access everything
      expect(can('ROOT', 'VIEWER')).toBe(true);
      expect(can('ROOT', 'ANALYST')).toBe(true);
      expect(can('ROOT', 'OPERATOR')).toBe(true);
      expect(can('ROOT', 'ADMIN')).toBe(true);
      expect(can('ROOT', 'ROOT')).toBe(true);

      // ADMIN can access ADMIN and below
      expect(can('ADMIN', 'VIEWER')).toBe(true);
      expect(can('ADMIN', 'ANALYST')).toBe(true);
      expect(can('ADMIN', 'OPERATOR')).toBe(true);
      expect(can('ADMIN', 'ADMIN')).toBe(true);
      expect(can('ADMIN', 'ROOT')).toBe(false);

      // VIEWER can only access VIEWER
      expect(can('VIEWER', 'VIEWER')).toBe(true);
      expect(can('VIEWER', 'ANALYST')).toBe(false);
      expect(can('VIEWER', 'OPERATOR')).toBe(false);
      expect(can('VIEWER', 'ADMIN')).toBe(false);
      expect(can('VIEWER', 'ROOT')).toBe(false);
    });

    it('should get authorized roles correctly', () => {
      expect(getAuthorizedRoles('VIEWER')).toEqual(['VIEWER', 'ANALYST', 'OPERATOR', 'ADMIN', 'ROOT']);
      expect(getAuthorizedRoles('ADMIN')).toEqual(['ADMIN', 'ROOT']);
      expect(getAuthorizedRoles('ROOT')).toEqual(['ROOT']);
    });
  });

  describe('Authorization', () => {
    const guardSpec: GuardSpec = {
      required: 'ADMIN',
      auditAction: 'settings:update',
      resource: 'system-settings'
    };

    it('should authorize users with sufficient privileges', () => {
      expect(() => authorize('ROOT', guardSpec)).not.toThrow();
      expect(() => authorize('ADMIN', guardSpec)).not.toThrow();
    });

    it('should reject users with insufficient privileges', () => {
      expect(() => authorize('OPERATOR', guardSpec)).toThrow(ForbiddenError);
      expect(() => authorize('VIEWER', guardSpec)).toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError with correct properties', () => {
      try {
        authorize('VIEWER', guardSpec);
        fail('Should have thrown ForbiddenError');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect(error.required).toBe('ADMIN');
        expect(error.actual).toBe('VIEWER');
        expect(error.audit).toBe('settings:update');
        expect(error.message).toContain('Insufficient privileges');
      }
    });
  });

  describe('Role Checker Utility', () => {
    it('should provide correct role checks for VIEWER', () => {
      const checker = useRoleCheck('VIEWER');
      
      expect(checker.canView()).toBe(true);
      expect(checker.canAnalyze()).toBe(false);
      expect(checker.canOperate()).toBe(false);
      expect(checker.canAdmin()).toBe(false);
      expect(checker.isRoot()).toBe(false);
      expect(checker.getRoleLevel()).toBe(0);
    });

    it('should provide correct role checks for ADMIN', () => {
      const checker = useRoleCheck('ADMIN');
      
      expect(checker.canView()).toBe(true);
      expect(checker.canAnalyze()).toBe(true);
      expect(checker.canOperate()).toBe(true);
      expect(checker.canAdmin()).toBe(true);
      expect(checker.isRoot()).toBe(false);
      expect(checker.getRoleLevel()).toBe(3);
    });

    it('should provide correct role checks for ROOT', () => {
      const checker = useRoleCheck('ROOT');
      
      expect(checker.canView()).toBe(true);
      expect(checker.canAnalyze()).toBe(true);
      expect(checker.canOperate()).toBe(true);
      expect(checker.canAdmin()).toBe(true);
      expect(checker.isRoot()).toBe(true);
      expect(checker.getRoleLevel()).toBe(4);
    });
  });

  describe('Permission System', () => {
    const userWithPermissions: User = {
      id: 'user1',
      email: 'user@example.com',
      role: 'ANALYST',
      permissions: ['reports:read', 'reports:create', 'analytics:read']
    };

    const userWithWildcard: User = {
      id: 'user2',
      email: 'admin@example.com',
      role: 'ADMIN',
      permissions: ['*:*']
    };

    const userWithoutPermissions: User = {
      id: 'user3',
      email: 'basic@example.com',
      role: 'VIEWER'
    };

    it('should check specific permissions correctly', () => {
      expect(hasPermission(userWithPermissions, { resource: 'reports', action: 'read' })).toBe(true);
      expect(hasPermission(userWithPermissions, { resource: 'reports', action: 'create' })).toBe(true);
      expect(hasPermission(userWithPermissions, { resource: 'reports', action: 'delete' })).toBe(false);
    });

    it('should handle wildcard permissions', () => {
      expect(hasPermission(userWithWildcard, { resource: 'anything', action: 'anything' })).toBe(true);
    });

    it('should handle users without permissions', () => {
      expect(hasPermission(userWithoutPermissions, { resource: 'reports', action: 'read' })).toBe(false);
    });
  });

  describe('Role Escalation', () => {
    it('should validate legitimate escalation requests', () => {
      const validRequest: EscalationRequest = {
        userId: 'user1',
        currentRole: 'VIEWER',
        requestedRole: 'ANALYST',
        reason: 'Need to create reports for project',
        duration: 60
      };

      expect(validateEscalation(validRequest)).toBe(true);
    });

    it('should reject escalation to ROOT', () => {
      const invalidRequest: EscalationRequest = {
        userId: 'user1',
        currentRole: 'ADMIN',
        requestedRole: 'ROOT',
        reason: 'Need root access',
        duration: 30
      };

      expect(validateEscalation(invalidRequest)).toBe(false);
    });

    it('should reject escalation beyond next level', () => {
      const invalidRequest: EscalationRequest = {
        userId: 'user1',
        currentRole: 'VIEWER',
        requestedRole: 'ADMIN', // Skipping ANALYST and OPERATOR
        reason: 'Need admin access',
        duration: 30
      };

      expect(validateEscalation(invalidRequest)).toBe(false);
    });

    it('should allow VIEWER to ANALYST escalation', () => {
      const validRequest: EscalationRequest = {
        userId: 'user1',
        currentRole: 'VIEWER',
        requestedRole: 'ANALYST',
        reason: 'Special analysis required',
        duration: 120
      };

      expect(validateEscalation(validRequest)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid roles gracefully', () => {
      expect(() => can('INVALID_ROLE' as Role, 'VIEWER')).toThrow();
      expect(() => can('VIEWER', 'INVALID_ROLE' as Role)).toThrow();
    });

    it('should provide meaningful error messages', () => {
      const guardSpec: GuardSpec = {
        required: 'ADMIN',
        auditAction: 'delete:user',
        resource: 'user-management'
      };

      try {
        authorize('VIEWER', guardSpec);
      } catch (error) {
        expect(error.message).toContain('ADMIN');
        expect(error.message).toContain('VIEWER');
        expect(error.message).toContain('Insufficient privileges');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle same role authorization', () => {
      expect(can('ADMIN', 'ADMIN')).toBe(true);
      expect(() => authorize('ADMIN', { required: 'ADMIN', auditAction: 'test' })).not.toThrow();
    });

    it('should handle empty permissions array', () => {
      const user: User = {
        id: 'user',
        email: 'user@example.com',
        role: 'VIEWER',
        permissions: []
      };

      expect(hasPermission(user, { resource: 'test', action: 'read' })).toBe(false);
    });

    it('should handle undefined permissions', () => {
      const user: User = {
        id: 'user',
        email: 'user@example.com',
        role: 'VIEWER'
        // permissions is undefined
      };

      expect(hasPermission(user, { resource: 'test', action: 'read' })).toBe(false);
    });
  });
});