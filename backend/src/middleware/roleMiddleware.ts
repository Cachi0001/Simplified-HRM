import { Request, Response, NextFunction } from 'express';
import { RoleHierarchyService } from '../services/RoleHierarchyService';
import logger from '../utils/logger';

// Use the existing user type from auth middleware

/**
 * Middleware to check if user has required role level
 */
export const requireRoleLevel = (minimumLevel: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const userLevel = RoleHierarchyService.getRoleLevel(req.user.role);
      
      if (userLevel < minimumLevel) {
        logger.warn(`Access denied: User ${req.user.email} (${req.user.role}, level ${userLevel}) attempted to access resource requiring level ${minimumLevel}`);
        
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      logger.error('Role level check error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Middleware to check if user has specific role
 */
export const requireRole = (allowedRoles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      const normalizedUserRole = RoleHierarchyService.normalizeRole(req.user.role);
      const normalizedAllowedRoles = roles.map(role => RoleHierarchyService.normalizeRole(role));
      
      if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
        logger.warn(`Access denied: User ${req.user.email} (${req.user.role}) attempted to access resource requiring roles: ${roles.join(', ')}`);
        
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      logger.error('Role check error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Middleware to check if user has specific permission
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      if (!RoleHierarchyService.hasPermission(req.user.role, permission)) {
        logger.warn(`Access denied: User ${req.user.email} (${req.user.role}) attempted to access resource requiring permission: ${permission}`);
        
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Middleware to check if user can manage another user's role
 */
export const requireRoleManagement = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const targetRole = req.body.role || req.params.role;
    
    if (!targetRole) {
      return res.status(400).json({
        status: 'error',
        message: 'Target role is required'
      });
    }

    if (!RoleHierarchyService.canManageRole(req.user.role, targetRole)) {
      logger.warn(`Role management denied: User ${req.user.email} (${req.user.role}) attempted to manage role: ${targetRole}`);
      
      return res.status(403).json({
        status: 'error',
        message: 'Cannot manage users with this role'
      });
    }

    next();
  } catch (error) {
    logger.error('Role management check error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to check if user can approve requests
 */
export const requireApprovalPermission = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const requesterRole = req.body.requesterRole || req.params.requesterRole;
    
    if (!requesterRole) {
      return res.status(400).json({
        status: 'error',
        message: 'Requester role is required'
      });
    }

    if (!RoleHierarchyService.canApproveRequest(req.user.role, requesterRole)) {
      logger.warn(`Approval denied: User ${req.user.email} (${req.user.role}) attempted to approve request from: ${requesterRole}`);
      
      return res.status(403).json({
        status: 'error',
        message: 'Cannot approve requests from this role'
      });
    }

    next();
  } catch (error) {
    logger.error('Approval permission check error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to check conversation access permissions
 */
export const requireConversationAccess = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const targetRole = req.body.targetRole || req.params.targetRole;
    
    if (!targetRole) {
      return res.status(400).json({
        status: 'error',
        message: 'Target role is required'
      });
    }

    if (!RoleHierarchyService.canAccessConversations(req.user.role, targetRole)) {
      logger.warn(`Conversation access denied: User ${req.user.email} (${req.user.role}) attempted to access conversations of: ${targetRole}`);
      
      return res.status(403).json({
        status: 'error',
        message: 'Cannot access conversations for this role'
      });
    }

    next();
  } catch (error) {
    logger.error('Conversation access check error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware for admin-only routes (admin level and above)
 */
export const requireAdmin = requireRoleLevel(4);

/**
 * Middleware for HR-only routes (HR level and above)
 */
export const requireHR = requireRoleLevel(3);

/**
 * Middleware for team lead routes (team lead level and above)
 */
export const requireTeamLead = requireRoleLevel(2);

/**
 * Middleware for superadmin-only routes
 */
export const requireSuperAdmin = requireRole('superadmin');