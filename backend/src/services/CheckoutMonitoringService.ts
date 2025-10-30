import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import NotificationService from './NotificationService';
import cron from 'node-cron';

export interface CheckoutRecord {
    employeeId: string;
    employeeName: string;
    department: string;
    lastCheckout?: Date;
    expectedCheckoutTime: string;
    status: 'checked_out' | 'missed_checkout' | 'late_checkout';
}

export interface CheckoutNotification {
    employeeId: string;
    managerId?: string;
    hrId?: string;
    type: 'missed_checkout' | 'late_checkout' | 'reminder';
    message: string;
    timestamp: Date;
}

export class CheckoutMonitoringService {
    private supabase: SupabaseClient;
    private notificationService: typeof NotificationService;
    private isJobRunning: boolean = false;

    constructor() {
        this.supabase = supabase.getClient();
        this.notificationService = NotificationService;
        this.initializeCronJobs();
    }

    /**
     * Initialize CRON jobs
     */
    private initializeCronJobs(): void {
        // Daily checkout monitoring at 6:30 PM (30 minutes after expected checkout)
        cron.schedule('30 18 * * 1-5', async () => {
            await this.runDailyCheckoutMonitoring();
        }, {
            timezone: 'UTC'
        });

        // Reminder notifications at 5:45 PM (15 minutes before checkout)
        cron.schedule('45 17 * * 1-5', async () => {
            await this.sendCheckoutReminders();
        }, {
            timezone: 'UTC'
        });

        logger.info('CheckoutMonitoringService: CRON jobs initialized');
    }

    /**
     * Run daily checkout monitoring
     */
    async runDailyCheckoutMonitoring(): Promise<void> {
        if (this.isJobRunning) {
            logger.warn('CheckoutMonitoringService: Job already running, skipping');
            return;
        }

        this.isJobRunning = true;

        try {
            logger.info('CheckoutMonitoringService: Starting daily checkout monitoring');

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // Get all active employees
            const { data: employees, error: employeesError } = await this.supabase
                .from('employees')
                .select(`
                    id,
                    full_name,
                    department:departments(name),
                    manager_id
                `)
                .eq('status', 'active');

            if (employeesError) {
                throw employeesError;
            }

            const checkoutRecords: CheckoutRecord[] = [];
            const notifications: CheckoutNotification[] = [];

            for (const employee of employees || []) {
                // Check if employee has checked out today
                const { data: attendance, error: attendanceError } = await this.supabase
                    .from('attendance_records')
                    .select('checkout_time')
                    .eq('employee_id', employee.id)
                    .eq('date', todayStr)
                    .single();

                if (attendanceError && attendanceError.code !== 'PGRST116') {
                    logger.error('CheckoutMonitoringService: Error fetching attendance', {
                        error: attendanceError.message,
                        employeeId: employee.id
                    });
                    continue;
                }

                const expectedCheckoutTime = '18:00'; // 6 PM
                const hasCheckedOut = attendance?.checkout_time !== null;

                let status: 'checked_out' | 'missed_checkout' | 'late_checkout' = 'missed_checkout';

                if (hasCheckedOut) {
                    const checkoutTime = new Date(`${todayStr}T${attendance?.checkout_time}`);
                    const expectedTime = new Date(`${todayStr}T${expectedCheckoutTime}`);

                    if (checkoutTime <= expectedTime) {
                        status = 'checked_out';
                    } else {
                        status = 'late_checkout';
                    }
                }

                const record: CheckoutRecord = {
                    employeeId: employee.id,
                    employeeName: employee.full_name,
                    department: Array.isArray(employee.department) ? (employee.department[0] as any)?.name || 'Unknown' : (employee.department as any)?.name || 'Unknown',
                    lastCheckout: hasCheckedOut && attendance?.checkout_time ? new Date(`${todayStr}T${attendance.checkout_time}`) : undefined,
                    expectedCheckoutTime,
                    status
                };

                checkoutRecords.push(record);

                // Create notifications for missed or late checkouts
                if (status === 'missed_checkout' || status === 'late_checkout') {
                    await this.createCheckoutNotifications(employee, status);
                }
            }

            // Store monitoring results
            await this.storeMonitoringResults(checkoutRecords);

            // Generate summary report
            await this.generateDailySummaryReport(checkoutRecords);

            logger.info('CheckoutMonitoringService: Daily monitoring completed', {
                totalEmployees: employees?.length || 0,
                missedCheckouts: checkoutRecords.filter(r => r.status === 'missed_checkout').length,
                lateCheckouts: checkoutRecords.filter(r => r.status === 'late_checkout').length
            });

        } catch (error) {
            logger.error('CheckoutMonitoringService: Daily monitoring failed', {
                error: (error as Error).message
            });

            // Send error notification to system administrators
            await this.notifySystemError(error as Error);
        } finally {
            this.isJobRunning = false;
        }
    }

    /**
     * Send checkout reminders
     */
    async sendCheckoutReminders(): Promise<void> {
        try {
            logger.info('CheckoutMonitoringService: Sending checkout reminders');

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // Get employees who haven't checked out yet
            const { data: employees, error } = await this.supabase
                .from('employees')
                .select(`
                    id,
                    full_name,
                    email
                `)
                .eq('status', 'active');

            if (error) {
                throw error;
            }

            for (const employee of employees || []) {
                // Check if employee has checked out today
                const { data: attendance } = await this.supabase
                    .from('attendance_records')
                    .select('checkout_time')
                    .eq('employee_id', employee.id)
                    .eq('date', todayStr)
                    .single();

                // Send reminder if not checked out
                if (!attendance?.checkout_time) {
                    await this.notificationService.createNotification({
                        userId: employee.id,
                        title: 'Checkout Reminder',
                        message: 'Don\'t forget to check out at the end of your workday (6:00 PM)',
                        type: 'checkout_reminder',
                        priority: 'medium'
                    });
                }
            }

            logger.info('CheckoutMonitoringService: Checkout reminders sent');
        } catch (error) {
            logger.error('CheckoutMonitoringService: Failed to send reminders', {
                error: (error as Error).message
            });
        }
    }

    /**
     * Create checkout notifications
     */
    private async createCheckoutNotifications(employee: any, status: 'missed_checkout' | 'late_checkout'): Promise<void> {
        try {
            const message = status === 'missed_checkout'
                ? `${employee.full_name} has missed their checkout time today`
                : `${employee.full_name} checked out late today`;

            // Notify the employee
            await this.notificationService.createNotification({
                userId: employee.id,
                title: status === 'missed_checkout' ? 'Missed Checkout' : 'Late Checkout',
                message: status === 'missed_checkout'
                    ? 'You missed your checkout time today. Please ensure to check out on time.'
                    : 'You checked out late today. Please try to check out on time.',
                type: status,
                priority: 'high'
            });

            // Notify manager if exists
            if (employee.manager_id) {
                await this.notificationService.createNotification({
                    userId: employee.manager_id,
                    title: `Employee ${status === 'missed_checkout' ? 'Missed' : 'Late'} Checkout`,
                    message,
                    type: status,
                    priority: 'medium',
                    relatedId: employee.id
                });
            }

            // Notify HR department
            const { data: hrUsers } = await this.supabase
                .from('employees')
                .select('id')
                .eq('role', 'hr')
                .eq('status', 'active');

            for (const hrUser of hrUsers || []) {
                await this.notificationService.createNotification({
                    userId: hrUser.id,
                    title: `Employee ${status === 'missed_checkout' ? 'Missed' : 'Late'} Checkout`,
                    message: `${message} - Department: ${employee.department?.name || 'Unknown'}`,
                    type: status,
                    priority: 'medium',
                    relatedId: employee.id
                });
            }

        } catch (error) {
            logger.error('CheckoutMonitoringService: Failed to create notifications', {
                error: (error as Error).message,
                employeeId: employee.id
            });
        }
    }

    /**
     * Store monitoring results
     */
    private async storeMonitoringResults(records: CheckoutRecord[]): Promise<void> {
        try {
            const monitoringData = records.map(record => ({
                employee_id: record.employeeId,
                date: new Date().toISOString().split('T')[0],
                expected_checkout_time: record.expectedCheckoutTime,
                actual_checkout_time: record.lastCheckout?.toTimeString().split(' ')[0],
                status: record.status,
                created_at: new Date().toISOString()
            }));

            const { error } = await this.supabase
                .from('checkout_monitoring_logs')
                .insert(monitoringData);

            if (error) {
                throw error;
            }

            logger.info('CheckoutMonitoringService: Monitoring results stored', {
                recordCount: records.length
            });
        } catch (error) {
            logger.error('CheckoutMonitoringService: Failed to store results', {
                error: (error as Error).message
            });
        }
    }

    /**
     * Generate daily summary report
     */
    private async generateDailySummaryReport(records: CheckoutRecord[]): Promise<void> {
        try {
            const summary = {
                date: new Date().toISOString().split('T')[0],
                totalEmployees: records.length,
                checkedOut: records.filter(r => r.status === 'checked_out').length,
                missedCheckouts: records.filter(r => r.status === 'missed_checkout').length,
                lateCheckouts: records.filter(r => r.status === 'late_checkout').length,
                complianceRate: Math.round((records.filter(r => r.status === 'checked_out').length / records.length) * 100)
            };

            // Store summary in database
            const { error } = await this.supabase
                .from('daily_checkout_summaries')
                .insert({
                    date: summary.date,
                    total_employees: summary.totalEmployees,
                    checked_out_count: summary.checkedOut,
                    missed_checkout_count: summary.missedCheckouts,
                    late_checkout_count: summary.lateCheckouts,
                    compliance_rate: summary.complianceRate,
                    created_at: new Date().toISOString()
                });

            if (error) {
                throw error;
            }

            // Send summary to managers and HR
            await this.sendSummaryNotifications(summary);

            logger.info('CheckoutMonitoringService: Daily summary generated', summary);
        } catch (error) {
            logger.error('CheckoutMonitoringService: Failed to generate summary', {
                error: (error as Error).message
            });
        }
    }

    /**
     * Send summary notifications
     */
    private async sendSummaryNotifications(summary: any): Promise<void> {
        try {
            const message = `Daily Checkout Summary: ${summary.checkedOut}/${summary.totalEmployees} employees checked out on time (${summary.complianceRate}% compliance)`;

            // Notify HR and managers
            const { data: recipients } = await this.supabase
                .from('employees')
                .select('id')
                .in('role', ['hr', 'manager'])
                .eq('status', 'active');

            for (const recipient of recipients || []) {
                await this.notificationService.createNotification({
                    userId: recipient.id,
                    title: 'Daily Checkout Summary',
                    message,
                    type: 'daily_summary',
                    priority: 'low'
                });
            }
        } catch (error) {
            logger.error('CheckoutMonitoringService: Failed to send summary notifications', {
                error: (error as Error).message
            });
        }
    }

    /**
     * Notify system error
     */
    private async notifySystemError(error: Error): Promise<void> {
        try {
            // Notify system administrators
            const { data: admins } = await this.supabase
                .from('employees')
                .select('id')
                .eq('role', 'admin')
                .eq('status', 'active');

            for (const admin of admins || []) {
                await this.notificationService.createNotification({
                    userId: admin.id,
                    title: 'Checkout Monitoring Error',
                    message: `Checkout monitoring job failed: ${error.message}`,
                    type: 'system_error',
                    priority: 'high'
                });
            }
        } catch (notificationError) {
            logger.error('CheckoutMonitoringService: Failed to send error notifications', {
                error: (notificationError as Error).message
            });
        }
    }

    /**
     * Get checkout monitoring statistics
     */
    async getCheckoutStatistics(startDate?: Date, endDate?: Date): Promise<any> {
        try {
            const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
            const end = endDate || new Date();

            const { data: summaries, error } = await this.supabase
                .from('daily_checkout_summaries')
                .select('*')
                .gte('date', start.toISOString().split('T')[0])
                .lte('date', end.toISOString().split('T')[0])
                .order('date', { ascending: false });

            if (error) {
                throw error;
            }

            const stats = {
                totalDays: summaries?.length || 0,
                averageComplianceRate: summaries?.reduce((sum, s) => sum + s.compliance_rate, 0) / (summaries?.length || 1),
                totalMissedCheckouts: summaries?.reduce((sum, s) => sum + s.missed_checkout_count, 0) || 0,
                totalLateCheckouts: summaries?.reduce((sum, s) => sum + s.late_checkout_count, 0) || 0,
                dailySummaries: summaries
            };

            return stats;
        } catch (error) {
            logger.error('CheckoutMonitoringService: Failed to get statistics', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Manual trigger for checkout monitoring (for testing)
     */
    async triggerManualMonitoring(): Promise<void> {
        logger.info('CheckoutMonitoringService: Manual monitoring triggered');
        await this.runDailyCheckoutMonitoring();
    }

    /**
     * Get job status
     */
    getJobStatus(): { isRunning: boolean; lastRun?: Date } {
        return {
            isRunning: this.isJobRunning,
            lastRun: new Date() // In a real implementation, you'd track this
        };
    }
}

export default new CheckoutMonitoringService();