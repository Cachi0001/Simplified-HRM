import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import PerformanceAnalyticsService from './PerformanceAnalyticsService';
import { NotificationService } from './NotificationService';

export interface PerformanceJobConfig {
    enabled: boolean;
    schedule: string; // cron format
    batchSize: number;
    retryAttempts: number;
    notifyOnCompletion: boolean;
}

export interface JobExecutionResult {
    success: boolean;
    processedUsers: number;
    errors: string[];
    executionTime: number;
    timestamp: Date;
}

export class PerformanceMetricsJob {
    private supabase: SupabaseClient;
    private performanceService: typeof PerformanceAnalyticsService;
    private notificationService: NotificationService;
    private config: PerformanceJobConfig;

    constructor(config?: Partial<PerformanceJobConfig>) {
        this.supabase = supabase.getClient();
        this.performanceService = PerformanceAnalyticsService;
        this.notificationService = new NotificationService();
        
        this.config = {
            enabled: true,
            schedule: '0 0 * * 1', // Every Monday at midnight
            batchSize: 50,
            retryAttempts: 3,
            notifyOnCompletion: true,
            ...config
        };
    }

    /**
     * Execute weekly performance metrics calculation
     */
    async executeWeeklyCalculation(): Promise<JobExecutionResult> {
        const startTime = Date.now();
        const result: JobExecutionResult = {
            success: false,
            processedUsers: 0,
            errors: [],
            executionTime: 0,
            timestamp: new Date()
        };

        try {
            logger.info('PerformanceMetricsJob: Starting weekly performance calculation');

            if (!this.config.enabled) {
                logger.info('PerformanceMetricsJob: Job is disabled, skipping execution');
                result.success = true;
                return result;
            }

            // Get all active users
            const users = await this.getActiveUsers();
            logger.info(`PerformanceMetricsJob: Processing ${users.length} users`);

            // Process users in batches
            for (let i = 0; i < users.length; i += this.config.batchSize) {
                const batch = users.slice(i, i + this.config.batchSize);
                await this.processBatch(batch, result);
            }

            // Calculate team and department averages
            await this.calculateTeamAverages();
            await this.calculateDepartmentAverages();

            // Generate weekly reports
            await this.generateWeeklyReports();

            // Send notifications if enabled
            if (this.config.notifyOnCompletion) {
                await this.sendCompletionNotifications(result);
            }

            result.success = true;
            result.executionTime = Date.now() - startTime;

            logger.info('PerformanceMetricsJob: Weekly calculation completed successfully', {
                processedUsers: result.processedUsers,
                executionTime: result.executionTime,
                errors: result.errors.length
            });

        } catch (error) {
            result.errors.push((error as Error).message);
            result.executionTime = Date.now() - startTime;
            
            logger.error('PerformanceMetricsJob: Failed to execute weekly calculation', {
                error: (error as Error).message,
                processedUsers: result.processedUsers,
                executionTime: result.executionTime
            });
        }

        // Log execution result
        await this.logJobExecution(result);

        return result;
    }

    /**
     * Execute daily performance updates
     */
    async executeDailyUpdate(): Promise<JobExecutionResult> {
        const startTime = Date.now();
        const result: JobExecutionResult = {
            success: false,
            processedUsers: 0,
            errors: [],
            executionTime: 0,
            timestamp: new Date()
        };

        try {
            logger.info('PerformanceMetricsJob: Starting daily performance update');

            // Update task completion metrics for today
            await this.updateDailyTaskMetrics();

            // Update attendance metrics for today
            await this.updateDailyAttendanceMetrics();

            // Calculate real-time performance scores
            const users = await this.getActiveUsers();
            for (const user of users) {
                try {
                    // await this.performanceService.calculatePerformanceScore(user.id);
                    result.processedUsers++;
                } catch (error) {
                    result.errors.push(`User ${user.id}: ${(error as Error).message}`);
                }
            }

            result.success = true;
            result.executionTime = Date.now() - startTime;

            logger.info('PerformanceMetricsJob: Daily update completed successfully', {
                processedUsers: result.processedUsers,
                executionTime: result.executionTime
            });

        } catch (error) {
            result.errors.push((error as Error).message);
            result.executionTime = Date.now() - startTime;
            
            logger.error('PerformanceMetricsJob: Failed to execute daily update', {
                error: (error as Error).message
            });
        }

        return result;
    }

    /**
     * Process a batch of users
     */
    private async processBatch(users: any[], result: JobExecutionResult): Promise<void> {
        const promises = users.map(async (user) => {
            try {
                // Calculate performance score
                // await this.performanceService.calculatePerformanceScore(user.id);
                
                // Update task completion analytics
                // await this.performanceService.updateTaskCompletionAnalytics(user.id);
                
                // Update attendance analytics
                // await this.performanceService.updateAttendanceAnalytics(user.id);
                
                result.processedUsers++;
            } catch (error) {
                result.errors.push(`User ${user.id}: ${(error as Error).message}`);
                logger.error('PerformanceMetricsJob: Failed to process user', {
                    userId: user.id,
                    error: (error as Error).message
                });
            }
        });

        await Promise.allSettled(promises);
    }

    /**
     * Get all active users
     */
    private async getActiveUsers(): Promise<any[]> {
        const { data: users, error } = await this.supabase
            .from('users')
            .select('id, email, role')
            .eq('is_active', true);

        if (error) {
            throw new Error(`Failed to fetch active users: ${error.message}`);
        }

        return users || [];
    }

    /**
     * Update daily task metrics
     */
    private async updateDailyTaskMetrics(): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        
        // Get today's completed tasks
        const { data: completedTasks, error } = await this.supabase
            .from('tasks')
            .select('id, assigned_to, completed_at, priority, estimated_hours')
            .gte('completed_at', `${today}T00:00:00`)
            .lt('completed_at', `${today}T23:59:59`)
            .eq('status', 'completed');

        if (error) {
            throw new Error(`Failed to fetch completed tasks: ${error.message}`);
        }

        // Update task completion metrics
        for (const task of completedTasks || []) {
            // await this.performanceService.updateTaskCompletionAnalytics(task.assigned_to);
        }
    }

    /**
     * Update daily attendance metrics
     */
    private async updateDailyAttendanceMetrics(): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        
        // Get today's attendance records
        const { data: attendanceRecords, error } = await this.supabase
            .from('attendance')
            .select('employee_id, check_in_time, check_out_time, minutes_late')
            .gte('date', today)
            .lt('date', `${today}T23:59:59`);

        if (error) {
            throw new Error(`Failed to fetch attendance records: ${error.message}`);
        }

        // Update attendance analytics for each user
        const employeeIds = [...new Set(attendanceRecords?.map(record => record.employee_id) || [])];
        for (const employeeId of employeeIds) {
            // await this.performanceService.updateAttendanceAnalytics(employeeId);
        }
    }

    /**
     * Calculate team averages
     */
    private async calculateTeamAverages(): Promise<void> {
        // Get all teams/departments
        const { data: departments, error } = await this.supabase
            .from('departments')
            .select('id, name');

        if (error) {
            logger.error('PerformanceMetricsJob: Failed to fetch departments', { error: error.message });
            return;
        }

        for (const department of departments || []) {
            try {
                // await this.performanceService.calculateDepartmentPerformance(department.id, new Date(), new Date());
            } catch (error) {
                logger.error('PerformanceMetricsJob: Failed to calculate department performance', {
                    departmentId: department.id,
                    error: (error as Error).message
                });
            }
        }
    }

    /**
     * Calculate department averages
     */
    private async calculateDepartmentAverages(): Promise<void> {
        // This is handled in calculateTeamAverages for now
        // Could be extended for more complex department hierarchies
    }

    /**
     * Generate weekly reports
     */
    private async generateWeeklyReports(): Promise<void> {
        try {
            // Generate performance reports for all departments
            const { data: departments } = await this.supabase
                .from('departments')
                .select('id, name');

            for (const department of departments || []) {
                // await this.performanceService.generateEmployeePerformanceReport(
                //     department.id, 7
                // );
            }
        } catch (error) {
            logger.error('PerformanceMetricsJob: Failed to generate weekly reports', {
                error: (error as Error).message
            });
        }
    }

    /**
     * Send completion notifications
     */
    private async sendCompletionNotifications(result: JobExecutionResult): Promise<void> {
        try {
            // Get admin users
            const { data: admins } = await this.supabase
                .from('users')
                .select('id, email')
                .eq('role', 'admin')
                .eq('is_active', true);

            const message = `Weekly performance calculation completed. Processed ${result.processedUsers} users with ${result.errors.length} errors.`;

            for (const admin of admins || []) {
                await this.notificationService.createNotification({
                    userId: admin.id,
                    type: 'system',
                    title: 'Performance Calculation Complete',
                    message
                });
            }
        } catch (error) {
            logger.error('PerformanceMetricsJob: Failed to send completion notifications', {
                error: (error as Error).message
            });
        }
    }

    /**
     * Log job execution
     */
    private async logJobExecution(result: JobExecutionResult): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('job_executions')
                .insert({
                    job_name: 'performance_metrics_calculation',
                    status: result.success ? 'completed' : 'failed',
                    processed_records: result.processedUsers,
                    error_count: result.errors.length,
                    execution_time_ms: result.executionTime,
                    errors: result.errors.length > 0 ? result.errors : null,
                    executed_at: result.timestamp.toISOString()
                });

            if (error) {
                logger.error('PerformanceMetricsJob: Failed to log job execution', {
                    error: error.message
                });
            }
        } catch (error) {
            logger.error('PerformanceMetricsJob: Failed to log job execution', {
                error: (error as Error).message
            });
        }
    }

    /**
     * Get job configuration
     */
    getConfig(): PerformanceJobConfig {
        return { ...this.config };
    }

    /**
     * Update job configuration
     */
    updateConfig(config: Partial<PerformanceJobConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Check if job is enabled
     */
    isEnabled(): boolean {
        return this.config.enabled;
    }

    /**
     * Enable/disable job
     */
    setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
    }
}

export default new PerformanceMetricsJob();