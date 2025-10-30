import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import { NotificationService } from './NotificationService';
import { EmailService } from './EmailService';

export interface CheckoutReminderResult {
    totalEmployees: number;
    employeesNeedingReminder: number;
    notificationsSent: number;
    emailsSent: number;
    errors: string[];
}

export class CheckoutMonitoringService {
    private supabase: SupabaseClient;
    private notificationService: NotificationService;
    private emailService: EmailService;

    constructor() {
        this.supabase = supabase.getClient();
        this.notificationService = new NotificationService();
        this.emailService = new EmailService();
    }

    /**
     * Get checkout reminder time from settings
     */
    async getCheckoutReminderTime(): Promise<string> {
        try {
            const { data, error } = await this.supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'checkout_reminder_time')
                .single();

            if (error) {
                logger.warn('CheckoutMonitoringService: Using default checkout reminder time');
                return '18:00:00';
            }

            return data.setting_value || '18:00:00';
        } catch (error) {
            logger.error('CheckoutMonitoringService: Failed to get checkout reminder time', { 
                error: (error as Error).message 
            });
            return '18:00:00';
        }
    }

    /**
     * Get onsite required days from settings
     */
    async getOnsiteRequiredDays(): Promise<string[]> {
        try {
            const { data, error } = await this.supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'onsite_required_days')
                .single();

            if (error) {
                logger.warn('CheckoutMonitoringService: Using default onsite required days');
                return ['monday', 'tuesday', 'wednesday', 'thursday'];
            }

            return data.setting_value as string[] || ['monday', 'tuesday', 'wednesday', 'thursday'];
        } catch (error) {
            logger.error('CheckoutMonitoringService: Failed to get onsite required days', { 
                error: (error as Error).message 
            });
            return ['monday', 'tuesday', 'wednesday', 'thursday'];
        }
    }

    /**
     * Check if today is an onsite required day
     */
    async isOnsiteRequiredDay(date: Date = new Date()): Promise<boolean> {
        const onsiteRequiredDays = await this.getOnsiteRequiredDays();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayName = dayNames[date.getDay()];
        
        return onsiteRequiredDays.includes(todayName);
    }

    /**
     * Get employees who checked in today but haven't checked out
     */
    async getEmployeesNeedingCheckoutReminder(date: Date = new Date()): Promise<any[]> {
        try {
            const today = date.toISOString().split('T')[0];

            logger.info('CheckoutMonitoringService: Getting employees needing checkout reminder', { 
                date: today 
            });

            const { data: attendanceRecords, error } = await this.supabase
                .from('attendance')
                .select(`
                    id,
                    employee_id,
                    check_in_time,
                    check_out_time,
                    checkout_reminder_sent,
                    employee:employees!attendance_employee_id_fkey(
                        id,
                        full_name,
                        email,
                        user_id
                    )
                `)
                .eq('date', today)
                .eq('status', 'checked_in')
                .is('check_out_time', null)
                .eq('checkout_reminder_sent', false);

            if (error) {
                logger.error('CheckoutMonitoringService: Failed to get attendance records', { 
                    error: error.message 
                });
                throw error;
            }

            const employeesNeedingReminder = attendanceRecords || [];

            logger.info('CheckoutMonitoringService: Found employees needing checkout reminder', { 
                count: employeesNeedingReminder.length 
            });

            return employeesNeedingReminder;
        } catch (error) {
            logger.error('CheckoutMonitoringService: Failed to get employees needing checkout reminder', { 
                error: (error as Error).message 
            });
            throw error;
        }
    }

    /**
     * Send checkout reminder to an employee
     */
    async sendCheckoutReminder(employee: any, attendanceId: string): Promise<{ notificationSent: boolean; emailSent: boolean }> {
        try {
            logger.info('CheckoutMonitoringService: Sending checkout reminder', { 
                employeeId: employee.id,
                employeeName: employee.full_name,
                attendanceId
            });

            let notificationSent = false;
            let emailSent = false;

            // Send system notification
            try {
                await this.notificationService.createNotification({
                    userId: employee.user_id,
                    type: 'checkout',
                    title: 'Checkout Reminder',
                    message: 'Don\'t forget to check out before leaving the office. Please complete your checkout to record your work hours accurately.',
                    relatedId: attendanceId,
                    actionUrl: '/attendance'
                });
                notificationSent = true;
                logger.info('CheckoutMonitoringService: System notification sent', { employeeId: employee.id });
            } catch (notificationError) {
                logger.error('CheckoutMonitoringService: Failed to send system notification', { 
                    employeeId: employee.id,
                    error: (notificationError as Error).message 
                });
            }

            // Send email notification
            try {
                await this.emailService.sendEmail({
                    to: employee.email,
                    subject: 'Checkout Reminder - Don\'t Forget to Check Out',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #333;">Checkout Reminder</h2>
                            <p>Hello ${employee.full_name},</p>
                            <p>This is a friendly reminder that you haven't checked out yet today.</p>
                            <p><strong>Please remember to check out before leaving the office.</strong></p>
                            <p>Checking out helps us:</p>
                            <ul>
                                <li>Track your work hours accurately</li>
                                <li>Ensure proper attendance records</li>
                                <li>Maintain security protocols</li>
                            </ul>
                            <p>You can check out using the attendance system in your dashboard.</p>
                            <p>If you have already left the office, please check out as soon as possible.</p>
                            <br>
                            <p>Best regards,<br>HR Team</p>
                        </div>
                    `
                });
                emailSent = true;
                logger.info('CheckoutMonitoringService: Email notification sent', { employeeId: employee.id });
            } catch (emailError) {
                logger.error('CheckoutMonitoringService: Failed to send email notification', { 
                    employeeId: employee.id,
                    error: (emailError as Error).message 
                });
            }

            // Mark reminder as sent in attendance record
            try {
                await this.supabase
                    .from('attendance')
                    .update({ checkout_reminder_sent: true })
                    .eq('id', attendanceId);
                
                logger.info('CheckoutMonitoringService: Marked reminder as sent', { attendanceId });
            } catch (updateError) {
                logger.error('CheckoutMonitoringService: Failed to mark reminder as sent', { 
                    attendanceId,
                    error: (updateError as Error).message 
                });
            }

            return { notificationSent, emailSent };
        } catch (error) {
            logger.error('CheckoutMonitoringService: Failed to send checkout reminder', { 
                employeeId: employee.id,
                error: (error as Error).message 
            });
            return { notificationSent: false, emailSent: false };
        }
    }

    /**
     * Run daily checkout monitoring job
     */
    async runDailyCheckoutMonitoring(date: Date = new Date()): Promise<CheckoutReminderResult> {
        try {
            logger.info('CheckoutMonitoringService: Starting daily checkout monitoring', { 
                date: date.toISOString() 
            });

            // Log job start
            const jobStartTime = new Date();
            await this.logCronJob('daily_checkout_monitoring', 'started', jobStartTime);

            // Check if today is an onsite required day
            const isOnsiteDay = await this.isOnsiteRequiredDay(date);
            
            if (!isOnsiteDay) {
                logger.info('CheckoutMonitoringService: Skipping checkout monitoring - not an onsite required day');
                
                await this.logCronJob('daily_checkout_monitoring', 'completed', jobStartTime, new Date(), 0, {
                    reason: 'Not an onsite required day',
                    date: date.toISOString().split('T')[0]
                });

                return {
                    totalEmployees: 0,
                    employeesNeedingReminder: 0,
                    notificationsSent: 0,
                    emailsSent: 0,
                    errors: []
                };
            }

            // Get employees needing checkout reminders
            const employeesNeedingReminder = await this.getEmployeesNeedingCheckoutReminder(date);
            
            let notificationsSent = 0;
            let emailsSent = 0;
            const errors: string[] = [];

            // Send reminders to each employee
            for (const attendanceRecord of employeesNeedingReminder) {
                try {
                    const result = await this.sendCheckoutReminder(
                        attendanceRecord.employee, 
                        attendanceRecord.id
                    );
                    
                    if (result.notificationSent) notificationsSent++;
                    if (result.emailSent) emailsSent++;
                } catch (error) {
                    const errorMessage = `Failed to send reminder to ${attendanceRecord.employee.full_name}: ${(error as Error).message}`;
                    errors.push(errorMessage);
                    logger.error('CheckoutMonitoringService: Individual reminder failed', { 
                        employeeId: attendanceRecord.employee.id,
                        error: errorMessage 
                    });
                }
            }

            const result: CheckoutReminderResult = {
                totalEmployees: employeesNeedingReminder.length,
                employeesNeedingReminder: employeesNeedingReminder.length,
                notificationsSent,
                emailsSent,
                errors
            };

            // Log job completion
            await this.logCronJob(
                'daily_checkout_monitoring', 
                errors.length > 0 ? 'completed' : 'completed', 
                jobStartTime, 
                new Date(), 
                employeesNeedingReminder.length,
                {
                    result,
                    date: date.toISOString().split('T')[0]
                }
            );

            logger.info('CheckoutMonitoringService: Daily checkout monitoring completed', { result });

            return result;
        } catch (error) {
            logger.error('CheckoutMonitoringService: Daily checkout monitoring failed', { 
                error: (error as Error).message 
            });

            // Log job failure
            await this.logCronJob(
                'daily_checkout_monitoring', 
                'failed', 
                new Date(), 
                new Date(), 
                0,
                { error: (error as Error).message }
            );

            throw error;
        }
    }

    /**
     * Check if it's time to run checkout monitoring
     */
    async shouldRunCheckoutMonitoring(currentTime: Date = new Date()): Promise<boolean> {
        try {
            const reminderTime = await this.getCheckoutReminderTime();
            const isOnsiteDay = await this.isOnsiteRequiredDay(currentTime);
            
            if (!isOnsiteDay) {
                return false;
            }

            const [reminderHour, reminderMinute] = reminderTime.split(':').map(Number);
            const currentHour = currentTime.getHours();
            const currentMinute = currentTime.getMinutes();

            // Check if current time matches reminder time (within 1 minute window)
            const isReminderTime = (
                currentHour === reminderHour && 
                Math.abs(currentMinute - reminderMinute) <= 1
            );

            // Check if job already ran today
            const today = currentTime.toISOString().split('T')[0];
            const { data: existingJob } = await this.supabase
                .from('cron_job_logs')
                .select('id')
                .eq('job_name', 'daily_checkout_monitoring')
                .eq('status', 'completed')
                .gte('start_time', `${today}T00:00:00Z`)
                .lte('start_time', `${today}T23:59:59Z`)
                .single();

            const alreadyRanToday = !!existingJob;

            logger.info('CheckoutMonitoringService: Checking if should run', {
                currentTime: currentTime.toISOString(),
                reminderTime,
                isOnsiteDay,
                isReminderTime,
                alreadyRanToday
            });

            return isReminderTime && !alreadyRanToday;
        } catch (error) {
            logger.error('CheckoutMonitoringService: Failed to check if should run', { 
                error: (error as Error).message 
            });
            return false;
        }
    }

    /**
     * Log CRON job execution
     */
    private async logCronJob(
        jobName: string,
        status: 'started' | 'completed' | 'failed',
        startTime: Date,
        endTime?: Date,
        recordsProcessed?: number,
        metadata?: any
    ): Promise<void> {
        try {
            const duration = endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : null;

            await this.supabase
                .from('cron_job_logs')
                .insert({
                    job_name: jobName,
                    status,
                    start_time: startTime.toISOString(),
                    end_time: endTime?.toISOString(),
                    duration_seconds: duration,
                    records_processed: recordsProcessed || 0,
                    metadata: metadata || {},
                    created_at: new Date().toISOString()
                });

            logger.info('CheckoutMonitoringService: CRON job logged', { 
                jobName, 
                status, 
                duration,
                recordsProcessed 
            });
        } catch (error) {
            logger.error('CheckoutMonitoringService: Failed to log CRON job', { 
                error: (error as Error).message 
            });
        }
    }

    /**
     * Get checkout monitoring statistics
     */
    async getCheckoutMonitoringStats(startDate?: Date, endDate?: Date): Promise<any> {
        try {
            const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate || new Date();

            // Get CRON job logs
            const { data: jobLogs, error: jobError } = await this.supabase
                .from('cron_job_logs')
                .select('*')
                .eq('job_name', 'daily_checkout_monitoring')
                .gte('start_time', start.toISOString())
                .lte('start_time', end.toISOString())
                .order('start_time', { ascending: false });

            if (jobError) throw jobError;

            // Get attendance records for the period
            const { data: attendanceRecords, error: attendanceError } = await this.supabase
                .from('attendance')
                .select('date, checkout_reminder_sent, check_out_time')
                .gte('date', start.toISOString().split('T')[0])
                .lte('date', end.toISOString().split('T')[0]);

            if (attendanceError) throw attendanceError;

            const totalJobs = jobLogs?.length || 0;
            const successfulJobs = jobLogs?.filter(job => job.status === 'completed').length || 0;
            const failedJobs = jobLogs?.filter(job => job.status === 'failed').length || 0;

            const totalReminders = jobLogs?.reduce((sum, job) => {
                return sum + (job.records_processed || 0);
            }, 0) || 0;

            const totalAttendanceRecords = attendanceRecords?.length || 0;
            const recordsWithReminders = attendanceRecords?.filter(record => record.checkout_reminder_sent).length || 0;
            const recordsWithoutCheckout = attendanceRecords?.filter(record => !record.check_out_time).length || 0;

            return {
                period: {
                    start: start.toISOString().split('T')[0],
                    end: end.toISOString().split('T')[0]
                },
                jobs: {
                    total: totalJobs,
                    successful: successfulJobs,
                    failed: failedJobs,
                    successRate: totalJobs > 0 ? Math.round((successfulJobs / totalJobs) * 100) : 0
                },
                reminders: {
                    totalSent: totalReminders,
                    averagePerDay: totalJobs > 0 ? Math.round(totalReminders / totalJobs) : 0
                },
                attendance: {
                    totalRecords: totalAttendanceRecords,
                    recordsWithReminders: recordsWithReminders,
                    recordsWithoutCheckout: recordsWithoutCheckout,
                    reminderRate: totalAttendanceRecords > 0 ? Math.round((recordsWithReminders / totalAttendanceRecords) * 100) : 0
                }
            };
        } catch (error) {
            logger.error('CheckoutMonitoringService: Failed to get checkout monitoring stats', { 
                error: (error as Error).message 
            });
            throw error;
        }
    }
}

export default new CheckoutMonitoringService();