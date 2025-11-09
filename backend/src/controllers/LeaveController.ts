import { Request, Response, NextFunction } from 'express';
import { LeaveService } from '../services/LeaveService';
import { ValidationError } from '../middleware/errorHandler';

export class LeaveController {
  private leaveService: LeaveService;

  constructor() {
    this.leaveService = new LeaveService();
  }

  createLeaveRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const { leaveType, startDate, endDate, reason, notes } = req.body;

      if (!leaveType || !startDate || !endDate || !reason) {
        throw new ValidationError('Leave type, start date, end date, and reason are required');
      }

      const result = await this.leaveService.createLeaveRequest(userId, {
        leaveType,
        startDate,
        endDate,
        reason,
        notes
      });

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          leave_request_id: result.leave_request_id,
          days_requested: result.days_requested
        }
      });
    } catch (error) {
      next(error);
    }
  };

  getAvailableLeaveTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const leaveTypes = await this.leaveService.getAvailableLeaveTypes(userId);

      res.json({
        success: true,
        data: leaveTypes
      });
    } catch (error) {
      next(error);
    }
  };

  getMyLeaveRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const { status } = req.query;
      const leaveRequests = await this.leaveService.getMyLeaveRequests(userId, status as string);

      res.json({
        success: true,
        data: leaveRequests
      });
    } catch (error) {
      next(error);
    }
  };

  getAllLeaveRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.query;
      const leaveRequests = await this.leaveService.getAllLeaveRequests(status as string);

      res.json({
        success: true,
        data: leaveRequests
      });
    } catch (error) {
      next(error);
    }
  };

  getLeaveRequestById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leaveRequest = await this.leaveService.getLeaveRequestById(req.params.id);

      res.json({
        success: true,
        data: leaveRequest
      });
    } catch (error) {
      next(error);
    }
  };

  getMyLeaveBalances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const { year } = req.query;
      const balances = await this.leaveService.getMyLeaveBalances(
        userId,
        year ? parseInt(year as string) : undefined
      );

      res.json({
        success: true,
        data: balances
      });
    } catch (error) {
      next(error);
    }
  };

  getLeaveBalances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const { year } = req.query;

      const balances = await this.leaveService.getLeaveBalances(
        employeeId,
        year ? parseInt(year as string) : undefined
      );

      res.json({
        success: true,
        data: balances
      });
    } catch (error) {
      next(error);
    }
  };

  approveLeaveRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const { comments } = req.body;
      const result = await this.leaveService.approveLeaveRequest(req.params.id, userId, comments);

      res.json({
        success: true,
        message: result.message,
        data: result.leaveRequest
      });
    } catch (error) {
      next(error);
    }
  };

  rejectLeaveRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const { reason } = req.body;
      if (!reason) {
        throw new ValidationError('Rejection reason is required');
      }

      const result = await this.leaveService.rejectLeaveRequest(req.params.id, userId, reason);

      res.json({
        success: true,
        message: result.message,
        data: result.leaveRequest
      });
    } catch (error) {
      next(error);
    }
  };

  cancelLeaveRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const result = await this.leaveService.cancelLeaveRequest(req.params.id, userId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };

  getMyLeaveStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const { year } = req.query;
      const stats = await this.leaveService.getMyLeaveStatistics(
        userId,
        year ? parseInt(year as string) : undefined
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  };

  getLeaveTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leaveTypes = await this.leaveService.getLeaveTypes();

      res.json({
        success: true,
        data: leaveTypes
      });
    } catch (error) {
      next(error);
    }
  };

  deleteLeaveRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const result = await this.leaveService.deleteLeaveRequest(req.params.id, userId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };
}
