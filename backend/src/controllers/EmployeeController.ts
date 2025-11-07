import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/EmployeeService';
import { ValidationError } from '../middleware/errorHandler';

export class EmployeeController {
  private employeeService: EmployeeService;

  constructor() {
    this.employeeService = new EmployeeService();
  }

  getPendingEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employees = await this.employeeService.getPendingEmployees();
      res.json({
        success: true,
        data: employees
      });
    } catch (error) {
      next(error);
    }
  };

  getAllEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, department } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status as string;
      if (department) filters.department = department as string;
      
      const employees = await this.employeeService.getAllEmployees(filters);
      res.json({
        success: true,
        data: employees
      });
    } catch (error) {
      next(error);
    }
  };

  getEmployeeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employee = await this.employeeService.getEmployeeById(req.params.id);
      res.json({
        success: true,
        data: employee
      });
    } catch (error) {
      next(error);
    }
  };

  getMyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }
      
      const profileData = await this.employeeService.getMyProfileWithCompletion(userId);
      res.json({
        success: true,
        data: profileData.profile,
        completion_percentage: profileData.completion_percentage
      });
    } catch (error) {
      next(error);
    }
  };

  updateMyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }
      
      const employee = await this.employeeService.updateMyProfile(userId, req.body);
      res.json({
        success: true,
        data: employee
      });
    } catch (error) {
      next(error);
    }
  };

  approveEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { role } = req.body;
      const approverId = (req as any).user?.userId;
      
      const result = await this.employeeService.approveEmployee(
        req.params.id,
        approverId,
        role || 'employee'
      );
      
      res.json({
        success: true,
        message: result.message,
        data: result.employee
      });
    } catch (error) {
      next(error);
    }
  };

  rejectEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reason } = req.body;
      const rejectedById = (req as any).user?.userId;
      
      const result = await this.employeeService.rejectEmployee(
        req.params.id,
        rejectedById,
        reason || 'Application rejected'
      );
      
      res.json({
        success: true,
        message: result.message,
        data: result.employee
      });
    } catch (error) {
      next(error);
    }
  };

  updateWorkingDays = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workingDays } = req.body;
      
      if (!Array.isArray(workingDays)) {
        throw new ValidationError('Working days must be an array');
      }
      
      const employee = await this.employeeService.updateWorkingDays(req.params.id, workingDays);
      res.json({
        success: true,
        data: employee
      });
    } catch (error) {
      next(error);
    }
  };

  updateMyWorkingDays = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const { workingDays } = req.body;
      
      if (!Array.isArray(workingDays)) {
        throw new ValidationError('Working days must be an array');
      }
      
      const employee = await this.employeeService.updateMyWorkingDays(userId, workingDays);
      res.json({
        success: true,
        data: employee
      });
    } catch (error) {
      next(error);
    }
  };

  bulkUpdateEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { updates } = req.body;
      
      if (!Array.isArray(updates)) {
        throw new ValidationError('Updates must be an array');
      }
      
      const results = await this.employeeService.bulkUpdateEmployees(updates);
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  };

  getActiveEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employees = await this.employeeService.getActiveEmployees();
      res.json({
        success: true,
        data: employees
      });
    } catch (error) {
      next(error);
    }
  };
}
