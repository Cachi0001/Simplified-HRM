import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { RoleHierarchyService } from '../services/RoleHierarchyService';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Access token is required'
      });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      res.status(500).json({
        status: 'error',
        message: 'Server configuration error'
      });
      return;
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    logger.error('Token verification failed', { error: (error as Error).message });
    res.status(403).json({
      status: 'error',
      message: 'Invalid or expired token'
    });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userRole = req.user.role;
      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Role check failed', { error: (error as Error).message });
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Enhanced role validation using hierarchy service
 * Allows access if user has minimum required role level
 */
export const requireMinimumRole = (minimumRole: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userRole = req.user.role;
      const userLevel = RoleHierarchyService.getRoleLevel(userRole);
      const requiredLevel = RoleHierarchyService.getRoleLevel(minimumRole);

      if (userLevel < requiredLevel) {
        logger.warn('Access denied - insufficient role level', {
          userId: req.user.id,
          userRole,
          userLevel,
          requiredRole: minimumRole,
          requiredLevel
        });

        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions for this action'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Role hierarchy check failed', { error: (error as Error).message });
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Permission-based access control
 * Checks if user has specific permission
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const userRole = req.user.role;
      const hasPermission = RoleHierarchyService.hasPermission(userRole, permission);

      if (!hasPermission) {
        logger.warn('Access denied - missing permission', {
          userId: req.user.id,
          userRole,
          requiredPermission: permission
        });

        res.status(403).json({
          status: 'error',
          message: `Permission required: ${permission}`
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Permission check failed', { error: (error as Error).message });
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Check if user can manage another user's role
 */
export const requireRoleManagement = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const managerRole = req.user.role;
    const targetRole = req.body.role || req.params.role;

    if (!targetRole) {
      res.status(400).json({
        status: 'error',
        message: 'Target role is required'
      });
      return;
    }

    const canManage = RoleHierarchyService.canManageRole(managerRole, targetRole);

    if (!canManage) {
      logger.warn('Role management denied', {
        managerId: req.user.id,
        managerRole,
        targetRole
      });

      res.status(403).json({
        status: 'error',
        message: 'Cannot manage users with this role level'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Role management check failed', { error: (error as Error).message });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * Validate role change permissions
 */
export const validateRoleChange = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const changerRole = req.user.role;
    const fromRole = req.body.currentRole || req.body.fromRole;
    const toRole = req.body.newRole || req.body.toRole || req.body.role;

    if (!fromRole || !toRole) {
      res.status(400).json({
        status: 'error',
        message: 'Current role and new role are required'
      });
      return;
    }

    const validation = RoleHierarchyService.validateRoleChangeDetailed(changerRole, fromRole, toRole);

    if (!validation.isValid) {
      logger.warn('Role change denied', {
        changerId: req.user.id,
        changerRole,
        fromRole,
        toRole,
        reason: validation.reason
      });

      res.status(403).json({
        status: 'error',
        message: validation.reason || 'Role change not permitted'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Role change validation failed', { error: (error as Error).message });
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Legacy middleware for backward compatibility
export const requireAdmin = requireRole(['admin', 'superadmin']);
export const requireAuth = requireRole(['admin', 'superadmin', 'hr', 'teamlead', 'employee']);

// New hierarchy-based middleware
export const requireSuperAdmin = requireMinimumRole('superadmin');
export const requireAdminLevel = requireMinimumRole('admin');
export const requireHRLevel = requireMinimumRole('hr');
export const requireTeamLeadLevel = requireMinimumRole('teamlead');

// Permission-based middleware
export const requireUserManagement = requirePermission('users:manage');
export const requireSystemManagement = requirePermission('system:manage');
export const requireDepartmentManagement = requirePermission('departments:manage');
export const requireAnnouncementManagement = requirePermission('announcements:manage');
