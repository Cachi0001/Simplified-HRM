import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import { NotificationService } from './NotificationService';
import { EmailService } from './EmailService';

export interface AttendanceNotificationSettings {
    enableLateArrivalNotifications: boolean;
    enableAbsenceNotifications: boolean;
    enableCheckoutReminders: boolean;
    lateArrivalThresholdMinutes: number;
    checkoutReminderTime: string;
    notifyAdminsOfAbsences: boolean;
    notifyAdminsOfLateArrivals: boolean;
}

export class AttendanceNotificationService {
    private supabase: SupabaseClient;
    private notificationService: NotificationService;
    private emailService: EmailService;

    constructor() {
        this.supabase = supabase.getClient();
        this.notificationService = new NotificationService();
        this.emailService = new EmailService();
    }

    /**
     * Get attendance notification settings
     */
    async getNotificationSettings(): Promise<AttendanceNotificationSettings> {
        try {
            const { data: settings, error } = await this.supabase
                .from('system_settings')
                .select('setting_key, setting_value')
                .in('setting_key', [
                    'enable_late_arrival_notifications',
                    'enable_absence_notifications',
                    'enable_checkout_reminders',
                    'late_arrival_threshold_minutes',
                    'checkout_reminder_time',
                    'notify_admins_of_absences',
                    'notify_admins_of_late_arrivals'
                ]);

            if (error) {
                logger.warn('AttendanceNotificationService: Using default notification settings');
            }

            const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || []);

            return {
                enableLateArrivalNotifications: settingsMap.get('enable_late_arrival_notifications') === 'true' || true,
                enableAbsenceNotifications: settingsMap.get('enable_absence_notifications') === 'true' || true,
                enableCheckoutReminders: settingsMap.get('enable_checkout_reminders') === 'true' || true,
                lateArrivalThresholdMinutes: parseInt(settingsMap.get('late_arrival_threshold_minutes') as string) || 5,
                checkoutReminderTime: settingsMap.get('checkout_reminder_time') as string || '18:00:00',
                notifyAdminsOfAbsences: settingsMap.get('notify_admins_of_absences') === 'true' || true,
                notifyAdminsOfLateArrivals: settingsMap.get('notify_admins_of_late_arrivals') === 'true' || false
            };
        } catch (error) {
            logger.error('AttendanceNotificationService: Failed to get notification settings', {
                error: (error as Error).message
            });

            // Return default settings
            return {
                enableLateArrivalNotifications: true,
                enableAbsenceNotifications: true,
                enableCheckoutReminders: true,
                lateArrivalThresholdMinutes: 5,
                checkoutReminderTime: '18:00:00',
                notifyAdminsOfAbsences: true,
                notifyAdminsOfLateArrivals: false
            };
        }
    }

    /**
     * Send late arrival notification to employee and optionally to admins
     */
    async sendLateArrivalNotification(
        employeeId: string,
        minutesLate: number,
        arrivalTime: Date
    ): Promise<void> {
        try {
            const settings = await this.getNotificationSettings();

            if (!settings.enableLateArrivalNotifications || minutesLate < settings.lateArrivalThresholdMinutes) {
                return;
            }

            logger.info('AttendanceNotificationService: Sending late arrival notification', {
                employeeId,
                minutesLate,
                arrivalTime: arrivalTime.toISOString()
            });

            // Get employee details
            const { data: employee, error: employeeError } = await this.supabase
                .from('employees')
                .select('id, full_name, email, user_id, department_id')
                .eq('id', employeeId)
                .single();

            if (employeeError || !employee) {
                logger.error('AttendanceNotificationService: Employee not found for late arrival notification', {
                    employeeId,
                    error: employeeError?.message
                });
                return;
            }

            // Send notification to employee
            try {
                await this.notificationService.createNotification({
                    userId: employee.user_id,
                    type: 'announcement',
                    title: 'Late Arrival Recorded',
                    message: `You arrived ${minutesLate} minutes late today at ${arrivalTime.toLocaleTimeString()}. Please try to arrive on time to maintain good attendance records.`,
                    actionUrl: '/attendance'
                });

                // Send email to employee
                await this.emailService.sendEmail({
                    to: employee.email,
                    subject: 'Late Arrival Notice - Attendance Reminder',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #ff6b35;">Late Arrival Notice</h2>
                            <p>Hello ${employee.full_name},</p>
                            <p>This is to inform you that you arrived <strong>${minutesLate} minutes late</strong> today at <strong>${arrivalTime.toLocaleTimeString()}</strong>.</p>
                            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                                <p style="margin: 0; color: #856404;">
                                    <strong>Reminder:</strong> Regular punctuality is important for maintaining good attendance records and team productivity.
                                </p>
                            </div>
                            <p>Please make an effort to arrive on time for future work days.</p>
                            <p>If you have any concerns about your schedule or need assistance with punctuality, please speak with your supervisor or HR.</p>
                            <br>
                            <p>Best regards,<br>HR Team</p>
                        </div>
                    `
                });

                logger.info('AttendanceNotificationService: Late arrival notification sent to employee', {
                    employeeId,
                    minutesLate
                });
            } catch (employeeNotificationError) {
                logger.error('AttendanceNotificationService: Failed to send late arrival notification to employee', {
                    employeeId,
                    error: (employeeNotificationError as Error).message
                });
            }

            // Send notification to admins if enabled
            if (settings.notifyAdminsOfLateArrivals) {
                try {
                    await this.notifyAdminsOfLateArrival(employee, minutesLate, arrivalTime);
                } catch (adminNotificationError) {
                    logger.error('AttendanceNotificationService: Failed to send late arrival notification to admins', {
                        employeeId,
                        error: (adminNotificationError as Error).message
                    });
                }
            }
        } catch (error) {
            logger.error('AttendanceNotificationService: Failed to send late arrival notification', {
                employeeId,
                minutesLate,
                error: (error as Error).message
            });
        }
    }

    /**
     * Send absence notification to employee and admins
     */
    async sendAbsenceNotification(employeeId: string, absenceDate: Date): Promise<void> {
        try {
            const settings = await this.getNotificationSettings();

            if (!settings.enableAbsenceNotifications) {
                return;
            }

            logger.info('AttendanceNotificationService: Sending absence notification', {
                employeeId,
                absenceDate: absenceDate.toISOString()
            });

            // Get employee details
            const { data: employee, error: employeeError } = await this.supabase
                .from('employees')
                .select('id, full_name, email, user_id, department_id')
                .eq('id', employeeId)
                .single();

            if (employeeError || !employee) {
                logger.error('AttendanceNotificationService: Employee not found for absence notification', {
                    employeeId,
                    error: employeeError?.message
                });
                return;
            }

            const dateStr = absenceDate.toLocaleDateString();

            // Send notification to employee
            try {
                await this.notificationService.createNotification({
                    userId: employee.user_id,
                    type: 'announcement',
                    title: 'Absence Recorded',
                    message: `You were marked as absent on ${dateStr}. If this is incorrect, please contact HR immediately to update your attendance record.`,
                    actionUrl: '/attendance'
                });

                // Send email to employee
                await this.emailService.sendEmail({
                    to: employee.email,
                    subject: 'Absence Notice - Attendance Record',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #dc3545;">Absence Notice</h2>
                            <p>Hello ${employee.full_name},</p>
                            <p>This is to inform you that you were marked as <strong>absent</strong> on <strong>${dateStr}</strong>.</p>
                            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                                <p style="margin: 0; color: #721c24;">
                                    <strong>Important:</strong> If you believe this absence record is incorrect, please contact HR immediately to have it reviewed and corrected.
                                </p>
                            </div>
                            <p>Possible reasons for this absence record:</p>
                            <ul>
                                <li>You did not check in to the attendance system</li>
                                <li>You were not present at the workplace</li>
                                <li>Technical issues with the attendance system</li>
                            </ul>
                            <p>Please ensure you check in properly each work day to maintain accurate attendance records.</p>
                            <br>
                            <p>Best regards,<br>HR Team</p>
                        </div>
                    `
                });

                logger.info('AttendanceNotificationService: Absence notification sent to employee', {
                    employeeId,
                    absenceDate: dateStr
                });
            } catch (employeeNotificationError) {
                logger.error('AttendanceNotificationService: Failed to send absence notification to employee', {
                    employeeId,
                    error: (employeeNotificationError as Error).message
                });
            }

            // Send notification to admins if enabled
            if (settings.notifyAdminsOfAbsences) {
                try {
                    await this.notifyAdminsOfAbsence(employee, absenceDate);
                } catch (adminNotificationError) {
                    logger.error('AttendanceNotificationService: Failed to send absence notification to admins', {
                        employeeId,
                        error: (adminNotificationError as Error).message
                    });
                }
            }
        } catch (error) {
            logger.error('AttendanceNotificationService: Failed to send absence notification', {
                employeeId,
                error: (error as Error).message
            });
        }
    }

    /**
     * Send checkout reminder notification
     */
    async sendCheckoutReminder(employeeId: string, attendanceId: string): Promise<void> {
        try {
            const settings = await this.getNotificationSettings();

            if (!settings.enableCheckoutReminders) {
                return;
            }

            logger.info('AttendanceNotificationService: Sending checkout reminder', {
                employeeId,
                attendanceId
            });

            // Get employee details
            const { data: employee, error: employeeError } = await this.supabase
                .from('employees')
                .select('id, full_name, email, user_id')
                .eq('id', employeeId)
                .single();

            if (employeeError || !employee) {
                logger.error('AttendanceNotificationService: Employee not found for checkout reminder', {
                    employeeId,
                    error: employeeError?.message
                });
                return;
            }

            // Send notification to employee
            await this.notificationService.createNotification({
                userId: employee.user_id,
                type: 'checkout',
                title: 'Checkout Reminder',
                message: 'Don\'t forget to check out before leaving the office. Please complete your checkout to record your work hours accurately.',
                relatedId: attendanceId,
                actionUrl: '/attendance'
            });

            // Send email to employee
            await this.emailService.sendEmail({
                to: employee.email,
                subject: 'Checkout Reminder - Don\'t Forget to Check Out',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #17a2b8;">Checkout Reminder</h2>
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

            logger.info('AttendanceNotificationService: Checkout reminder sent', {
                employeeId,
                attendanceId
            });
        } catch (error) {
            logger.error('AttendanceNotificationService: Failed to send checkout reminder', {
                employeeId,
                attendanceId,
                error: (error as Error).message
            });
        }
    }

    /**
     * Send daily attendance summary to admins
     */
    async sendDailyAttendanceSummary(date: Date = new Date()): Promise<void> {
        try {
            const dateStr = date.toISOString().split('T')[0];

            logger.info('AttendanceNotificationService: Sending daily attendance summary', {
                date: dateStr
            });

            // Get attendance summary for the day
            const { data: attendanceRecords, error } = await this.supabase
                .from('attendance')
                .select(`
                    *,
                    employee:employees!attendance_employee_id_fkey(
                        full_name,
                        department:departments!employees_department_id_fkey(name)
                    )
                `)
                .eq('date', dateStr);

            if (error) {
                throw error;
            }

            const totalEmployees = await this.getTotalActiveEmployees();
            const presentEmployees = attendanceRecords?.filter(r => r.status !== 'absent').length || 0;
            const absentEmployees = attendanceRecords?.filter(r => r.status === 'absent').length || 0;
            const lateEmployees = attendanceRecords?.filter(r => r.is_late).length || 0;
            const notCheckedIn = totalEmployees - (attendanceRecords?.length || 0);

            // Get admin emails
            const adminEmails = await this.getAdminEmails();

            if (adminEmails.length === 0) {
                logger.warn('AttendanceNotificationService: No admin emails found for daily summary');
                return;
            }

            // Send email to each admin
            for (const adminEmail of adminEmails) {
                try {
                    await this.emailService.sendEmail({
                        to: adminEmail,
                        subject: `Daily Attendance Summary - ${date.toLocaleDateString()}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #28a745;">Daily Attendance Summary</h2>
                                <p><strong>Date:</strong> ${date.toLocaleDateString()}</p>
                                
                                <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin: 20px 0;">
                                    <h3 style="margin-top: 0; color: #495057;">Overview</h3>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                        <div>
                                            <p><strong>Total Employees:</strong> ${totalEmployees}</p>
                                            <p><strong>Present:</strong> ${presentEmployees}</p>
                                        </div>
                                        <div>
                                            <p><strong>Absent:</strong> ${absentEmployees}</p>
                                            <p><strong>Late Arrivals:</strong> ${lateEmployees}</p>
                                        </div>
                                    </div>
                                    ${notCheckedIn > 0 ? `<p style="color: #dc3545;"><strong>Not Checked In:</strong> ${notCheckedIn}</p>` : ''}
                                </div>

                                ${lateEmployees > 0 ? `
                                <div style="background-color: #fff3cd; border-radius: 5px; padding: 15px; margin: 20px 0;">
                                    <h4 style="margin-top: 0; color: #856404;">Late Arrivals</h4>
                                    ${attendanceRecords?.filter(r => r.is_late).map(r =>
                            `<p style="margin: 5px 0;">• ${r.employee.full_name} - ${r.minutes_late} minutes late</p>`
                        ).join('')}
                                </div>
                                ` : ''}

                                ${absentEmployees > 0 ? `
                                <div style="background-color: #f8d7da; border-radius: 5px; padding: 15px; margin: 20px 0;">
                                    <h4 style="margin-top: 0; color: #721c24;">Absent Employees</h4>
                                    ${attendanceRecords?.filter(r => r.status === 'absent').map(r =>
                            `<p style="margin: 5px 0;">• ${r.employee.full_name} - ${r.employee.department?.name || 'No Department'}</p>`
                        ).join('')}
                                </div>
                                ` : ''}

                                <p>You can view detailed attendance reports in the admin dashboard.</p>
                                <br>
                                <p>Best regards,<br>HR Management System</p>
                            </div>
                        `
                    });
                } catch (emailError) {
                    logger.error('AttendanceNotificationService: Failed to send daily summary to admin', {
                        adminEmail,
                        error: (emailError as Error).message
                    });
                }
            }

            logger.info('AttendanceNotificationService: Daily attendance summary sent', {
                date: dateStr,
                adminCount: adminEmails.length
            });
        } catch (error) {
            logger.error('AttendanceNotificationService: Failed to send daily attendance summary', {
                error: (error as Error).message
            });
        }
    }

    /**
     * Notify admins of late arrival
     */
    private async notifyAdminsOfLateArrival(
        employee: any,
        minutesLate: number,
        arrivalTime: Date
    ): Promise<void> {
        const adminEmails = await this.getAdminEmails();

        for (const adminEmail of adminEmails) {
            try {
                await this.emailService.sendEmail({
                    to: adminEmail,
                    subject: `Late Arrival Alert - ${employee.full_name}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #ff6b35;">Late Arrival Alert</h2>
                            <p>An employee has arrived late today:</p>
                            <div style="background-color: #fff3cd; border-radius: 5px; padding: 15px; margin: 20px 0;">
                                <p><strong>Employee:</strong> ${employee.full_name}</p>
                                <p><strong>Arrival Time:</strong> ${arrivalTime.toLocaleTimeString()}</p>
                                <p><strong>Minutes Late:</strong> ${minutesLate}</p>
                                <p><strong>Date:</strong> ${arrivalTime.toLocaleDateString()}</p>
                            </div>
                            <p>Please review the attendance record and take appropriate action if necessary.</p>
                        </div>
                    `
                });
            } catch (error) {
                logger.error('AttendanceNotificationService: Failed to notify admin of late arrival', {
                    adminEmail,
                    employeeId: employee.id,
                    error: (error as Error).message
                });
            }
        }
    }

    /**
     * Notify admins of absence
     */
    private async notifyAdminsOfAbsence(employee: any, absenceDate: Date): Promise<void> {
        const adminEmails = await this.getAdminEmails();

        for (const adminEmail of adminEmails) {
            try {
                await this.emailService.sendEmail({
                    to: adminEmail,
                    subject: `Employee Absence Alert - ${employee.full_name}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #dc3545;">Employee Absence Alert</h2>
                            <p>An employee was marked as absent today:</p>
                            <div style="background-color: #f8d7da; border-radius: 5px; padding: 15px; margin: 20px 0;">
                                <p><strong>Employee:</strong> ${employee.full_name}</p>
                                <p><strong>Date:</strong> ${absenceDate.toLocaleDateString()}</p>
                                <p><strong>Email:</strong> ${employee.email}</p>
                            </div>
                            <p>Please review the absence and follow up with the employee if necessary.</p>
                        </div>
                    `
                });
            } catch (error) {
                logger.error('AttendanceNotificationService: Failed to notify admin of absence', {
                    adminEmail,
                    employeeId: employee.id,
                    error: (error as Error).message
                });
            }
        }
    }

    /**
     * Get admin email addresses
     */
    private async getAdminEmails(): Promise<string[]> {
        try {
            const { data: admins, error } = await this.supabase
                .from('employees')
                .select('email')
                .eq('role', 'admin')
                .eq('status', 'active');

            if (error) {
                throw error;
            }

            return admins?.map(admin => admin.email) || [];
        } catch (error) {
            logger.error('AttendanceNotificationService: Failed to get admin emails', {
                error: (error as Error).message
            });
            return [];
        }
    }

    /**
     * Get total number of active employees
     */
    private async getTotalActiveEmployees(): Promise<number> {
        try {
            const { count, error } = await this.supabase
                .from('employees')
                .select('id', { count: 'exact' })
                .eq('status', 'active');

            if (error) {
                throw error;
            }

            return count || 0;
        } catch (error) {
            logger.error('AttendanceNotificationService: Failed to get total active employees', {
                error: (error as Error).message
            });
            return 0;
        }
    }

    /**
     * Update notification settings
     */
    async updateNotificationSettings(settings: Partial<AttendanceNotificationSettings>): Promise<void> {
        try {
            logger.info('AttendanceNotificationService: Updating notification settings', { settings });

            const settingsToUpdate = [
                { key: 'enable_late_arrival_notifications', value: settings.enableLateArrivalNotifications?.toString() },
                { key: 'enable_absence_notifications', value: settings.enableAbsenceNotifications?.toString() },
                { key: 'enable_checkout_reminders', value: settings.enableCheckoutReminders?.toString() },
                { key: 'late_arrival_threshold_minutes', value: settings.lateArrivalThresholdMinutes?.toString() },
                { key: 'checkout_reminder_time', value: settings.checkoutReminderTime },
                { key: 'notify_admins_of_absences', value: settings.notifyAdminsOfAbsences?.toString() },
                { key: 'notify_admins_of_late_arrivals', value: settings.notifyAdminsOfLateArrivals?.toString() }
            ].filter(setting => setting.value !== undefined);

            for (const setting of settingsToUpdate) {
                await this.supabase
                    .from('system_settings')
                    .upsert({
                        setting_key: setting.key,
                        setting_value: setting.value,
                        category: 'attendance_notifications',
                        updated_at: new Date().toISOString()
                    });
            }

            logger.info('AttendanceNotificationService: Notification settings updated successfully');
        } catch (error) {
            logger.error('AttendanceNotificationService: Failed to update notification settings', {
                error: (error as Error).message
            });
            throw error;
        }
    }
}

export default new AttendanceNotificationService();