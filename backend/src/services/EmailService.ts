import { Pool } from 'pg';
import logger from '../utils/logger';
import * as nodemailer from 'nodemailer';

export interface EmailTemplate {
    id: string;
    template_name: string;
    template_type: string;
    subject_template: string;
    html_content: string;
    text_content?: string;
    variables: string[];
}

export interface EmailData {
    [key: string]: any;
}

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor(private db: Pool) {
        // Initialize email transporter (configure based on your email provider)
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    /**
     * Send templated email to user
     */
    async sendTemplatedEmail(
        userId: string,
        templateName: string,
        data: EmailData
    ): Promise<void> {
        try {
            // Get user email
            const userQuery = 'SELECT email, full_name FROM users WHERE id = $1';
            const userResult = await this.db.query(userQuery, [userId]);
            
            if (userResult.rows.length === 0) {
                throw new Error('User not found');
            }

            const user = userResult.rows[0];

            // Get email template
            const template = await this.getEmailTemplate(templateName);
            if (!template) {
                throw new Error(`Email template '${templateName}' not found`);
            }

            // Render template with data
            const renderedSubject = this.renderTemplate(template.subject_template, data);
            const renderedHtml = this.renderTemplate(template.html_content, data);
            const renderedText = template.text_content 
                ? this.renderTemplate(template.text_content, data)
                : this.htmlToText(renderedHtml);

            // Send email
            await this.sendEmail({
                to: user.email,
                subject: renderedSubject,
                html: renderedHtml,
                text: renderedText
            });

            // Log delivery
            await this.logEmailDelivery(userId, templateName, 'sent', user.email);

            logger.info('📧 [EmailService] Templated email sent', {
                userId,
                templateName,
                email: user.email
            });

        } catch (error) {
            logger.error('❌ [EmailService] Send templated email error', {
                error: (error as Error).message,
                userId,
                templateName
            });

            // Log failed delivery
            await this.logEmailDelivery(userId, templateName, 'failed', '', (error as Error).message);
            throw error;
        }
    }

    /**
     * Send email to multiple users with same template
     */
    async sendBulkTemplatedEmail(
        userIds: string[],
        templateName: string,
        data: EmailData
    ): Promise<void> {
        try {
            const promises = userIds.map(userId => 
                this.sendTemplatedEmail(userId, templateName, data)
                    .catch(error => {
                        logger.error('❌ [EmailService] Bulk email failed for user', {
                            userId,
                            error: error.message
                        });
                    })
            );

            await Promise.allSettled(promises);

            logger.info('📧 [EmailService] Bulk templated emails processed', {
                templateName,
                userCount: userIds.length
            });

        } catch (error) {
            logger.error('❌ [EmailService] Send bulk templated email error', {
                error: (error as Error).message,
                templateName,
                userCount: userIds.length
            });
            throw error;
        }
    }

    /**
     * Get email template by name
     */
    private async getEmailTemplate(templateName: string): Promise<EmailTemplate | null> {
        try {
            const query = `
                SELECT * FROM email_templates 
                WHERE template_name = $1 AND is_active = true
            `;
            const result = await this.db.query(query, [templateName]);
            
            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];

        } catch (error) {
            logger.error('❌ [EmailService] Get email template error', {
                error: (error as Error).message,
                templateName
            });
            throw error;
        }
    }

    /**
     * Render template with data
     */
    private renderTemplate(template: string, data: EmailData): string {
        let rendered = template;
        
        // Simple template rendering - replace {{variable}} with data values
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            rendered = rendered.replace(regex, String(data[key] || ''));
        });

        return rendered;
    }

    /**
     * Send employee approval email
     */
    async sendApprovalEmail(email: string, employeeName: string, role: string): Promise<void> {
        try {
            const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth`;
            const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Account Approved - Go3Net HR System</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 Account Approved!</h1>
                            <p>Welcome to Go3Net HR Management System</p>
                        </div>
                        <div class="content">
                            <h2>Hello ${employeeName},</h2>
                            <p>Great news! Your employee account has been approved and activated.</p>
                            <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                <strong>Account Details:</strong><br>
                                📧 Email: ${email}<br>
                                👤 Role: ${role.charAt(0).toUpperCase() + role.slice(1)}<br>
                                ✅ Status: Active
                            </div>
                            <p>You can now access the HR system using your registered email and password.</p>
                            <div style="text-align: center;">
                                <a href="${loginUrl}" class="button">Login to Your Account</a>
                            </div>
                            <p>If you have any questions or need assistance, please contact your HR department.</p>
                            <p>Best regards,<br>Go3Net HR Team</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message from Go3Net HR Management System</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
            await this.sendEmail({
                to: email,
                subject: '🎉 Your Go3net Account Has Been Approved!',
                html: emailHtml
            });
            logger.info('Approval email sent successfully', { email, role });
        } catch (error) {
            logger.error('Failed to send approval email', { email, error });
            throw error;
        }
    }

    /**
     * Send employee rejection email
     */
    async sendRejectionEmail(email: string, employeeName: string, reason?: string): Promise<void> {
        try {
            const supportUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/contact`;
            const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Account Application Update - Go3Net HR System</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; background: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                        .reason-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>📋 Account Application Update</h1>
                            <p>Go3Net HR Management System</p>
                        </div>
                        <div class="content">
                            <h2>Hello ${employeeName},</h2>
                            <p>Thank you for your interest in joining Go3Net. After careful review, we regret to inform you that your account application has not been approved at this time.</p>
                            ${reason ? `
                            <div class="reason-box">
                                <strong>Reason:</strong><br>
                                ${reason}
                            </div>
                            ` : ''}
                            <p>We appreciate the time you took to apply and encourage you to consider future opportunities with us.</p>
                            <p>If you have any questions about this decision or would like to discuss your application further, please don't hesitate to contact our HR department.</p>
                            <div style="text-align: center;">
                                <a href="${supportUrl}" class="button">Contact HR Support</a>
                            </div>
                            <p>Thank you for your understanding.</p>
                            <p>Best regards,<br>Go3Net HR Team</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message from Go3Net HR Management System</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
            await this.sendEmail({
                to: email,
                subject: '📋 Go3Net Account Application Update',
                html: emailHtml
            });
            logger.info('Rejection email sent successfully', { email });
        } catch (error) {
            logger.error('Failed to send rejection email', { email, error });
            throw error;
        }
    }

    /**
     * Send raw email
     */
    public async sendEmail(options: {
        to: string;
        subject: string;
        html: string;
        text?: string;
    }): Promise<void> {
        try {
            const mailOptions = {
                from: process.env.SMTP_FROM || 'noreply@go3net.com',
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text
            };

            await this.transporter.sendMail(mailOptions);

        } catch (error) {
            logger.error('❌ [EmailService] Send email error', {
                error: (error as Error).message,
                to: options.to
            });
            throw error;
        }
    }

    /**
     * Log email delivery attempt
     */
    private async logEmailDelivery(
        userId: string,
        templateName: string,
        status: 'sent' | 'failed',
        email: string,
        errorMessage?: string
    ): Promise<void> {
        try {
            const query = `
                INSERT INTO notification_delivery_log (
                    recipient_id, delivery_type, status, recipient_email,
                    template_used, error_message, sent_at
                ) VALUES ($1, 'email', $2, $3, $4, $5, NOW())
            `;

            await this.db.query(query, [
                userId,
                status,
                email,
                templateName,
                errorMessage || null
            ]);

        } catch (error) {
            logger.error('❌ [EmailService] Log email delivery error', {
                error: (error as Error).message
            });
            // Don't throw here as this is just logging
        }
    }

    /**
     * Convert HTML to plain text (simple implementation)
     */
    private htmlToText(html: string): string {
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
    }

    /**
     * Get approver user IDs based on role hierarchy
     */
    async getApproverUserIds(requesterRole: string): Promise<string[]> {
        try {
            let approverRoles: string[] = [];

            switch (requesterRole) {
                case 'employee':
                case 'teamlead':
                    approverRoles = ['hr', 'admin', 'superadmin'];
                    break;
                case 'hr':
                case 'admin':
                    approverRoles = ['superadmin'];
                    break;
                case 'superadmin':
                    // Superadmin requests are auto-approved, no notifications needed
                    return [];
                default:
                    approverRoles = ['hr', 'admin', 'superadmin'];
            }

            const query = `
                SELECT u.id FROM users u
                JOIN employees e ON u.id = e.user_id
                WHERE u.role = ANY($1) AND e.status = 'active'
            `;

            const result = await this.db.query(query, [approverRoles]);
            return result.rows.map(row => row.id);

        } catch (error) {
            logger.error('❌ [EmailService] Get approver user IDs error', {
                error: (error as Error).message,
                requesterRole
            });
            throw error;
        }
    }

    /**
     * Send leave request notification emails
     */
    async sendLeaveRequestNotification(
        leaveRequest: any,
        requesterName: string,
        requesterRole: string
    ): Promise<void> {
        try {
            const approverUserIds = await this.getApproverUserIds(requesterRole);
            
            if (approverUserIds.length === 0) {
                logger.info('📧 [EmailService] No approvers found for leave request', {
                    requesterRole
                });
                return;
            }

            const emailData = {
                employee_name: requesterName,
                leave_type: leaveRequest.type,
                start_date: leaveRequest.start_date,
                end_date: leaveRequest.end_date,
                reason: leaveRequest.notes || leaveRequest.reason || 'No reason provided',
                action_url: `${process.env.FRONTEND_URL}/dashboard/leave-requests/${leaveRequest.id}`
            };

            await this.sendBulkTemplatedEmail(
                approverUserIds,
                'leave_request_submitted',
                emailData
            );

            logger.info('📧 [EmailService] Leave request notification emails sent', {
                leaveRequestId: leaveRequest.id,
                approverCount: approverUserIds.length
            });

        } catch (error) {
            logger.error('❌ [EmailService] Send leave request notification error', {
                error: (error as Error).message,
                leaveRequestId: leaveRequest.id
            });
            // Don't throw here as this is async notification
        }
    }

    /**
     * Send purchase request notification emails
     */
    async sendPurchaseRequestNotification(
        purchaseRequest: any,
        requesterName: string,
        requesterRole: string
    ): Promise<void> {
        try {
            const approverUserIds = await this.getApproverUserIds(requesterRole);
            
            if (approverUserIds.length === 0) {
                logger.info('📧 [EmailService] No approvers found for purchase request', {
                    requesterRole
                });
                return;
            }

            const emailData = {
                employee_name: requesterName,
                item_name: purchaseRequest.item_name,
                amount: purchaseRequest.amount || purchaseRequest.estimated_cost || 'Not specified',
                description: purchaseRequest.description || purchaseRequest.notes || 'No description provided',
                action_url: `${process.env.FRONTEND_URL}/dashboard/purchase-requests/${purchaseRequest.id}`
            };

            await this.sendBulkTemplatedEmail(
                approverUserIds,
                'purchase_request_submitted',
                emailData
            );

            logger.info('📧 [EmailService] Purchase request notification emails sent', {
                purchaseRequestId: purchaseRequest.id,
                approverCount: approverUserIds.length
            });

        } catch (error) {
            logger.error('❌ [EmailService] Send purchase request notification error', {
                error: (error as Error).message,
                purchaseRequestId: purchaseRequest.id
            });
            // Don't throw here as this is async notification
        }
    }

    /**
     * Send task assignment notification emails
     */
    async sendTaskAssignmentNotification(
        task: any,
        assignerName: string,
        assigneeName: string,
        assigneeUserId: string
    ): Promise<void> {
        try {
            const emailData = {
                task_title: task.title,
                assigner_name: assignerName,
                assignee_name: assigneeName,
                due_date: task.due_date || 'No due date specified',
                description: task.description || 'No description provided',
                action_url: `${process.env.FRONTEND_URL}/dashboard/tasks/${task.id}`
            };

            await this.sendTemplatedEmail(
                assigneeUserId,
                'task_assigned',
                emailData
            );

            logger.info('📧 [EmailService] Task assignment notification email sent', {
                taskId: task.id,
                assigneeUserId
            });

        } catch (error) {
            logger.error('❌ [EmailService] Send task assignment notification error', {
                error: (error as Error).message,
                taskId: task.id
            });
            // Don't throw here as this is async notification
        }
    }

    /**
     * Send task started notification emails to relevant stakeholders
     */
    async sendTaskStartedNotification(
        task: any,
        employeeName: string,
        stakeholderUserIds: string[]
    ): Promise<void> {
        try {
            if (stakeholderUserIds.length === 0) {
                return;
            }

            const emailData = {
                task_title: task.title,
                employee_name: employeeName,
                start_time: new Date().toLocaleString()
            };

            await this.sendBulkTemplatedEmail(
                stakeholderUserIds,
                'task_started',
                emailData
            );

            logger.info('📧 [EmailService] Task started notification emails sent', {
                taskId: task.id,
                stakeholderCount: stakeholderUserIds.length
            });

        } catch (error) {
            logger.error('❌ [EmailService] Send task started notification error', {
                error: (error as Error).message,
                taskId: task.id
            });
            // Don't throw here as this is async notification
        }
    }

    /**
     * Send approval confirmation email
     */
    async sendApprovalConfirmation(email: string, fullName: string): Promise<void> {
        try {
            await this.sendEmail({
                to: email,
                subject: 'Account Approved - Welcome to Go3net!',
                html: `
                    <h2>Welcome to Go3net, ${fullName}!</h2>
                    <p>Your account has been approved and you can now access the system.</p>
                    <p>You can log in at: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth</p>
                `,
                text: `Welcome to Go3net, ${fullName}! Your account has been approved and you can now access the system.`
            });

            logger.info('📧 Approval confirmation email sent', { email, fullName });
        } catch (error) {
            logger.error('❌ Failed to send approval confirmation email', {
                error: (error as Error).message,
                email,
                fullName
            });
            throw error;
        }
    }

    /**
     * Send task notification email
     */
    async sendTaskNotification(
        assigneeEmail: string,
        assigneeName: string,
        taskTitle: string,
        assignerName: string
    ): Promise<void> {
        try {
            await this.sendEmail({
                to: assigneeEmail,
                subject: 'New Task Assigned',
                html: `
                    <h2>New Task Assigned</h2>
                    <p>Hello ${assigneeName},</p>
                    <p>You have been assigned a new task: <strong>${taskTitle}</strong></p>
                    <p>Assigned by: ${assignerName}</p>
                    <p>Please log in to view the details: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks</p>
                `,
                text: `New task assigned: ${taskTitle} by ${assignerName}. Please log in to view details.`
            });

            logger.info('📧 Task notification email sent', { assigneeEmail, taskTitle });
        } catch (error) {
            logger.error('❌ Failed to send task notification email', {
                error: (error as Error).message,
                assigneeEmail,
                taskTitle
            });
            throw error;
        }
    }

    /**
     * Send task completion notification email
     */
    async sendTaskCompletionNotification(
        assignerEmail: string,
        assignerName: string,
        taskTitle: string,
        completedByName: string
    ): Promise<void> {
        try {
            await this.sendEmail({
                to: assignerEmail,
                subject: 'Task Completed',
                html: `
                    <h2>Task Completed</h2>
                    <p>Hello ${assignerName},</p>
                    <p>The task <strong>${taskTitle}</strong> has been completed by ${completedByName}.</p>
                    <p>Please log in to review: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks</p>
                `,
                text: `Task completed: ${taskTitle} by ${completedByName}. Please log in to review.`
            });

            logger.info('📧 Task completion notification email sent', { assignerEmail, taskTitle });
        } catch (error) {
            logger.error('❌ Failed to send task completion notification email', {
                error: (error as Error).message,
                assignerEmail,
                taskTitle
            });
            throw error;
        }
    }

    /**
     * Send department assignment notification email
     */
    async sendDepartmentAssignmentNotification(
        employeeEmail: string,
        employeeName: string,
        departmentName: string,
        assignerName: string
    ): Promise<void> {
        try {
            await this.sendEmail({
                to: employeeEmail,
                subject: 'Department Assignment Update',
                html: `
                    <h2>Department Assignment Update</h2>
                    <p>Hello ${employeeName},</p>
                    <p>You have been assigned to the <strong>${departmentName}</strong> department.</p>
                    <p>Updated by: ${assignerName}</p>
                    <p>Please log in to view your updated profile: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings</p>
                `,
                text: `You have been assigned to the ${departmentName} department by ${assignerName}.`
            });

            logger.info('📧 Department assignment notification email sent', { employeeEmail, departmentName });
        } catch (error) {
            logger.error('❌ Failed to send department assignment notification email', {
                error: (error as Error).message,
                employeeEmail,
                departmentName
            });
            throw error;
        }
    }

    /**
     * Send announcement notification email to all employees
     */
    async sendAnnouncementNotification(
        announcement: any,
        authorName: string,
        employees: any[]
    ): Promise<void> {
        try {
            const announcementUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;
            
            const emailPromises = employees.map(async (employee) => {
                try {
                    const emailHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>New Announcement - Go3Net HR System</title>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                                .announcement-box { background: white; padding: 20px; border-left: 4px solid #4CAF50; margin: 20px 0; border-radius: 5px; }
                                .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
                                .priority-high { background: #ff6b6b; color: white; }
                                .priority-medium { background: #4ecdc4; color: white; }
                                .priority-low { background: #95e1d3; color: #333; }
                                .priority-urgent { background: #ff3838; color: white; }
                                .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                                .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>📢 New Announcement</h1>
                                    <p>Go3Net HR Management System</p>
                                </div>
                                <div class="content">
                                    <h2>Hello ${employee.full_name},</h2>
                                    <p>A new announcement has been published:</p>
                                    
                                    <div class="announcement-box">
                                        <div style="margin-bottom: 10px;">
                                            <span class="priority-badge priority-${announcement.priority}">${announcement.priority}</span>
                                        </div>
                                        <h3 style="margin: 0 0 15px 0; color: #333;">${announcement.title}</h3>
                                        <p style="margin: 0; color: #666; line-height: 1.6;">${announcement.content}</p>
                                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; font-size: 14px; color: #888;">
                                            <strong>From:</strong> ${authorName}<br>
                                            <strong>Published:</strong> ${new Date().toLocaleDateString()}
                                        </div>
                                    </div>
                                    
                                    <div style="text-align: center;">
                                        <a href="${announcementUrl}" class="button">View in Dashboard</a>
                                    </div>
                                    
                                    <p style="font-size: 14px; color: #666;">
                                        You can view all announcements and react to them in your dashboard.
                                    </p>
                                    
                                    <p>Best regards,<br>Go3Net HR Team</p>
                                </div>
                                <div class="footer">
                                    <p>This is an automated message from Go3Net HR Management System</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `;

                    await this.sendEmail({
                        to: employee.email,
                        subject: `📢 New Announcement: ${announcement.title}`,
                        html: emailHtml,
                        text: `New Announcement: ${announcement.title}\n\n${announcement.content}\n\nFrom: ${authorName}\n\nView in dashboard: ${announcementUrl}`
                    });

                    logger.info('📧 Announcement email sent', { 
                        employeeEmail: employee.email, 
                        announcementId: announcement.id 
                    });
                } catch (error) {
                    logger.error('❌ Failed to send announcement email to employee', {
                        error: (error as Error).message,
                        employeeEmail: employee.email,
                        announcementId: announcement.id
                    });
                }
            });

            await Promise.allSettled(emailPromises);

            logger.info('📧 Announcement notification emails processed', {
                announcementId: announcement.id,
                employeeCount: employees.length
            });

        } catch (error) {
            logger.error('❌ Failed to send announcement notification emails', {
                error: (error as Error).message,
                announcementId: announcement.id
            });
            throw error;
        }
    }

    /**
     * Send reaction notification email
     */
    async sendReactionNotification(
        authorEmail: string,
        authorName: string,
        reactorName: string,
        announcementTitle: string,
        reactionType: string
    ): Promise<void> {
        try {
            const reactionEmoji = reactionType === 'like' ? '👍' : 
                                 reactionType === 'love' ? '❤️' : 
                                 reactionType === 'laugh' ? '😂' : 
                                 reactionType === 'wow' ? '😮' : 
                                 reactionType === 'sad' ? '😢' : 
                                 reactionType === 'angry' ? '😡' : reactionType;

            const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;

            const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Reaction to Your Announcement - Go3Net HR System</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .reaction-box { background: white; padding: 20px; border-left: 4px solid #4CAF50; margin: 20px 0; border-radius: 5px; text-align: center; }
                        .reaction-emoji { font-size: 48px; margin: 10px 0; }
                        .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>${reactionEmoji} Someone reacted to your announcement!</h1>
                            <p>Go3Net HR Management System</p>
                        </div>
                        <div class="content">
                            <h2>Hello ${authorName},</h2>
                            <p>Great news! Someone reacted to your announcement.</p>
                            
                            <div class="reaction-box">
                                <div class="reaction-emoji">${reactionEmoji}</div>
                                <h3 style="margin: 10px 0; color: #333;">${reactorName} reacted to:</h3>
                                <p style="font-style: italic; color: #666;">"${announcementTitle}"</p>
                            </div>
                            
                            <div style="text-align: center;">
                                <a href="${dashboardUrl}" class="button">View Your Announcements</a>
                            </div>
                            
                            <p style="font-size: 14px; color: #666;">
                                You can see all reactions and engagement on your announcements in the dashboard.
                            </p>
                            
                            <p>Best regards,<br>Go3Net HR Team</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message from Go3Net HR Management System</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            await this.sendEmail({
                to: authorEmail,
                subject: `${reactionEmoji} ${reactorName} reacted to your announcement`,
                html: emailHtml,
                text: `${reactorName} reacted ${reactionEmoji} to your announcement "${announcementTitle}". View in dashboard: ${dashboardUrl}`
            });

            logger.info('📧 Reaction notification email sent', { 
                authorEmail, 
                reactorName, 
                reactionType 
            });
        } catch (error) {
            logger.error('❌ Failed to send reaction notification email', {
                error: (error as Error).message,
                authorEmail,
                reactorName,
                reactionType
            });
            throw error;
        }
    }

    /**
     * Send checkout reminder email
     */
    async sendCheckoutReminder(
        employeeEmail: string,
        employeeName: string
    ): Promise<void> {
        try {
            const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;
            
            const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Checkout Reminder - Go3Net HR System</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .reminder-box { background: white; padding: 20px; border-left: 4px solid #FF6B6B; margin: 20px 0; border-radius: 5px; text-align: center; }
                        .time-emoji { font-size: 48px; margin: 10px 0; }
                        .button { display: inline-block; background: #FF6B6B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                        .urgent { color: #FF6B6B; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🕕 Checkout Reminder</h1>
                            <p>Go3Net HR Management System</p>
                        </div>
                        <div class="content">
                            <h2>Hello ${employeeName},</h2>
                            <p>This is a friendly reminder that it's now <span class="urgent">6:00 PM</span>!</p>
                            
                            <div class="reminder-box">
                                <div class="time-emoji">🕕</div>
                                <h3 style="margin: 10px 0; color: #333;">Don't forget to check out!</h3>
                                <p style="color: #666;">Please remember to check out before leaving the office to ensure accurate attendance tracking.</p>
                            </div>
                            
                            <div style="text-align: center;">
                                <a href="${dashboardUrl}" class="button">Check Out Now</a>
                            </div>
                            
                            <p style="font-size: 14px; color: #666;">
                                If you've already checked out, please disregard this message. 
                                If you're working late, you can check out when you're ready to leave.
                            </p>
                            
                            <p>Best regards,<br>Go3Net HR Team</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated reminder from Go3Net HR Management System</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            await this.sendEmail({
                to: employeeEmail,
                subject: '🕕 Checkout Reminder - 6:00 PM',
                html: emailHtml,
                text: `Hello ${employeeName},\n\nThis is a friendly reminder that it's now 6:00 PM! Don't forget to check out before leaving the office.\n\nYou can check out from the dashboard: ${dashboardUrl}\n\nBest regards,\nGo3Net HR Team`
            });

            logger.info('📧 [EmailService] Checkout reminder email sent successfully', {
                employeeEmail,
                employeeName
            });

        } catch (error) {
            logger.error('❌ [EmailService] Failed to send checkout reminder email', {
                error: (error as Error).message,
                employeeEmail,
                employeeName
            });
            throw error;
        }
    }
}
