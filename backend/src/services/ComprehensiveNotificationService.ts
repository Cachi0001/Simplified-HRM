import { Pool } from 'pg';
import { NotificationService } from './NotificationService';
import { EmailService } from './EmailService';
import logger from '../utils/logger';

export interface NotificationRequest {
    userId: string;
    type: 'leave_request' | 'purchase_request' | 'task_assignment' | 'task_started' | 'approval_decision';
    title: string;
    message: string;
    data?: Record<string, any>;
    relatedId?: string;
    actionUrl?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    
    // Email specific
    emailTemplate?: string;
    emailData?: Record<string, any>;
    
    // Notification preferences
    sendSystem?: boolean;
    sendEmail?: boolean;
    sendPush?: boolean;
    
    // Conflict prevention
    preventDuplicates?: boolean;
    timeWindowMinutes?: number;
}

export interface BatchNotificationRequest {
    notifications: NotificationRequest[];
    batchId?: string;
    delayBetweenEmails?: number; // milliseconds
}

export class ComprehensiveNotificationService {
    constructor(
        private db: Pool,
        private notificationService: NotificationService,
        private emailService: EmailService
    ) {}

    /**
     * Send comprehensive notification (system + email)
     */
    async sendNotification(request: NotificationRequest): Promise<{
        systemNotification?: any;
        emailSent: boolean;
        skipped: boolean;
        reason?: string;
    }> {
        try {
            logger.info('🔔 [ComprehensiveNotification] Sending notification', {
                userId: request.userId,
                type: request.type,
                sendSystem: request.sendSystem !== false,
                sendEmail: request.sendEmail !== false
            });

            // Get user notification preferences
            const preferences = await this.getUserNotificationPreferences(request.userId, request.type);
            
            // Check if notifications should be sent based on preferences
            const shouldSendSystem = (request.sendSystem !== false) && preferences.system;
            const shouldSendEmail = (request.sendEmail !== false) && preferences.email;

            if (!shouldSendSystem && !shouldSendEmail) {
                return {
                    systemNotification: null,
                    emailSent: false,
                    skipped: true,
                    reason: 'User preferences disabled all notifications'
                };
            }

            let systemNotification = null;
            let emailSent = false;

            // Send system notification
            if (shouldSendSystem) {
                try {
                    systemNotification = await this.notificationService.createNotificationSafe({
                        userId: request.userId,
                        type: request.type,
                        title: request.title,
                        message: request.message,
                        data: request.data,
                        relatedId: request.relatedId,
                        actionUrl: request.actionUrl,
                        priority: request.priority
                    }, request.preventDuplicates, request.timeWindowMinutes);

                    if (systemNotification) {
                        logger.info('✅ [ComprehensiveNotification] System notification sent', {
                            notificationId: systemNotification.id,
                            userId: request.userId
                        });
                    }
                } catch (error) {
                    logger.error('❌ [ComprehensiveNotification] System notification failed', {
                        error: (error as Error).message,
                        userId: request.userId
                    });
                }
            }

            // Send email notification
            if (shouldSendEmail && request.emailTemplate) {
                try {
                    await this.emailService.sendTemplatedEmail(
                        request.userId,
                        request.emailTemplate,
                        request.emailData || {}
                    );
                    emailSent = true;

                    logger.info('📧 [ComprehensiveNotification] Email notification sent', {
                        userId: request.userId,
                        template: request.emailTemplate
                    });
                } catch (error) {
                    logger.error('❌ [ComprehensiveNotification] Email notification failed', {
                        error: (error as Error).message,
                        userId: request.userId,
                        template: request.emailTemplate
                    });
                }
            }

            return {
                systemNotification,
                emailSent,
                skipped: false
            };

        } catch (error) {
            logger.error('❌ [ComprehensiveNotification] Send notification error', {
                error: (error as Error).message,
                userId: request.userId,
                type: request.type
            });
            throw error;
        }
    }

    /**
     * Send batch notifications with rate limiting
     */
    async sendBatchNotifications(request: BatchNotificationRequest): Promise<{
        successful: number;
        failed: number;
        skipped: number;
        results: any[];
    }> {
        try {
            const batchId = request.batchId || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            logger.info('📦 [ComprehensiveNotification] Sending batch notifications', {
                batchId,
                count: request.notifications.length
            });

            const results = [];
            let successful = 0;
            let failed = 0;
            let skipped = 0;

            for (let i = 0; i < request.notifications.length; i++) {
                const notification = request.notifications[i];
                
                try {
                    const result = await this.sendNotification(notification);
                    results.push({ ...result, userId: notification.userId, index: i });

                    if (result.skipped) {
                        skipped++;
                    } else {
                        successful++;
                    }

                    // Rate limiting between emails
                    if (request.delayBetweenEmails && i < request.notifications.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, request.delayBetweenEmails));
                    }

                } catch (error) {
                    failed++;
                    results.push({
                        userId: notification.userId,
                        index: i,
                        error: (error as Error).message,
                        systemNotification: null,
                        emailSent: false,
                        skipped: false
                    });

                    logger.error('❌ [ComprehensiveNotification] Batch notification failed', {
                        batchId,
                        index: i,
                        userId: notification.userId,
                        error: (error as Error).message
                    });
                }
            }

            logger.info('✅ [ComprehensiveNotification] Batch notifications completed', {
                batchId,
                successful,
                failed,
                skipped,
                total: request.notifications.length
            });

            return { successful, failed, skipped, results };

        } catch (error) {
            logger.error('❌ [ComprehensiveNotification] Send batch notifications error', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Send approval notifications to appropriate roles
     */
    async sendApprovalNotifications(
        requestId: string,
        requestType: 'leave' | 'purchase',
        requesterRole: string,
        requesterName: string,
        requestData: Record<string, any>
    ): Promise<void> {
        try {
            // Determine who should receive notifications based on requester role
            let approverRoles: string[] = [];
            let approvalLevel = '';

            switch (requesterRole) {
                case 'employee':
                case 'teamlead':
                    approverRoles = ['hr', 'admin', 'superadmin'];
                    approvalLevel = 'hr_admin';
                    break;
                case 'hr':
                case 'admin':
                    approverRoles = ['superadmin'];
                    approvalLevel = 'superadmin_only';
                    break;
                case 'superadmin':
                    // Auto-approved, no notifications needed
                    logger.info('🔔 [ComprehensiveNotification] Superadmin request auto-approved', {
                        requestId,
                        requestType
                    });
                    return;
                default:
                    approverRoles = ['hr', 'admin', 'superadmin'];
                    approvalLevel = 'hr_admin';
            }

            // Get approvers
            const approversQuery = `
                SELECT u.id as user_id, e.full_name, e.role, u.email
                FROM employees e
                JOIN users u ON e.user_id = u.id
                WHERE e.role = ANY($1) AND e.status = 'active'
            `;
            
            const approversResult = await this.db.query(approversQuery, [approverRoles]);
            const approvers = approversResult.rows;

            if (approvers.length === 0) {
                logger.warn('⚠️ [ComprehensiveNotification] No approvers found', {
                    requestId,
                    requestType,
                    requesterRole,
                    approverRoles
                });
                return;
            }

            // Prepare batch notifications
            const notifications: NotificationRequest[] = approvers.map(approver => ({
                userId: approver.user_id,
                type: `${requestType}_request` as any,
                title: `New ${requestType.charAt(0).toUpperCase() + requestType.slice(1)} Request`,
                message: `${requesterName} has submitted a ${requestType} request that requires your approval`,
                data: {
                    request_id: requestId,
                    request_type: requestType,
                    requester_role: requesterRole,
                    approval_level: approvalLevel,
                    ...requestData
                },
                relatedId: requestId,
                actionUrl: `/dashboard/${requestType}-requests/${requestId}`,
                priority: 'medium',
                emailTemplate: `${requestType}_request_submitted`,
                emailData: {
                    approver_name: approver.full_name,
                    requester_name: requesterName,
                    request_id: requestId,
                    action_url: `${process.env.FRONTEND_URL}/dashboard/${requestType}-requests/${requestId}`,
                    ...requestData
                },
                preventDuplicates: true,
                timeWindowMinutes: 10
            }));

            // Send batch notifications
            await this.sendBatchNotifications({
                notifications,
                delayBetweenEmails: 1000 // 1 second delay between emails
            });

            logger.info('🔔 [ComprehensiveNotification] Approval notifications sent', {
                requestId,
                requestType,
                approverCount: approvers.length,
                approvalLevel
            });

        } catch (error) {
            logger.error('❌ [ComprehensiveNotification] Send approval notifications error', {
                error: (error as Error).message,
                requestId,
                requestType
            });
            throw error;
        }
    }

    /**
     * Send approval decision notifications
     */
    async sendApprovalDecisionNotifications(
        requestId: string,
        requestType: 'leave' | 'purchase',
        decision: 'approved' | 'rejected',
        approverName: string,
        requesterUserId: string,
        requesterName: string,
        comments?: string,
        requestData?: Record<string, any>
    ): Promise<void> {
        try {
            const notification: NotificationRequest = {
                userId: requesterUserId,
                type: 'approval_decision',
                title: `${requestType.charAt(0).toUpperCase() + requestType.slice(1)} Request ${decision.charAt(0).toUpperCase() + decision.slice(1)}`,
                message: `Your ${requestType} request has been ${decision} by ${approverName}`,
                data: {
                    request_id: requestId,
                    request_type: requestType,
                    decision,
                    approver_name: approverName,
                    comments,
                    ...requestData
                },
                relatedId: requestId,
                actionUrl: `/dashboard/${requestType}-requests/${requestId}`,
                priority: 'high',
                emailTemplate: `${requestType}_request_${decision}`,
                emailData: {
                    requester_name: requesterName,
                    approver_name: approverName,
                    request_id: requestId,
                    decision,
                    comments: comments || (decision === 'approved' ? 'No additional comments' : 'No reason provided'),
                    ...requestData
                },
                preventDuplicates: true,
                timeWindowMinutes: 5
            };

            await this.sendNotification(notification);

            logger.info('🔔 [ComprehensiveNotification] Approval decision notification sent', {
                requestId,
                requestType,
                decision,
                requesterUserId
            });

        } catch (error) {
            logger.error('❌ [ComprehensiveNotification] Send approval decision notification error', {
                error: (error as Error).message,
                requestId,
                requestType,
                decision
            });
            throw error;
        }
    }

    /**
     * Get user notification preferences
     */
    private async getUserNotificationPreferences(
        userId: string,
        notificationType: string
    ): Promise<{ system: boolean; email: boolean; push: boolean }> {
        try {
            const query = `
                SELECT system_enabled, email_enabled, push_enabled
                FROM notification_preferences
                WHERE user_id = $1 AND notification_type = $2
            `;
            
            const result = await this.db.query(query, [userId, notificationType]);
            
            if (result.rows.length === 0) {
                // Default preferences if not set
                return { system: true, email: true, push: true };
            }

            const prefs = result.rows[0];
            return {
                system: prefs.system_enabled,
                email: prefs.email_enabled,
                push: prefs.push_enabled
            };

        } catch (error) {
            logger.error('❌ [ComprehensiveNotification] Get user preferences error', {
                error: (error as Error).message,
                userId,
                notificationType
            });
            // Return default preferences on error
            return { system: true, email: true, push: true };
        }
    }

    /**
     * Initialize default notification preferences for a user
     */
    async initializeUserPreferences(userId: string): Promise<void> {
        try {
            const defaultTypes = [
                'leave_request',
                'purchase_request',
                'task_assignment',
                'task_started',
                'approval_decision'
            ];

            const preferences = defaultTypes.map(type => ({
                user_id: userId,
                notification_type: type,
                system_enabled: true,
                email_enabled: true,
                push_enabled: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            const query = `
                INSERT INTO notification_preferences (
                    user_id, notification_type, system_enabled, email_enabled, push_enabled, created_at, updated_at
                ) VALUES ${preferences.map((_, i) => `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`).join(', ')}
                ON CONFLICT (user_id, notification_type) DO NOTHING
            `;

            const values = preferences.flatMap(p => [
                p.user_id, p.notification_type, p.system_enabled, p.email_enabled, p.push_enabled, p.created_at, p.updated_at
            ]);

            await this.db.query(query, values);

            logger.info('✅ [ComprehensiveNotification] User preferences initialized', {
                userId,
                preferencesCount: defaultTypes.length
            });

        } catch (error) {
            logger.error('❌ [ComprehensiveNotification] Initialize user preferences error', {
                error: (error as Error).message,
                userId
            });
            throw error;
        }
    }
}