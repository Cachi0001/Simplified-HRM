import logger from '../utils/logger';

export interface RolePermissions {
  canViewAll: boolean;
  canApprove: boolean;
  canDelete: boolean;
  canEdit: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
}

export interface UserContext {
  id: string;
  employeeId: string;
  role: string;
  email?: string;
}

export class PermissionService {
  private static readonly ROLE_PERMISSIONS: Record<string, RolePermissions> = {
    employee: {
      canViewAll: false,
      canApprove: false,
      canDelete: true, // Can delete own requests
      canEdit: true,   // Can edit own requests
      canManageUsers: false,
      canViewReports: false
    },
    teamlead: {
      canViewAll: false, // Can view team requests only
      canApprove: true,  // Can approve team requests
      canDelete: false,
      canEdit: false,
      canManageUsers: false,
      canViewReports: true
    },
    hr: {
      canViewAll: true,
      canApprove: true,
      canDelete: false,
      canEdit: false,
      canManageUsers: true,
      canViewReports: true
    },
    admin: {
      canViewAll: true,
      canApprove: true,
      canDelete: true,
      canEdit: true,
      canManageUsers: true,
      canViewReports: true
    },
    superadmin: {
      canViewAll: true,
      canApprove: true,
      canDelete: true,
      canEdit: true,
      canManageUsers: true,
      canViewReports: true
    },
    'super-admin': { // Support both formats
      canViewAll: true,
      canApprove: true,
      canDelete: true,
      canEdit: true,
      canManageUsers: true,
      canViewReports: true
    }
  };

  /**
   * Get permissions for a specific role
   */
  static getRolePermissions(role: string): RolePermissions {
    const normalizedRole = role?.toLowerCase();
    const permissions = this.ROLE_PERMISSIONS[normalizedRole];
    
    if (!permissions) {
      logger.warn('Unknown role, defaulting to employee permissions', { role });
      return this.ROLE_PERMISSIONS.employee;
    }
    
    return permissions;
  }

  /**
   * Check if user can view all requests (admin-level access)
   */
  static canViewAllRequests(user: UserContext): boolean {
    const permissions = this.getRolePermissions(user.role);
    return permissions.canViewAll;
  }

  /**
   * Check if user can approve requests
   */
  static canApproveRequests(user: UserContext): boolean {
    const permissions = this.getRolePermissions(user.role);
    return permissions.canApprove;
  }

  /**
   * Check if user can delete a specific request
   */
  static canDeleteRequest(user: UserContext, requestOwnerId: string): boolean {
    const permissions = this.getRolePermissions(user.role);
    
    // Admin roles can delete any request
    if (permissions.canDelete && permissions.canViewAll) {
      return true;
    }
    
    // Regular users can only delete their own requests
    if (permissions.canDelete && (user.employeeId === requestOwnerId || user.id === requestOwnerId)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if user can edit a specific request
   */
  static canEditRequest(user: UserContext, requestOwnerId: string, requestStatus: string): boolean {
    const permissions = this.getRolePermissions(user.role);
    
    // Can't edit approved or rejected requests (unless admin)
    if (['approved', 'rejected'].includes(requestStatus) && !permissions.canViewAll) {
      return false;
    }
    
    // Admin roles can edit any request
    if (permissions.canEdit && permissions.canViewAll) {
      return true;
    }
    
    // Regular users can only edit their own pending requests
    if (permissions.canEdit && 
        (user.employeeId === requestOwnerId || user.id === requestOwnerId) && 
        requestStatus === 'pending') {
      return true;
    }
    
    return false;
  }

  /**
   * Check if user can manage other users
   */
  static canManageUsers(user: UserContext): boolean {
    const permissions = this.getRolePermissions(user.role);
    return permissions.canManageUsers;
  }

  /**
   * Check if user can view reports
   */
  static canViewReports(user: UserContext): boolean {
    const permissions = this.getRolePermissions(user.role);
    return permissions.canViewReports;
  }

  /**
   * Get list of roles that can approve requests
   */
  static getApproverRoles(): string[] {
    return Object.entries(this.ROLE_PERMISSIONS)
      .filter(([_, permissions]) => permissions.canApprove)
      .map(([role, _]) => role);
  }

  /**
   * Get list of roles that have admin-level access
   */
  static getAdminRoles(): string[] {
    return Object.entries(this.ROLE_PERMISSIONS)
      .filter(([_, permissions]) => permissions.canViewAll)
      .map(([role, _]) => role);
  }

  /**
   * Validate if user has minimum required role level
   */
  static hasMinimumRole(userRole: string, requiredRole: string): boolean {
    const roleHierarchy: Record<string, number> = {
      employee: 1,
      teamlead: 2,
      hr: 3,
      admin: 4,
      superadmin: 5,
      'super-admin': 5
    };

    const userLevel = roleHierarchy[userRole?.toLowerCase()] || 0;
    const requiredLevel = roleHierarchy[requiredRole?.toLowerCase()] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Create user context from request user object
   */
  static createUserContext(reqUser: any): UserContext {
    return {
      id: reqUser?.id || reqUser?.sub,
      employeeId: reqUser?.employeeId || reqUser?.id || reqUser?.sub,
      role: reqUser?.role || 'employee',
      email: reqUser?.email
    };
  }

  /**
   * Log permission check for debugging
   */
  static logPermissionCheck(
    action: string, 
    user: UserContext, 
    result: boolean, 
    context?: any
  ): void {
    logger.info('🔐 Permission check', {
      action,
      userId: user.id,
      userRole: user.role,
      result: result ? 'ALLOWED' : 'DENIED',
      context
    });
  }
}