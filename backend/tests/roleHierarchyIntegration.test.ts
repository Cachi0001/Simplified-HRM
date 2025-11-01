/**
 * Role Hierarchy Integration Tests
 * Test the complete role hierarchy validation system
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { RoleHierarchyService } from '../src/services/RoleHierarchyService';

describe('Role Hierarchy Integration Tests', () => {
  const jwtSecret = process.env.JWT_SECRET || 'test-secret';

  // Helper function to create JWT tokens for testing
  const createToken = (user: { id: string; email: string; role: string }) => {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role
      },
      jwtSecret,
      { expiresIn: '1h' }
    );
  };

  const mockUsers = {
    superadmin: { id: 'super-1', email: 'ceo@company.com', role: 'superadmin' },
    admin: { id: 'admin-1', email: 'admin@company.com', role: 'admin' },
    hr: { id: 'hr-1', email: 'hr@company.com', role: 'hr' },
    teamlead: { id: 'tl-1', email: 'teamlead@company.com', role: 'teamlead' },
    employee: { id: 'emp-1', email: 'employee@company.com', role: 'employee' }
  };

  describe('RoleHierarchyService Core Functionality', () => {
    test('should have correct role hierarchy levels', () => {
      expect(RoleHierarchyService.getRoleLevel('superadmin')).toBe(5);
      expect(RoleHierarchyService.getRoleLevel('admin')).toBe(4);
      expect(RoleHierarchyService.getRoleLevel('hr')).toBe(3);
      expect(RoleHierarchyService.getRoleLevel('teamlead')).toBe(2);
      expect(RoleHierarchyService.getRoleLevel('employee')).toBe(1);
    });

    test('should validate role management permissions correctly', () => {
      // Superadmin can manage all roles below
      expect(RoleHierarchyService.canManageRole('superadmin', 'admin')).toBe(true);
      expect(RoleHierarchyService.canManageRole('superadmin', 'hr')).toBe(true);
      expect(RoleHierarchyService.canManageRole('superadmin', 'teamlead')).toBe(true);
      expect(RoleHierarchyService.canManageRole('superadmin', 'employee')).toBe(true);

      // Admin can manage hr, teamlead, employee but not superadmin
      expect(RoleHierarchyService.canManageRole('admin', 'superadmin')).toBe(false);
      expect(RoleHierarchyService.canManageRole('admin', 'hr')).toBe(true);
      expect(RoleHierarchyService.canManageRole('admin', 'teamlead')).toBe(true);
      expect(RoleHierarchyService.canManageRole('admin', 'employee')).toBe(true);

      // Employee cannot manage any roles
      expect(RoleHierarchyService.canManageRole('employee', 'superadmin')).toBe(false);
      expect(RoleHierarchyService.canManageRole('employee', 'admin')).toBe(false);
      expect(RoleHierarchyService.canManageRole('employee', 'hr')).toBe(false);
      expect(RoleHierarchyService.canManageRole('employee', 'teamlead')).toBe(false);
      expect(RoleHierarchyService.canManageRole('employee', 'employee')).toBe(false);
    });

    test('should validate role changes correctly', () => {
      // Valid role changes
      const validChange = RoleHierarchyService.validateRoleChangeDetailed('admin', 'employee', 'hr');
      expect(validChange.isValid).toBe(true);

      // Invalid role change - insufficient permissions
      const invalidChange = RoleHierarchyService.validateRoleChangeDetailed('employee', 'admin', 'hr');
      expect(invalidChange.isValid).toBe(false);
      expect(invalidChange.reason).toContain('Insufficient permissions');

      // Invalid role escalation
      const escalationChange = RoleHierarchyService.validateRoleChangeDetailed('hr', 'employee', 'admin');
      expect(escalationChange.isValid).toBe(false);
      expect(escalationChange.reason).toContain('Cannot assign a role equal to or higher');
    });

    test('should identify correct approval roles', () => {
      // Employee requests can be approved by teamlead, hr, admin, superadmin
      const employeeApprovers = RoleHierarchyService.getApprovalRoles('employee');
      expect(employeeApprovers).toContain('teamlead');
      expect(employeeApprovers).toContain('hr');
      expect(employeeApprovers).toContain('admin');
      expect(employeeApprovers).toContain('superadmin');

      // Admin requests can only be approved by superadmin
      const adminApprovers = RoleHierarchyService.getApprovalRoles('admin');
      expect(adminApprovers).toContain('superadmin');
      expect(adminApprovers).not.toContain('admin');
      expect(adminApprovers).not.toContain('hr');

      // Superadmin cannot make requests
      const superadminApprovers = RoleHierarchyService.getApprovalRoles('superadmin');
      expect(superadminApprovers).toHaveLength(0);
    });

    test('should handle conversation access permissions', () => {
      // Superadmin can access all conversations
      const superadminAccess = RoleHierarchyService.getAccessibleConversationRoles('superadmin');
      expect(superadminAccess).toContain('superadmin');
      expect(superadminAccess).toContain('admin');
      expect(superadminAccess).toContain('hr');
      expect(superadminAccess).toContain('teamlead');
      expect(superadminAccess).toContain('employee');

      // Admin can access all except superadmin
      const adminAccess = RoleHierarchyService.getAccessibleConversationRoles('admin');
      expect(adminAccess).not.toContain('superadmin');
      expect(adminAccess).toContain('admin');
      expect(adminAccess).toContain('hr');
      expect(adminAccess).toContain('teamlead');
      expect(adminAccess).toContain('employee');

      // Employee can only access own conversations
      const employeeAccess = RoleHierarchyService.getAccessibleConversationRoles('employee');
      expect(employeeAccess).toContain('employee');
      expect(employeeAccess).not.toContain('teamlead');
      expect(employeeAccess).not.toContain('hr');
      expect(employeeAccess).not.toContain('admin');
      expect(employeeAccess).not.toContain('superadmin');
    });

    test('should validate specific permissions correctly', () => {
      // Superadmin should have system management permissions
      expect(RoleHierarchyService.hasPermission('superadmin', 'system:manage')).toBe(true);
      expect(RoleHierarchyService.hasPermission('superadmin', 'users:manage')).toBe(true);
      expect(RoleHierarchyService.hasPermission('superadmin', 'conversations:view_all')).toBe(true);

      // Admin should have operational permissions but not system management
      expect(RoleHierarchyService.hasPermission('admin', 'system:manage')).toBe(false);
      expect(RoleHierarchyService.hasPermission('admin', 'users:manage')).toBe(true);
      expect(RoleHierarchyService.hasPermission('admin', 'departments:manage')).toBe(true);

      // Employee should have basic permissions only
      expect(RoleHierarchyService.hasPermission('employee', 'system:manage')).toBe(false);
      expect(RoleHierarchyService.hasPermission('employee', 'users:manage')).toBe(false);
      expect(RoleHierarchyService.hasPermission('employee', 'profile:manage')).toBe(true);
      expect(RoleHierarchyService.hasPermission('employee', 'requests:create')).toBe(true);
    });

    test('should prevent superadmin from making requests', () => {
      expect(RoleHierarchyService.canApproveRequest('superadmin', 'admin')).toBe(true);
      expect(RoleHierarchyService.canApproveRequest('superadmin', 'superadmin')).toBe(false);
      
      // Superadmin cannot make requests (CEO level)
      const superadminService = new RoleHierarchyService();
      expect(superadminService.canMakeRequests('superadmin')).toBe(false);
      expect(superadminService.canMakeRequests('admin')).toBe(true);
      expect(superadminService.canMakeRequests('employee')).toBe(true);
    });
  });

  describe('Role Validation Middleware Integration', () => {
    test('should validate role hierarchy in middleware context', () => {
      // Test role management permissions
      expect(RoleHierarchyService.canManageRole('admin', 'employee')).toBe(true);
      expect(RoleHierarchyService.canManageRole('employee', 'admin')).toBe(false);

      // Test permission checks
      expect(RoleHierarchyService.hasPermission('hr', 'employees:manage')).toBe(true);
      expect(RoleHierarchyService.hasPermission('employee', 'employees:manage')).toBe(false);

      // Test approval permissions
      expect(RoleHierarchyService.canApproveRequest('hr', 'employee')).toBe(true);
      expect(RoleHierarchyService.canApproveRequest('employee', 'hr')).toBe(false);
    });

    test('should handle edge cases correctly', () => {
      // Invalid roles
      expect(RoleHierarchyService.getRoleLevel('invalid')).toBe(0);
      expect(RoleHierarchyService.isValidRole('invalid')).toBe(false);
      expect(RoleHierarchyService.canManageRole('invalid', 'employee')).toBe(false);

      // Same role management (should be false)
      expect(RoleHierarchyService.canManageRole('admin', 'admin')).toBe(false);
      expect(RoleHierarchyService.canManageRole('employee', 'employee')).toBe(false);

      // Role normalization
      const service = new RoleHierarchyService();
      expect(service.normalizeRole('ADMIN')).toBe('admin');
      expect(service.normalizeRole('  TeamLead  ')).toBe('teamlead');
      expect(service.normalizeRole('')).toBe('');
    });
  });

  describe('Role Hierarchy Service Instance Methods', () => {
    let roleService: RoleHierarchyService;

    beforeEach(() => {
      roleService = new RoleHierarchyService();
    });

    test('should provide instance methods that match static methods', () => {
      // Test instance methods work the same as static methods
      expect(roleService.getRoleLevel('admin')).toBe(RoleHierarchyService.getRoleLevel('admin'));
      expect(roleService.hasPermission('admin', 'users:manage')).toBe(RoleHierarchyService.hasPermission('admin', 'users:manage'));
      expect(roleService.canManageRole('admin', 'employee')).toBe(RoleHierarchyService.canManageRole('admin', 'employee'));
      expect(roleService.isValidRole('admin')).toBe(RoleHierarchyService.isValidRole('admin'));
      expect(roleService.getAllRoles()).toEqual(RoleHierarchyService.getAllRoles());
    });

    test('should handle role change validation with detailed response', () => {
      const validation = roleService.validateRoleChange('admin', 'employee', 'hr');
      expect(validation).toHaveProperty('isValid');
      expect(validation.isValid).toBe(true);

      const invalidValidation = roleService.validateRoleChange('employee', 'admin', 'hr');
      expect(invalidValidation.isValid).toBe(false);
      expect(invalidValidation).toHaveProperty('reason');
      expect(invalidValidation.reason).toContain('Insufficient permissions');
    });

    test('should provide correct manageable roles', () => {
      const adminManaged = roleService.getManagedRoles('admin');
      expect(adminManaged).toContain('hr');
      expect(adminManaged).toContain('teamlead');
      expect(adminManaged).toContain('employee');
      expect(adminManaged).not.toContain('admin');
      expect(adminManaged).not.toContain('superadmin');

      const employeeManaged = roleService.getManagedRoles('employee');
      expect(employeeManaged).toHaveLength(0);
    });

    test('should provide correct accessible user roles for conversation history', () => {
      const hrAccess = roleService.getAccessibleUserRoles('hr');
      expect(hrAccess).toContain('teamlead');
      expect(hrAccess).toContain('employee');
      expect(hrAccess).not.toContain('hr');
      expect(hrAccess).not.toContain('admin');
      expect(hrAccess).not.toContain('superadmin');
    });
  });

  describe('Role Hierarchy Complete System Test', () => {
    test('should demonstrate complete role hierarchy workflow', () => {
      // 1. Superadmin creates admin
      expect(RoleHierarchyService.canChangeRole('superadmin', 'employee', 'admin')).toBe(true);
      
      // 2. Admin creates HR user
      expect(RoleHierarchyService.canChangeRole('admin', 'employee', 'hr')).toBe(true);
      
      // 3. HR creates team lead (HR level 3 can manage teamlead level 2)
      expect(RoleHierarchyService.canChangeRole('hr', 'employee', 'teamlead')).toBe(true); // HR can create teamlead
      expect(RoleHierarchyService.canChangeRole('admin', 'employee', 'teamlead')).toBe(true); // Admin can too
      
      // 4. Team lead cannot create other team leads
      expect(RoleHierarchyService.canChangeRole('teamlead', 'employee', 'teamlead')).toBe(false);
      
      // 5. Employee cannot change any roles
      expect(RoleHierarchyService.canChangeRole('employee', 'employee', 'teamlead')).toBe(false);
      
      // 6. Request approval workflow
      expect(RoleHierarchyService.canApproveRequest('hr', 'employee')).toBe(true);
      expect(RoleHierarchyService.canApproveRequest('admin', 'hr')).toBe(true);
      expect(RoleHierarchyService.canApproveRequest('superadmin', 'admin')).toBe(true);
      
      // 7. Conversation access
      expect(RoleHierarchyService.canAccessConversations('admin', 'employee')).toBe(true);
      expect(RoleHierarchyService.canAccessConversations('employee', 'admin')).toBe(false);
    });

    test('should validate complete permission matrix', () => {
      const roles = ['superadmin', 'admin', 'hr', 'teamlead', 'employee'];
      const permissions = [
        'system:manage',
        'users:manage', 
        'employees:manage',
        'team:manage',
        'profile:manage'
      ];

      // Superadmin should have system:manage
      expect(RoleHierarchyService.hasPermission('superadmin', 'system:manage')).toBe(true);
      
      // Admin should have users:manage but not system:manage
      expect(RoleHierarchyService.hasPermission('admin', 'users:manage')).toBe(true);
      expect(RoleHierarchyService.hasPermission('admin', 'system:manage')).toBe(false);
      
      // HR should have employees:manage
      expect(RoleHierarchyService.hasPermission('hr', 'employees:manage')).toBe(true);
      expect(RoleHierarchyService.hasPermission('hr', 'users:manage')).toBe(false);
      
      // Team lead should have team:manage
      expect(RoleHierarchyService.hasPermission('teamlead', 'team:manage')).toBe(true);
      expect(RoleHierarchyService.hasPermission('teamlead', 'employees:manage')).toBe(false);
      
      // Employee should have profile:manage only
      expect(RoleHierarchyService.hasPermission('employee', 'profile:manage')).toBe(true);
      expect(RoleHierarchyService.hasPermission('employee', 'team:manage')).toBe(false);
    });
  });
});