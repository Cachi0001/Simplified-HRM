import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import PerformanceAnalyticsService from './PerformanceAnalyticsService';
import AttendanceAnalyticsService from './AttendanceAnalyticsService';
import TaskCompletionAnalyticsService from './TaskCompletionAnalyticsService';
import EmailTemplateService from './EmailTemplateService';
import { EmailService } from './EmailService';
import db from '../config/database';

export type ReportType = 
    | 'performance_summary' 
    | 'attendance_report' 
    | 'task_completion_report' 
    | 'department_analytics' 
    | 'employee_scorecard'
    | 'executive_dashboard'
    | 'monthly_summary'
    | 'quarterly_review';

export type ReportFormat = 'html' | 'pdf' | 'csv' | 'json';

export interface ReportSchedule {
    id: string;
    reportType: ReportType;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    recipients: string[];
    format: ReportFormat;
    isActive: boolean;
    lastGenerated?: Date;
    nextScheduled: Date;
    parameters: any;
}

export interface GeneratedReport {
    id: string;
    reportType: ReportType;
    format: ReportFormat;
    generatedAt: Date;
    generatedBy: string;
    period: {
        start: Date;
        end: Date;
    };
    data: any;
    summary: {
        keyMetrics: Array<{
            name: string;
            value: string | number;
            trend?: 'up' | 'down' | 'stable';
            change?: number;
        }>;
        insights: string[];
        recommendations: string[];
    };
    content: string; // HTML content
    metadata: {
        totalRecords: number;
        processingTime: number;
        dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
    };
}

export interface ReportTemplate {
    id: string;
    reportType: ReportType;
    name: string;
    description: string;
    template: string;
    parameters: Array<{
        name: string;
        type: 'string' | 'number' | 'date' | 'boolean' | 'select';
        required: boolean;
        defaultValue?: any;
        options?: string[];
    }>;
    isActive: boolean;
}

export class ReportGenerationService {
    private supabase: SupabaseClient;
    private performanceService: typeof PerformanceAnalyticsService;
    private attendanceService: typeof AttendanceAnalyticsService;
    private taskService: typeof TaskCompletionAnalyticsService;
    private emailService: EmailService;

    constructor() {
        this.supabase = supabase.getClient();
        this.performanceService = PerformanceAnalyticsService;
        this.attendanceService = AttendanceAnalyticsService;
        this.taskService = TaskCompletionAnalyticsService;
        this.emailService = new EmailService(db);
    }

    /**
     * Generate a report based on type and parameters
     */
    async generateReport(
        reportType: ReportType,
        startDate: Date,
        endDate: Date,
        parameters: any = {},
        generatedBy: string,
        format: ReportFormat = 'html'
    ): Promise<GeneratedReport> {
        try {
            const startTime = Date.now();
            
            logger.info('ReportGenerationService: Generating report', {
                reportType,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                format,
                generatedBy
            });

            // Generate report data based on type
            const reportData = await this.generateReportData(reportType, startDate, endDate, parameters);

            // Generate report content
            const content = await this.generateReportContent(reportType, reportData, format);

            // Calculate metadata
            const processingTime = Date.now() - startTime;
            const metadata = {
                totalRecords: this.calculateTotalRecords(reportData),
                processingTime,
                dataQuality: this.assessDataQuality(reportData)
            };

            // Create report record
            const report: GeneratedReport = {
                id: this.generateReportId(),
                reportType,
                format,
                generatedAt: new Date(),
                generatedBy,
                period: { start: startDate, end: endDate },
                data: reportData,
                summary: this.generateReportSummary(reportType, reportData),
                content,
                metadata
            };

            // Store report in database
            await this.storeReport(report);

            logger.info('ReportGenerationService: Report generated successfully', {
                reportId: report.id,
                reportType,
                processingTime
            });

            return report;
        } catch (error) {
            logger.error('ReportGenerationService: Failed to generate report', {
                error: (error as Error).message,
                reportType,
                generatedBy
            });
            throw error;
        }
    }

    /**
     * Schedule automated report generation
     */
    async scheduleReport(schedule: Omit<ReportSchedule, 'id' | 'nextScheduled'>): Promise<ReportSchedule> {
        try {
            logger.info('ReportGenerationService: Scheduling report', {
                reportType: schedule.reportType,
                frequency: schedule.frequency
            });

            const nextScheduled = this.calculateNextScheduledTime(schedule.frequency);
            
            const reportSchedule: ReportSchedule = {
                ...schedule,
                id: this.generateScheduleId(),
                nextScheduled
            };

            // Store schedule in database
            await this.supabase
                .from('report_schedules')
                .insert({
                    id: reportSchedule.id,
                    report_type: reportSchedule.reportType,
                    frequency: reportSchedule.frequency,
                    recipients: reportSchedule.recipients,
                    format: reportSchedule.format,
                    is_active: reportSchedule.isActive,
                    next_scheduled: reportSchedule.nextScheduled.toISOString(),
                    parameters: reportSchedule.parameters,
                    created_at: new Date().toISOString()
                });

            logger.info('ReportGenerationService: Report scheduled successfully', {
                scheduleId: reportSchedule.id,
                nextScheduled: reportSchedule.nextScheduled
            });

            return reportSchedule;
        } catch (error) {
            logger.error('ReportGenerationService: Failed to schedule report', {
                error: (error as Error).message,
                reportType: schedule.reportType
            });
            throw error;
        }
    }

    /**
     * Run scheduled reports
     */
    async runScheduledReports(): Promise<{ processed: number; errors: string[] }> {
        try {
            logger.info('ReportGenerationService: Running scheduled reports');

            const now = new Date();
            const errors: string[] = [];
            let processed = 0;

            // Get due scheduled reports
            const { data: schedules, error } = await this.supabase
                .from('report_schedules')
                .select('*')
                .eq('is_active', true)
                .lte('next_scheduled', now.toISOString());

            if (error) {
                throw error;
            }

            // Process each scheduled report
            for (const schedule of schedules || []) {
                try {
                    await this.processScheduledReport(schedule);
                    processed++;
                } catch (reportError) {
                    const errorMessage = `Failed to process scheduled report ${schedule.id}: ${(reportError as Error).message}`;
                    errors.push(errorMessage);
                    logger.error('ReportGenerationService: Scheduled report failed', {
                        scheduleId: schedule.id,
                        error: errorMessage
                    });
                }
            }

            logger.info('ReportGenerationService: Scheduled reports completed', {
                processed,
                errors: errors.length
            });

            return { processed, errors };
        } catch (error) {
            logger.error('ReportGenerationService: Failed to run scheduled reports', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Get available report templates
     */
    async getReportTemplates(): Promise<ReportTemplate[]> {
        try {
            const { data: templates, error } = await this.supabase
                .from('report_templates')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) {
                throw error;
            }

            return templates?.map(template => ({
                id: template.id,
                reportType: template.report_type,
                name: template.name,
                description: template.description,
                template: template.template,
                parameters: template.parameters,
                isActive: template.is_active
            })) || [];
        } catch (error) {
            logger.error('ReportGenerationService: Failed to get report templates', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Send report via email
     */
    async sendReportByEmail(
        reportId: string,
        recipients: string[],
        subject?: string
    ): Promise<void> {
        try {
            logger.info('ReportGenerationService: Sending report by email', {
                reportId,
                recipientCount: recipients.length
            });

            // Get report data
            const { data: reportRecord, error } = await this.supabase
                .from('generated_reports')
                .select('*')
                .eq('id', reportId)
                .single();

            if (error || !reportRecord) {
                throw new Error(`Report not found: ${reportId}`);
            }

            const report = this.mapDatabaseToReport(reportRecord);

            // Generate email content
            const emailSubject = subject || `${this.getReportTypeDisplayName(report.reportType)} - ${report.period.start.toLocaleDateString()} to ${report.period.end.toLocaleDateString()}`;
            
            const emailContent = this.generateEmailReportContent(report);

            // Send to each recipient
            for (const recipient of recipients) {
                try {
                    const html = EmailTemplateService.generateEmailTemplate({
                        recipientName: 'Team Member',
                        title: '📊 Automated Report',
                        subtitle: emailSubject,
                        content: emailContent,
                        actionButton: {
                            text: 'View Full Report',
                            url: `${process.env.FRONTEND_URL}/reports/${reportId}`,
                            color: 'primary'
                        }
                    });

                    await this.emailService.sendEmail({
                        to: recipient,
                        subject: emailSubject,
                        html
                    });
                } catch (emailError) {
                    logger.error('ReportGenerationService: Failed to send report to recipient', {
                        recipient,
                        reportId,
                        error: (emailError as Error).message
                    });
                }
            }

            logger.info('ReportGenerationService: Report sent by email', {
                reportId,
                recipientCount: recipients.length
            });
        } catch (error) {
            logger.error('ReportGenerationService: Failed to send report by email', {
                error: (error as Error).message,
                reportId
            });
            throw error;
        }
    }

    /**
     * Generate report data based on type
     */
    private async generateReportData(
        reportType: ReportType,
        startDate: Date,
        endDate: Date,
        parameters: any
    ): Promise<any> {
        switch (reportType) {
            case 'performance_summary':
                return await this.generatePerformanceSummaryData(startDate, endDate, parameters);
            
            case 'attendance_report':
                return await this.generateAttendanceReportData(startDate, endDate, parameters);
            
            case 'task_completion_report':
                return await this.generateTaskCompletionReportData(startDate, endDate, parameters);
            
            case 'department_analytics':
                return await this.generateDepartmentAnalyticsData(startDate, endDate, parameters);
            
            case 'employee_scorecard':
                return await this.generateEmployeeScorecardData(startDate, endDate, parameters);
            
            case 'executive_dashboard':
                return await this.generateExecutiveDashboardData(startDate, endDate, parameters);
            
            case 'monthly_summary':
                return await this.generateMonthlySummaryData(startDate, endDate, parameters);
            
            case 'quarterly_review':
                return await this.generateQuarterlyReviewData(startDate, endDate, parameters);
            
            default:
                throw new Error(`Unsupported report type: ${reportType}`);
        }
    }

    /**
     * Generate performance summary data
     */
    private async generatePerformanceSummaryData(startDate: Date, endDate: Date, parameters: any): Promise<any> {
        const { departmentId } = parameters;

        // Get employees to analyze
        let employeeQuery = this.supabase
            .from('employees')
            .select('id, full_name, department_id, departments!employees_department_id_fkey(name)')
            .eq('status', 'active');

        if (departmentId) {
            employeeQuery = employeeQuery.eq('department_id', departmentId);
        }

        const { data: employees, error } = await employeeQuery;

        if (error) {
            throw error;
        }

        const performanceData = [];
        
        for (const employee of employees || []) {
            try {
                const performance = await this.performanceService.calculateEmployeePerformance(
                    employee.id,
                    startDate,
                    endDate
                );
                performanceData.push(performance);
            } catch (error) {
                logger.warn('ReportGenerationService: Failed to get performance for employee', {
                    employeeId: employee.id,
                    error: (error as Error).message
                });
            }
        }

        return {
            employees: performanceData,
            summary: this.calculatePerformanceSummary(performanceData),
            rankings: performanceData
                .sort((a, b) => b.scores.overall - a.scores.overall)
                .slice(0, 10)
        };
    }

    /**
     * Generate attendance report data
     */
    private async generateAttendanceReportData(startDate: Date, endDate: Date, parameters: any): Promise<any> {
        const { departmentId } = parameters;

        const attendanceReport = await this.attendanceService.generateAttendanceReport(
            'custom',
            startDate,
            endDate,
            departmentId
        );

        return attendanceReport;
    }

    /**
     * Generate task completion report data
     */
    private async generateTaskCompletionReportData(startDate: Date, endDate: Date, parameters: any): Promise<any> {
        const { departmentId, employeeId } = parameters;

        let reportType: 'individual' | 'department' | 'company' = 'company';
        let targetId: string | undefined;

        if (employeeId) {
            reportType = 'individual';
            targetId = employeeId;
        } else if (departmentId) {
            reportType = 'department';
            targetId = departmentId;
        }

        const taskReport = await this.taskService.generateTaskDeliveryReport(
            reportType,
            startDate,
            endDate,
            targetId
        );

        return taskReport;
    }

    /**
     * Generate department analytics data
     */
    private async generateDepartmentAnalyticsData(startDate: Date, endDate: Date, parameters: any): Promise<any> {
        const { data: departments, error } = await this.supabase
            .from('departments')
            .select('id, name')
            .eq('is_active', true);

        if (error) {
            throw error;
        }

        const departmentAnalytics = [];

        for (const department of departments || []) {
            try {
                const [performance, attendance, tasks] = await Promise.all([
                    this.performanceService.calculateDepartmentPerformance(department.id, startDate, endDate),
                    this.attendanceService.analyzeDepartmentAttendance(department.id, startDate, endDate),
                    this.taskService.analyzeDepartmentTaskCompletion(department.id, startDate, endDate)
                ]);

                departmentAnalytics.push({
                    department,
                    performance,
                    attendance,
                    tasks
                });
            } catch (error) {
                logger.warn('ReportGenerationService: Failed to get analytics for department', {
                    departmentId: department.id,
                    error: (error as Error).message
                });
            }
        }

        return {
            departments: departmentAnalytics,
            summary: this.calculateDepartmentSummary(departmentAnalytics)
        };
    }

    /**
     * Generate employee scorecard data
     */
    private async generateEmployeeScorecardData(startDate: Date, endDate: Date, parameters: any): Promise<any> {
        const { employeeId } = parameters;

        if (!employeeId) {
            throw new Error('Employee ID is required for employee scorecard');
        }

        const [performance, attendance, tasks, insights] = await Promise.all([
            this.performanceService.calculateEmployeePerformance(employeeId, startDate, endDate),
            this.attendanceService.analyzeEmployeeAttendancePattern(employeeId, startDate, endDate),
            this.taskService.analyzeEmployeeTaskCompletion(employeeId, startDate, endDate),
            this.performanceService.generatePerformanceInsights(employeeId, startDate, endDate)
        ]);

        return {
            performance,
            attendance,
            tasks,
            insights,
            scorecard: this.generateScorecard(performance, attendance, tasks)
        };
    }

    /**
     * Generate executive dashboard data
     */
    private async generateExecutiveDashboardData(startDate: Date, endDate: Date, parameters: any): Promise<any> {
        const [
            performanceRankings,
            attendanceReport,
            taskReport,
            departmentAnalytics
        ] = await Promise.all([
            this.performanceService.getPerformanceRankings(startDate, endDate, undefined, 20),
            this.attendanceService.generateAttendanceReport('custom', startDate, endDate),
            this.taskService.generateTaskDeliveryReport('company', startDate, endDate),
            this.generateDepartmentAnalyticsData(startDate, endDate, {})
        ]);

        return {
            overview: {
                totalEmployees: attendanceReport.summary.totalEmployees,
                averagePerformance: this.calculateAveragePerformance(performanceRankings),
                attendanceRate: attendanceReport.summary.averageAttendanceRate,
                taskCompletionRate: (taskReport.summary.completedTasks / taskReport.summary.totalTasks) * 100
            },
            topPerformers: performanceRankings.slice(0, 5),
            departmentSummary: departmentAnalytics.summary,
            alerts: [
                ...attendanceReport.alerts,
                ...taskReport.alerts
            ],
            trends: this.calculateExecutiveTrends(performanceRankings, attendanceReport, taskReport)
        };
    }

    /**
     * Generate monthly summary data
     */
    private async generateMonthlySummaryData(startDate: Date, endDate: Date, parameters: any): Promise<any> {
        // Similar to executive dashboard but with monthly focus
        return await this.generateExecutiveDashboardData(startDate, endDate, parameters);
    }

    /**
     * Generate quarterly review data
     */
    private async generateQuarterlyReviewData(startDate: Date, endDate: Date, parameters: any): Promise<any> {
        // Extended version of monthly summary with quarterly comparisons
        const currentData = await this.generateExecutiveDashboardData(startDate, endDate, parameters);
        
        // Get previous quarter for comparison
        const quarterLength = endDate.getTime() - startDate.getTime();
        const prevQuarterEnd = new Date(startDate.getTime() - 1);
        const prevQuarterStart = new Date(prevQuarterEnd.getTime() - quarterLength);

        try {
            const previousData = await this.generateExecutiveDashboardData(prevQuarterStart, prevQuarterEnd, parameters);
            
            return {
                current: currentData,
                previous: previousData,
                comparison: this.calculateQuarterlyComparison(currentData, previousData)
            };
        } catch (error) {
            // If previous quarter data is not available, return current data only
            return {
                current: currentData,
                comparison: null
            };
        }
    }

    /**
     * Generate report content based on format
     */
    private async generateReportContent(reportType: ReportType, data: any, format: ReportFormat): Promise<string> {
        switch (format) {
            case 'html':
                return this.generateHtmlContent(reportType, data);
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.generateCsvContent(reportType, data);
            case 'pdf':
                // For now, return HTML that can be converted to PDF
                return this.generateHtmlContent(reportType, data);
            default:
                throw new Error(`Unsupported report format: ${format}`);
        }
    }

    /**
     * Generate HTML content for report
     */
    private generateHtmlContent(reportType: ReportType, data: any): string {
        // This would use templates to generate HTML content
        // For now, returning a basic HTML structure
        return `
            <div class="report-container">
                <h1>${this.getReportTypeDisplayName(reportType)}</h1>
                <div class="report-content">
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    /**
     * Generate CSV content for report
     */
    private generateCsvContent(reportType: ReportType, data: any): string {
        // Basic CSV generation - would be enhanced based on report type
        if (data.employees) {
            const headers = ['Employee Name', 'Department', 'Overall Score', 'Attendance Score', 'Task Score'];
            const rows = data.employees.map((emp: any) => [
                emp.employeeName,
                emp.department || 'N/A',
                emp.scores.overall,
                emp.scores.attendance,
                emp.scores.taskCompletion
            ]);
            
            return [headers, ...rows].map(row => row.join(',')).join('\n');
        }
        
        return 'No data available for CSV export';
    }

    /**
     * Process a scheduled report
     */
    private async processScheduledReport(schedule: any): Promise<void> {
        const { start, end } = this.calculateReportPeriod(schedule.frequency);
        
        // Generate the report
        const report = await this.generateReport(
            schedule.report_type,
            start,
            end,
            schedule.parameters,
            'system',
            schedule.format
        );

        // Send to recipients
        if (schedule.recipients && schedule.recipients.length > 0) {
            await this.sendReportByEmail(report.id, schedule.recipients);
        }

        // Update schedule for next run
        const nextScheduled = this.calculateNextScheduledTime(schedule.frequency);
        
        await this.supabase
            .from('report_schedules')
            .update({
                last_generated: new Date().toISOString(),
                next_scheduled: nextScheduled.toISOString()
            })
            .eq('id', schedule.id);
    }

    /**
     * Calculate report period based on frequency
     */
    private calculateReportPeriod(frequency: string): { start: Date; end: Date } {
        const now = new Date();
        const end = new Date(now);
        let start: Date;

        switch (frequency) {
            case 'daily':
                start = new Date(now);
                start.setDate(start.getDate() - 1);
                break;
            case 'weekly':
                start = new Date(now);
                start.setDate(start.getDate() - 7);
                break;
            case 'monthly':
                start = new Date(now);
                start.setMonth(start.getMonth() - 1);
                break;
            case 'quarterly':
                start = new Date(now);
                start.setMonth(start.getMonth() - 3);
                break;
            default:
                start = new Date(now);
                start.setDate(start.getDate() - 7);
        }

        return { start, end };
    }

    /**
     * Calculate next scheduled time
     */
    private calculateNextScheduledTime(frequency: string): Date {
        const now = new Date();
        const next = new Date(now);

        switch (frequency) {
            case 'daily':
                next.setDate(next.getDate() + 1);
                break;
            case 'weekly':
                next.setDate(next.getDate() + 7);
                break;
            case 'monthly':
                next.setMonth(next.getMonth() + 1);
                break;
            case 'quarterly':
                next.setMonth(next.getMonth() + 3);
                break;
        }

        return next;
    }

    /**
     * Generate report summary
     */
    private generateReportSummary(reportType: ReportType, data: any): any {
        const keyMetrics: Array<{ name: string; value: string | number; trend?: 'up' | 'down' | 'stable' }> = [];
        const insights: string[] = [];
        const recommendations: string[] = [];

        // Generate summary based on report type
        switch (reportType) {
            case 'performance_summary':
                if (data.summary) {
                    keyMetrics.push(
                        { name: 'Average Performance Score', value: data.summary.averageScore },
                        { name: 'Top Performers', value: data.summary.topPerformersCount },
                        { name: 'Employees Analyzed', value: data.employees.length }
                    );
                }
                break;
            
            case 'attendance_report':
                keyMetrics.push(
                    { name: 'Average Attendance Rate', value: `${data.summary.averageAttendanceRate}%` },
                    { name: 'Total Employees', value: data.summary.totalEmployees },
                    { name: 'Late Employees', value: data.summary.lateEmployees }
                );
                break;
        }

        return { keyMetrics, insights, recommendations };
    }

    /**
     * Store report in database
     */
    private async storeReport(report: GeneratedReport): Promise<void> {
        await this.supabase
            .from('generated_reports')
            .insert({
                id: report.id,
                report_type: report.reportType,
                format: report.format,
                generated_at: report.generatedAt.toISOString(),
                generated_by: report.generatedBy,
                period_start: report.period.start.toISOString(),
                period_end: report.period.end.toISOString(),
                data: report.data,
                summary: report.summary,
                content: report.content,
                metadata: report.metadata
            });
    }

    /**
     * Helper methods
     */
    private generateReportId(): string {
        return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateScheduleId(): string {
        return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getReportTypeDisplayName(reportType: ReportType): string {
        const displayNames: { [key in ReportType]: string } = {
            performance_summary: 'Performance Summary',
            attendance_report: 'Attendance Report',
            task_completion_report: 'Task Completion Report',
            department_analytics: 'Department Analytics',
            employee_scorecard: 'Employee Scorecard',
            executive_dashboard: 'Executive Dashboard',
            monthly_summary: 'Monthly Summary',
            quarterly_review: 'Quarterly Review'
        };
        
        return displayNames[reportType] || reportType;
    }

    private calculateTotalRecords(data: any): number {
        // Calculate based on data structure
        if (data.employees) return data.employees.length;
        if (data.summary && data.summary.totalEmployees) return data.summary.totalEmployees;
        return 0;
    }

    private assessDataQuality(data: any): 'excellent' | 'good' | 'fair' | 'poor' {
        // Simple data quality assessment
        const totalRecords = this.calculateTotalRecords(data);
        
        if (totalRecords >= 50) return 'excellent';
        if (totalRecords >= 20) return 'good';
        if (totalRecords >= 5) return 'fair';
        return 'poor';
    }

    private calculatePerformanceSummary(performanceData: any[]): any {
        if (performanceData.length === 0) {
            return { averageScore: 0, topPerformersCount: 0 };
        }

        const averageScore = performanceData.reduce((sum, p) => sum + p.scores.overall, 0) / performanceData.length;
        const topPerformersCount = performanceData.filter(p => p.scores.overall >= 90).length;

        return {
            averageScore: Math.round(averageScore),
            topPerformersCount
        };
    }

    private calculateDepartmentSummary(departmentAnalytics: any[]): any {
        return {
            totalDepartments: departmentAnalytics.length,
            averagePerformance: departmentAnalytics.reduce((sum, d) => sum + d.performance.averageScores.overall, 0) / departmentAnalytics.length,
            topDepartment: departmentAnalytics.sort((a, b) => b.performance.averageScores.overall - a.performance.averageScores.overall)[0]?.department.name
        };
    }

    private calculateAveragePerformance(rankings: any[]): number {
        if (rankings.length === 0) return 0;
        return rankings.reduce((sum, r) => sum + r.overallScore, 0) / rankings.length;
    }

    private calculateExecutiveTrends(performanceRankings: any[], attendanceReport: any, taskReport: any): any {
        return {
            performance: 'stable',
            attendance: 'stable',
            taskCompletion: 'stable'
        };
    }

    private calculateQuarterlyComparison(current: any, previous: any): any {
        return {
            performanceChange: current.overview.averagePerformance - previous.overview.averagePerformance,
            attendanceChange: current.overview.attendanceRate - previous.overview.attendanceRate,
            taskCompletionChange: current.overview.taskCompletionRate - previous.overview.taskCompletionRate
        };
    }

    private generateScorecard(performance: any, attendance: any, tasks: any): any {
        return {
            overallGrade: this.calculateOverallGrade(performance.scores.overall),
            strengths: [
                ...performance.recommendations.filter((r: string) => r.includes('excellent') || r.includes('outstanding')),
                ...attendance.insights.filter((i: string) => i.includes('consistent') || i.includes('reliable'))
            ],
            improvementAreas: [
                ...performance.recommendations.filter((r: string) => r.includes('improve') || r.includes('focus')),
                ...tasks.recommendations.filter((r: string) => r.includes('improve') || r.includes('enhance'))
            ]
        };
    }

    private calculateOverallGrade(score: number): string {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    private generateEmailReportContent(report: GeneratedReport): string {
        const keyMetricsHtml = report.summary.keyMetrics.map(metric => 
            `<p><strong>${metric.name}:</strong> ${metric.value}</p>`
        ).join('');

        return `
            <p>Your ${this.getReportTypeDisplayName(report.reportType)} for the period ${report.period.start.toLocaleDateString()} to ${report.period.end.toLocaleDateString()} is ready.</p>
            
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #dee2e6;">
                <h3 style="margin: 0 0 15px 0; color: #17a2b8; font-size: 18px;">📊 Key Metrics</h3>
                ${keyMetricsHtml}
            </div>
            
            ${report.summary.insights.length > 0 ? `
                <div style="background-color: #e8f5e8; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #28a745;">
                    <h3 style="margin: 0 0 15px 0; color: #155724; font-size: 18px;">💡 Key Insights</h3>
                    ${report.summary.insights.map(insight => `<p>• ${insight}</p>`).join('')}
                </div>
            ` : ''}
            
            <p>Click the button below to view the complete report with detailed analytics and recommendations.</p>
        `;
    }

    private mapDatabaseToReport(record: any): GeneratedReport {
        return {
            id: record.id,
            reportType: record.report_type,
            format: record.format,
            generatedAt: new Date(record.generated_at),
            generatedBy: record.generated_by,
            period: {
                start: new Date(record.period_start),
                end: new Date(record.period_end)
            },
            data: record.data,
            summary: record.summary,
            content: record.content,
            metadata: record.metadata
        };
    }
}

export default new ReportGenerationService();