/**
 * RoleManagementController - Handle role management operations
 */
import { Request, Response } from 'express';
import SupabaseConfig from '../config/supabase';

const supabase = SupabaseConfig.getClient();
import { RoleHierarchyService } from '../services/RoleHierarchyService';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

class RoleManagementController {
  private roleHierarchyService = new RoleHierarchyService();

  // Update user role
  async updateUserRole(req: AuthenticatedRequest, res: Response) {
    try {
      const { targetUserId, newRole, reason } = req.body;
      const managerId = req.user?.userId;
      const managerRole = req.user?.role;

      if (!managerId || !managerRole) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      if (!targetUserId || !newRole) {
        return res.status(400).json({
          status: 'error',
          message: 'Target user ID and new role are required'
        });
      }

      // Get target user's current role
      const { data: targetUser, error: userError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', targetUserId)
        .single();

      if (userError || !targetUser) {
        return res.status(404).json({
          status: 'error',
          message: 'Target user not found'
        });
      }

      // Validate role change
      const validation = this.roleHierarchyService.validateRoleChange(
        managerRole,
        targetUser.role,
        newRole
      );

      if (!validation.isValid) {
        return res.status(403).json({
          status: 'error',
          message: validation.reason
        });
      }

      // Update user role in users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUserId);

      if (updateError) {
        console.error('❌ Error updating user role:', updateError);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to update user role'
        });
      }

      // Update employee role if exists
      const { error: empUpdateError } = await supabase
        .from('employees')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', targetUserId);

      if (empUpdateError) {
        console.warn('⚠️ Warning: Could not update employee role:', empUpdateError);
      }

      // Log the role change
      await this.logRoleChange(managerId, targetUserId, targetUser.role, newRole, reason);

      console.log('✅ Role updated successfully:', {
        targetUserId,
        oldRole: targetUser.role,
        newRole,
        managerId
      });

      res.json({
        status: 'success',
        message: `User role updated from ${targetUser.role} to ${newRole}`,
        data: {
          userId: targetUserId,
          oldRole: targetUser.role,
          newRole: newRole,
          updatedBy: managerId
        }
      });
    } catch (error) {
      console.error('❌ Update user role error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Get users that can be managed by current user
  async getManagedUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (!userRole) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const managedRoles = this.roleHierarchyService.getManagedRoles(userRole);

      if (managedRoles.length === 0) {
        return res.json({
          status: 'success',
          data: { users: [] }
        });
      }

      // Get users with manageable roles
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          role,
          created_at,
          updated_at
        `)
        .in('role', managedRoles)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching managed users:', error);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to fetch users'
        });
      }

      res.json({
        status: 'success',
        data: { 
          users,
          managedRoles,
          totalCount: users.length
        }
      });
    } catch (error) {
      console.error('❌ Get managed users error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Get role hierarchy information
  async getRoleHierarchy(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      if (!userRole) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const allRoles = this.roleHierarchyService.getAllRoles();
      const managedRoles = this.roleHierarchyService.getManagedRoles(userRole);
      const approvalRoles = this.roleHierarchyService.getApprovalRoles(userRole);

      res.json({
        status: 'success',
        data: {
          currentRole: userRole,
          allRoles,
          managedRoles,
          approvalRoles,
          canMakeRequests: this.roleHierarchyService.canMakeRequests(userRole)
        }
      });
    } catch (error) {
      console.error('❌ Get role hierarchy error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Assign user to team lead
  async assignToTeamLead(req: AuthenticatedRequest, res: Response) {
    try {
      const { employeeId, teamLeadId, departmentId } = req.body;
      const managerId = req.user?.userId;
      const managerRole = req.user?.role;

      if (!managerId || !managerRole) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      if (!employeeId || !teamLeadId) {
        return res.status(400).json({
          status: 'error',
          message: 'Employee ID and Team Lead ID are required'
        });
      }

      // Verify team lead has correct role
      const { data: teamLead, error: teamLeadError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', teamLeadId)
        .single();

      if (teamLeadError || !teamLead || teamLead.role !== 'teamlead') {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid team lead'
        });
      }

      // Check if manager can assign team leads
      if (!this.roleHierarchyService.canManageRole(managerRole, 'teamlead')) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to assign team leads'
        });
      }

      // Update employee assignment
      const updateData: any = {
        manager_id: teamLeadId,
        updated_at: new Date().toISOString()
      };

      if (departmentId) {
        updateData.department_id = departmentId;
      }

      const { error: updateError } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', employeeId);

      if (updateError) {
        console.error('❌ Error assigning to team lead:', updateError);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to assign employee to team lead'
        });
      }

      console.log('✅ Employee assigned to team lead successfully:', {
        employeeId,
        teamLeadId,
        departmentId,
        managerId
      });

      res.json({
        status: 'success',
        message: 'Employee assigned to team lead successfully',
        data: {
          employeeId,
          teamLeadId,
          departmentId,
          assignedBy: managerId
        }
      });
    } catch (error) {
      console.error('❌ Assign to team lead error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Get team members for a team lead
  async getTeamMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const { teamLeadId } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      // Check if user can view team members
      if (userRole === 'employee' && userId !== teamLeadId) {
        return res.status(403).json({
          status: 'error',
          message: 'You can only view your own team members'
        });
      }

      const { data: teamMembers, error } = await supabase
        .from('employees')
        .select(`
          id,
          user_id,
          email,
          full_name,
          role,
          department,
          position,
          status,
          created_at
        `)
        .eq('manager_id', teamLeadId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching team members:', error);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to fetch team members'
        });
      }

      res.json({
        status: 'success',
        data: {
          teamMembers,
          teamLeadId,
          totalCount: teamMembers.length
        }
      });
    } catch (error) {
      console.error('❌ Get team members error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Log role changes for audit trail
  private async logRoleChange(
    managerId: string,
    targetUserId: string,
    oldRole: string,
    newRole: string,
    reason?: string
  ) {
    try {
      // Get manager info
      const { data: manager } = await supabase
        .from('users')
        .select('full_name, role')
        .eq('id', managerId)
        .single();

      const { error } = await supabase
        .from('approval_history')
        .insert([
          {
            employee_id: targetUserId,
            old_role: oldRole,
            new_role: newRole,
            changed_by_id: managerId,
            changed_by_name: manager?.full_name || 'Unknown',
            changed_by_role: manager?.role || 'Unknown',
            reason: reason || 'Role update via management interface',
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('❌ Error logging role change:', error);
      }
    } catch (error) {
      console.error('❌ Error in logRoleChange:', error);
    }
  }
}

export default new RoleManagementController();