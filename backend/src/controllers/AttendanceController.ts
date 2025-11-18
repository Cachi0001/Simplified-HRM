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
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;
      const { employeeId, startDate, endDate } = req.query;

      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      // Get current user's employee record
      const { EmployeeRepository } = require('../repositories/EmployeeRepository');
      const employeeRepo = new EmployeeRepository();
      const currentEmployee = await employeeRepo.findByUserId(userId);
      
      if (!currentEmployee) {
        throw new ValidationError('Employee profile not found');
      }

      // ACCESS CONTROL: Only HR, Admin, SuperAdmin, and TeamLead can view attendance reports
      const canViewAllAttendance = ['hr', 'admin', 'superadmin', 'teamlead'].includes(userRole);
      
      if (!canViewAllAttendance) {
        // Regular employees can only see their own attendance
        // Redirect them to use /my-records endpoint instead
        throw new ValidationError('You do not have permission to view attendance reports. Use /my-records to view your own attendance.');
      }

      // TeamLeads can only see their team members' attendance
      let filteredEmployeeId = employeeId as string | undefined;
      
      if (userRole === 'teamlead' && employeeId) {
        // Verify the requested employee is in their team
        const requestedEmployee = await employeeRepo.findById(employeeId as string);
        
        if (requestedEmployee && requestedEmployee.team_lead_id !== currentEmployee.id) {
          throw new ValidationError('You can only view attendance for your team members');
        }
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const report = await this.attendanceService.getAttendanceReport(
        filteredEmployeeId,
        start,
        end
      );

      // Additional filtering for TeamLeads - only return their team members
      let filteredReport = report;
      if (userRole === 'teamlead') {
        // Get all team members
        const allEmployees = await employeeRepo.findAll({});
        const teamMemberIds = allEmployees
          .filter(emp => emp.team_lead_id === currentEmployee.id)
          .map(emp => emp.id);
        
        // Filter report to only include team members
        filteredReport = report.filter((record: any) => 
          teamMemberIds.includes(record._id?.employeeId || record.employee_id)
        );
      }

      res.json({
        success: true,
        data: filteredReport
      });
    } catch (error) {
      next(error);
    }
  };
}
