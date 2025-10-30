import { Request, Response } from 'express';
import { PerformanceAnalyticsService } from '../services/PerformanceAnalyticsService';
import logger from '../utils/logger';

export class PerformanceAnalyticsController {
    constructor(private performanceService: PerformanceAnalyticsService) {}

    /**
     * Get employee performance report
     * GET /api/performance/employee/:id/report
     */
    async getEmployeePerformanceReport(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { period_days } = req.query;
            const userRole = req.user?.role;
            const currentUserId = req.user?.employeeId || req.user?.id;

            if (!id) {
                res.status(400).json({
                    status: 'error',
                    message: 'Employee ID is required'
                });
                return;
            }

            // Check permissions - users can only view their own report unless they're admin/hr
            if (id !== currentUserId && !['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to view this performance report'
                });
                return;
            }

            logger.info('📊 [PerformanceAnalyticsController] Get employee performance report', {
                employeeId: id,
                periodDays: period_days || 30,
                requestedBy: currentUserId
            });

            const periodDays = period_days ? parseInt(period_days as string) : 30;
            const report = await this.performanceService.generateEmployeePerformanceReport(id, periodDays);

            res.status(200).json({
                status: 'success',
                data: { report }
            });
        } catch (error) {
            logger.error('❌ [PerformanceAnalyticsController] Get employee performance report error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get employee performance metrics
     * GET /api/performance/employee/:id/metrics
     */
    async getEmployeePerformanceMetrics(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { metric_type, limit } = req.query;
            const userRole = req.user?.role;
            const currentUserId = req.user?.employeeId || req.user?.id;

            if (!id) {
                res.status(400).json({
                    status: 'error',
                    message: 'Employee ID is required'
                });
                return;
            }

            // Check permissions
            if (id !== currentUserId && !['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to view these performance metrics'
                });
                return;
            }

            const limitNum = limit ? parseInt(limit as string) : 30;
            const metricType = metric_type as 'task_completion' | 'attendance' | 'overall' | undefined;

            const metrics = await this.performanceService.getEmployeePerformanceMetrics(
                id, 
                metricType, 
                limitNum
            );

            res.status(200).json({
                status: 'success',
                data: { metrics, count: metrics.length }
            });
        } catch (error) {
            logger.error('❌ [PerformanceAnalyticsController] Get employee performance metrics error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Calculate and update employee performance scores
     * POST /api/performance/employee/:id/calculate
     */
    async calculateEmployeePerformance(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { period_days } = req.body;
            const userRole = req.user?.role;

            if (!id) {
                res.status(400).json({
                    status: 'error',
                    message: 'Employee ID is required'
                });
                return;
            }

            // Only admins and HR can trigger performance calculations
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to calculate performance'
                });
                return;
            }

            logger.info('🔄 [PerformanceAnalyticsController] Calculate employee performance', {
                employeeId: id,
                periodDays: period_days || 30,
                triggeredBy: req.user?.id
            });

            const periodDays = period_days || 30;

            // Calculate all scores
            const taskScore = await this.performanceService.calculateTaskCompletionScore(id, periodDays);
            const attendanceScore = await this.performanceService.calculateAttendanceScore(id, periodDays);
            const overallScore = await this.performanceService.calculateOverallScore(id, periodDays);

            // Store metrics
            await this.performanceService.storePerformanceMetric(id, 'task_completion', taskScore);
            await this.performanceService.storePerformanceMetric(id, 'attendance', attendanceScore);
            await this.performanceService.storePerformanceMetric(id, 'overall', overallScore);

            // Update employee record
            await this.performanceService.updateEmployeePerformanceScore(id, overallScore);

            res.status(200).json({
                status: 'success',
                message: 'Performance scores calculated and updated successfully',
                data: {
                    task_completion_score: taskScore,
                    attendance_score: attendanceScore,
                    overall_score: overallScore
                }
            });
        } catch (error) {
            logger.error('❌ [PerformanceAnalyticsController] Calculate employee performance error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get top performers
     * GET /api/performance/top-performers
     */
    async getTopPerformers(req: Request, res: Response): Promise<void> {
        try {
            const { limit, period_days } = req.query;
            const userRole = req.user?.role;

            // Only admins and HR can view top performers
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to view top performers'
                });
                return;
            }

            logger.info('🏆 [PerformanceAnalyticsController] Get top performers', {
                limit: limit || 10,
                periodDays: period_days || 30
            });

            const limitNum = limit ? parseInt(limit as string) : 10;
            const periodDays = period_days ? parseInt(period_days as string) : 30;

            const topPerformers = await this.performanceService.getTopPerformers(limitNum, periodDays);

            res.status(200).json({
                status: 'success',
                data: { topPerformers, count: topPerformers.length }
            });
        } catch (error) {
            logger.error('❌ [PerformanceAnalyticsController] Get top performers error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get department performance summary
     * GET /api/performance/department/:id/summary
     */
    async getDepartmentPerformanceSummary(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userRole = req.user?.role;

            if (!id) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID is required'
                });
                return;
            }

            // Only admins and HR can view department performance
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to view department performance'
                });
                return;
            }

            logger.info('🏢 [PerformanceAnalyticsController] Get department performance summary', {
                departmentId: id
            });

            const summary = await this.performanceService.getDepartmentPerformanceSummary(id);

            res.status(200).json({
                status: 'success',
                data: { summary }
            });
        } catch (error) {
            logger.error('❌ [PerformanceAnalyticsController] Get department performance summary error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Run performance calculation for all employees
     * POST /api/performance/calculate-all
     */
    async calculateAllEmployeesPerformance(req: Request, res: Response): Promise<void> {
        try {
            const userRole = req.user?.role;

            // Only super-admin and admin can trigger bulk calculations
            if (!['super-admin', 'admin'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to run bulk performance calculations'
                });
                return;
            }

            logger.info('🔄 [PerformanceAnalyticsController] Calculate all employees performance', {
                triggeredBy: req.user?.id
            });

            // Run the calculation asynchronously
            this.performanceService.runDailyPerformanceCalculation()
                .catch(error => {
                    logger.error('Background performance calculation failed', { 
                        error: error.message 
                    });
                });

            res.status(202).json({
                status: 'success',
                message: 'Performance calculation started for all employees. This may take a few minutes to complete.'
            });
        } catch (error) {
            logger.error('❌ [PerformanceAnalyticsController] Calculate all employees performance error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get my performance report (for current user)
     * GET /api/performance/my-report
     */
    async getMyPerformanceReport(req: Request, res: Response): Promise<void> {
        try {
            const { period_days } = req.query;
            const currentUserId = req.user?.employeeId || req.user?.id;

            if (!currentUserId) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID is required'
                });
                return;
            }

            logger.info('📊 [PerformanceAnalyticsController] Get my performance report', {
                userId: currentUserId,
                periodDays: period_days || 30
            });

            const periodDays = period_days ? parseInt(period_days as string) : 30;
            const report = await this.performanceService.generateEmployeePerformanceReport(
                currentUserId, 
                periodDays
            );

            res.status(200).json({
                status: 'success',
                data: { report }
            });
        } catch (error) {
            logger.error('❌ [PerformanceAnalyticsController] Get my performance report error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get my performance metrics (for current user)
     * GET /api/performance/my-metrics
     */
    async getMyPerformanceMetrics(req: Request, res: Response): Promise<void> {
        try {
            const { metric_type, limit } = req.query;
            const currentUserId = req.user?.employeeId || req.user?.id;

            if (!currentUserId) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID is required'
                });
                return;
            }

            const limitNum = limit ? parseInt(limit as string) : 30;
            const metricType = metric_type as 'task_completion' | 'attendance' | 'overall' | undefined;

            const metrics = await this.performanceService.getEmployeePerformanceMetrics(
                currentUserId, 
                metricType, 
                limitNum
            );

            res.status(200).json({
                status: 'success',
                data: { metrics, count: metrics.length }
            });
        } catch (error) {
            logger.error('❌ [PerformanceAnalyticsController] Get my performance metrics error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }
}