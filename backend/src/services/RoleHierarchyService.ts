import logger from '../utils/logger';

export interface RoleLevel {
  role: string;
  level: number;
  permissions: string[];
}

export class RoleHierarchyService {
  private static readonly ROLE_HIERARCHY: RoleLevel[] = [
    {
      role: 'superadmin',
      level: 5,
      permissions: [
        'system:manage',
        'users:manage',
        'roles:manage',
        'departments:manage',
        'requests:approve_all',
        'conversations:view_all',
        'announcements:manage',
        'analytics:view_all'
      ]
    },
    {
      role: 'admin',
      level: 4,
      permissions: [
        'users:manage',
        'departments:manage',
        'requests:approve_hr_teamlead_employee',
        'conversations:view_non_superadmin',
        'announcements:manage',
        'analytics:view_operational'
      ]
    },
    {
      role: 'hr',
      level: 3,
      permissions: [
        'employees:manage',
        'requests:approve_teamlead_employee',
        'conversations:view_employees_teamleads',
        'announcements:create',
        'leave:manage',
        'departments:view'
      ]
    },
    {
      role: 'teamlead',
      level: 2,
      permissions: [
        'team:manage',
        'tasks:assign',
        'requests:approve_employee',
        'conversations:view_team_members',
        'team:view_metrics'
      ]
    },
    {
      role: 'employee',
      level: 1,
      permissions: [
        'profile:manage',
        'requests:create',
        'conversations:view_own',
        'tasks:view_assigned'
      ]
    }
  ];

  /**
   * Get the level of a role
   */
  static getRoleLevel(role: string): number {
    const normalizedRole = this.normalizeRole(role);
    const roleData = this.ROLE_HIERARCHY.find(r => r.role === normalizedRole);
    return roleData?.level || 0;
  }

  /**
   * Check if a role has permission to perform an action
   */
  static hasPermission(userRole: string, permission: string): boolean {
    const normalizedRole = this.normalizeRole(userRole);
    const roleData = this.ROLE_HIERARCHY.find(r => r.role === normalizedRole);
    
    if (!roleData) {
      logger.warn(`Unknown role: ${userRole}`);
      return false;
    }

    return roleData.permissions.includes(permission);
  }

  /**
   * Check if a role can manage another role
   */
  static canManageRole(managerRole: string, targetRole: string): boolean {
    const managerLevel = this.getRoleLevel(managerRole);
    const targetLevel = this.getRoleLevel(targetRole);
    
    return managerLevel > targetLevel;
  }

  /**
   * Get all roles that a user can manage
   */
  static getManageableRoles(userRole: string): string[] {
    const userLevel = this.getRoleLevel(userRole);
    
    return this.ROLE_HIERARCHY
      .filter(role => role.level < userLevel)
      .map(role => role.role);
  }

  /**
   * Validate if a role change is allowed
   */
  static canChangeRole(changerRole: string, fromRole: string, toRole: string): boolean {
    const changerLevel = this.getRoleLevel(changerRole);
    const fromLevel = this.getRoleLevel(fromRole);
    const toLevel = this.getRoleLevel(toRole);
    
    // Changer must have higher level than both source and target roles
    return changerLevel > fromLevel && changerLevel > toLevel;
  }

  /**
   * Validate role change with detailed response
   */
  static validateRoleChangeDetailed(changerRole: string, fromRole: string, toRole: string): {
    isValid: boolean;
    reason?: string;
  } {
    const changerLevel = this.getRoleLevel(changerRole);
    const fromLevel = this.getRoleLevel(fromRole);
    const toLevel = this.getRoleLevel(toRole);
    
    if (changerLevel <= fromLevel) {
      return {
        isValid: false,
        reason: 'Insufficient permissions to change this user\'s role'
      };
    }
    
    if (changerLevel <= toLevel) {
      return {
        isValid: false,
        reason: 'Cannot assign a role equal to or higher than your own'
      };
    }
    
    return { isValid: true };
  }

  /**
   * Get roles that can approve requests from a specific role
   */
  static getApprovalRoles(requesterRole: string): string[] {
    const requesterLevel = this.getRoleLevel(requesterRole);
    
    // Superadmin cannot make requests (CEO level)
    if (requesterRole === 'superadmin') {
      return [];
    }
    
    // Return all roles with higher levels
    return this.ROLE_HIERARCHY
      .filter(role => role.level > requesterLevel)
      .map(role => role.role);
  }

  /**
   * Check if a user can approve requests from another role
   */
  static canApproveRequest(approverRole: string, requesterRole: string): boolean {
    const approverLevel = this.getRoleLevel(approverRole);
    const requesterLevel = this.getRoleLevel(requesterRole);
    
    // Superadmin cannot make requests
    if (requesterRole === 'superadmin') {
      return false;
    }
    
    return approverLevel > requesterLevel;
  }

  /**
   * Get roles whose conversations can be accessed by a specific role
   */
  static getAccessibleConversationRoles(accessorRole: string): string[] {
    const normalizedRole = this.normalizeRole(accessorRole);
    
    switch (normalizedRole) {
      case 'superadmin':
        // Can see all conversations
        return ['superadmin', 'admin', 'hr', 'teamlead', 'employee'];
      
      case 'admin':
        // Can see all except superadmin's personal conversations
        return ['admin', 'hr', 'teamlead', 'employee'];
      
      case 'hr':
        // Can see employees and teamleads under their management
        return ['teamlead', 'employee'];
      
      case 'teamlead':
        // Can see employees in their department
        return ['employee'];
      
      case 'employee':
        // Can only see their own conversations
        return ['employee'];
      
      default:
        logger.warn(`Unknown role for conversation access: ${accessorRole}`);
        return [];
    }
  }

  /**
   * Check if a user can access another user's conversations
   */
  static canAccessConversations(accessorRole: string, targetRole: string): boolean {
    const accessibleRoles = this.getAccessibleConversationRoles(accessorRole);
    return accessibleRoles.includes(this.normalizeRole(targetRole));
  }

  /**
   * Normalize role name (lowercase, trim)
   */
  static normalizeRole(role: string): string {
    return role?.toLowerCase().trim() || '';
  }

  /**
   * Validate if a role is valid
   */
  static isValidRole(role: string): boolean {
    const normalizedRole = this.normalizeRole(role);
    return this.ROLE_HIERARCHY.some(r => r.role === normalizedRole);
  }

  /**
   * Get all valid roles
   */
  static getAllRoles(): string[] {
    return this.ROLE_HIERARCHY.map(r => r.role);
  }

  /**
   * Get role hierarchy for display purposes
   */
  static getRoleHierarchy(): RoleLevel[] {
    return [...this.ROLE_HIERARCHY].sort((a, b) => b.level - a.level);
  }

  /**
   * Get permissions for a specific role
   */
  static getRolePermissions(role: string): string[] {
    const normalizedRole = this.normalizeRole(role);
    const roleData = this.ROLE_HIERARCHY.find(r => r.role === normalizedRole);
    return roleData?.permissions || [];
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(userRole: string, permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  /**
   * Check if user has all of the specified permissions
   */
  static hasAllPermissions(userRole: string, permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  // Instance methods that delegate to static methods for backward compatibility
  
  /**
   * Instance method: Get the level of a role
   */
  getRoleLevel(role: string): number {
    return RoleHierarchyService.getRoleLevel(role);
  }

  /**
   * Instance method: Check if a role has permission to perform an action
   */
  hasPermission(userRole: string, permission: string): boolean {
    return RoleHierarchyService.hasPermission(userRole, permission);
  }

  /**
   * Instance method: Check if a role can manage another role
   */
  canManageRole(managerRole: string, targetRole: string): boolean {
    return RoleHierarchyService.canManageRole(managerRole, targetRole);
  }

  /**
   * Instance method: Get all roles that a user can manage
   */
  getManagedRoles(userRole: string): string[] {
    return RoleHierarchyService.getManageableRoles(userRole);
  }

  /**
   * Instance method: Validate if a role change is allowed
   */
  validateRoleChange(changerRole: string, fromRole: string, toRole: string): {
    isValid: boolean;
    reason?: string;
  } {
    return RoleHierarchyService.validateRoleChangeDetailed(changerRole, fromRole, toRole);
  }

  /**
   * Instance method: Get roles that can approve requests from a specific role
   */
  getApprovalRoles(requesterRole: string): string[] {
    return RoleHierarchyService.getApprovalRoles(requesterRole);
  }

  /**
   * Instance method: Check if a user can make requests (superadmin cannot)
   */
  canMakeRequests(userRole: string): boolean {
    return RoleHierarchyService.normalizeRole(userRole) !== 'superadmin';
  }

  /**
   * Instance method: Get roles whose conversations can be accessed by a specific role
   */
  getAccessibleUserRoles(accessorRole: string): string[] {
    return RoleHierarchyService.getAccessibleConversationRoles(accessorRole);
  }

  /**
   * Instance method: Normalize role name
   */
  normalizeRole(role: string): string {
    return RoleHierarchyService.normalizeRole(role);
  }

  /**
   * Instance method: Validate if a role is valid
   */
  isValidRole(role: string): boolean {
    return RoleHierarchyService.isValidRole(role);
  }

  /**
   * Instance method: Get all valid roles
   */
  getAllRoles(): string[] {
    return RoleHierarchyService.getAllRoles();
  }

  /**
   * Instance method: Get role hierarchy for display purposes
   */
  getRoleHierarchy(): RoleLevel[] {
    return RoleHierarchyService.getRoleHierarchy();
  }

  /**
   * Instance method: Get permissions for a specific role
   */
  getRolePermissions(role: string): string[] {
    return RoleHierarchyService.getRolePermissions(role);
  }

  /**
   * Instance method: Check if user has any of the specified permissions
   */
  hasAnyPermission(userRole: string, permissions: string[]): boolean {
    return RoleHierarchyService.hasAnyPermission(userRole, permissions);
  }

  /**
   * Instance method: Check if user has all of the specified permissions
   */
  hasAllPermissions(userRole: string, permissions: string[]): boolean {
    return RoleHierarchyService.hasAllPermissions(userRole, permissions);
  }
}