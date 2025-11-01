/**
 * Role-based authentication middleware
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RoleHierarchyService } from '../services/RoleHierarchyService';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

const roleHierarchyService = new RoleHierarchyService();

/**
 * Middleware to check if user has required role or higher
 */
export const requireRole = (requiredRole: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          status: 'error',
          message: 'Access token required'
        });
      }

      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      if (!decoded.role) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid token: role not found'
        });
      }

      // Check if user has required permission
      if (!roleHierarchyService.hasPermission(decoded.role, requiredRole)) {
        return res.status(403).json({
          status: 'error',
          message: `Access denied. Required role: ${requiredRole} or higher`
        });
      }

      // Add user info to request
      req.user = {
        userId: decoded.sub,
        email: decoded.email,
        role: decoded.role
      };

      next();
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }
  };
};

/**
 * Middleware to check if user can manage another user's role
 */
export const requireManagementPermission = (targetRoleParam: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const targetRole = req.body[targetRoleParam] || req.params[targetRoleParam];
      
      if (!targetRole) {
        return res.status(400).json({
          status: 'error',
          message: `Target role parameter '${targetRoleParam}' is required`
        });
      }

      if (!roleHierarchyService.canManageRole(req.user.role, targetRole)) {
        return res.status(403).json({
          status: 'error',
          message: `You cannot manage users with ${targetRole} role`
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Middleware to validate role change requests
 */
export const validateRoleChange = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const { currentRole, newRole } = req.body;
    
    if (!currentRole || !newRole) {
      return res.status(400).json({
        status: 'error',
        message: 'Current role and new role are required'
      });
    }

    const validation = roleHierarchyService.validateRoleChange(
      req.user.role,
      currentRole,
      newRole
    );

    if (!validation.isValid) {
      return res.status(403).json({
        status: 'error',
        message: validation.reason
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to check conversation history access permissions
 */
export const requireConversationAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const targetUserId = req.params.userId || req.body.userId;
    const userRole = req.user.role;

    // Employees can only access their own conversations
    if (userRole === 'employee' && targetUserId !== req.user.userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only access your own conversations'
      });
    }

    // For other roles, check if they have access to the target user's role
    // This will be validated in the service layer with actual user data
    
    next();
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to prevent superadmin from making requests
 */
export const preventSuperadminRequests = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    if (!roleHierarchyService.canMakeRequests(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'CEO level users cannot make requests'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

export { roleHierarchyService };