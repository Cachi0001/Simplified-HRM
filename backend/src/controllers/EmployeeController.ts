import { Request, Response } from 'express';
import { EmployeeService } from '../services/EmployeeService';
import { CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQuery } from '../models/SupabaseEmployee';
import logger from '../utils/logger';

export class EmployeeController {
  constructor(private employeeService: EmployeeService) {}

  async createEmployee(req: Request, res: Response): Promise<void> {
    try {
      const employeeData: CreateEmployeeRequest = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      logger.info('EmployeeController: Create employee request', { createdBy: userId });

      const employee = await this.employeeService.createEmployee(employeeData, userId, userRole);

      res.status(201).json({
        status: 'success',
        message: 'Employee created successfully',
        data: { employee }
      });
    } catch (error) {
      logger.error('EmployeeController: Create employee error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getAllEmployees(req: Request, res: Response): Promise<void> {
    try {
      const query: EmployeeQuery = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        search: req.query.search as string,
        department: req.query.department as string,
        status: req.query.status as 'active' | 'rejected' | 'pending',
        role: req.query.role as 'admin' | 'employee' | 'hr'
      };

      const userRole = req.user?.role;

      const result = await this.employeeService.getAllEmployees(query, userRole);

      res.status(200).json({
        status: 'success',
        data: result.employees,
        total: result.total,
        page: result.page,
        limit: result.limit
      });
    } catch (error) {
      logger.error('EmployeeController: Get all employees error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getEmployeeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      const employee = await this.employeeService.getEmployeeById(id, userRole, userId);

      if (!employee) {
        res.status(404).json({
          status: 'error',
          message: 'Employee not found'
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: { employee }
      });
    } catch (error) {
      logger.error('EmployeeController: Get employee by ID error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getPendingApprovals(req: Request, res: Response): Promise<void> {
    try {
      const pendingEmployees = await this.employeeService.getPendingApprovals();

      res.status(200).json({
        status: 'success',
        employees: pendingEmployees,
        total: pendingEmployees.length
      });
    } catch (error) {
      logger.error('EmployeeController: Get pending approvals error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }
  
  async getMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      const employee = await this.employeeService.getMyProfile(userId);

      if (!employee) {
        res.status(404).json({
          status: 'error',
          message: 'Employee profile not found'
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: { employee }
      });
    } catch (error) {
      logger.error('EmployeeController: Get my profile error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async updateEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const employeeData: UpdateEmployeeRequest = req.body;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      const employee = await this.employeeService.updateEmployee(id, employeeData, userRole, userId);

      res.status(200).json({
        status: 'success',
        message: 'Employee updated successfully',
        data: { employee }
      });
    } catch (error) {
      logger.error('EmployeeController: Update employee error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async updateMyProfile(req: Request, res: Response): Promise<void> {
    try {
      const employeeData: UpdateEmployeeRequest = req.body;
      const userId = req.user?.id;

      const employee = await this.employeeService.updateMyProfile(employeeData, userId);

      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: { employee }
      });
    } catch (error) {
      logger.error('EmployeeController: Update my profile error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async deleteEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;

      await this.employeeService.deleteEmployee(id, userRole);

      res.status(204).json({
        status: 'success',
        message: 'Employee deleted successfully'
      });
    } catch (error) {
      logger.error('EmployeeController: Delete employee error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async searchEmployees(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          status: 'error',
          message: 'Search query is required'
        });
        return;
      }

      const userRole = req.user?.role;

      const employees = await this.employeeService.searchEmployees(q, userRole);

      res.status(200).json({
        status: 'success',
        data: { employees }
      });
    } catch (error) {
      logger.error('EmployeeController: Search employees error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getEmployeesForChat(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      const employees = await this.employeeService.getEmployeesForChat(userId);

      res.status(200).json({
        status: 'success',
        data: employees,
        total: employees.length
      });
    } catch (error) {
      logger.error('EmployeeController: Get employees for chat error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async approveEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const employee = await this.employeeService.approveEmployee(id);

      res.status(200).json({
        status: 'success',
        message: 'Employee approved successfully',
        data: { employee }
      });
    } catch (error) {
      logger.error('EmployeeController: Approve employee error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async approveEmployeeWithRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role, reason } = req.body;
      const approverId = req.user?.id;
      const approverName = req.user?.fullName;
      const approverRole = req.user?.role;

      if (!role) {
        res.status(400).json({
          status: 'error',
          message: 'Role is required'
        });
        return;
      }

      if (!['admin', 'employee', 'hr', 'super-admin', 'superadmin', 'teamlead'].includes(role)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid role. Must be admin, employee, hr, super-admin, superadmin, or teamlead'
        });
        return;
      }

      logger.info('EmployeeController: Approve employee with role', { 
        employeeId: id, 
        role, 
        approverId,
        approverRole 
      });

      const result = await this.employeeService.approveEmployeeWithRole(
        id,
        role,
        approverId,
        approverName,
        reason
      );

      // Send approval email (handled by service layer)
      try {
        await this.employeeService.sendApprovalNotification(result.email, result.full_name, role);
      } catch (emailError) {
        logger.error('Failed to send approval email', { employeeId: id, error: emailError });
        // Don't fail the approval if email fails
      }

      res.status(200).json({
        status: 'success',
        message: 'Employee approved and role assigned successfully',
        data: result
      });
    } catch (error) {
      logger.error('EmployeeController: Approve employee with role error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role, reason } = req.body;
      const updatedById = req.user?.id;
      const updatedByName = req.user?.fullName;

      if (!role) {
        res.status(400).json({
          status: 'error',
          message: 'Role is required'
        });
        return;
      }

      if (!['admin', 'employee', 'hr', 'super-admin', 'superadmin', 'teamlead'].includes(role)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid role. Must be admin, employee, hr, super-admin, superadmin, or teamlead'
        });
        return;
      }

      logger.info('EmployeeController: Update employee role', { 
        employeeId: id, 
        newRole: role, 
        updatedById
      });

      const result = await this.employeeService.updateRole(
        id,
        role,
        updatedById,
        updatedByName,
        reason
      );

      res.status(200).json({
        status: 'success',
        message: 'Employee role updated successfully',
        data: result
      });
    } catch (error) {
      logger.error('EmployeeController: Update role error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getApprovalHistory(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = req.query.employeeId as string | undefined;

      const history = await this.employeeService.getApprovalHistory(employeeId);

      res.status(200).json({
        status: 'success',
        data: history
      });
    } catch (error) {
      logger.error('EmployeeController: Get approval history error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async assignDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { department } = req.body;

      if (!department) {
        res.status(400).json({
          status: 'error',
          message: 'Department is required'
        });
        return;
      }

      const employee = await this.employeeService.assignDepartment(id, department);

      res.status(200).json({
        status: 'success',
        message: 'Department assigned successfully',
        data: { employee }
      });
    } catch (error) {
      logger.error('EmployeeController: Assign department error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getEmployeeStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.employeeService.getEmployeeStats();

      res.status(200).json({
        status: 'success',
        ...stats
      });
    } catch (error) {
      logger.error('EmployeeController: Get employee stats error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }
   async rejectEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      await this.employeeService.rejectEmployee(id, reason);

      res.status(200).json({
        status: 'success',
        message: 'Employee registration rejected'
      });
    } catch (error) {
      logger.error('EmployeeController: Reject employee error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async bulkUpdateEmployees(req: Request, res: Response): Promise<void> {
    try {
      const { updates } = req.body;
      const currentUserRole = req.user?.role;
      const currentUserId = req.user?.id;

      if (!updates || !Array.isArray(updates)) {
        res.status(400).json({
          status: 'error',
          message: 'Updates array is required'
        });
        return;
      }

      if (!currentUserRole) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      logger.info('EmployeeController: Bulk update employees', { count: updates.length });

      const results = {
        success: [] as string[],
        failed: [] as { id: string; error: string }[]
      };

      // Process each update
      for (const update of updates) {
        try {
          const { employeeId, updates: employeeUpdates } = update;
          
          if (!employeeId) {
            results.failed.push({ id: 'unknown', error: 'Employee ID is required' });
            continue;
          }

          await this.employeeService.updateEmployee(employeeId, employeeUpdates, currentUserRole, currentUserId);
          results.success.push(employeeId);
        } catch (error) {
          results.failed.push({ 
            id: update.employeeId || 'unknown', 
            error: (error as Error).message 
          });
        }
      }

      res.status(200).json({
        status: 'success',
        message: `Bulk update completed. ${results.success.length} successful, ${results.failed.length} failed.`,
        data: results
      });
    } catch (error) {
      logger.error('EmployeeController: Bulk update error', { error: (error as Error).message });
      res.status(500).json({
        status: 'error',
        message: 'Failed to perform bulk update'
      });
    }
  }



  async getEmployeesForTasks(req: Request, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;

      logger.info('EmployeeController: Get employees for tasks', { userRole });

      const employees = await this.employeeService.getEmployeesForTasks(userRole);

      res.status(200).json({
        status: 'success',
        data: employees
      });
    } catch (error) {
      logger.error('EmployeeController: Get employees for tasks error', { error: (error as Error).message });
      res.status(500).json({
        status: 'error',
        message: 'Failed to get employees for tasks'
      });
    }
  }

  /**
   * Update employee status (for management roles only)
   * PUT /api/employees/:id/status
   */
  async updateEmployeeStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const changedById = req.user?.id;
      const userRole = req.user?.role;

      // Validate user has permission to update employee status
      const authorizedRoles = ['superadmin', 'super-admin', 'admin', 'hr'];
      if (!authorizedRoles.includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions to update employee status'
        });
        return;
      }

      // Validate status
      if (!status || !['active', 'inactive', 'pending', 'rejected', 'terminated'].includes(status)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid status. Must be active, inactive, pending, rejected, or terminated'
        });
        return;
      }

      // Validate employee ID is a proper UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid employee ID format'
        });
        return;
      }

      logger.info('EmployeeController: Update employee status', { 
        employeeId: id, 
        newStatus: status, 
        changedBy: changedById,
        userRole,
        reason 
      });

      // Call database function to update status
      const result = await this.employeeService.updateEmployeeStatus(id, status, changedById, userRole, reason);

      res.status(200).json(result);
    } catch (error) {
      logger.error('EmployeeController: Update employee status error', { 
        error: (error as Error).message,
        employeeId: req.params.id 
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get employee status change history
   * GET /api/employees/:id/status-history
   */
  async getEmployeeStatusHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;

      // Validate user has permission to view employee history
      const authorizedRoles = ['superadmin', 'super-admin', 'admin', 'hr'];
      if (!authorizedRoles.includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions to view employee history'
        });
        return;
      }

      // Validate employee ID is a proper UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid employee ID format'
        });
        return;
      }

      logger.info('EmployeeController: Get employee status history', { 
        employeeId: id, 
        requestedBy: req.user?.id,
        userRole 
      });

      const history = await this.employeeService.getEmployeeStatusHistory(id, userRole);

      res.status(200).json({
        status: 'success',
        data: history
      });
    } catch (error) {
      logger.error('EmployeeController: Get employee status history error', { 
        error: (error as Error).message,
        employeeId: req.params.id 
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get employees for management (with restrictions)
   * GET /api/employees/management
   */
  async getEmployeesForManagement(req: Request, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;
      const statusFilter = req.query.status as string;
      const roleFilter = req.query.role as string;
      const departmentFilter = req.query.department as string;

      // Validate user has permission to access employee management
      const authorizedRoles = ['superadmin', 'super-admin', 'admin', 'hr'];
      if (!authorizedRoles.includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'Access denied. Only SuperAdmin, Admin, and HR can access employee management.'
        });
        return;
      }

      logger.info('EmployeeController: Get employees for management', { 
        requestedBy: req.user?.id,
        userRole,
        filters: { statusFilter, roleFilter, departmentFilter }
      });

      const employees = await this.employeeService.getEmployeesForManagement(
        userRole,
        req.user?.id || '',
        statusFilter, 
        roleFilter, 
        departmentFilter
      );

      res.status(200).json({
        status: 'success',
        data: employees
      });
    } catch (error) {
      logger.error('EmployeeController: Get employees for management error', { 
        error: (error as Error).message,
        requestedBy: req.user?.id 
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Update employee non-personal fields (for management roles only)
   * PUT /api/employees/:id/fields
   */
  async updateEmployeeFields(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { department_id, position, role, manager_id, salary } = req.body;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      // Validate user has permission to update employee fields
      const authorizedRoles = ['superadmin', 'super-admin', 'admin', 'hr'];
      if (!authorizedRoles.includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions to update employee fields'
        });
        return;
      }

      // Validate employee ID is a proper UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid employee ID format'
        });
        return;
      }

      logger.info('EmployeeController: Update employee fields', { 
        employeeId: id, 
        fields: { department_id, position, role, manager_id, salary },
        updatedBy: userId,
        userRole 
      });

      const result = await this.employeeService.updateEmployeeFields(
        id, 
        { department_id, position, role, manager_id, salary },
        userId,
        userRole
      );

      res.status(200).json(result);
    } catch (error) {
      logger.error('EmployeeController: Update employee fields error', { 
        error: (error as Error).message,
        employeeId: req.params.id 
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }
}