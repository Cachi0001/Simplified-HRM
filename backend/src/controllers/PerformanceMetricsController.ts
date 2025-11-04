import { Request, Response } from 'express';
import { PerformanceMetricsService } from '../services/PerformanceMetricsService';
// Define AuthenticatedRequest interface locally
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
  employee?: {
    id: string;
    role: string;
  };
}
import logger from '../utils/logger';

export class PerformanceMetricsController {
  private performanceMetricsService = new PerformanceMetricsService();

  /**
   * Get performance metrics for a specific employee
   */
  getEmployeePerformance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate } = req.query;

      // Validate employee access
      if (!this.canAccessEmployeeData(req, employeeId)) {
        res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only view your own performance metrics.'
        });
        return;
      }

      const metrics = await this.performanceMetricsService.getEmployeePerformanceMetrics(
        employeeId,
        startDate as string,
        endDate as string
      );

      res.json({
        status: 'success',
        data: metrics
      });
    } catch (error) {
      logger.error('PerformanceMetricsController: Get employee performance failed', {
        error: (error as Error).message,
        employeeId: req.params.employeeId
      });
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve performance metrics'
      });
    }
  };

  /**
   * Calculate/recalculate performance metrics for a specific employee
   */
  calculateEmployeePerformance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate } = req.body;

      // Only HR/Admin/Superadmin can trigger recalculation
      if (!this.isHROrAdmin(req)) {
        res.status(403).json({
          status: 'error',
          message: 'Access denied. Only HR/Admin can recalculate performance metrics.'
        });
        return;
      }

      const metrics = await this.performanceMetricsService.calculateEmployeePerformance(
        employeeId,
        startDate,
        endDate
      );

      res.json({
        status: 'success',
        data: metrics,
        message: 'Performance metrics calculated successfully'
      });
    } catch (error) {
      logger.error('PerformanceMetricsController: Calculate employee performance failed', {
        error: (error as Error).message,
        employeeId: req.params.employeeId
      });
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to calculate performance metrics'
      });
    }
  };

  /**
   * Get performance summary for dashboard
   */
  getPerformanceSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { departmentId, limit } = req.query;

      // Only HR/Admin/Superadmin can view performance summary
      if (!this.isHROrAdmin(req)) {
        res.status(403).json({
          status: 'error',
          message: 'Access denied. Only HR/Admin can view performance summary.'
        });
        return;
      }

      const summary = await this.performanceMetricsService.getPerformanceSummary(
        departmentId as string,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        status: 'success',
        data: summary
      });
    } catch (error) {
      logger.error('PerformanceMetricsController: Get performance summary failed', {
        error: (error as Error).message
      });
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve performance summary'
      });
    }
  };

  /**
   * Get performance trends for an employee
   */
  getEmployeePerformanceTrends = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const { months } = req.query;

      // Validate employee access
      if (!this.canAccessEmployeeData(req, employeeId)) {
        res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only view your own performance trends.'
        });
        return;
      }

      const trends = await this.performanceMetricsService.getEmployeePerformanceTrends(
        employeeId,
        months ? parseInt(months as string) : undefined
      );

      res.json({
        status: 'success',
        data: trends
      });
    } catch (error) {
      logger.error('PerformanceMetricsController: Get employee performance trends failed', {
        error: (error as Error).message,
        employeeId: req.params.employeeId
      });
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve performance trends'
      });
    }
  };

  /**
   * Get performance weights configuration
   */
  getPerformanceWeights = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const weights = await this.performanceMetricsService.getPerformanceWeights();

      res.json({
        status: 'success',
        data: weights
      });
    } catch (error) {
      logger.error('PerformanceMetricsController: Get performance weights failed', {
        error: (error as Error).message
      });
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve performance weights'
      });
    }
  };

  /**
   * Update performance weight (admin only)
   */
  updatePerformanceWeight = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { weightId } = req.params;
      const { weightValue, description } = req.body;

      // Only Admin/Superadmin can update weights
      if (!this.isAdmin(req)) {
        res.status(403).json({
          status: 'error',
          message: 'Access denied. Only Admin can update performance weights.'
        });
        return;
      }

      // Validate input
      if (typeof weightValue !== 'number' || weightValue < 0 || weightValue > 1) {
        res.status(400).json({
          status: 'error',
          message: 'Weight value must be a number between 0 and 1'
        });
        return;
      }

      const updatedWeight = await this.performanceMetricsService.updatePerformanceWeight(
        weightId,
        weightValue,
        description
      );

      res.json({
        status: 'success',
        data: updatedWeight,
        message: 'Performance weight updated successfully'
      });
    } catch (error) {
      logger.error('PerformanceMetricsController: Update performance weight failed', {
        error: (error as Error).message,
        weightId: req.params.weightId
      });
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to update performance weight'
      });
    }
  };

  /**
   * Recalculate performance for all employees (batch operation)
   */
  recalculateAllPerformance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.body;

      // Only Admin/Superadmin can trigger batch recalculation
      if (!this.isAdmin(req)) {
        res.status(403).json({
          status: 'error',
          message: 'Access denied. Only Admin can trigger batch recalculation.'
        });
        return;
      }

      const result = await this.performanceMetricsService.recalculateAllPerformance(
        startDate,
        endDate
      );

      res.json({
        status: 'success',
        data: result,
        message: `Batch recalculation completed. ${result.success} successful, ${result.failed} failed.`
      });
    } catch (error) {
      logger.error('PerformanceMetricsController: Recalculate all performance failed', {
        error: (error as Error).message
      });
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to recalculate performance metrics'
      });
    }
  };

  /**
   * Get multiple employee performance metrics
   */
  getMultipleEmployeePerformance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { employeeIds, startDate, endDate } = req.body;

      // Only HR/Admin/Superadmin can view multiple employee metrics
      if (!this.isHROrAdmin(req)) {
        res.status(403).json({
          status: 'error',
          message: 'Access denied. Only HR/Admin can view multiple employee metrics.'
        });
        return;
      }

      // Validate input
      if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
        res.status(400).json({
          status: 'error',
          message: 'Employee IDs must be provided as a non-empty array'
        });
        return;
      }

      const metrics = await this.performanceMetricsService.getMultipleEmployeePerformance(
        employeeIds,
        startDate,
        endDate
      );

      res.json({
        status: 'success',
        data: metrics
      });
    } catch (error) {
      logger.error('PerformanceMetricsController: Get multiple employee performance failed', {
        error: (error as Error).message
      });
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve multiple employee performance metrics'
      });
    }
  };

  // Helper methods for role-based access control

  private canAccessEmployeeData(req: AuthenticatedRequest, employeeId: string): boolean {
    // Users can access their own data
    if (req.employee?.id === employeeId) {
      return true;
    }

    // HR/Admin/Superadmin can access all employee data
    return this.isHROrAdmin(req);
  }

  private isHROrAdmin(req: AuthenticatedRequest): boolean {
    const role = req.employee?.role;
    return role === 'hr' || role === 'admin' || role === 'superadmin';
  }

  private isAdmin(req: AuthenticatedRequest): boolean {
    const role = req.employee?.role;
    return role === 'admin' || role === 'superadmin';
  }
}