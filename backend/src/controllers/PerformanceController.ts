import { Request, Response, NextFunction } from 'express';
import { PerformanceService } from '../services/PerformanceService';

export class PerformanceController {
  private performanceService: PerformanceService;

  constructor() {
    this.performanceService = new PerformanceService();
  }

  getMyPerformance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employeeId = (req as any).employee?.id;
      
      if (!employeeId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const metrics = await this.performanceService.getEmployeePerformance(
        employeeId,
        start,
        end
      );

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  };

  getEmployeePerformance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const metrics = await this.performanceService.getEmployeePerformance(
        employeeId,
        start,
        end
      );

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  };

  getAllPerformance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const metrics = await this.performanceService.getAllEmployeesPerformance(
        start,
        end
      );

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  };

  getHistoricalMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;

      const metrics = await this.performanceService.getHistoricalMetrics(
        employeeId,
        limit
      );

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  };
}
