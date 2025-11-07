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

      if (!lat || !lng) {
        throw new ValidationError('Location coordinates are required');
      }

      const employeeId = userId;

      const result = await this.attendanceService.clockIn({
        employee_id: employeeId,
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

      if (!lat || !lng) {
        throw new ValidationError('Location coordinates are required');
      }

      const employeeId = userId;

      const result = await this.attendanceService.clockOut({
        employee_id: employeeId,
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

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const records = await this.attendanceService.getMyRecords(userId, start, end);

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

      const status = await this.attendanceService.getTodayStatus(userId);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      next(error);
    }
  };
}
