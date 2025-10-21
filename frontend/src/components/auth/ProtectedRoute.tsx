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

  // Redirect based on user role
  if (user.role === 'employee' && window.location.pathname === '/dashboard') {
    return <Navigate to="/employee-dashboard" replace />;
  }

  if (user.role === 'admin' && window.location.pathname === '/employee-dashboard') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
