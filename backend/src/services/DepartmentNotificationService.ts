import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import { NotificationService } from './NotificationService';
import { EmailService } from './EmailService';
import EmailTemplateService from './EmailTemplateService';

export interface DepartmentNotification {
    id: string;
    departmentId: string;
    title: string;
    message: string;
    type: 'announcement' | 'alert' | 'reminder' | 'update' | 'urgent';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    createdBy: string;
    createdAt: Date;
    scheduledFor?: Date;
    expiresAt?: Date;
    recipients: {
        all: boolean;
        roles?: string[];
        specificEmployees?: string[];
        excludeEmployees?: string[];
    };
    channels: {
        inApp: boolean;
        email: boolean;
        sms?: boolean;
    };
    status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
    metadata?: {
        attachments?: string[];
        actionRequired?: boolean;
        deadline?: Date;
        category?: string;
    };
}

export interface DepartmentBroadcast {
    id: string;
    departmentId: string;
    title: string;
    content: string;
    broadcastType: 'meeting' | 'policy_update' | 'achievement' | 'training' | 'emergency' | 'general';
    createdBy: string;
    createdAt: Date;
    deliveredTo: string[];
    readBy: string[];
    acknowledgedBy: string[];
    requiresAcknowledgment: boolean;
}

export class DepartmentNotificationService {
    private supabase: SupabaseClient;
    private notificationService: NotificationService;
    private emailService: EmailService;

    constructor() {
        this.supabase = supabase.getClient();
        this.notificationService = new NotificationService();
        this.emailService = new EmailService();
    }

    /**
     * Send notification to entire department
     */
    async sendDepartmentNotification(
        notification: Omit<DepartmentNotification, 'id' | 'createdAt' | 'status'>
    ): Promise<DepartmentNotification> {
        try {
            logger.info('DepartmentNotificationService: Sending department notification', {
                departmentId: notification.departmentId,
                title: notification.title,
                type: notification.type
            });

            const notificationRecord: DepartmentNotification = {
                ...notification,
                id: this.generateNotificationId(),
                createdAt: new Date(),
                status: notification.scheduledFor ? 'scheduled' : 'sent'
            };

            // Get department employees
            const recipients = await this.getDepartmentRecipients(
                notification.departmentId,
                notification.recipients
            );

            if (recipients.length === 0) {
                throw new Error('No recipients found for department notification');
            }

            // Store notification record
            await this.storeNotification(notificationRecord);

            // Send notifications based on channels
            if (notification.channels.inApp) {
                await this.sendInAppNotifications(notificationRecord, recipients);
            }

            if (notification.channels.email) {
                await this.sendEmailNotifications(notificationRecord, recipients);
            }

            // Update delivery status
            await this.updateNotificationDelivery(notificationRecord.id, recipients.map(r => r.id));

            logger.info('DepartmentNotificationService: Department notification sent', {
                notificationId: notificationRecord.id,
                recipientCount: recipients.length
            });

            return notificationRecord;
        } catch (error) {
            logger.error('DepartmentNotificationService: Failed to send department notification', {
                error: (error as Error).message,
                departmentId: notification.departmentId
            });
            throw error;
        }
    }

    /**
     * Broadcast message to department
     */
    async broadcastToDepartment(
        broadcast: Omit<DepartmentBroadcast, 'id' | 'createdAt' | 'deliveredTo' | 'readBy' | 'acknowledgedBy'>
    ): Promise<DepartmentBroadcast> {
        try {
            logger.info('DepartmentNotificationService: Broadcasting to department', {
                departmentId: broadcast.departmentId,
                title: broadcast.title,
                broadcastType: broadcast.broadcastType
            });

            // Get all department employees
            const { data: employees, error } = await this.supabase
                .from('employees')
                .select('id, full_name, email')
                .eq('department_id', broadcast.departmentId)
                .eq('status', 'active');

            if (error) {
                throw error;
            }

            const employeeList = employees || [];

            const broadcastRecord: DepartmentBroadcast = {
                ...broadcast,
                id: this.generateBroadcastId(),
                createdAt: new Date(),
                deliveredTo: employeeList.map(emp => emp.id),
                readBy: [],
                acknowledgedBy: []
            };

            // Store broadcast record
            await this.storeBroadcast(broadcastRecord);

            // Send in-app notifications to all employees
            for (const employee of employeeList) {
                try {
                    await this.notificationService.createNotification({
                        userId: employee.id,
                        title: `📢 ${broadcast.title}`,
                        message: broadcast.content,
                        type: 'department_broadcast',
                        priority: this.getBroadcastPriority(broadcast.broadcastType),
                        metadata: {
                            broadcastId: broadcastRecord.id,
                            departmentId: broadcast.departmentId,
                            broadcastType: broadcast.broadcastType,
                            requiresAcknowledgment: broadcast.requiresAcknowledgment
                        }
                    });
                } catch (notificationError) {
                    logger.error('DepartmentNotificationService: Failed to send notification to employee', {
                        employeeId: employee.id,
                        error: (notificationError as Error).message
                    });
                }
            }

            // Send email notifications for important broadcasts
            if (['emergency', 'policy_update', 'meeting'].includes(broadcast.broadcastType)) {
                await this.sendBroadcastEmails(broadcastRecord, employeeList);
            }

            logger.info('DepartmentNotificationService: Department broadcast sent', {
                broadcastId: broadcastRecord.id,
                recipientCount: employeeList.length
            });

            return broadcastRecord;
        } catch (error) {
            logger.error('DepartmentNotificationService: Failed to broadcast to department', {
                error: (error as Error).message,
                departmentId: broadcast.departmentId
            });
            throw error;
        }
    }

    /**
     * Send task assignment notifications to department
     */
    async notifyDepartmentTaskAssignment(
        departmentId: string,
        taskId: string,
        taskTitle: string,
        assignedBy: string,
        dueDate?: Date,
        priority?: string
    ): Promise<void> {
        try {
            logger.info('DepartmentNotificationService: Notifying department task assignment', {
                departmentId,
                taskId,
                taskTitle
            });

            const notification: Omit<DepartmentNotification, 'id' | 'createdAt' | 'status'> = {
                departmentId,
                title: '📋 New Task Assignment',
                message: `A new task "${taskTitle}" has been assigned to your department.${dueDate ? ` Due: ${dueDate.toLocaleDateString()}` : ''}`,
                type: 'alert',
                priority: priority === 'high' ? 'high' : 'medium',
                createdBy: assignedBy,
                recipients: { all: true },
                channels: { inApp: true, email: true },
                metadata: {
                    taskId,
                    actionRequired: true,
                    deadline: dueDate,
                    category: 'task_assignment'
                }
            };

            await this.sendDepartmentNotification(notification);

            logger.info('DepartmentNotificationService: Task assignment notification sent', {
                departmentId,
                taskId
            });
        } catch (error) {
            logger.error('DepartmentNotificationService: Failed to notify task assignment', {
                error: (error as Error).message,
                departmentId,
                taskId
            });
            throw error;
        }
    }

    /**
     * Send performance alert to department
     */
    async notifyDepartmentPerformanceAlert(
        departmentId: string,
        alertType: 'low_performance' | 'attendance_issue' | 'deadline_missed' | 'improvement_needed',
        details: {
            metric: string;
            currentValue: number;
            threshold: number;
            affectedEmployees?: string[];
        },
        createdBy: string
    ): Promise<void> {
        try {
            logger.info('DepartmentNotificationService: Sending performance alert', {
                departmentId,
                alertType,
                metric: details.metric
            });

            const alertMessages = {
                low_performance: `Department performance alert: ${details.metric} is at ${details.currentValue}%, below the threshold of ${details.threshold}%`,
                attendance_issue: `Attendance concern: ${details.metric} is at ${details.currentValue}%, below acceptable level of ${details.threshold}%`,
                deadline_missed: `Deadline alert: ${details.metric} shows ${details.currentValue} missed deadlines this period`,
                improvement_needed: `Improvement needed: ${details.metric} requires attention (current: ${details.currentValue}%, target: ${details.threshold}%)`
            };

            const notification: Omit<DepartmentNotification, 'id' | 'createdAt' | 'status'> = {
                departmentId,
                title: '⚠️ Department Performance Alert',
                message: alertMessages[alertType],
                type: 'alert',
                priority: 'high',
                createdBy,
                recipients: { 
                    all: false,
                    roles: ['manager', 'supervisor'],
                    specificEmployees: details.affectedEmployees
                },
                channels: { inApp: true, email: true },
                metadata: {
                    alertType,
                    metric: details.metric,
                    currentValue: details.currentValue,
                    threshold: details.threshold,
                    category: 'performance_alert'
                }
            };

            await this.sendDepartmentNotification(notification);

            logger.info('DepartmentNotificationService: Performance alert sent', {
                departmentId,
                alertType
            });
        } catch (error) {
            logger.error('DepartmentNotificationService: Failed to send performance alert', {
                error: (error as Error).message,
                departmentId,
                alertType
            });
            throw error;
        }
    }

    /**
     * Schedule recurring department notifications
     */
    async scheduleRecurringNotification(
        notification: Omit<DepartmentNotification, 'id' | 'createdAt' | 'status'>,
        schedule: {
            frequency: 'daily' | 'weekly' | 'monthly';
            dayOfWeek?: number; // 0-6 for weekly
            dayOfMonth?: number; // 1-31 for monthly
            time: string; // HH:MM format
        }
    ): Promise<string> {
        try {
            logger.info('DepartmentNotificationService: Scheduling recurring notification', {
                departmentId: notification.departmentId,
                frequency: schedule.frequency
            });

            const scheduleId = this.generateScheduleId();

            // Store recurring schedule
            await this.supabase
                .from('department_notification_schedules')
                .insert({
                    id: scheduleId,
                    department_id: notification.departmentId,
                    notification_data: notification,
                    frequency: schedule.frequency,
                    day_of_week: schedule.dayOfWeek,
                    day_of_month: schedule.dayOfMonth,
                    time: schedule.time,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    next_execution: this.calculateNextExecution(schedule)
                });

            logger.info('DepartmentNotificationService: Recurring notification scheduled', {
                scheduleId,
                departmentId: notification.departmentId
            });

            return scheduleId;
        } catch (error) {
            logger.error('DepartmentNotificationService: Failed to schedule recurring notification', {
                error: (error as Error).message,
                departmentId: notification.departmentId
            });
            throw error;
        }
    }

    /**
     * Get department notification history
     */
    async getDepartmentNotificationHistory(
        departmentId: string,
        limit: number = 50
    ): Promise<DepartmentNotification[]> {
        try {
            const { data: notifications, error } = await this.supabase
                .from('department_notifications')
                .select('*')
                .eq('department_id', departmentId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                throw error;
            }

            return notifications?.map(notification => this.mapDatabaseToNotification(notification)) || [];
        } catch (error) {
            logger.error('DepartmentNotificationService: Failed to get notification history', {
                error: (error as Error).message,
                departmentId
            });
            throw error;
        }
    }

    /**
     * Mark broadcast as read by employee
     */
    async markBroadcastAsRead(broadcastId: string, employeeId: string): Promise<void> {
        try {
            // Update broadcast read status
            const { data: broadcast, error: fetchError } = await this.supabase
                .from('department_broadcasts')
                .select('read_by')
                .eq('id', broadcastId)
                .single();

            if (fetchError || !broadcast) {
                throw new Error(`Broadcast not found: ${broadcastId}`);
            }

            const readBy = broadcast.read_by || [];
            if (!readBy.includes(employeeId)) {
                readBy.push(employeeId);

                await this.supabase
                    .from('department_broadcasts')
                    .update({ read_by: readBy })
                    .eq('id', broadcastId);
            }

            logger.info('DepartmentNotificationService: Broadcast marked as read', {
                broadcastId,
                employeeId
            });
        } catch (error) {
            logger.error('DepartmentNotificationService: Failed to mark broadcast as read', {
                error: (error as Error).message,
                broadcastId,
                employeeId
            });
            throw error;
        }
    }

    /**
     * Acknowledge broadcast (for broadcasts requiring acknowledgment)
     */
    async acknowledgeBroadcast(broadcastId: string, employeeId: string): Promise<void> {
        try {
            // Update broadcast acknowledgment status
            const { data: broadcast, error: fetchError } = await this.supabase
                .from('department_broadcasts')
                .select('acknowledged_by, requires_acknowledgment')
                .eq('id', broadcastId)
                .single();

            if (fetchError || !broadcast) {
                throw new Error(`Broadcast not found: ${broadcastId}`);
            }

            if (!broadcast.requires_acknowledgment) {
                throw new Error('Broadcast does not require acknowledgment');
            }

            const acknowledgedBy = broadcast.acknowledged_by || [];
            if (!acknowledgedBy.includes(employeeId)) {
                acknowledgedBy.push(employeeId);

                await this.supabase
                    .from('department_broadcasts')
                    .update({ acknowledged_by: acknowledgedBy })
                    .eq('id', broadcastId);

                // Also mark as read
                await this.markBroadcastAsRead(broadcastId, employeeId);
            }

            logger.info('DepartmentNotificationService: Broadcast acknowledged', {
                broadcastId,
                employeeId
            });
        } catch (error) {
            logger.error('DepartmentNotificationService: Failed to acknowledge broadcast', {
                error: (error as Error).message,
                broadcastId,
                employeeId
            });
            throw error;
        }
    }

    /**
     * Get department recipients based on criteria
     */
    private async getDepartmentRecipients(
        departmentId: string,
        criteria: DepartmentNotification['recipients']
    ): Promise<Array<{ id: string; full_name: string; email: string; role?: string }>> {
        try {
            let query = this.supabase
                .from('employees')
                .select('id, full_name, email, role')
                .eq('department_id', departmentId)
                .eq('status', 'active');

            // Apply recipient filters
            if (!criteria.all) {
                if (criteria.roles && criteria.roles.length > 0) {
                    query = query.in('role', criteria.roles);
                }

                if (criteria.specificEmployees && criteria.specificEmployees.length > 0) {
                    query = query.in('id', criteria.specificEmployees);
                }
            }

            const { data: employees, error } = await query;

            if (error) {
                throw error;
            }

            let recipients = employees || [];

            // Exclude specific employees if specified
            if (criteria.excludeEmployees && criteria.excludeEmployees.length > 0) {
                recipients = recipients.filter(emp => !criteria.excludeEmployees!.includes(emp.id));
            }

            return recipients;
        } catch (error) {
            logger.error('DepartmentNotificationService: Failed to get department recipients', {
                error: (error as Error).message,
                departmentId
            });
            return [];
        }
    }

    /**
     * Send in-app notifications
     */
    private async sendInAppNotifications(
        notification: DepartmentNotification,
        recipients: Array<{ id: string; full_name: string; email: string }>
    ): Promise<void> {
        for (const recipient of recipients) {
            try {
                await this.notificationService.createNotification({
                    userId: recipient.id,
                    title: notification.title,
                    message: notification.message,
                    type: notification.type,
                    priority: notification.priority,
                    metadata: {
                        departmentNotificationId: notification.id,
                        departmentId: notification.departmentId,
                        ...notification.metadata
                    }
                });
            } catch (error) {
                logger.error('DepartmentNotificationService: Failed to send in-app notification', {
                    recipientId: recipient.id,
                    error: (error as Error).message
                });
            }
        }
    }

    /**
     * Send email notifications
     */
    private async sendEmailNotifications(
        notification: DepartmentNotification,
        recipients: Array<{ id: string; full_name: string; email: string }>
    ): Promise<void> {
        for (const recipient of recipients) {
            try {
                const html = EmailTemplateService.generateEmailTemplate({
                    recipientName: recipient.full_name,
                    title: notification.title,
                    subtitle: `Department Notification - ${notification.type.toUpperCase()}`,
                    content: notification.message,
                    actionButton: notification.metadata?.actionRequired ? {
                        text: 'View Details',
                        url: `${process.env.FRONTEND_URL}/notifications`,
                        color: 'primary'
                    } : undefined
                });

                await this.emailService.sendEmail({
                    to: recipient.email,
                    subject: notification.title,
                    html
                });
            } catch (error) {
                logger.error('DepartmentNotificationService: Failed to send email notification', {
                    recipientEmail: recipient.email,
                    error: (error as Error).message
                });
            }
        }
    }

    /**
     * Send broadcast emails
     */
    private async sendBroadcastEmails(
        broadcast: DepartmentBroadcast,
        recipients: Array<{ id: string; full_name: string; email: string }>
    ): Promise<void> {
        for (const recipient of recipients) {
            try {
                const html = EmailTemplateService.generateEmailTemplate({
                    recipientName: recipient.full_name,
                    title: `📢 ${broadcast.title}`,
                    subtitle: `Department Broadcast - ${broadcast.broadcastType.replace('_', ' ').toUpperCase()}`,
                    content: broadcast.content,
                    actionButton: broadcast.requiresAcknowledgment ? {
                        text: 'Acknowledge',
                        url: `${process.env.FRONTEND_URL}/broadcasts/${broadcast.id}/acknowledge`,
                        color: 'primary'
                    } : undefined
                });

                await this.emailService.sendEmail({
                    to: recipient.email,
                    subject: `📢 ${broadcast.title}`,
                    html
                });
            } catch (error) {
                logger.error('DepartmentNotificationService: Failed to send broadcast email', {
                    recipientEmail: recipient.email,
                    error: (error as Error).message
                });
            }
        }
    }

    /**
     * Store notification in database
     */
    private async storeNotification(notification: DepartmentNotification): Promise<void> {
        await this.supabase
            .from('department_notifications')
            .insert({
                id: notification.id,
                department_id: notification.departmentId,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                priority: notification.priority,
                created_by: notification.createdBy,
                created_at: notification.createdAt.toISOString(),
                scheduled_for: notification.scheduledFor?.toISOString(),
                expires_at: notification.expiresAt?.toISOString(),
                recipients: notification.recipients,
                channels: notification.channels,
                status: notification.status,
                metadata: notification.metadata
            });
    }

    /**
     * Store broadcast in database
     */
    private async storeBroadcast(broadcast: DepartmentBroadcast): Promise<void> {
        await this.supabase
            .from('department_broadcasts')
            .insert({
                id: broadcast.id,
                department_id: broadcast.departmentId,
                title: broadcast.title,
                content: broadcast.content,
                broadcast_type: broadcast.broadcastType,
                created_by: broadcast.createdBy,
                created_at: broadcast.createdAt.toISOString(),
                delivered_to: broadcast.deliveredTo,
                read_by: broadcast.readBy,
                acknowledged_by: broadcast.acknowledgedBy,
                requires_acknowledgment: broadcast.requiresAcknowledgment
            });
    }

    /**
     * Update notification delivery status
     */
    private async updateNotificationDelivery(notificationId: string, deliveredTo: string[]): Promise<void> {
        await this.supabase
            .from('department_notifications')
            .update({ 
                status: 'sent',
                delivered_to: deliveredTo,
                delivered_at: new Date().toISOString()
            })
            .eq('id', notificationId);
    }

    /**
     * Map database record to notification object
     */
    private mapDatabaseToNotification(record: any): DepartmentNotification {
        return {
            id: record.id,
            departmentId: record.department_id,
            title: record.title,
            message: record.message,
            type: record.type,
            priority: record.priority,
            createdBy: record.created_by,
            createdAt: new Date(record.created_at),
            scheduledFor: record.scheduled_for ? new Date(record.scheduled_for) : undefined,
            expiresAt: record.expires_at ? new Date(record.expires_at) : undefined,
            recipients: record.recipients,
            channels: record.channels,
            status: record.status,
            metadata: record.metadata
        };
    }

    /**
     * Get broadcast priority based on type
     */
    private getBroadcastPriority(broadcastType: string): 'low' | 'medium' | 'high' | 'urgent' {
        const priorityMap: { [key: string]: 'low' | 'medium' | 'high' | 'urgent' } = {
            emergency: 'urgent',
            policy_update: 'high',
            meeting: 'high',
            training: 'medium',
            achievement: 'low',
            general: 'low'
        };

        return priorityMap[broadcastType] || 'medium';
    }

    /**
     * Calculate next execution time for recurring notifications
     */
    private calculateNextExecution(schedule: any): string {
        const now = new Date();
        const [hours, minutes] = schedule.time.split(':').map(Number);

        let nextExecution = new Date();
        nextExecution.setHours(hours, minutes, 0, 0);

        switch (schedule.frequency) {
            case 'daily':
                if (nextExecution <= now) {
                    nextExecution.setDate(nextExecution.getDate() + 1);
                }
                break;
            case 'weekly':
                const targetDay = schedule.dayOfWeek || 1; // Default to Monday
                const currentDay = nextExecution.getDay();
                const daysUntilTarget = (targetDay - currentDay + 7) % 7;
                
                if (daysUntilTarget === 0 && nextExecution <= now) {
                    nextExecution.setDate(nextExecution.getDate() + 7);
                } else {
                    nextExecution.setDate(nextExecution.getDate() + daysUntilTarget);
                }
                break;
            case 'monthly':
                const targetDate = schedule.dayOfMonth || 1;
                nextExecution.setDate(targetDate);
                
                if (nextExecution <= now) {
                    nextExecution.setMonth(nextExecution.getMonth() + 1);
                }
                break;
        }

        return nextExecution.toISOString();
    }

    /**
     * Generate unique notification ID
     */
    private generateNotificationId(): string {
        return `dept_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique broadcast ID
     */
    private generateBroadcastId(): string {
        return `dept_broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique schedule ID
     */
    private generateScheduleId(): string {
        return `dept_schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default new DepartmentNotificationService();