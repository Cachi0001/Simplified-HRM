import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';

interface ProtectedRouteProps {
  children: JSX.Element;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const user = authService.getCurrentUserFromStorage();

  if (!user || user.role !== 'admin') {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
