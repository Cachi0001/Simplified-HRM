import logger from '../utils/logger';

export interface EmailTemplateData {
    recipientName: string;
    title: string;
    subtitle?: string;
    content: string;
    actionButton?: {
        text: string;
        url: string;
        color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
    };
    footerText?: string;
    metadata?: Record<string, any>;
}

export interface NotificationCard {
    title: string;
    content: string;
    type?: 'info' | 'success' | 'warning' | 'danger';
    icon?: string;
}

export class EmailTemplateService {
    private readonly brandColors = {
        primary: '#17a2b8',
        primaryDark: '#138496',
        success: '#28a745',
        successDark: '#1e7e34',
        warning: '#ffc107',
        warningDark: '#e0a800',
        danger: '#dc3545',
        dangerDark: '#c82333',
        info: '#17a2b8',
        infoDark: '#138496'
    };

    private readonly baseStyles = `
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4; 
        }
        .email-container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff; 
            border-radius: 10px; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
            overflow: hidden; 
        }
        .header { 
            padding: 40px 30px; 
            text-align: center; 
            color: white; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 600; 
            letter-spacing: 0.5px; 
        }
        .header p { 
            margin: 10px 0 0 0; 
            font-size: 16px; 
            opacity: 0.9; 
        }
        .content { 
            padding: 40px 30px; 
        }
        .greeting { 
            font-size: 18px; 
            margin-bottom: 20px; 
            color: #333333; 
        }
        .message { 
            font-size: 16px; 
            line-height: 1.6; 
            margin-bottom: 30px; 
            color: #555555; 
        }
        .card { 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
            border: 1px solid #dee2e6; 
        }
        .card h3 { 
            margin: 0 0 15px 0; 
            font-size: 18px; 
        }
        .card p { 
            margin: 5px 0; 
            color: #555; 
        }
        .action-button { 
            display: inline-block; 
            text-decoration: none; 
            padding: 16px 32px; 
            border-radius: 8px; 
            font-weight: 600; 
            letter-spacing: 0.5px; 
            text-transform: uppercase; 
            transition: all 0.3s ease; 
            text-align: center;
        }
        .footer { 
            background-color: #f8f9fa; 
            padding: 30px; 
            text-align: center; 
            border-top: 1px solid #e9ecef; 
        }
        .footer p { 
            margin: 0; 
            font-size: 14px; 
            color: #6c757d; 
        }
        @media only screen and (max-width: 600px) { 
            .email-container { 
                margin: 0; 
                border-radius: 0; 
            } 
            .header { 
                padding: 30px 20px; 
            } 
            .content { 
                padding: 30px 20px; 
            } 
            .action-button { 
                display: block; 
                width: 100%; 
                box-sizing: border-box; 
            } 
        }
    `;

    /**
     * Generate a branded email template
     */
    generateEmailTemplate(data: EmailTemplateData): string {
        const headerColor = this.getHeaderColor(data.actionButton?.color || 'primary');
        const buttonStyles = this.getButtonStyles(data.actionButton?.color || 'primary');
        
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${data.title} - Go3net HR Management System</title>
                <style>
                    ${this.baseStyles}
                    .header { background: ${headerColor}; }
                    .action-button { ${buttonStyles} }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <h1>${data.title}</h1>
                        ${data.subtitle ? `<p>${data.subtitle}</p>` : ''}
                    </div>
                    <div class="content">
                        <p class="greeting">Hello ${data.recipientName},</p>
                        <div class="message">
                            ${data.content}
                        </div>
                        ${data.actionButton ? `
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="${data.actionButton.url}" class="action-button">
                                    ${data.actionButton.text}
                                </a>
                            </div>
                        ` : ''}
                    </div>
                    <div class="footer">
                        <p>${data.footerText || 'This is an automated message from Go3net HR Management System.'}</p>
                        <p style="margin-top: 15px;">© Go3net HR Management System. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Generate notification card HTML
     */
    generateNotificationCard(card: NotificationCard): string {
        const cardClass = this.getCardClass(card.type || 'info');
        const icon = card.icon || this.getDefaultIcon(card.type || 'info');
        
        return `
            <div class="card ${cardClass}">
                <h3>${icon} ${card.title}</h3>
                ${card.content}
            </div>
        `;
    }

    /**
     * Generate request details card for leave requests
     */
    generateLeaveRequestCard(leaveData: any): string {
        return this.generateNotificationCard({
            title: 'Leave Request Details',
            type: 'info',
            icon: '📅',
            content: `
                <p><strong>Leave Type:</strong> ${this.capitalizeFirst(leaveData.type)}</p>
                <p><strong>Start Date:</strong> ${this.formatDate(leaveData.start_date)}</p>
                <p><strong>End Date:</strong> ${this.formatDate(leaveData.end_date)}</p>
                <p><strong>Duration:</strong> ${leaveData.days_requested} working days</p>
                ${leaveData.reason ? `<p><strong>Reason:</strong> ${leaveData.reason}</p>` : ''}
                ${leaveData.notes ? `<p><strong>Notes:</strong> ${leaveData.notes}</p>` : ''}
            `
        });
    }

    /**
     * Generate request details card for purchase requests
     */
    generatePurchaseRequestCard(purchaseData: any): string {
        return this.generateNotificationCard({
            title: 'Purchase Request Details',
            type: 'info',
            icon: '🛒',
            content: `
                <p><strong>Item:</strong> ${purchaseData.item_name}</p>
                <p><strong>Quantity:</strong> ${purchaseData.quantity}</p>
                <p><strong>Unit Price:</strong> $${purchaseData.unit_price.toFixed(2)}</p>
                <p><strong>Total Amount:</strong> $${purchaseData.total_amount.toFixed(2)}</p>
                <p><strong>Urgency:</strong> ${this.capitalizeFirst(purchaseData.urgency)}</p>
                ${purchaseData.vendor ? `<p><strong>Vendor:</strong> ${purchaseData.vendor}</p>` : ''}
                ${purchaseData.category ? `<p><strong>Category:</strong> ${purchaseData.category}</p>` : ''}
                ${purchaseData.justification ? `<p><strong>Justification:</strong> ${purchaseData.justification}</p>` : ''}
                ${purchaseData.expected_delivery_date ? `<p><strong>Expected Delivery:</strong> ${this.formatDate(purchaseData.expected_delivery_date)}</p>` : ''}
            `
        });
    }

    /**
     * Generate attendance notification card
     */
    generateAttendanceCard(attendanceData: any): string {
        const isLate = attendanceData.isLate || attendanceData.minutesLate > 0;
        
        return this.generateNotificationCard({
            title: 'Attendance Information',
            type: isLate ? 'warning' : 'success',
            icon: isLate ? '⏰' : '✅',
            content: `
                <p><strong>Date:</strong> ${this.formatDate(attendanceData.date || new Date())}</p>
                <p><strong>Check-in Time:</strong> ${this.formatTime(attendanceData.checkInTime || new Date())}</p>
                ${isLate ? `<p><strong>Minutes Late:</strong> ${attendanceData.minutesLate}</p>` : ''}
                ${attendanceData.location ? `<p><strong>Location:</strong> Office (${Math.round(attendanceData.distance || 0)}m from office)</p>` : ''}
                ${attendanceData.totalHours ? `<p><strong>Total Hours:</strong> ${attendanceData.totalHours}</p>` : ''}
            `
        });
    }

    /**
     * Generate approval decision card
     */
    generateApprovalDecisionCard(decision: 'approved' | 'rejected', approverName: string, comments?: string): string {
        const isApproved = decision === 'approved';
        
        return this.generateNotificationCard({
            title: `Request ${isApproved ? 'Approved' : 'Rejected'}`,
            type: isApproved ? 'success' : 'danger',
            icon: isApproved ? '✅' : '❌',
            content: `
                <p><strong>Status:</strong> ${isApproved ? 'Approved' : 'Rejected'}</p>
                <p><strong>Reviewed by:</strong> ${approverName}</p>
                <p><strong>Date:</strong> ${this.formatDate(new Date())}</p>
                ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ''}
            `
        });
    }

    /**
     * Generate daily summary card
     */
    generateDailySummaryCard(summary: any): string {
        return this.generateNotificationCard({
            title: 'Daily Summary',
            type: 'info',
            icon: '📊',
            content: `
                <p><strong>Total Pending Requests:</strong> ${summary.totalPending}</p>
                ${Object.entries(summary.byType || {}).map(([type, count]) => 
                    `<p><strong>${this.capitalizeFirst(type)} Requests:</strong> ${count}</p>`
                ).join('')}
                <p><strong>Date:</strong> ${this.formatDate(new Date())}</p>
            `
        });
    }

    /**
     * Get header gradient color based on type
     */
    private getHeaderColor(type: string): string {
        switch (type) {
            case 'success':
                return `linear-gradient(135deg, ${this.brandColors.success} 0%, ${this.brandColors.successDark} 100%)`;
            case 'warning':
                return `linear-gradient(135deg, ${this.brandColors.warning} 0%, ${this.brandColors.warningDark} 100%)`;
            case 'danger':
                return `linear-gradient(135deg, ${this.brandColors.danger} 0%, ${this.brandColors.dangerDark} 100%)`;
            case 'info':
                return `linear-gradient(135deg, ${this.brandColors.info} 0%, ${this.brandColors.infoDark} 100%)`;
            default:
                return `linear-gradient(135deg, ${this.brandColors.primary} 0%, ${this.brandColors.primaryDark} 100%)`;
        }
    }

    /**
     * Get button styles based on type
     */
    private getButtonStyles(type: string): string {
        const baseStyles = 'color: #ffffff; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);';
        
        switch (type) {
            case 'success':
                return `${baseStyles} background: linear-gradient(135deg, ${this.brandColors.success} 0%, ${this.brandColors.successDark} 100%);`;
            case 'warning':
                return `${baseStyles} background: linear-gradient(135deg, ${this.brandColors.warning} 0%, ${this.brandColors.warningDark} 100%); color: #212529;`;
            case 'danger':
                return `${baseStyles} background: linear-gradient(135deg, ${this.brandColors.danger} 0%, ${this.brandColors.dangerDark} 100%);`;
            case 'info':
                return `${baseStyles} background: linear-gradient(135deg, ${this.brandColors.info} 0%, ${this.brandColors.infoDark} 100%);`;
            default:
                return `${baseStyles} background: linear-gradient(135deg, ${this.brandColors.primary} 0%, ${this.brandColors.primaryDark} 100%);`;
        }
    }

    /**
     * Get card CSS class based on type
     */
    private getCardClass(type: string): string {
        switch (type) {
            case 'success':
                return 'card-success';
            case 'warning':
                return 'card-warning';
            case 'danger':
                return 'card-danger';
            case 'info':
            default:
                return 'card-info';
        }
    }

    /**
     * Get default icon for card type
     */
    private getDefaultIcon(type: string): string {
        switch (type) {
            case 'success':
                return '✅';
            case 'warning':
                return '⚠️';
            case 'danger':
                return '❌';
            case 'info':
            default:
                return 'ℹ️';
        }
    }

    /**
     * Format date for display
     */
    private formatDate(date: string | Date): string {
        try {
            const d = typeof date === 'string' ? new Date(date) : date;
            return d.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    }

    /**
     * Format time for display
     */
    private formatTime(time: string | Date): string {
        try {
            const t = typeof time === 'string' ? new Date(time) : time;
            return t.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            return 'Invalid Time';
        }
    }

    /**
     * Capitalize first letter of string
     */
    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Generate additional CSS for card types
     */
    getAdditionalCardStyles(): string {
        return `
            .card-success { 
                background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); 
                border-color: ${this.brandColors.success}; 
            }
            .card-success h3 { color: #155724; }
            .card-warning { 
                background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); 
                border-color: ${this.brandColors.warning}; 
            }
            .card-warning h3 { color: #856404; }
            .card-danger { 
                background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); 
                border-color: ${this.brandColors.danger}; 
            }
            .card-danger h3 { color: #721c24; }
            .card-info { 
                background-color: #f8f9fa; 
                border-color: ${this.brandColors.info}; 
            }
            .card-info h3 { color: ${this.brandColors.info}; }
        `;
    }
}

export default new EmailTemplateService();