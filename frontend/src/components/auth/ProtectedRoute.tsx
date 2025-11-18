import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { getDashboardForRole, isValidRole } from '../../utils/roleUtils';

interface ProtectedRouteProps {
  children: JSX.Element;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const user = authService.getCurrentUserFromStorage();

  if (!user) {
    console.log('[ProtectedRoute] No user found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Validate user role
  if (!isValidRole(user.role)) {
    console.error('[ProtectedRoute] Invalid user role:', user.role);
    authService.logout();
    return <Navigate to="/auth" replace />;
  }

  const currentPath = window.location.pathname;
  const correctDashboard = getDashboardForRole(user.role);

  // List of all dashboard paths
  const allDashboards = [
    '/super-admin-dashboard',
    '/dashboard',
    '/hr-dashboard',
    '/teamlead-dashboard',
    '/employee-dashboard'
  ];

  // List of management/utility pages that all roles can access
  const managementPages = [
    '/employee-management',
    '/tasks',
    '/attendance-report',
    '/profile',
    '/settings'
  ];

  // Check if current path is a management page
  const isManagementPage = managementPages.some(page => currentPath.startsWith(page));

  // If user is on a dashboard that's not their correct one, redirect
  if (allDashboards.includes(currentPath) && currentPath !== correctDashboard) {
    console.warn(`[ProtectedRoute] ⚠️ Role mismatch! User: ${user.role}, Path: ${currentPath}, Redirecting to: ${correctDashboard}`);
    return <Navigate to={correctDashboard} replace />;
  }

  // Allow access to management pages for authorized roles
  if (isManagementPage) {
    // Superadmin can access all management pages
    if (user.role === 'superadmin') {
      console.log('[ProtectedRoute] Superadmin access granted to:', currentPath);
      return children;
    }
    
    // HR and Admin can access most management pages
    if (['hr', 'admin'].includes(user.role)) {
      console.log('[ProtectedRoute] Admin/HR access granted to:', currentPath);
      return children;
    }
    
    // Other roles can access their allowed pages
    console.log('[ProtectedRoute] Access granted to:', currentPath);
    return children;
  }

  return children;
}
