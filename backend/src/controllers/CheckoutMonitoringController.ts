import { Request, Response } from 'express';
import CheckoutMonitoringService from '../services/CheckoutMonitoringService';
import logger from '../utils/logger';

export class CheckoutMonitoringController {
    private checkoutMonitoringService: typeof CheckoutMonitoringService;

    constructor() {
        this.checkoutMonitoringService = CheckoutMonitoringService;
    }

    /**
     * Get checkout monitoring statistics
     * GET /api/checkout-monitoring/statistics
     */
    async getCheckoutStatistics(req: Request, res: Response): Promise<void> {
        try {
            const { startDate, endDate } = req.query;

            logger.info('📊 [CheckoutMonitoringController] Get checkout statistics', {
                startDate,
                endDate
            });

            const start = startDate ? new Date(startDate as string) : undefined;
            const end = endDate ? new Date(endDate as string) : undefined;

            const statistics = await this.checkoutMonitoringService.getCheckoutStatistics(start, end);

            res.status(200).json({
                status: 'success',
                data: { statistics }
            });
        } catch (error) {
            logger.error('❌ [CheckoutMonitoringController] Get statistics error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Trigger manual checkout monitoring
     * POST /api/checkout-monitoring/trigger
     */
    async triggerManualMonitoring(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            // Only allow HR and admin users to trigger manual monitoring
            if (!['hr', 'admin', 'manager'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to trigger monitoring'
                });
                return;
            }

            logger.info('🔄 [CheckoutMonitoringController] Manual monitoring triggered', {
                triggeredBy: userId,
                userRole
            });

            // Trigger monitoring in background
            this.checkoutMonitoringService.triggerManualMonitoring()
                .catch(error => {
                    logger.error('❌ [CheckoutMonitoringController] Manual monitoring failed', {
                        error: error.message
                    });
                });

            res.status(200).json({
                status: 'success',
                message: 'Checkout monitoring triggered successfully'
            });
        } catch (error) {
            logger.error('❌ [CheckoutMonitoringController] Trigger monitoring error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get job status
     * GET /api/checkout-monitoring/status
     */
    async getJobStatus(req: Request, res: Response): Promise<void> {
        try {
            logger.info('📋 [CheckoutMonitoringController] Get job status');

            const status = this.checkoutMonitoringService.getJobStatus();

            res.status(200).json({
                status: 'success',
                data: { jobStatus: status }
            });
        } catch (error) {
            logger.error('❌ [CheckoutMonitoringController] Get job status error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get daily checkout summary
     * GET /api/checkout-monitoring/daily-summary
     */
    async getDailySummary(req: Request, res: Response): Promise<void> {
        try {
            const { date } = req.query;
            const targetDate = date ? new Date(date as string) : new Date();
            const dateStr = targetDate.toISOString().split('T')[0];

            logger.info('📅 [CheckoutMonitoringController] Get daily summary', { date: dateStr });

            // Get summary from database
            const { data: summary, error } = await this.checkoutMonitoringService['supabase']
                .from('daily_checkout_summaries')
                .select('*')
                .eq('date', dateStr)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (!summary) {
                res.status(404).json({
                    status: 'error',
                    message: 'No summary found for the specified date'
                });
                return;
            }

            res.status(200).json({
                status: 'success',
                data: { summary }
            });
        } catch (error) {
            logger.error('❌ [CheckoutMonitoringController] Get daily summary error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get checkout monitoring logs
     * GET /api/checkout-monitoring/logs
     */
    async getMonitoringLogs(req: Request, res: Response): Promise<void> {
        try {
            const { date, employeeId, status, limit = 50, offset = 0 } = req.query;

            logger.info('📝 [CheckoutMonitoringController] Get monitoring logs', {
                date,
                employeeId,
                status,
                limit,
                offset
            });

            let query = this.checkoutMonitoringService['supabase']
                .from('checkout_monitoring_logs')
                .select(`
                    *,
                    employee:employees(id, full_name, department:departments(name))
                `)
                .order('created_at', { ascending: false })
                .range(Number(offset), Number(offset) + Number(limit) - 1);

            if (date) {
                query = query.eq('date', date);
            }

            if (employeeId) {
                query = query.eq('employee_id', employeeId);
            }

            if (status) {
                query = query.eq('status', status);
            }

            const { data: logs, error, count } = await query;

            if (error) {
                throw error;
            }

            res.status(200).json({
                status: 'success',
                data: {
                    logs,
                    pagination: {
                        total: count || 0,
                        limit: Number(limit),
                        offset: Number(offset)
                    }
                }
            });
        } catch (error) {
            logger.error('❌ [CheckoutMonitoringController] Get monitoring logs error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Update checkout monitoring settings
     * PUT /api/checkout-monitoring/settings
     */
    async updateMonitoringSettings(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;
            const { settings } = req.body;

            // Only allow HR and admin users to update settings
            if (!['hr', 'admin'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to update monitoring settings'
                });
                return;
            }

            logger.info('⚙️ [CheckoutMonitoringController] Update monitoring settings', {
                updatedBy: userId,
                settings
            });

            // Store settings in database
            const { error } = await this.checkoutMonitoringService['supabase']
                .from('checkout_monitoring_settings')
                .upsert({
                    id: 'default',
                    settings,
                    updated_by: userId,
                    updated_at: new Date().toISOString()
                });

            if (error) {
                throw error;
            }

            res.status(200).json({
                status: 'success',
                message: 'Monitoring settings updated successfully',
                data: { settings }
            });
        } catch (error) {
            logger.error('❌ [CheckoutMonitoringController] Update settings error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get checkout monitoring settings
     * GET /api/checkout-monitoring/settings
     */
    async getMonitoringSettings(req: Request, res: Response): Promise<void> {
        try {
            logger.info('⚙️ [CheckoutMonitoringController] Get monitoring settings');

            const { data: settings, error } = await this.checkoutMonitoringService['supabase']
                .from('checkout_monitoring_settings')
                .select('*')
                .eq('id', 'default')
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            const defaultSettings = {
                expectedCheckoutTime: '18:00',
                reminderTime: '17:45',
                monitoringTime: '18:30',
                notifyManagers: true,
                notifyHR: true,
                notifyEmployee: true,
                workDays: [1, 2, 3, 4, 5], // Monday to Friday
                timezone: 'UTC'
            };

            res.status(200).json({
                status: 'success',
                data: { 
                    settings: settings?.settings || defaultSettings 
                }
            });
        } catch (error) {
            logger.error('❌ [CheckoutMonitoringController] Get settings error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }
}

export default new CheckoutMonitoringController();