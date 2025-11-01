/**
 * RoleHierarchyService - Handle role hierarchy validation and management
 */

export interface RoleHierarchy {
  superadmin: number;
  admin: number;
  hr: number;
  teamlead: number;
  employee: number;
}

export class RoleHierarchyService {
  // Role hierarchy: superadmin > admin > hr > teamlead > employee
  private readonly ROLE_HIERARCHY: RoleHierarchy = {
    superadmin: 5,
    admin: 4,
    hr: 3,
    teamlead: 2,
    employee: 1
  };

  /**
   * Get the numeric level for a role
   */
  getRoleLevel(role: string): number {
    const normalizedRole = role.toLowerCase().replace('-', '') as keyof RoleHierarchy;
    return this.ROLE_HIERARCHY[normalizedRole] || 0;
  }

  /**
   * Check if userRole has higher or equal authority than requiredRole
   */
  hasPermission(userRole: string, requiredRole: string): boolean {
    const userLevel = this.getRoleLevel(userRole);
    const requiredLevel = this.getRoleLevel(requiredRole);
    
    return userLevel >= requiredLevel;
  }

  /**
   * Check if managerRole can manage targetRole
   */
  canManageRole(managerRole: string, targetRole: string): boolean {
    const managerLevel = this.getRoleLevel(managerRole);
    const targetLevel = this.getRoleLevel(targetRole);
    
    // Manager must have higher level than target
    return managerLevel > targetLevel;
  }

  /**
   * Get all roles that a user can manage
   */
  getManagedRoles(userRole: string): string[] {
    const userLevel = this.getRoleLevel(userRole);
    const managedRoles: string[] = [];

    for (const [role, level] of Object.entries(this.ROLE_HIERARCHY)) {
      if (level < userLevel) {
        managedRoles.push(role);
      }
    }

    return managedRoles;
  }

  /**
   * Get all roles that can approve requests from a user
   */
  getApprovalRoles(requesterRole: string): string[] {
    const requesterLevel = this.getRoleLevel(requesterRole);
    const approvalRoles: string[] = [];

    for (const [role, level] of Object.entries(this.ROLE_HIERARCHY)) {
      if (level > requesterLevel) {
        approvalRoles.push(role);
      }
    }

    return approvalRoles;
  }

  /**
   * Validate role change request
   */
  validateRoleChange(managerRole: string, currentRole: string, newRole: string): {
    isValid: boolean;
    reason?: string;
  } {
    // Check if manager can manage current role
    if (!this.canManageRole(managerRole, currentRole)) {
      return {
        isValid: false,
        reason: `${managerRole} cannot manage users with ${currentRole} role`
      };
    }

    // Check if manager can assign new role
    if (!this.canManageRole(managerRole, newRole)) {
      return {
        isValid: false,
        reason: `${managerRole} cannot assign ${newRole} role`
      };
    }

    // Prevent role escalation above manager's level
    const managerLevel = this.getRoleLevel(managerRole);
    const newRoleLevel = this.getRoleLevel(newRole);

    if (newRoleLevel >= managerLevel) {
      return {
        isValid: false,
        reason: `Cannot assign role equal to or higher than your own role`
      };
    }

    return { isValid: true };
  }

  /**
   * Get users that a role can see in conversation history
   */
  getAccessibleUserRoles(userRole: string): string[] {
    const userLevel = this.getRoleLevel(userRole);
    const accessibleRoles: string[] = [];

    for (const [role, level] of Object.entries(this.ROLE_HIERARCHY)) {
      // Superadmin can see all
      if (userRole === 'superadmin') {
        accessibleRoles.push(role);
      }
      // Admin can see all except superadmin
      else if (userRole === 'admin' && role !== 'superadmin') {
        accessibleRoles.push(role);
      }
      // HR can see teamlead and employee
      else if (userRole === 'hr' && (role === 'teamlead' || role === 'employee')) {
        accessibleRoles.push(role);
      }
      // TeamLead can see employee
      else if (userRole === 'teamlead' && role === 'employee') {
        accessibleRoles.push(role);
      }
      // Employee can only see their own
      else if (userRole === 'employee' && role === 'employee') {
        accessibleRoles.push(role);
      }
    }

    return accessibleRoles;
  }

  /**
   * Check if user can make requests (CEO/superadmin cannot make requests)
   */
  canMakeRequests(userRole: string): boolean {
    return userRole !== 'superadmin';
  }

  /**
   * Get the hierarchy chain above a role
   */
  getHierarchyChain(role: string): string[] {
    const roleLevel = this.getRoleLevel(role);
    const chain: string[] = [];

    for (const [hierarchyRole, level] of Object.entries(this.ROLE_HIERARCHY)) {
      if (level > roleLevel) {
        chain.push(hierarchyRole);
      }
    }

    // Sort by level (highest first)
    return chain.sort((a, b) => this.getRoleLevel(b) - this.getRoleLevel(a));
  }

  /**
   * Normalize role name (handle variations like 'super-admin' vs 'superadmin')
   */
  normalizeRole(role: string): string {
    const normalized = role.toLowerCase().replace('-', '');
    
    // Map variations
    const roleMap: { [key: string]: string } = {
      'superadmin': 'superadmin',
      'admin': 'admin',
      'hr': 'hr',
      'teamlead': 'teamlead',
      'teamleader': 'teamlead',
      'employee': 'employee'
    };

    return roleMap[normalized] || role;
  }

  /**
   * Get all valid roles
   */
  getAllRoles(): string[] {
    return Object.keys(this.ROLE_HIERARCHY);
  }

  /**
   * Check if role is valid
   */
  isValidRole(role: string): boolean {
    const normalizedRole = this.normalizeRole(role);
    return Object.keys(this.ROLE_HIERARCHY).includes(normalizedRole);
  }
}

export default new RoleHierarchyService();