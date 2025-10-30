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

      if (!['admin', 'employee', 'hr', 'super-admin'].includes(role)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid role. Must be admin, employee, hr, or super-admin'
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

      if (!['admin', 'employee', 'hr', 'super-admin'].includes(role)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid role. Must be admin, employee, hr, or super-admin'
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

      await this.employeeService.rejectEmployee(id);

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
}