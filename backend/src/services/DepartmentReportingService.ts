import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import DepartmentAnalyticsService from './DepartmentAnalyticsService';
import ReportGenerationService from './ReportGenerationService';
import EmailTemplateService from './EmailTemplateService';
import { EmailService } from './EmailService';
import db from '../config/database';

export interface DepartmentReport {
    id: string;
    departmentId: string;
    departmentName: string;
    reportType: 'performance' | 'attendance' | 'productivity' | 'comprehensive' | 'monthly' | 'quarterly';
    period: {
        start: Date;
        end: Date;
    };
    generatedAt: Date;
    generatedBy: string;
    data: {
        metrics: any;
        analytics: any;
        trends: any;
        comparisons?: any;
    };
    summary: {
        keyHighlights: string[];
        majorConcerns: string[];
        recommendations: string[];
        nextActions: string[];
    };
    content: string;
    recipients: string[];
    status: 'draft' | 'sent' | 'scheduled';
}

export interface DepartmentReportSchedule {
    id: string;
    departmentId: string;
    reportType: 'performance' | 'attendance' | 'productivity' | 'comprehensive' | 'monthly' | 'quarterly';
    frequency: 'weekly' | 'monthly' | 'quarterly';
    recipients: string[];
    isActive: boolean;
    lastGenerated?: Date;
    nextScheduled: Date;
    templateId?: string;
}

export class DepartmentReportingService {
    private supabase: SupabaseClient;
    private analyticsService: typeof DepartmentAnalyticsService;
    private reportService: typeof ReportGenerationService;
    private emailService: EmailService;

    constructor() {
        this.supabase = supabase.getClient();
        this.analyticsService = DepartmentAnalyticsService;
        this.reportService = ReportGenerationService;
        this.emailService = new EmailService(db);
    }

    /**
     * Generate department report
     */
    async generateDepartmentReport(
        departmentId: string,
        reportType: 'performance' | 'attendance' | 'productivity' | 'comprehensive' | 'monthly' | 'quarterly',
        startDate: Date,
        endDate: Date,
        generatedBy: string,
        templateId?: string
    ): Promise<DepartmentReport> {
        try {
            logger.info('DepartmentReportingService: Generating department report', {
                departmentId,
                reportType,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });

            // Get department details
            const { data: department, error: deptError } = await this.supabase
                .from('departments')
                .select('id, name, manager_id')
                .eq('id', departmentId)
                .single();

            if (deptError || !department) {
                throw new Error(`Department not found: ${departmentId}`);
            }

            // Gather report data based on type
            const reportData = await this.gatherReportData(departmentId, reportType, startDate, endDate);

            // Generate report content
            const content = await this.generateReportContent(reportType, reportData, templateId);

            // Generate summary
            const summary = this.generateReportSummary(reportType, reportData);

            // Get default recipients
            const recipients = await this.getDefaultRecipients(departmentId);

            const report: DepartmentReport = {
                id: this.generateReportId(),
                departmentId,
                departmentName: department.name,
                reportType,
                period: { start: startDate, end: endDate },
                generatedAt: new Date(),
                generatedBy,
                data: reportData,
                summary,
                content,
                recipients,
                status: 'draft'
            };

            // Store report
            await this.storeReport(report);

            logger.info('DepartmentReportingService: Department report generated', {
                reportId: report.id,
                departmentId,
                reportType
            });

            return report;
        } catch (error) {
            logger.error('DepartmentReportingService: Failed to generate department report', {
                error: (error as Error).message,
                departmentId,
                reportType
            });
            throw error;
        }
    }

    /**
     * Send department report via email
     */
    async sendDepartmentReport(
        reportId: string,
        recipients?: string[],
        customMessage?: string
    ): Promise<void> {
        try {
            logger.info('DepartmentReportingService: Sending department report', {
                reportId,
                recipientCount: recipients?.length
            });

            // Get report
            const { data: reportRecord, error } = await this.supabase
                .from('department_reports')
                .select('*')
                .eq('id', reportId)
                .single();

            if (error || !reportRecord) {
                throw new Error(`Report not found: ${reportId}`);
            }

            const report = this.mapDatabaseToReport(reportRecord);
            const emailRecipients = recipients || report.recipients;

            if (emailRecipients.length === 0) {
                throw new Error('No recipients specified for report');
            }

            // Generate email content
            const emailContent = this.generateEmailContent(report, customMessage);
            const subject = `${report.departmentName} ${this.getReportTypeDisplayName(report.reportType)} - ${report.period.start.toLocaleDateString()} to ${report.period.end.toLocaleDateString()}`;

            // Send to each recipient
            for (const recipient of emailRecipients) {
                try {
                    const html = EmailTemplateService.generateEmailTemplate({
                        recipientName: 'Team Member',
                        title: '📊 Department Report',
                        subtitle: subject,
                        content: emailContent,
                        actionButton: {
                            text: 'View Full Report',
                            url: `${process.env.FRONTEND_URL}/departments/${report.departmentId}/reports/${reportId}`,
                            color: 'primary'
                        }
                    });

                    await this.emailService.sendEmail({
                        to: recipient,
                        subject,
                        html
                    });
                } catch (emailError) {
                    logger.error('DepartmentReportingService: Failed to send report to recipient', {
                        recipient,
                        reportId,
                        error: (emailError as Error).message
                    });
                }
            }

            // Update report status
            await this.supabase
                .from('department_reports')
                .update({ status: 'sent', sent_at: new Date().toISOString() })
                .eq('id', reportId);

            logger.info('DepartmentReportingService: Department report sent', {
                reportId,
                recipientCount: emailRecipients.length
            });
        } catch (error) {
            logger.error('DepartmentReportingService: Failed to send department report', {
                error: (error as Error).message,
                reportId
            });
            throw error;
        }
    }

    /**
     * Schedule department report
     */
    async scheduleDepartmentReport(
        schedule: Omit<DepartmentReportSchedule, 'id' | 'nextScheduled'>
    ): Promise<DepartmentReportSchedule> {
        try {
            logger.info('DepartmentReportingService: Scheduling department report', {
                departmentId: schedule.departmentId,
                reportType: schedule.reportType,
                frequency: schedule.frequency
            });

            const nextScheduled = this.calculateNextScheduledTime(schedule.frequency);
            
            const reportSchedule: DepartmentReportSchedule = {
                ...schedule,
                id: this.generateScheduleId(),
                nextScheduled
            };

            // Store schedule
            await this.supabase
                .from('department_report_schedules')
                .insert({
                    id: reportSchedule.id,
                    department_id: reportSchedule.departmentId,
                    report_type: reportSchedule.reportType,
                    frequency: reportSchedule.frequency,
                    recipients: reportSchedule.recipients,
                    is_active: reportSchedule.isActive,
                    next_scheduled: reportSchedule.nextScheduled.toISOString(),
                    template_id: reportSchedule.templateId,
                    created_at: new Date().toISOString()
                });

            logger.info('DepartmentReportingService: Department report scheduled', {
                scheduleId: reportSchedule.id,
                nextScheduled: reportSchedule.nextScheduled
            });

            return reportSchedule;
        } catch (error) {
            logger.error('DepartmentReportingService: Failed to schedule department report', {
                error: (error as Error).message,
                departmentId: schedule.departmentId
            });
            throw error;
        }
    }

    /**
     * Get department reports history
     */
    async getDepartmentReportsHistory(
        departmentId: string,
        limit: number = 20
    ): Promise<DepartmentReport[]> {
        try {
            const { data: reports, error } = await this.supabase
                .from('department_reports')
                .select('*')
                .eq('department_id', departmentId)
                .order('generated_at', { ascending: false })
                .limit(limit);

            if (error) {
                throw error;
            }

            return reports?.map(report => this.mapDatabaseToReport(report)) || [];
        } catch (error) {
            logger.error('DepartmentReportingService: Failed to get reports history', {
                error: (error as Error).message,
                departmentId
            });
            throw error;
        }
    }

    /**
     * Gather report data based on type
     */
    private async gatherReportData(
        departmentId: string,
        reportType: string,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        const data: any = {};

        switch (reportType) {
            case 'performance':
                data.metrics = await this.analyticsService.getDepartmentMetrics(departmentId, startDate, endDate);
                break;
            case 'comprehensive':
                data.metrics = await this.analyticsService.getDepartmentMetrics(departmentId, startDate, endDate);
                data.comparisons = await this.analyticsService.compareDepartments(startDate, endDate);
                break;
            default:
                data.metrics = await this.analyticsService.getDepartmentMetrics(departmentId, startDate, endDate);
        }

        return data;
    }

    /**
     * Generate report content
     */
    private async generateReportContent(
        reportType: string,
        data: any,
        templateId?: string
    ): Promise<string> {
        // Use ReportGenerationService to generate formatted content
        const report = await this.reportService.generateReport(
            reportType as any,
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            new Date(),
            { data, templateId },
            'system',
            'html'
        );
        return report.content;
    }

    /**
     * Generate report summary
     */
    private generateReportSummary(reportType: string, data: any): any {
        const metrics = data.metrics;
        
        return {
            keyHighlights: [
                `Department health score: ${metrics.healthScore}`,
                `Employee count: ${metrics.employeeCount}`,
                `Overall performance: ${metrics.performance.averageOverallScore}%`
            ],
            majorConcerns: metrics.insights.filter((insight: string) => 
                insight.includes('decline') || insight.includes('concern') || insight.includes('attention')
            ),
            recommendations: metrics.recommendations,
            nextActions: this.generateNextActions(metrics)
        };
    }

    /**
     * Generate next actions based on metrics
     */
    private generateNextActions(metrics: any): string[] {
        const actions: string[] = [];

        if (metrics.healthScore < 60) {
            actions.push('Schedule department improvement meeting');
        }

        if (metrics.performance.underPerformers.length > 0) {
            actions.push('Conduct performance review sessions');
        }

        if (metrics.attendance.averageAttendanceRate < 85) {
            actions.push('Review attendance policies and support');
        }

        return actions;
    }

    /**
     * Get default recipients for department reports
     */
    private async getDefaultRecipients(departmentId: string): Promise<string[]> {
        try {
            const { data: department, error } = await this.supabase
                .from('departments')
                .select(`
                    manager_id,
                    employees!employees_department_id_fkey(email)
                `)
                .eq('id', departmentId)
                .single();

            if (error || !department) {
                return [];
            }

            const recipients: string[] = [];

            // Add department manager
            if (department.manager_id) {
                const { data: manager } = await this.supabase
                    .from('employees')
                    .select('email')
                    .eq('id', department.manager_id)
                    .single();

                if (manager?.email) {
                    recipients.push(manager.email);
                }
            }

            return recipients;
        } catch (error) {
            logger.error('DepartmentReportingService: Failed to get default recipients', {
                error: (error as Error).message,
                departmentId
            });
            return [];
        }
    }

    /**
     * Store report in database
     */
    private async storeReport(report: DepartmentReport): Promise<void> {
        await this.supabase
            .from('department_reports')
            .insert({
                id: report.id,
                department_id: report.departmentId,
                department_name: report.departmentName,
                report_type: report.reportType,
                period_start: report.period.start.toISOString(),
                period_end: report.period.end.toISOString(),
                generated_at: report.generatedAt.toISOString(),
                generated_by: report.generatedBy,
                data: report.data,
                summary: report.summary,
                content: report.content,
                recipients: report.recipients,
                status: report.status
            });
    }

    /**
     * Map database record to report object
     */
    private mapDatabaseToReport(record: any): DepartmentReport {
        return {
            id: record.id,
            departmentId: record.department_id,
            departmentName: record.department_name,
            reportType: record.report_type,
            period: {
                start: new Date(record.period_start),
                end: new Date(record.period_end)
            },
            generatedAt: new Date(record.generated_at),
            generatedBy: record.generated_by,
            data: record.data,
            summary: record.summary,
            content: record.content,
            recipients: record.recipients,
            status: record.status
        };
    }

    /**
     * Generate email content for report
     */
    private generateEmailContent(report: DepartmentReport, customMessage?: string): string {
        let content = customMessage || '';
        
        content += `
        <h3>Department Report Summary</h3>
        <p><strong>Period:</strong> ${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()}</p>
        <p><strong>Health Score:</strong> ${report.data.metrics.healthScore}/100</p>
        
        <h4>Key Highlights:</h4>
        <ul>
        ${report.summary.keyHighlights.map(highlight => `<li>${highlight}</li>`).join('')}
        </ul>
        
        <h4>Recommendations:</h4>
        <ul>
        ${report.summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
        `;

        return content;
    }

    /**
     * Get display name for report type
     */
    private getReportTypeDisplayName(reportType: string): string {
        const displayNames: { [key: string]: string } = {
            'performance': 'Performance Report',
            'attendance': 'Attendance Report',
            'productivity': 'Productivity Report',
            'comprehensive': 'Comprehensive Report',
            'monthly': 'Monthly Report',
            'quarterly': 'Quarterly Report'
        };

        return displayNames[reportType] || 'Department Report';
    }

    /**
     * Calculate next scheduled time based on frequency
     */
    private calculateNextScheduledTime(frequency: string): Date {
        const now = new Date();
        
        switch (frequency) {
            case 'weekly':
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            case 'monthly':
                const nextMonth = new Date(now);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                return nextMonth;
            case 'quarterly':
                const nextQuarter = new Date(now);
                nextQuarter.setMonth(nextQuarter.getMonth() + 3);
                return nextQuarter;
            default:
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
    }

    /**
     * Generate unique report ID
     */
    private generateReportId(): string {
        return `dept_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique schedule ID
     */
    private generateScheduleId(): string {
        return `dept_schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default new DepartmentReportingService();