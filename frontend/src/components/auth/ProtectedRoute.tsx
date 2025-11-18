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

  // If user is on a dashboard that's not their correct one, redirect
  if (allDashboards.includes(currentPath) && currentPath !== correctDashboard) {
    console.warn(`[ProtectedRoute] ⚠️ Role mismatch! User: ${user.role}, Path: ${currentPath}, Redirecting to: ${correctDashboard}`);
    return <Navigate to={correctDashboard} replace />;
  }

  // Superadmin can access non-dashboard pages (like employee-management, tasks, etc.)
  if (user.role === 'superadmin' && !allDashboards.includes(currentPath)) {
    console.log('[ProtectedRoute] Superadmin access granted to:', currentPath);
    return children;
  }

  return children;
}
