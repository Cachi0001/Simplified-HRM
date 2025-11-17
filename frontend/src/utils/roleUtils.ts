/**
 * Utility functions for role-based routing and permissions
 */

export type UserRole = 'superadmin' | 'admin' | 'hr' | 'teamlead' | 'employee';

/**
 * Get the correct dashboard path for a given role
 */
export function getDashboardForRole(role: string): string {
  const dashboardMap: Record<string, string> = {
    'superadmin': '/super-admin-dashboard',
    'admin': '/dashboard',
    'hr': '/hr-dashboard',
    'teamlead': '/teamlead-dashboard',
    'employee': '/employee-dashboard'
  };

  return dashboardMap[role] || '/employee-dashboard';
}

/**
 * Check if a role is valid
 */
export function isValidRole(role: string): role is UserRole {
  const validRoles: UserRole[] = ['superadmin', 'admin', 'hr', 'teamlead', 'employee'];
  return validRoles.includes(role as UserRole);
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    'superadmin': 'Super Admin',
    'admin': 'Admin',
    'hr': 'HR',
    'teamlead': 'Team Lead',
    'employee': 'Employee'
  };

  return roleNames[role] || 'Unknown';
}

/**
 * Check if user has permission to access a feature
 */
export function hasPermission(userRole: string, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole as UserRole);
}
