import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services/AttendanceService';
import { ValidationError } from '../middleware/errorHandler';

export class AttendanceController {
  private attendanceService: AttendanceService;

  constructor() {
    this.attendanceService = new AttendanceService();
  }

  clockIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const { lat, lng, address } = req.body;

      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      if (!lat || !lng) {
        throw new ValidationError('Location coordinates are required');
      }

      // Get employee_id from user_id
      const { EmployeeRepository } = require('../repositories/EmployeeRepository');
      const employeeRepo = new EmployeeRepository();
      const employee = await employeeRepo.findByUserId(userId);
      
      if (!employee) {
        throw new ValidationError('Employee profile not found. Please complete your profile first.');
      }

      const result = await this.attendanceService.clockIn({
        employee_id: employee.id,
        lat,
        lng,
        address
      });

      res.json({
        success: true,
        message: result.message,
        data: result.attendance
      });
    } catch (error) {
      next(error);
    }
  };

  clockOut = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const { lat, lng, address } = req.body;

      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      if (!lat || !lng) {
        throw new ValidationError('Location coordinates are required');
      }

      // Get employee_id from user_id
      const { EmployeeRepository } = require('../repositories/EmployeeRepository');
      const employeeRepo = new EmployeeRepository();
      const employee = await employeeRepo.findByUserId(userId);
      
      if (!employee) {
        throw new ValidationError('Employee profile not found. Please complete your profile first.');
      }

      const result = await this.attendanceService.clockOut({
        employee_id: employee.id,
        lat,
        lng,
        address
      });

      res.json({
        success: true,
        message: result.message,
        data: result.attendance
      });
    } catch (error) {
      next(error);
    }
  };

  getMyRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const { startDate, endDate } = req.query;

      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      // Get employee_id from user_id
      const { EmployeeRepository } = require('../repositories/EmployeeRepository');
      const employeeRepo = new EmployeeRepository();
      const employee = await employeeRepo.findByUserId(userId);
      
      if (!employee) {
        throw new ValidationError('Employee profile not found');
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const records = await this.attendanceService.getMyRecords(employee.id, start, end);

      res.json({
        success: true,
        data: records
      });
    } catch (error) {
      next(error);
    }
  };

  getTodayStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      // Get employee_id from user_id
      const { EmployeeRepository } = require('../repositories/EmployeeRepository');
      const employeeRepo = new EmployeeRepository();
      const employee = await employeeRepo.findByUserId(userId);
      
      if (!employee) {
        throw new ValidationError('Employee profile not found');
      }

      const status = await this.attendanceService.getTodayStatus(employee.id);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      next(error);
    }
  };

  getAttendanceReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { employeeId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const report = await this.attendanceService.getAttendanceReport(
        employeeId as string | undefined,
        start,
        end
      );

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  };
}
