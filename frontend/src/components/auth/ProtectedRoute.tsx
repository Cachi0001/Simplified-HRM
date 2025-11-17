import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';

interface ProtectedRouteProps {
  children: JSX.Element;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const user = authService.getCurrentUserFromStorage();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Define correct dashboard for each role
  const roleDashboards: Record<string, string> = {
    'superadmin': '/super-admin-dashboard',
    'admin': '/dashboard',
    'hr': '/hr-dashboard',
    'teamlead': '/teamlead-dashboard',
    'employee': '/employee-dashboard'
  };

  const currentPath = window.location.pathname;
  const correctDashboard = roleDashboards[user.role] || '/employee-dashboard';

  // List of all dashboard paths
  const allDashboards = Object.values(roleDashboards);

  // If user is on a dashboard that's not their correct one, redirect
  // But allow /dashboard for superadmin as it's an alias for /super-admin-dashboard
  const isGenericDashboard = currentPath === '/dashboard';
  const isSuperadminOnGenericDashboard = user.role === 'superadmin' && isGenericDashboard;
  
  if (allDashboards.includes(currentPath) && currentPath !== correctDashboard && !isSuperadminOnGenericDashboard) {
    console.warn(`⚠️ Role mismatch detected! User role: ${user.role}, Current path: ${currentPath}, Redirecting to: ${correctDashboard}`);
    return <Navigate to={correctDashboard} replace />;
  }

  return children;
}
