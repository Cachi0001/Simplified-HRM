import { Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { isValidRole } from '../../utils/roleUtils';

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

  // REMOVED: Dashboard redirect logic that was forcing users to specific dashboards
  // Users can now access any dashboard or page they have permissions for
  console.log('[ProtectedRoute] Access granted for user:', user.role);
  return children;
}
