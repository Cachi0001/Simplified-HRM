import { Request, Response } from 'express';
import { RoleHierarchyService } from '../services/RoleHierarchyService';
import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

export class RoleController {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Get role hierarchy information
   */
  async getRoleHierarchy(req: Request, res: Response): Promise<void> {
    try {
      const hierarchy = RoleHierarchyService.getRoleHierarchy();
      
      res.status(200).json({
        status: 'success',
        data: {
          hierarchy,
          userRole: req.user?.role,
          userLevel: RoleHierarchyService.getRoleLevel(req.user?.role || '')
        }
      });
    } catch (error) {
      logger.error('Get role hierarchy error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve role hierarchy'
      });
    }
  }

  /**
   * Get manageable roles for current user
   */
  async getManageableRoles(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const manageableRoles = RoleHierarchyService.getManageableRoles(req.user.role);
      
      res.status(200).json({
        status: 'success',
        data: {
          manageableRoles,
          userRole: req.user.role
        }
      });
    } catch (error) {
      logger.error('Get manageable roles error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve manageable roles'
      });
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const { userId, newRole } = req.body;

      if (!userId || !newRole) {
        res.status(400).json({
          status: 'error',
          message: 'User ID and new role are required'
        });
        return;
      }

      // Validate the new role
      if (!RoleHierarchyService.isValidRole(newRole)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid role specified'
        });
        return;
      }

      // Get current user data
      const { data: targetUser, error: getUserError } = await this.supabase
        .from('users')
        .select('id, email, role')
        .eq('id', userId)
        .single();

      if (getUserError || !targetUser) {
        res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
        return;
      }

      // Check if current user can change this role
      if (!RoleHierarchyService.canChangeRole(req.user.role, targetUser.role, newRole)) {
        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions to change this role'
        });
        return;
      }

      // Update user role in users table
      const { error: updateUserError } = await this.supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (updateUserError) {
        throw updateUserError;
      }

      // Update employee role in employees table
      const { error: updateEmployeeError } = await this.supabase
        .from('employees')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (updateEmployeeError) {
        logger.warn('Failed to update employee role, but user role updated:', updateEmployeeError);
      }

      logger.info(`Role updated: User ${targetUser.email} role changed from ${targetUser.role} to ${newRole} by ${req.user.email}`);

      res.status(200).json({
        status: 'success',
        message: 'User role updated successfully',
        data: {
          userId,
          oldRole: targetUser.role,
          newRole,
          updatedBy: req.user.email
        }
      });
    } catch (error) {
      logger.error('Update user role error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update user role'
      });
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const { role } = req.params;
      const { page = 1, limit = 20 } = req.query;

      if (!role) {
        res.status(400).json({
          status: 'error',
          message: 'Role parameter is required'
        });
        return;
      }

      // Check if user can manage this role
      if (!RoleHierarchyService.canManageRole(req.user.role, role)) {
        res.status(403).json({
          status: 'error',
          message: 'Cannot view users with this role'
        });
        return;
      }

      const offset = (Number(page) - 1) * Number(limit);

      // Get users with the specified role
      const { data: users, error: usersError } = await this.supabase
        .from('users')
        .select('id, email, full_name, role, created_at')
        .eq('role', role)
        .range(offset, offset + Number(limit) - 1)
        .order('created_at', { ascending: false });

      if (usersError) {
        throw usersError;
      }

      // Get total count
      const { count, error: countError } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', role);

      if (countError) {
        throw countError;
      }

      res.status(200).json({
        status: 'success',
        data: {
          users: users || [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: count || 0,
            totalPages: Math.ceil((count || 0) / Number(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Get users by role error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve users'
      });
    }
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const { userId } = req.params;
      let targetRole = req.user.role;

      // If checking another user's permissions
      if (userId && userId !== req.user.id) {
        // Check if current user can view this user's permissions
        const { data: targetUser, error: getUserError } = await this.supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single();

        if (getUserError || !targetUser) {
          res.status(404).json({
            status: 'error',
            message: 'User not found'
          });
          return;
        }

        if (!RoleHierarchyService.canManageRole(req.user.role, targetUser.role)) {
          res.status(403).json({
            status: 'error',
            message: 'Cannot view permissions for this user'
          });
          return;
        }

        targetRole = targetUser.role;
      }

      const permissions = RoleHierarchyService.getRolePermissions(targetRole);
      const roleLevel = RoleHierarchyService.getRoleLevel(targetRole);

      res.status(200).json({
        status: 'success',
        data: {
          userId: userId || req.user.id,
          role: targetRole,
          level: roleLevel,
          permissions
        }
      });
    } catch (error) {
      logger.error('Get user permissions error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve user permissions'
      });
    }
  }

  /**
   * Check if user can perform specific action
   */
  async checkPermission(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      const { permission } = req.body;

      if (!permission) {
        res.status(400).json({
          status: 'error',
          message: 'Permission is required'
        });
        return;
      }

      const hasPermission = RoleHierarchyService.hasPermission(req.user.role, permission);

      res.status(200).json({
        status: 'success',
        data: {
          permission,
          hasPermission,
          userRole: req.user.role
        }
      });
    } catch (error) {
      logger.error('Check permission error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to check permission'
      });
    }
  }
}