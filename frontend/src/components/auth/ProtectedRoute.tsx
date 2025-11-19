import { Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { isValidRole } from '../../utils/roleUtils';

interface ProtectedRouteProps {
  children: JSX.Element;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const user = authService.getCurrentUserFromStorage();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Validate user role
  if (!isValidRole(user.role)) {
    authService.logout();
    return <Navigate to="/auth" replace />;
  }

  // REMOVED: Dashboard redirect logic that was forcing users to specific dashboards
  // Users can now access any dashboard or page they have permissions for
  return children;
}
