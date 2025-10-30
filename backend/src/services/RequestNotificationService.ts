import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import { NotificationService } from './NotificationService';
import { EmailService } from './EmailService';

export type RequestType = 'leave' | 'purchase' | 'expense' | 'travel' | 'overtime';
export type NotificationEvent = 
    | 'request_submitted' 
    | 'approval_required' 
    | 'approved' 
    | 'rejected' 
    | 'changes_requested'
    | 'escalated'
    | 'cancelled';

export interface NotificationTemplate {
    id: string;
    requestType: RequestType;
    event: NotificationEvent;
    emailSubject: string;
    emailTemplate: string;
    systemTitle: string;
    systemMessage: string;
    isActive: boolean;
}

export interface RequestNotificationData {
    requestId: string;
    requestType: RequestType;
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    requestData: any;
    approverId?: string;
    approverName?: string;
    comments?: string;
}

export class RequestNotificationService {
    private supabase: SupabaseClient;
    private notificationService: NotificationService;
    private emailService: EmailService;

    constructor() {
        this.supabase = supabase.getClient();
        this.notificationService = new NotificationService();
        this.emailService = new EmailService();
    }

    /**
     * Send notification when a new request is submitted
     */
    async sendRequestSubmittedNotification(
        requestId: string,
        requestType: RequestType,
        employeeId: string
    ): Promise<void> {
        try {
            logger.info('RequestNotificationService: Sending request submitted notification', {
                requestId,
                requestType,
                employeeId
            });

            const requestData = await this.getRequestData(requestId, requestType);
            if (!requestData) return;

            // Send confirmation to employee
            await this.notificationService.createNotification({
                userId: employeeId,
                type: this.mapRequestTypeToNotificationType(requestType),
                title: `${this.capitalizeRequestType(requestType)} Request Submitted`,
                message: `Your ${requestType} request has been submitted successfully and is pending approval.`,
                relatedId: requestId,
                actionUrl: this.getRequestUrl(requestType)
            });

            // Send email confirmation to employee
            await this.sendEmailNotification(requestData, 'request_submitted');

            // Notify approvers
            await this.notifyApprovers(requestData, 'approval_required');

            logger.info('RequestNotificationService: Request submitted notifications sent', {
                requestId,
                requestType
            });
        } catch (error) {
            logger.error('RequestNotificationService: Failed to send request submitted notification', {
                error: (error as Error).message,
                requestId,
                requestType
            });
        }
    }

    /**
     * Send notification to approver when approval is required
     */
    async sendApprovalRequestNotification(
        approverId: string,
        requestType: RequestType,
        requestId: string,
        stepId: string
    ): Promise<void> {
        try {
            logger.info('RequestNotificationService: Sending approval request notification', {
                approverId,
                requestType,
                requestId,
                stepId
            });

            const requestData = await this.getRequestData(requestId, requestType);
            if (!requestData) return;

            // Send system notification to approver
            await this.notificationService.createNotification({
                userId: approverId,
                type: this.mapRequestTypeToNotificationType(requestType),
                title: `${this.capitalizeRequestType(requestType)} Approval Required`,
                message: `${requestData.employeeName} has submitted a ${requestType} request that requires your approval.`,
                relatedId: requestId,
                actionUrl: `/admin/${requestType}-requests`
            });

            // Send email to approver
            const { data: approver } = await this.supabase
                .from('employees')
                .select('full_name, email')
                .eq('id', approverId)
                .single();

            if (approver) {
                await this.sendApprovalRequestEmail(requestData, approver);
            }

            logger.info('RequestNotificationService: Approval request notification sent', {
                approverId,
                requestId
            });
        } catch (error) {
            logger.error('RequestNotificationService: Failed to send approval request notification', {
                error: (error as Error).message,
                approverId,
                requestId
            });
        }
    }

    /**
     * Send notification when request is approved or rejected
     */
    async sendApprovalDecisionNotification(
        requestId: string,
        requestType: RequestType,
        decision: 'approved' | 'rejected',
        approverId: string,
        comments?: string
    ): Promise<void> {
        try {
            logger.info('RequestNotificationService: Sending approval decision notification', {
                requestId,
                requestType,
                decision,
                approverId
            });

            const requestData = await this.getRequestData(requestId, requestType);
            if (!requestData) return;

            const { data: approver } = await this.supabase
                .from('employees')
                .select('full_name')
                .eq('id', approverId)
                .single();

            const approverName = approver?.full_name || 'Administrator';
            const isApproved = decision === 'approved';

            // Send system notification to employee
            await this.notificationService.createNotification({
                userId: requestData.employeeId,
                type: this.mapRequestTypeToNotificationType(requestType),
                title: `${this.capitalizeRequestType(requestType)} Request ${isApproved ? 'Approved' : 'Rejected'}`,
                message: `Your ${requestType} request has been ${decision} by ${approverName}.${comments ? ` Comments: ${comments}` : ''}`,
                relatedId: requestId,
                actionUrl: this.getRequestUrl(requestType)
            });

            // Send email notification
            await this.sendDecisionEmail(requestData, decision, approverName, comments);

            logger.info('RequestNotificationService: Approval decision notification sent', {
                requestId,
                decision
            });
        } catch (error) {
            logger.error('RequestNotificationService: Failed to send approval decision notification', {
                error: (error as Error).message,
                requestId,
                decision
            });
        }
    }

    /**
     * Send notification when changes are requested
     */
    async sendChangeRequestNotification(
        requestId: string,
        requestType: RequestType,
        comments?: string
    ): Promise<void> {
        try {
            logger.info('RequestNotificationService: Sending change request notification', {
                requestId,
                requestType
            });

            const requestData = await this.getRequestData(requestId, requestType);
            if (!requestData) return;

            // Send system notification to employee
            await this.notificationService.createNotification({
                userId: requestData.employeeId,
                type: this.mapRequestTypeToNotificationType(requestType),
                title: `${this.capitalizeRequestType(requestType)} Request - Changes Requested`,
                message: `Changes have been requested for your ${requestType} request.${comments ? ` Comments: ${comments}` : ''}`,
                relatedId: requestId,
                actionUrl: this.getRequestUrl(requestType)
            });

            // Send email notification
            await this.emailService.sendEmail({
                to: requestData.employeeEmail,
                subject: `Changes Requested - ${this.capitalizeRequestType(requestType)} Request`,
                html: this.generateChangeRequestEmailHtml(requestData, comments)
            });

            logger.info('RequestNotificationService: Change request notification sent', {
                requestId
            });
        } catch (error) {
            logger.error('RequestNotificationService: Failed to send change request notification', {
                error: (error as Error).message,
                requestId
            });
        }
    }

    /**
     * Send notification when request is cancelled
     */
    async sendCancellationNotification(
        requestId: string,
        requestType: RequestType,
        employeeId: string,
        reason?: string
    ): Promise<void> {
        try {
            logger.info('RequestNotificationService: Sending cancellation notification', {
                requestId,
                requestType,
                employeeId
            });

            const requestData = await this.getRequestData(requestId, requestType);
            if (!requestData) return;

            // Send confirmation to employee
            await this.notificationService.createNotification({
                userId: employeeId,
                type: this.mapRequestTypeToNotificationType(requestType),
                title: `${this.capitalizeRequestType(requestType)} Request Cancelled`,
                message: `Your ${requestType} request has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
                relatedId: requestId,
                actionUrl: this.getRequestUrl(requestType)
            });

            // Notify approvers about cancellation
            await this.notifyApproversOfCancellation(requestData, reason);

            logger.info('RequestNotificationService: Cancellation notification sent', {
                requestId
            });
        } catch (error) {
            logger.error('RequestNotificationService: Failed to send cancellation notification', {
                error: (error as Error).message,
                requestId
            });
        }
    }

    /**
     * Send daily summary of pending requests to approvers
     */
    async sendDailyPendingRequestsSummary(): Promise<void> {
        try {
            logger.info('RequestNotificationService: Sending daily pending requests summary');

            // Get all approvers
            const { data: approvers, error: approversError } = await this.supabase
                .from('employees')
                .select('id, full_name, email')
                .in('role', ['super-admin', 'admin', 'hr'])
                .eq('status', 'active');

            if (approversError || !approvers?.length) {
                logger.warn('RequestNotificationService: No approvers found for daily summary');
                return;
            }

            // Get pending requests summary
            const pendingSummary = await this.getPendingRequestsSummary();

            if (pendingSummary.totalPending === 0) {
                logger.info('RequestNotificationService: No pending requests for daily summary');
                return;
            }

            // Send summary to each approver
            for (const approver of approvers) {
                try {
                    await this.emailService.sendEmail({
                        to: approver.email,
                        subject: `Daily Pending Requests Summary - ${new Date().toLocaleDateString()}`,
                        html: this.generateDailySummaryEmailHtml(pendingSummary, approver.full_name)
                    });
                } catch (emailError) {
                    logger.error('RequestNotificationService: Failed to send daily summary to approver', {
                        approverId: approver.id,
                        error: (emailError as Error).message
                    });
                }
            }

            logger.info('RequestNotificationService: Daily pending requests summary sent', {
                approverCount: approvers.length,
                totalPending: pendingSummary.totalPending
            });
        } catch (error) {
            logger.error('RequestNotificationService: Failed to send daily pending requests summary', {
                error: (error as Error).message
            });
        }
    }

    /**
     * Get request data for notifications
     */
    private async getRequestData(requestId: string, requestType: RequestType): Promise<RequestNotificationData | null> {
        try {
            const tableName = `${requestType}_requests`;
            
            const { data: request, error } = await this.supabase
                .from(tableName)
                .select(`
                    *,
                    employee:employees(id, full_name, email)
                `)
                .eq('id', requestId)
                .single();

            if (error || !request) {
                logger.error('RequestNotificationService: Failed to get request data', {
                    error: error?.message,
                    requestId,
                    requestType
                });
                return null;
            }

            return {
                requestId,
                requestType,
                employeeId: request.employee.id,
                employeeName: request.employee.full_name,
                employeeEmail: request.employee.email,
                requestData: request
            };
        } catch (error) {
            logger.error('RequestNotificationService: Failed to get request data', {
                error: (error as Error).message,
                requestId,
                requestType
            });
            return null;
        }
    }

    /**
     * Notify all approvers
     */
    private async notifyApprovers(requestData: RequestNotificationData, event: NotificationEvent): Promise<void> {
        try {
            const { data: approvers, error } = await this.supabase
                .from('employees')
                .select('id, full_name, email')
                .in('role', ['super-admin', 'admin', 'hr'])
                .eq('status', 'active');

            if (error || !approvers?.length) {
                logger.warn('RequestNotificationService: No approvers found');
                return;
            }

            for (const approver of approvers) {
                await this.sendApprovalRequestNotification(
                    approver.id,
                    requestData.requestType,
                    requestData.requestId,
                    '' // stepId not needed for general notifications
                );
            }
        } catch (error) {
            logger.error('RequestNotificationService: Failed to notify approvers', {
                error: (error as Error).message,
                requestId: requestData.requestId
            });
        }
    }

    /**
     * Notify approvers of cancellation
     */
    private async notifyApproversOfCancellation(requestData: RequestNotificationData, reason?: string): Promise<void> {
        try {
            const { data: approvers, error } = await this.supabase
                .from('employees')
                .select('id, full_name, email')
                .in('role', ['super-admin', 'admin', 'hr'])
                .eq('status', 'active');

            if (error || !approvers?.length) return;

            for (const approver of approvers) {
                await this.notificationService.createNotification({
                    userId: approver.id,
                    type: this.mapRequestTypeToNotificationType(requestData.requestType),
                    title: `${this.capitalizeRequestType(requestData.requestType)} Request Cancelled`,
                    message: `${requestData.employeeName} has cancelled their ${requestData.requestType} request.${reason ? ` Reason: ${reason}` : ''}`,
                    relatedId: requestData.requestId,
                    actionUrl: `/admin/${requestData.requestType}-requests`
                });
            }
        } catch (error) {
            logger.error('RequestNotificationService: Failed to notify approvers of cancellation', {
                error: (error as Error).message,
                requestId: requestData.requestId
            });
        }
    }

    /**
     * Send email notification based on template
     */
    private async sendEmailNotification(requestData: RequestNotificationData, event: NotificationEvent): Promise<void> {
        try {
            const template = await this.getNotificationTemplate(requestData.requestType, event);
            
            if (!template) {
                // Use default template
                await this.sendDefaultEmailNotification(requestData, event);
                return;
            }

            const subject = this.interpolateTemplate(template.emailSubject, requestData);
            const html = this.interpolateTemplate(template.emailTemplate, requestData);

            await this.emailService.sendEmail({
                to: requestData.employeeEmail,
                subject,
                html
            });
        } catch (error) {
            logger.error('RequestNotificationService: Failed to send email notification', {
                error: (error as Error).message,
                requestId: requestData.requestId,
                event
            });
        }
    }

    /**
     * Send approval request email to approver
     */
    private async sendApprovalRequestEmail(requestData: RequestNotificationData, approver: any): Promise<void> {
        const requestDetails = this.formatRequestDetails(requestData);
        
        await this.emailService.sendEmail({
            to: approver.email,
            subject: `Approval Required - ${this.capitalizeRequestType(requestData.requestType)} Request from ${requestData.employeeName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #17a2b8;">Approval Required</h2>
                    <p>Hello ${approver.full_name},</p>
                    <p>A new ${requestData.requestType} request requires your approval:</p>
                    
                    <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #495057;">Request Details</h3>
                        <p><strong>Employee:</strong> ${requestData.employeeName}</p>
                        <p><strong>Request Type:</strong> ${this.capitalizeRequestType(requestData.requestType)}</p>
                        ${requestDetails}
                    </div>
                    
                    <p>Please review and approve or reject this request in the admin dashboard.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL}/admin/${requestData.requestType}-requests" 
                           style="background-color: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Review Request
                        </a>
                    </div>
                    
                    <p>Best regards,<br>HR Management System</p>
                </div>
            `
        });
    }

    /**
     * Send decision email to employee
     */
    private async sendDecisionEmail(
        requestData: RequestNotificationData,
        decision: 'approved' | 'rejected',
        approverName: string,
        comments?: string
    ): Promise<void> {
        const isApproved = decision === 'approved';
        const statusColor = isApproved ? '#28a745' : '#dc3545';
        const statusIcon = isApproved ? '✅' : '❌';
        
        await this.emailService.sendEmail({
            to: requestData.employeeEmail,
            subject: `${this.capitalizeRequestType(requestData.requestType)} Request ${isApproved ? 'Approved' : 'Rejected'}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: ${statusColor};">${statusIcon} Request ${isApproved ? 'Approved' : 'Rejected'}</h2>
                    <p>Hello ${requestData.employeeName},</p>
                    <p>Your ${requestData.requestType} request has been <strong>${decision}</strong> by ${approverName}.</p>
                    
                    <div style="background-color: ${isApproved ? '#d4edda' : '#f8d7da'}; border-radius: 5px; padding: 20px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: ${isApproved ? '#155724' : '#721c24'};">Decision Details</h3>
                        <p><strong>Status:</strong> ${isApproved ? 'Approved' : 'Rejected'}</p>
                        <p><strong>Reviewed by:</strong> ${approverName}</p>
                        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                        ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ''}
                    </div>
                    
                    ${isApproved ? 
                        '<p>Your request has been approved. You will be notified of any next steps if required.</p>' :
                        '<p>If you have questions about this decision, please contact your supervisor or HR department.</p>'
                    }
                    
                    <p>You can view your request details in your dashboard.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL}/${requestData.requestType}-requests" 
                           style="background-color: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            View Request
                        </a>
                    </div>
                    
                    <p>Best regards,<br>HR Management System</p>
                </div>
            `
        });
    }

    /**
     * Generate change request email HTML
     */
    private generateChangeRequestEmailHtml(requestData: RequestNotificationData, comments?: string): string {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ffc107;">⚠️ Changes Requested</h2>
                <p>Hello ${requestData.employeeName},</p>
                <p>Changes have been requested for your ${requestData.requestType} request.</p>
                
                <div style="background-color: #fff3cd; border-radius: 5px; padding: 20px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #856404;">Requested Changes</h3>
                    ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : '<p>Please review and update your request as needed.</p>'}
                </div>
                
                <p>Please make the necessary changes and resubmit your request.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL}/${requestData.requestType}-requests" 
                       style="background-color: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Update Request
                    </a>
                </div>
                
                <p>Best regards,<br>HR Management System</p>
            </div>
        `;
    }

    /**
     * Generate daily summary email HTML
     */
    private generateDailySummaryEmailHtml(summary: any, approverName: string): string {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #17a2b8;">📋 Daily Pending Requests Summary</h2>
                <p>Hello ${approverName},</p>
                <p>Here's your daily summary of pending requests requiring approval:</p>
                
                <div style="background-color: #f8f9fa; border-radius: 5px; padding: 20px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #495057;">Summary</h3>
                    <p><strong>Total Pending:</strong> ${summary.totalPending}</p>
                    ${Object.entries(summary.byType).map(([type, count]) => 
                        `<p><strong>${this.capitalizeRequestType(type)}:</strong> ${count}</p>`
                    ).join('')}
                </div>
                
                <p>Please review these requests at your earliest convenience.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL}/admin/requests" 
                       style="background-color: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Review Requests
                    </a>
                </div>
                
                <p>Best regards,<br>HR Management System</p>
            </div>
        `;
    }

    /**
     * Get pending requests summary
     */
    private async getPendingRequestsSummary(): Promise<any> {
        try {
            const requestTypes: RequestType[] = ['leave', 'purchase'];
            const summary = { totalPending: 0, byType: {} as Record<string, number> };

            for (const type of requestTypes) {
                const { count, error } = await this.supabase
                    .from(`${type}_requests`)
                    .select('id', { count: 'exact' })
                    .eq('status', 'pending');

                if (!error && count) {
                    summary.byType[type] = count;
                    summary.totalPending += count;
                }
            }

            return summary;
        } catch (error) {
            logger.error('RequestNotificationService: Failed to get pending requests summary', {
                error: (error as Error).message
            });
            return { totalPending: 0, byType: {} };
        }
    }

    /**
     * Get notification template
     */
    private async getNotificationTemplate(requestType: RequestType, event: NotificationEvent): Promise<NotificationTemplate | null> {
        try {
            const { data, error } = await this.supabase
                .from('notification_templates')
                .select('*')
                .eq('request_type', requestType)
                .eq('event', event)
                .eq('is_active', true)
                .single();

            if (error) return null;

            return {
                id: data.id,
                requestType: data.request_type,
                event: data.event,
                emailSubject: data.email_subject,
                emailTemplate: data.email_template,
                systemTitle: data.system_title,
                systemMessage: data.system_message,
                isActive: data.is_active
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Send default email notification
     */
    private async sendDefaultEmailNotification(requestData: RequestNotificationData, event: NotificationEvent): Promise<void> {
        const subject = `${this.capitalizeRequestType(requestData.requestType)} Request - ${this.capitalizeEvent(event)}`;
        const message = this.getDefaultMessage(requestData, event);

        await this.emailService.sendEmail({
            to: requestData.employeeEmail,
            subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>${subject}</h2>
                    <p>Hello ${requestData.employeeName},</p>
                    <p>${message}</p>
                    <p>Best regards,<br>HR Management System</p>
                </div>
            `
        });
    }

    /**
     * Interpolate template with request data
     */
    private interpolateTemplate(template: string, requestData: RequestNotificationData): string {
        return template
            .replace(/\{\{employeeName\}\}/g, requestData.employeeName)
            .replace(/\{\{requestType\}\}/g, requestData.requestType)
            .replace(/\{\{requestId\}\}/g, requestData.requestId)
            .replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
    }

    /**
     * Format request details for email
     */
    private formatRequestDetails(requestData: RequestNotificationData): string {
        const data = requestData.requestData;
        
        switch (requestData.requestType) {
            case 'leave':
                return `
                    <p><strong>Leave Type:</strong> ${data.type}</p>
                    <p><strong>Start Date:</strong> ${data.start_date}</p>
                    <p><strong>End Date:</strong> ${data.end_date}</p>
                    <p><strong>Days:</strong> ${data.days_requested}</p>
                    ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
                `;
            case 'purchase':
                return `
                    <p><strong>Item:</strong> ${data.item_name}</p>
                    <p><strong>Quantity:</strong> ${data.quantity}</p>
                    <p><strong>Unit Price:</strong> $${data.unit_price}</p>
                    <p><strong>Total Amount:</strong> $${data.total_amount}</p>
                    <p><strong>Urgency:</strong> ${data.urgency}</p>
                    ${data.justification ? `<p><strong>Justification:</strong> ${data.justification}</p>` : ''}
                `;
            default:
                return '<p>Request details available in the system.</p>';
        }
    }

    /**
     * Map request type to notification type
     */
    private mapRequestTypeToNotificationType(requestType: RequestType): 'leave' | 'purchase' | 'task' {
        switch (requestType) {
            case 'leave':
                return 'leave';
            case 'purchase':
                return 'purchase';
            default:
                return 'task';
        }
    }

    /**
     * Get request URL based on type
     */
    private getRequestUrl(requestType: RequestType): string {
        return `/${requestType}-requests`;
    }

    /**
     * Capitalize request type
     */
    private capitalizeRequestType(requestType: string): string {
        return requestType.charAt(0).toUpperCase() + requestType.slice(1);
    }

    /**
     * Capitalize event
     */
    private capitalizeEvent(event: string): string {
        return event.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    /**
     * Get default message for event
     */
    private getDefaultMessage(requestData: RequestNotificationData, event: NotificationEvent): string {
        switch (event) {
            case 'request_submitted':
                return `Your ${requestData.requestType} request has been submitted and is pending approval.`;
            case 'approved':
                return `Your ${requestData.requestType} request has been approved.`;
            case 'rejected':
                return `Your ${requestData.requestType} request has been rejected.`;
            case 'changes_requested':
                return `Changes have been requested for your ${requestData.requestType} request.`;
            default:
                return `Your ${requestData.requestType} request status has been updated.`;
        }
    }
}

export default new RequestNotificationService();