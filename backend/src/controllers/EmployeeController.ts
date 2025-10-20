import { Request, Response } from 'express';
import { EmployeeService } from '../services/EmployeeService';
import { CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeQuery } from '../models/Employee';
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
        status: req.query.status as 'active' | 'inactive',
        role: req.query.role as 'admin' | 'employee'
      };

      const userRole = req.user?.role;

      const result = await this.employeeService.getAllEmployees(query, userRole);

      res.status(200).json({
        status: 'success',
        data: result
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

  async getPendingApprovals(req: Request, res: Response): Promise<void> {
    try {
      const pendingApprovals = await this.employeeService.getPendingApprovals();

      res.status(200).json({
        status: 'success',
        data: { pendingApprovals }
      });
    } catch (error) {
      logger.error('EmployeeController: Get pending approvals error', { error: (error as Error).message });
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
