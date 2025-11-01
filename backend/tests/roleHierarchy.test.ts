/**
 * Role Hierarchy Service Tests
 */
import { RoleHierarchyService } from '../src/services/RoleHierarchyService';

describe('RoleHierarchyService', () => {
  let roleService: RoleHierarchyService;

  beforeEach(() => {
    roleService = new RoleHierarchyService();
  });

  describe('Role Level Tests', () => {
    test('should return correct role levels', () => {
      expect(roleService.getRoleLevel('superadmin')).toBe(5);
      expect(roleService.getRoleLevel('admin')).toBe(4);
      expect(roleService.getRoleLevel('hr')).toBe(3);
      expect(roleService.getRoleLevel('teamlead')).toBe(2);
      expect(roleService.getRoleLevel('employee')).toBe(1);
    });

    test('should handle invalid roles', () => {
      expect(roleService.getRoleLevel('invalid')).toBe(0);
    });
  });

  describe('Permission Tests', () => {
    test('superadmin should have system permissions', () => {
      expect(roleService.hasPermission('superadmin', 'system:manage')).toBe(true);
      expect(roleService.hasPermission('superadmin', 'users:manage')).toBe(true);
      expect(roleService.hasPermission('superadmin', 'roles:manage')).toBe(true);
      expect(roleService.hasPermission('superadmin', 'conversations:view_all')).toBe(true);
    });

    test('admin should have operational permissions', () => {
      expect(roleService.hasPermission('admin', 'system:manage')).toBe(false);
      expect(roleService.hasPermission('admin', 'users:manage')).toBe(true);
      expect(roleService.hasPermission('admin', 'departments:manage')).toBe(true);
      expect(roleService.hasPermission('admin', 'conversations:view_non_superadmin')).toBe(true);
    });

    test('employee should have basic permissions', () => {
      expect(roleService.hasPermission('employee', 'system:manage')).toBe(false);
      expect(roleService.hasPermission('employee', 'users:manage')).toBe(false);
      expect(roleService.hasPermission('employee', 'profile:manage')).toBe(true);
      expect(roleService.hasPermission('employee', 'requests:create')).toBe(true);
    });
  });

  describe('Management Tests', () => {
    test('should correctly identify manageable roles', () => {
      const superadminManaged = roleService.getManagedRoles('superadmin');
      expect(superadminManaged).toContain('admin');
      expect(superadminManaged).toContain('hr');
      expect(superadminManaged).toContain('teamlead');
      expect(superadminManaged).toContain('employee');

      const adminManaged = roleService.getManagedRoles('admin');
      expect(adminManaged).not.toContain('superadmin');
      expect(adminManaged).toContain('hr');
      expect(adminManaged).toContain('teamlead');
      expect(adminManaged).toContain('employee');

      const employeeManaged = roleService.getManagedRoles('employee');
      expect(employeeManaged).toHaveLength(0);
    });

    test('should validate role changes correctly', () => {
      // Valid role change: admin changing hr to teamlead
      const validChange = roleService.validateRoleChange('admin', 'hr', 'teamlead');
      expect(validChange.isValid).toBe(true);

      // Invalid role change: employee trying to change admin
      const invalidChange = roleService.validateRoleChange('employee', 'admin', 'hr');
      expect(invalidChange.isValid).toBe(false);
      expect(invalidChange.reason).toContain('Insufficient permissions');

      // Invalid role escalation: hr trying to assign admin role
      const escalationChange = roleService.validateRoleChange('hr', 'employee', 'admin');
      expect(escalationChange.isValid).toBe(false);
      expect(escalationChange.reason).toContain('Cannot assign a role equal to or higher');
    });
  });

  describe('Request Approval Tests', () => {
    test('should identify correct approval roles', () => {
      const employeeApprovers = roleService.getApprovalRoles('employee');
      expect(employeeApprovers).toContain('superadmin');
      expect(employeeApprovers).toContain('admin');
      expect(employeeApprovers).toContain('hr');
      expect(employeeApprovers).toContain('teamlead');

      const adminApprovers = roleService.getApprovalRoles('admin');
      expect(adminApprovers).toContain('superadmin');
      expect(adminApprovers).not.toContain('admin');
      expect(adminApprovers).not.toContain('hr');
    });

    test('should prevent superadmin from making requests', () => {
      expect(roleService.canMakeRequests('superadmin')).toBe(false);
      expect(roleService.canMakeRequests('admin')).toBe(true);
      expect(roleService.canMakeRequests('employee')).toBe(true);
    });
  });

  describe('Conversation Access Tests', () => {
    test('should return correct accessible roles for conversation history', () => {
      const superadminAccess = roleService.getAccessibleUserRoles('superadmin');
      expect(superadminAccess).toContain('superadmin');
      expect(superadminAccess).toContain('admin');
      expect(superadminAccess).toContain('hr');
      expect(superadminAccess).toContain('teamlead');
      expect(superadminAccess).toContain('employee');

      const adminAccess = roleService.getAccessibleUserRoles('admin');
      expect(adminAccess).not.toContain('superadmin');
      expect(adminAccess).toContain('admin');
      expect(adminAccess).toContain('hr');
      expect(adminAccess).toContain('teamlead');
      expect(adminAccess).toContain('employee');

      const hrAccess = roleService.getAccessibleUserRoles('hr');
      expect(hrAccess).not.toContain('superadmin');
      expect(hrAccess).not.toContain('admin');
      expect(hrAccess).not.toContain('hr');
      expect(hrAccess).toContain('teamlead');
      expect(hrAccess).toContain('employee');

      const employeeAccess = roleService.getAccessibleUserRoles('employee');
      expect(employeeAccess).toContain('employee');
      expect(employeeAccess).not.toContain('teamlead');
      expect(employeeAccess).not.toContain('hr');
    });
  });

  describe('Utility Tests', () => {
    test('should normalize role names correctly', () => {
      expect(roleService.normalizeRole('ADMIN')).toBe('admin');
      expect(roleService.normalizeRole('TeamLead')).toBe('teamlead');
      expect(roleService.normalizeRole('  EMPLOYEE  ')).toBe('employee');
      expect(roleService.normalizeRole('HR')).toBe('hr');
    });

    test('should validate roles correctly', () => {
      expect(roleService.isValidRole('superadmin')).toBe(true);
      expect(roleService.isValidRole('admin')).toBe(true);
      expect(roleService.isValidRole('invalid')).toBe(false);
    });

    test('should return all valid roles', () => {
      const allRoles = roleService.getAllRoles();
      expect(allRoles).toContain('superadmin');
      expect(allRoles).toContain('admin');
      expect(allRoles).toContain('hr');
      expect(allRoles).toContain('teamlead');
      expect(allRoles).toContain('employee');
      expect(allRoles).toHaveLength(5);
    });
  });
});