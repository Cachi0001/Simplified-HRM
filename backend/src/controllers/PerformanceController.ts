import { Request, Response } from 'express';
import { PerformanceService } from '../services/PerformanceService';
import { EmployeeService } from '../services/EmployeeService';
import { SupabaseEmployeeRepository } from '../repositories/implementations/SupabaseEmployeeRepository';
import logger from '../utils/logger';

export class PerformanceController {
  private performanceService: PerformanceService;
  private employeeService: EmployeeService;

  constructor() {
    this.performanceService = new PerformanceService();
    const employeeRepository = new SupabaseEmployeeRepository();
    this.employeeService = new EmployeeService(employeeRepository);
  }

  /**
   * Get performance metrics for current user
   * GET /api/performance/my-metrics
   */
  async getMyPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { start_date, end_date } = req.query;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      // Get employee ID from user ID
      const employee = await this.employeeService.getMyProfile(userId);
      if (!employee) {
        res.status(404).json({
          status: 'error',
          message: 'Employee profile not found'
        });
        return;
      }

      const metrics = await this.performanceService.getEmployeePerformanceMetrics(
        employee.id,
        start_date as string,
        end_date as string
      );

      res.status(200).json({
        status: 'success',
        data: metrics
      });
    } catch (error) {
      logger.error('PerformanceController: Get my performance metrics error', {
        error: (error as Error).message,
        userId: req.user?.id
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get performance summary for current user
   * GET /api/performance/my-summary
   */
  async getMyPerformanceSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      // Get employee ID from user ID
      const employee = await this.employeeService.getMyProfile(userId);
      if (!employee) {
        res.status(404).json({
          status: 'error',
          message: 'Employee profile not found'
        });
        return;
      }

      const summary = await this.performanceService.getPerformanceSummary(employee.id);

      res.status(200).json({
        status: 'success',
        data: summary
      });
    } catch (error) {
      logger.error('PerformanceController: Get my performance summary error', {
        error: (error as Error).message,
        userId: req.user?.id
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get performance history for current user
   * GET /api/performance/my-history
   */
  async getMyPerformanceHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { months } = req.query;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      // Get employee ID from user ID
      const employee = await this.employeeService.getMyProfile(userId);
      if (!employee) {
        res.status(404).json({
          status: 'error',
          message: 'Employee profile not found'
        });
        return;
      }

      const history = await this.performanceService.getPerformanceHistory(
        employee.id,
        months ? parseInt(months as string) : 6
      );

      res.status(200).json({
        status: 'success',
        data: history
      });
    } catch (error) {
      logger.error('PerformanceController: Get my performance history error', {
        error: (error as Error).message,
        userId: req.user?.id
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Recalculate performance metrics for current user
   * POST /api/performance/recalculate
   */
  async recalculateMyPerformance(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { start_date, end_date } = req.body;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      // Get employee ID from user ID
      const employee = await this.employeeService.getMyProfile(userId);
      if (!employee) {
        res.status(404).json({
          status: 'error',
          message: 'Employee profile not found'
        });
        return;
      }

      const metrics = await this.performanceService.calculateEmployeePerformance(
        employee.id,
        start_date,
        end_date
      );

      res.status(200).json({
        status: 'success',
        message: 'Performance metrics recalculated successfully',
        data: metrics
      });
    } catch (error) {
      logger.error('PerformanceController: Recalculate my performance error', {
        error: (error as Error).message,
        userId: req.user?.id
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get performance metrics for a specific employee (HR/Admin only)
   * GET /api/performance/employee/:employeeId
   */
  async getEmployeePerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const { start_date, end_date } = req.query;
      const userRole = req.user?.role;

      // Check permissions
      if (!['hr', 'admin', 'superadmin', 'teamlead'].includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions'
        });
        return;
      }

      const metrics = await this.performanceService.getEmployeePerformanceMetrics(
        employeeId,
        start_date as string,
        end_date as string
      );

      res.status(200).json({
        status: 'success',
        data: metrics
      });
    } catch (error) {
      logger.error('PerformanceController: Get employee performance metrics error', {
        error: (error as Error).message,
        employeeId: req.params.employeeId
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get team performance metrics (for managers/HR)
   * GET /api/performance/team
   */
  async getTeamPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { employee_ids, start_date, end_date } = req.query;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      // Check permissions
      if (!['hr', 'admin', 'superadmin', 'teamlead'].includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions'
        });
        return;
      }

      let employeeIds: string[] = [];

      if (employee_ids) {
        // Use provided employee IDs
        employeeIds = Array.isArray(employee_ids) ? employee_ids as string[] : [employee_ids as string];
      } else if (userRole === 'teamlead') {
        // For team leads, get their team members
        const teamMembers = await this.employeeService.getTeamMembers(userId!);
        employeeIds = teamMembers.map(member => member.id);
      } else {
        // For HR/Admin, get all employees
        const allEmployees = await this.employeeService.getAllEmployees({}, userRole);
        employeeIds = allEmployees.employees.map(emp => emp.id);
      }

      const metrics = await this.performanceService.getTeamPerformanceMetrics(
        employeeIds,
        start_date as string,
        end_date as string
      );

      res.status(200).json({
        status: 'success',
        data: metrics
      });
    } catch (error) {
      logger.error('PerformanceController: Get team performance metrics error', {
        error: (error as Error).message,
        userRole: req.user?.role
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get performance weights configuration
   * GET /api/performance/weights
   */
  async getPerformanceWeights(req: Request, res: Response): Promise<void> {
    try {
      const weights = await this.performanceService.getPerformanceWeights();

      res.status(200).json({
        status: 'success',
        data: weights
      });
    } catch (error) {
      logger.error('PerformanceController: Get performance weights error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Update performance weights configuration (Admin only)
   * PUT /api/performance/weights
   */
  async updatePerformanceWeights(req: Request, res: Response): Promise<void> {
    try {
      const { weights } = req.body;
      const userRole = req.user?.role;

      // Check permissions
      if (!['admin', 'superadmin'].includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'Only administrators can update performance weights'
        });
        return;
      }

      const updatedWeights = await this.performanceService.updatePerformanceWeights(weights);

      res.status(200).json({
        status: 'success',
        message: 'Performance weights updated successfully',
        data: updatedWeights
      });
    } catch (error) {
      logger.error('PerformanceController: Update performance weights error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }
}