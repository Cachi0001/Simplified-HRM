import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';

export interface TaskCompletionMetrics {
    employeeId: string;
    employeeName: string;
    department?: string;
    period: {
        start: Date;
        end: Date;
    };
    metrics: {
        totalTasks: number;
        completedTasks: number;
        overdueTasks: number;
        onTimeTasks: number;
        completionRate: number;
        onTimeRate: number;
        averageCompletionTime: number;
        averageDelayDays: number;
    };
    patterns: {
        mostProductiveDay: string;
        mostProductiveHour: string;
        averageTasksPerDay: number;
        taskComplexityHandling: 'excellent' | 'good' | 'needs_improvement';
        consistencyScore: number;
    };
    insights: string[];
    recommendations: string[];
}

export interface TaskAnalytics {
    taskId: string;
    taskTitle: string;
    assignedTo: string;
    assigneeName: string;
    department?: string;
    createdAt: Date;
    dueDate?: Date;
    completedAt?: Date;
    status: string;
    priority: string;
    estimatedHours?: number;
    actualHours?: number;
    deliveryMetrics: {
        isOnTime: boolean;
        isOverdue: boolean;
        daysEarly: number;
        daysLate: number;
        completionEfficiency: number;
    };
    qualityMetrics: {
        revisionCount: number;
        approvalTime?: number;
        clientSatisfaction?: number;
    };
}

export interface DepartmentTaskAnalytics {
    departmentId: string;
    departmentName: string;
    period: {
        start: Date;
        end: Date;
    };
    metrics: {
        totalTasks: number;
        completedTasks: number;
        averageCompletionRate: number;
        averageOnTimeRate: number;
        averageCompletionTime: number;
        productivityScore: number;
    };
    trends: {
        completionTrend: 'improving' | 'declining' | 'stable';
        qualityTrend: 'improving' | 'declining' | 'stable';
        efficiencyTrend: 'improving' | 'declining' | 'stable';
    };
    topPerformers: Array<{
        employeeId: string;
        employeeName: string;
        completionRate: number;
        onTimeRate: number;
    }>;
    bottlenecks: Array<{
        type: 'employee' | 'task_type' | 'process';
        description: string;
        impact: 'high' | 'medium' | 'low';
        recommendations: string[];
    }>;
}

export interface TaskDeliveryReport {
    reportType: 'individual' | 'department' | 'company';
    period: {
        start: Date;
        end: Date;
    };
    summary: {
        totalTasks: number;
        completedTasks: number;
        onTimeTasks: number;
        overdueTasks: number;
        averageCompletionTime: number;
        overallEfficiency: number;
    };
    deliveryBreakdown: {
        byPriority: Array<{
            priority: string;
            totalTasks: number;
            completedTasks: number;
            averageCompletionTime: number;
            onTimeRate: number;
        }>;
        byDepartment: Array<{
            departmentId: string;
            departmentName: string;
            completionRate: number;
            onTimeRate: number;
            averageCompletionTime: number;
        }>;
        byTaskType: Array<{
            taskType: string;
            totalTasks: number;
            averageCompletionTime: number;
            complexityScore: number;
        }>;
    };
    alerts: Array<{
        type: 'overdue_tasks' | 'low_completion_rate' | 'quality_issues';
        description: string;
        severity: 'high' | 'medium' | 'low';
        affectedEmployees: string[];
        recommendations: string[];
    }>;
}

export class TaskCompletionAnalyticsService {
    private supabase: SupabaseClient;

    // Performance thresholds
    private readonly thresholds = {
        excellentCompletionRate: 0.95,
        goodCompletionRate: 0.85,
        excellentOnTimeRate: 0.90,
        goodOnTimeRate: 0.80,
        maxAcceptableDelay: 2, // days
        consistencyThreshold: 0.75
    };

    constructor() {
        this.supabase = supabase.getClient();
    }

    /**
     * Analyze task completion metrics for an employee
     */
    async analyzeEmployeeTaskCompletion(
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<TaskCompletionMetrics> {
        try {
            logger.info('TaskCompletionAnalyticsService: Analyzing employee task completion', {
                employeeId,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });

            // Get employee details
            const { data: employee, error: employeeError } = await this.supabase
                .from('employees')
                .select(`
                    id,
                    full_name,
                    department_id,
                    departments!employees_department_id_fkey(name)
                `)
                .eq('id', employeeId)
                .single();

            if (employeeError || !employee) {
                throw new Error(`Employee not found: ${employeeId}`);
            }

            // Get task data
            const { data: tasks, error: tasksError } = await this.supabase
                .from('tasks')
                .select('*')
                .eq('assigned_to', employeeId)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: true });

            if (tasksError) {
                throw tasksError;
            }

            const taskList = tasks || [];

            // Calculate basic metrics
            const basicMetrics = this.calculateBasicTaskMetrics(taskList);

            // Analyze patterns
            const patterns = this.analyzeTaskPatterns(taskList, startDate, endDate);

            // Generate insights and recommendations
            const insights = this.generateTaskInsights(basicMetrics, patterns);
            const recommendations = this.generateTaskRecommendations(basicMetrics, patterns);

            const metrics: TaskCompletionMetrics = {
                employeeId,
                employeeName: employee.full_name,
                department: (employee.departments as any)?.name,
                period: { start: startDate, end: endDate },
                metrics: basicMetrics,
                patterns,
                insights,
                recommendations
            };

            logger.info('TaskCompletionAnalyticsService: Employee task completion analyzed', {
                employeeId,
                completionRate: basicMetrics.completionRate,
                onTimeRate: basicMetrics.onTimeRate
            });

            return metrics;
        } catch (error) {
            logger.error('TaskCompletionAnalyticsService: Failed to analyze employee task completion', {
                error: (error as Error).message,
                employeeId
            });
            throw error;
        }
    }

    /**
     * Analyze department task completion analytics
     */
    async analyzeDepartmentTaskCompletion(
        departmentId: string,
        startDate: Date,
        endDate: Date
    ): Promise<DepartmentTaskAnalytics> {
        try {
            logger.info('TaskCompletionAnalyticsService: Analyzing department task completion', {
                departmentId,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });

            // Get department details and employees
            const { data: department, error: deptError } = await this.supabase
                .from('departments')
                .select(`
                    id,
                    name,
                    employees(id, full_name)
                `)
                .eq('id', departmentId)
                .single();

            if (deptError || !department) {
                throw new Error(`Department not found: ${departmentId}`);
            }

            const employees = department.employees || [];
            const employeeIds = employees.map(emp => emp.id);

            // Get all tasks for department employees
            const { data: tasks, error: tasksError } = await this.supabase
                .from('tasks')
                .select(`
                    *,
                    assignee:employees!tasks_assigned_to_fkey(id, full_name)
                `)
                .in('assigned_to', employeeIds)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString());

            if (tasksError) {
                throw tasksError;
            }

            const taskList = tasks || [];

            // Calculate department metrics
            const metrics = this.calculateDepartmentTaskMetrics(taskList);

            // Calculate trends
            const trends = await this.calculateDepartmentTaskTrends(departmentId, startDate, endDate);

            // Identify top performers
            const topPerformers = await this.identifyTaskTopPerformers(employeeIds, startDate, endDate);

            // Identify bottlenecks
            const bottlenecks = this.identifyTaskBottlenecks(taskList, employees);

            const analytics: DepartmentTaskAnalytics = {
                departmentId,
                departmentName: department.name,
                period: { start: startDate, end: endDate },
                metrics,
                trends,
                topPerformers,
                bottlenecks
            };

            logger.info('TaskCompletionAnalyticsService: Department task completion analyzed', {
                departmentId,
                averageCompletionRate: metrics.averageCompletionRate
            });

            return analytics;
        } catch (error) {
            logger.error('TaskCompletionAnalyticsService: Failed to analyze department task completion', {
                error: (error as Error).message,
                departmentId
            });
            throw error;
        }
    }

    /**
     * Generate comprehensive task delivery report
     */
    async generateTaskDeliveryReport(
        reportType: 'individual' | 'department' | 'company',
        startDate: Date,
        endDate: Date,
        targetId?: string
    ): Promise<TaskDeliveryReport> {
        try {
            logger.info('TaskCompletionAnalyticsService: Generating task delivery report', {
                reportType,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                targetId
            });

            // Get task data based on report type
            let query = this.supabase
                .from('tasks')
                .select(`
                    *,
                    assignee:employees!tasks_assigned_to_fkey(id, full_name, department:departments(id, name))
                `)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString());

            if (reportType === 'individual' && targetId) {
                query = query.eq('assigned_to', targetId);
            } else if (reportType === 'department' && targetId) {
                query = query.eq('assignee.department.id', targetId);
            }

            const { data: tasks, error } = await query;

            if (error) {
                throw error;
            }

            const taskList = tasks || [];

            // Calculate summary metrics
            const summary = this.calculateReportSummary(taskList);

            // Calculate delivery breakdown
            const deliveryBreakdown = this.calculateDeliveryBreakdown(taskList);

            // Generate alerts
            const alerts = this.generateTaskDeliveryAlerts(taskList);

            const report: TaskDeliveryReport = {
                reportType,
                period: { start: startDate, end: endDate },
                summary,
                deliveryBreakdown,
                alerts
            };

            logger.info('TaskCompletionAnalyticsService: Task delivery report generated', {
                reportType,
                totalTasks: summary.totalTasks,
                overallEfficiency: summary.overallEfficiency
            });

            return report;
        } catch (error) {
            logger.error('TaskCompletionAnalyticsService: Failed to generate task delivery report', {
                error: (error as Error).message,
                reportType
            });
            throw error;
        }
    }

    /**
     * Analyze individual task delivery metrics
     */
    async analyzeTaskDelivery(taskId: string): Promise<TaskAnalytics> {
        try {
            logger.info('TaskCompletionAnalyticsService: Analyzing task delivery', { taskId });

            const { data: task, error } = await this.supabase
                .from('tasks')
                .select(`
                    *,
                    assignee:employees!tasks_assigned_to_fkey(id, full_name, department:departments(name))
                `)
                .eq('id', taskId)
                .single();

            if (error || !task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            // Calculate delivery metrics
            const deliveryMetrics = this.calculateTaskDeliveryMetrics(task);

            // Calculate quality metrics (if available)
            const qualityMetrics = await this.calculateTaskQualityMetrics(taskId);

            const analytics: TaskAnalytics = {
                taskId: task.id,
                taskTitle: task.title,
                assignedTo: task.assigned_to,
                assigneeName: task.assignee?.full_name || 'Unknown',
                department: task.assignee?.department?.name,
                createdAt: new Date(task.created_at),
                dueDate: task.due_date ? new Date(task.due_date) : undefined,
                completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
                status: task.status,
                priority: task.priority || 'medium',
                estimatedHours: task.estimated_hours,
                actualHours: task.actual_hours,
                deliveryMetrics,
                qualityMetrics
            };

            logger.info('TaskCompletionAnalyticsService: Task delivery analyzed', {
                taskId,
                isOnTime: deliveryMetrics.isOnTime,
                completionEfficiency: deliveryMetrics.completionEfficiency
            });

            return analytics;
        } catch (error) {
            logger.error('TaskCompletionAnalyticsService: Failed to analyze task delivery', {
                error: (error as Error).message,
                taskId
            });
            throw error;
        }
    }

    /**
     * Calculate basic task metrics
     */
    private calculateBasicTaskMetrics(tasks: any[]): any {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const overdueTasks = tasks.filter(t => this.isTaskOverdue(t)).length;
        const onTimeTasks = tasks.filter(t => this.isTaskOnTime(t)).length;

        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        const onTimeRate = completedTasks > 0 ? (onTimeTasks / completedTasks) * 100 : 0;

        // Calculate average completion time
        const completedTasksWithTimes = tasks.filter(t => 
            t.status === 'completed' && t.created_at && t.completed_at
        );

        const completionTimes = completedTasksWithTimes.map(t => {
            const created = new Date(t.created_at);
            const completed = new Date(t.completed_at);
            return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
        });

        const averageCompletionTime = completionTimes.length > 0 
            ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
            : 0;

        // Calculate average delay for overdue tasks
        const overdueTimes = tasks
            .filter(t => this.isTaskOverdue(t) && t.due_date && t.completed_at)
            .map(t => {
                const due = new Date(t.due_date);
                const completed = new Date(t.completed_at);
                return (completed.getTime() - due.getTime()) / (1000 * 60 * 60 * 24); // days
            });

        const averageDelayDays = overdueTimes.length > 0 
            ? overdueTimes.reduce((sum, delay) => sum + delay, 0) / overdueTimes.length 
            : 0;

        return {
            totalTasks,
            completedTasks,
            overdueTasks,
            onTimeTasks,
            completionRate: Math.round(completionRate * 100) / 100,
            onTimeRate: Math.round(onTimeRate * 100) / 100,
            averageCompletionTime: Math.round(averageCompletionTime * 100) / 100,
            averageDelayDays: Math.round(averageDelayDays * 100) / 100
        };
    }

    /**
     * Analyze task completion patterns
     */
    private analyzeTaskPatterns(tasks: any[], startDate: Date, endDate: Date): any {
        // Analyze completion by day of week
        const dayCompletions: { [key: string]: number } = {};
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        tasks.filter(t => t.completed_at).forEach(task => {
            const completedDate = new Date(task.completed_at);
            const dayName = dayNames[completedDate.getDay()];
            dayCompletions[dayName] = (dayCompletions[dayName] || 0) + 1;
        });

        const mostProductiveDay = Object.keys(dayCompletions).length > 0 
            ? Object.keys(dayCompletions).reduce((a, b) => dayCompletions[a] > dayCompletions[b] ? a : b)
            : 'N/A';

        // Analyze completion by hour
        const hourCompletions: { [key: number]: number } = {};

        tasks.filter(t => t.completed_at).forEach(task => {
            const completedDate = new Date(task.completed_at);
            const hour = completedDate.getHours();
            hourCompletions[hour] = (hourCompletions[hour] || 0) + 1;
        });

        const mostProductiveHour = Object.keys(hourCompletions).length > 0 
            ? Object.keys(hourCompletions).reduce((a, b) => hourCompletions[Number(a)] > hourCompletions[Number(b)] ? a : b)
            : 'N/A';

        // Calculate average tasks per day
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const averageTasksPerDay = totalDays > 0 ? tasks.length / totalDays : 0;

        // Assess task complexity handling
        const complexTasks = tasks.filter(t => t.priority === 'high' || (t.estimated_hours && t.estimated_hours > 8));
        const complexTasksCompleted = complexTasks.filter(t => t.status === 'completed');
        const complexTaskCompletionRate = complexTasks.length > 0 ? complexTasksCompleted.length / complexTasks.length : 1;

        let taskComplexityHandling: 'excellent' | 'good' | 'needs_improvement';
        if (complexTaskCompletionRate >= 0.9) {
            taskComplexityHandling = 'excellent';
        } else if (complexTaskCompletionRate >= 0.7) {
            taskComplexityHandling = 'good';
        } else {
            taskComplexityHandling = 'needs_improvement';
        }

        // Calculate consistency score
        const consistencyScore = this.calculateTaskConsistencyScore(tasks);

        return {
            mostProductiveDay,
            mostProductiveHour: mostProductiveHour !== 'N/A' ? `${mostProductiveHour}:00` : 'N/A',
            averageTasksPerDay: Math.round(averageTasksPerDay * 100) / 100,
            taskComplexityHandling,
            consistencyScore
        };
    }

    /**
     * Calculate task consistency score
     */
    private calculateTaskConsistencyScore(tasks: any[]): number {
        const completedTasks = tasks.filter(t => t.status === 'completed' && t.created_at && t.completed_at);
        
        if (completedTasks.length < 2) return 1.0;

        const completionTimes = completedTasks.map(t => {
            const created = new Date(t.created_at);
            const completed = new Date(t.completed_at);
            return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        });

        const average = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
        const variance = completionTimes.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / completionTimes.length;
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = average > 0 ? standardDeviation / average : 0;

        // Convert to consistency score (0-1, where 1 is most consistent)
        return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
    }

    /**
     * Check if task is overdue
     */
    private isTaskOverdue(task: any): boolean {
        if (!task.due_date) return false;
        
        const dueDate = new Date(task.due_date);
        const now = new Date();
        
        if (task.status === 'completed' && task.completed_at) {
            const completedDate = new Date(task.completed_at);
            return completedDate > dueDate;
        }
        
        return task.status !== 'completed' && now > dueDate;
    }

    /**
     * Check if task was completed on time
     */
    private isTaskOnTime(task: any): boolean {
        if (task.status !== 'completed' || !task.completed_at || !task.due_date) {
            return false;
        }
        
        const completedDate = new Date(task.completed_at);
        const dueDate = new Date(task.due_date);
        
        return completedDate <= dueDate;
    }

    /**
     * Calculate task delivery metrics for individual task
     */
    private calculateTaskDeliveryMetrics(task: any): any {
        const isOnTime = this.isTaskOnTime(task);
        const isOverdue = this.isTaskOverdue(task);
        
        let daysEarly = 0;
        let daysLate = 0;
        
        if (task.status === 'completed' && task.completed_at && task.due_date) {
            const completedDate = new Date(task.completed_at);
            const dueDate = new Date(task.due_date);
            const diffDays = (completedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);
            
            if (diffDays < 0) {
                daysEarly = Math.abs(diffDays);
            } else if (diffDays > 0) {
                daysLate = diffDays;
            }
        }
        
        // Calculate completion efficiency (estimated vs actual time)
        let completionEfficiency = 1.0;
        if (task.estimated_hours && task.actual_hours) {
            completionEfficiency = task.estimated_hours / task.actual_hours;
            completionEfficiency = Math.max(0, Math.min(2, completionEfficiency)); // Cap between 0 and 2
        }
        
        return {
            isOnTime,
            isOverdue,
            daysEarly: Math.round(daysEarly * 100) / 100,
            daysLate: Math.round(daysLate * 100) / 100,
            completionEfficiency: Math.round(completionEfficiency * 100) / 100
        };
    }

    /**
     * Calculate task quality metrics
     */
    private async calculateTaskQualityMetrics(taskId: string): Promise<any> {
        // This would typically involve checking task revisions, feedback, etc.
        // For now, returning default values
        return {
            revisionCount: 0,
            approvalTime: undefined,
            clientSatisfaction: undefined
        };
    }

    /**
     * Generate task insights
     */
    private generateTaskInsights(metrics: any, patterns: any): string[] {
        const insights: string[] = [];

        // Completion rate insights
        if (metrics.completionRate >= this.thresholds.excellentCompletionRate * 100) {
            insights.push('Excellent task completion rate - consistently delivers on commitments');
        } else if (metrics.completionRate >= this.thresholds.goodCompletionRate * 100) {
            insights.push('Good task completion rate with room for improvement');
        } else {
            insights.push('Task completion rate needs significant improvement');
        }

        // On-time delivery insights
        if (metrics.onTimeRate >= this.thresholds.excellentOnTimeRate * 100) {
            insights.push('Outstanding on-time delivery performance');
        } else if (metrics.onTimeRate >= this.thresholds.goodOnTimeRate * 100) {
            insights.push('Good on-time delivery with occasional delays');
        } else {
            insights.push('Frequent delays in task delivery - time management needs attention');
        }

        // Productivity insights
        if (patterns.averageTasksPerDay > 3) {
            insights.push('High task throughput - handles multiple tasks efficiently');
        } else if (patterns.averageTasksPerDay < 1) {
            insights.push('Low task throughput - may need support or task redistribution');
        }

        // Complexity handling insights
        if (patterns.taskComplexityHandling === 'excellent') {
            insights.push('Excellent at handling complex and high-priority tasks');
        } else if (patterns.taskComplexityHandling === 'needs_improvement') {
            insights.push('Struggles with complex tasks - may need additional training or support');
        }

        // Consistency insights
        if (patterns.consistencyScore >= this.thresholds.consistencyThreshold) {
            insights.push('Consistent task completion patterns - reliable delivery times');
        } else {
            insights.push('Inconsistent task completion patterns - delivery times vary significantly');
        }

        return insights;
    }

    /**
     * Generate task recommendations
     */
    private generateTaskRecommendations(metrics: any, patterns: any): string[] {
        const recommendations: string[] = [];

        if (metrics.completionRate < this.thresholds.goodCompletionRate * 100) {
            recommendations.push('Implement task prioritization and time management training');
        }

        if (metrics.onTimeRate < this.thresholds.goodOnTimeRate * 100) {
            recommendations.push('Review task estimation and deadline setting processes');
        }

        if (metrics.averageDelayDays > this.thresholds.maxAcceptableDelay) {
            recommendations.push('Investigate causes of delays and implement mitigation strategies');
        }

        if (patterns.taskComplexityHandling === 'needs_improvement') {
            recommendations.push('Provide additional training for complex task management');
        }

        if (patterns.consistencyScore < this.thresholds.consistencyThreshold) {
            recommendations.push('Establish more structured task management processes');
        }

        if (patterns.averageTasksPerDay < 1) {
            recommendations.push('Review workload distribution and identify potential blockers');
        }

        if (recommendations.length === 0) {
            recommendations.push('Continue maintaining excellent task completion standards');
        }

        return recommendations;
    }

    /**
     * Calculate department task metrics
     */
    private calculateDepartmentTaskMetrics(tasks: any[]): any {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const onTimeTasks = tasks.filter(t => this.isTaskOnTime(t)).length;

        const averageCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        const averageOnTimeRate = completedTasks > 0 ? (onTimeTasks / completedTasks) * 100 : 0;

        // Calculate average completion time
        const completedTasksWithTimes = tasks.filter(t => 
            t.status === 'completed' && t.created_at && t.completed_at
        );

        const completionTimes = completedTasksWithTimes.map(t => {
            const created = new Date(t.created_at);
            const completed = new Date(t.completed_at);
            return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        });

        const averageCompletionTime = completionTimes.length > 0 
            ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
            : 0;

        // Calculate productivity score (tasks completed per day)
        const uniqueDates = new Set(tasks.map(t => t.created_at.split('T')[0]));
        const totalDays = uniqueDates.size || 1;
        const productivityScore = (completedTasks / totalDays) * 10; // Scale to 0-100

        return {
            totalTasks,
            completedTasks,
            averageCompletionRate: Math.round(averageCompletionRate * 100) / 100,
            averageOnTimeRate: Math.round(averageOnTimeRate * 100) / 100,
            averageCompletionTime: Math.round(averageCompletionTime * 100) / 100,
            productivityScore: Math.min(100, Math.round(productivityScore * 100) / 100)
        };
    }

    /**
     * Calculate department task trends
     */
    private async calculateDepartmentTaskTrends(
        departmentId: string,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        // This would compare with previous period
        // For now, returning stable trends
        return {
            completionTrend: 'stable',
            qualityTrend: 'stable',
            efficiencyTrend: 'stable'
        };
    }

    /**
     * Identify top performers in task completion
     */
    private async identifyTaskTopPerformers(
        employeeIds: string[],
        startDate: Date,
        endDate: Date
    ): Promise<Array<{ employeeId: string; employeeName: string; completionRate: number; onTimeRate: number }>> {
        const performers: Array<{ employeeId: string; employeeName: string; completionRate: number; onTimeRate: number }> = [];

        for (const employeeId of employeeIds) {
            try {
                const metrics = await this.analyzeEmployeeTaskCompletion(employeeId, startDate, endDate);
                
                if (metrics.metrics.completionRate >= 90 && metrics.metrics.onTimeRate >= 85) {
                    performers.push({
                        employeeId,
                        employeeName: metrics.employeeName,
                        completionRate: metrics.metrics.completionRate,
                        onTimeRate: metrics.metrics.onTimeRate
                    });
                }
            } catch (error) {
                logger.warn('TaskCompletionAnalyticsService: Failed to analyze employee for top performers', {
                    employeeId,
                    error: (error as Error).message
                });
            }
        }

        return performers.sort((a, b) => b.completionRate - a.completionRate).slice(0, 10);
    }

    /**
     * Identify task bottlenecks
     */
    private identifyTaskBottlenecks(tasks: any[], employees: any[]): any[] {
        const bottlenecks: any[] = [];

        // Identify employees with low completion rates
        const employeePerformance: { [key: string]: any } = {};
        
        tasks.forEach(task => {
            if (!employeePerformance[task.assigned_to]) {
                employeePerformance[task.assigned_to] = {
                    total: 0,
                    completed: 0,
                    overdue: 0
                };
            }
            
            employeePerformance[task.assigned_to].total++;
            
            if (task.status === 'completed') {
                employeePerformance[task.assigned_to].completed++;
            }
            
            if (this.isTaskOverdue(task)) {
                employeePerformance[task.assigned_to].overdue++;
            }
        });

        // Check for employee bottlenecks
        Object.entries(employeePerformance).forEach(([employeeId, perf]: [string, any]) => {
            const completionRate = perf.total > 0 ? perf.completed / perf.total : 0;
            const overdueRate = perf.total > 0 ? perf.overdue / perf.total : 0;
            
            if (completionRate < 0.7 || overdueRate > 0.3) {
                const employee = employees.find(emp => emp.id === employeeId);
                bottlenecks.push({
                    type: 'employee',
                    description: `${employee?.full_name || 'Unknown'} has low task completion performance`,
                    impact: overdueRate > 0.5 ? 'high' : 'medium',
                    recommendations: [
                        'Provide additional training and support',
                        'Review workload distribution',
                        'Implement closer monitoring and mentoring'
                    ]
                });
            }
        });

        // Check for task type bottlenecks
        const taskTypes: { [key: string]: any } = {};
        
        tasks.forEach(task => {
            const type = task.category || 'uncategorized';
            if (!taskTypes[type]) {
                taskTypes[type] = { total: 0, completed: 0, avgTime: 0, times: [] };
            }
            
            taskTypes[type].total++;
            
            if (task.status === 'completed') {
                taskTypes[type].completed++;
                
                if (task.created_at && task.completed_at) {
                    const time = (new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24);
                    taskTypes[type].times.push(time);
                }
            }
        });

        Object.entries(taskTypes).forEach(([type, data]: [string, any]) => {
            const completionRate = data.total > 0 ? data.completed / data.total : 0;
            const avgTime = data.times.length > 0 ? data.times.reduce((sum: number, time: number) => sum + time, 0) / data.times.length : 0;
            
            if (completionRate < 0.6 || avgTime > 14) { // More than 2 weeks average
                bottlenecks.push({
                    type: 'task_type',
                    description: `${type} tasks show poor completion performance`,
                    impact: avgTime > 21 ? 'high' : 'medium',
                    recommendations: [
                        'Review task complexity and requirements',
                        'Provide specialized training for this task type',
                        'Consider breaking down complex tasks'
                    ]
                });
            }
        });

        return bottlenecks;
    }

    /**
     * Calculate report summary
     */
    private calculateReportSummary(tasks: any[]): any {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const onTimeTasks = tasks.filter(t => this.isTaskOnTime(t)).length;
        const overdueTasks = tasks.filter(t => this.isTaskOverdue(t)).length;

        // Calculate average completion time
        const completedTasksWithTimes = tasks.filter(t => 
            t.status === 'completed' && t.created_at && t.completed_at
        );

        const completionTimes = completedTasksWithTimes.map(t => {
            const created = new Date(t.created_at);
            const completed = new Date(t.completed_at);
            return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        });

        const averageCompletionTime = completionTimes.length > 0 
            ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
            : 0;

        // Calculate overall efficiency
        const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
        const onTimeRate = completedTasks > 0 ? onTimeTasks / completedTasks : 0;
        const overallEfficiency = (completionRate * 0.6) + (onTimeRate * 0.4); // Weighted average

        return {
            totalTasks,
            completedTasks,
            onTimeTasks,
            overdueTasks,
            averageCompletionTime: Math.round(averageCompletionTime * 100) / 100,
            overallEfficiency: Math.round(overallEfficiency * 100)
        };
    }

    /**
     * Calculate delivery breakdown
     */
    private calculateDeliveryBreakdown(tasks: any[]): any {
        // By priority
        const priorityBreakdown: { [key: string]: any } = {};
        const priorities = ['low', 'medium', 'high', 'urgent'];
        
        priorities.forEach(priority => {
            const priorityTasks = tasks.filter(t => (t.priority || 'medium') === priority);
            const completed = priorityTasks.filter(t => t.status === 'completed');
            const onTime = priorityTasks.filter(t => this.isTaskOnTime(t));
            
            const completionTimes = completed
                .filter(t => t.created_at && t.completed_at)
                .map(t => {
                    const created = new Date(t.created_at);
                    const completedDate = new Date(t.completed_at);
                    return (completedDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
                });
            
            const avgCompletionTime = completionTimes.length > 0 
                ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
                : 0;
            
            priorityBreakdown[priority] = {
                priority,
                totalTasks: priorityTasks.length,
                completedTasks: completed.length,
                averageCompletionTime: Math.round(avgCompletionTime * 100) / 100,
                onTimeRate: completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 0
            };
        });

        // By department
        const departmentBreakdown: { [key: string]: any } = {};
        
        tasks.forEach(task => {
            const deptId = task.assignee?.department?.id || 'unknown';
            const deptName = task.assignee?.department?.name || 'Unknown';
            
            if (!departmentBreakdown[deptId]) {
                departmentBreakdown[deptId] = {
                    departmentId: deptId,
                    departmentName: deptName,
                    totalTasks: 0,
                    completedTasks: 0,
                    onTimeTasks: 0,
                    completionTimes: []
                };
            }
            
            departmentBreakdown[deptId].totalTasks++;
            
            if (task.status === 'completed') {
                departmentBreakdown[deptId].completedTasks++;
                
                if (this.isTaskOnTime(task)) {
                    departmentBreakdown[deptId].onTimeTasks++;
                }
                
                if (task.created_at && task.completed_at) {
                    const time = (new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24);
                    departmentBreakdown[deptId].completionTimes.push(time);
                }
            }
        });

        const departmentArray = Object.values(departmentBreakdown).map((dept: any) => ({
            departmentId: dept.departmentId,
            departmentName: dept.departmentName,
            completionRate: dept.totalTasks > 0 ? Math.round((dept.completedTasks / dept.totalTasks) * 100) : 0,
            onTimeRate: dept.completedTasks > 0 ? Math.round((dept.onTimeTasks / dept.completedTasks) * 100) : 0,
            averageCompletionTime: dept.completionTimes.length > 0 
                ? Math.round((dept.completionTimes.reduce((sum: number, time: number) => sum + time, 0) / dept.completionTimes.length) * 100) / 100 
                : 0
        }));

        // By task type
        const taskTypeBreakdown: { [key: string]: any } = {};
        
        tasks.forEach(task => {
            const type = task.category || 'uncategorized';
            
            if (!taskTypeBreakdown[type]) {
                taskTypeBreakdown[type] = {
                    taskType: type,
                    totalTasks: 0,
                    completionTimes: [],
                    complexityScores: []
                };
            }
            
            taskTypeBreakdown[type].totalTasks++;
            
            if (task.status === 'completed' && task.created_at && task.completed_at) {
                const time = (new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24);
                taskTypeBreakdown[type].completionTimes.push(time);
            }
            
            // Simple complexity score based on estimated hours and priority
            let complexityScore = 1;
            if (task.estimated_hours) {
                complexityScore = Math.min(5, task.estimated_hours / 8); // Scale to 1-5
            }
            if (task.priority === 'high') complexityScore *= 1.5;
            if (task.priority === 'urgent') complexityScore *= 2;
            
            taskTypeBreakdown[type].complexityScores.push(complexityScore);
        });

        const taskTypeArray = Object.values(taskTypeBreakdown).map((type: any) => ({
            taskType: type.taskType,
            totalTasks: type.totalTasks,
            averageCompletionTime: type.completionTimes.length > 0 
                ? Math.round((type.completionTimes.reduce((sum: number, time: number) => sum + time, 0) / type.completionTimes.length) * 100) / 100 
                : 0,
            complexityScore: type.complexityScores.length > 0 
                ? Math.round((type.complexityScores.reduce((sum: number, score: number) => sum + score, 0) / type.complexityScores.length) * 100) / 100 
                : 1
        }));

        return {
            byPriority: Object.values(priorityBreakdown),
            byDepartment: departmentArray,
            byTaskType: taskTypeArray
        };
    }

    /**
     * Generate task delivery alerts
     */
    private generateTaskDeliveryAlerts(tasks: any[]): any[] {
        const alerts: any[] = [];

        // Group tasks by assignee
        const employeeTasks: { [key: string]: any[] } = {};
        
        tasks.forEach(task => {
            const assigneeId = task.assigned_to;
            if (!employeeTasks[assigneeId]) {
                employeeTasks[assigneeId] = [];
            }
            employeeTasks[assigneeId].push(task);
        });

        // Check for overdue tasks alert
        Object.entries(employeeTasks).forEach(([employeeId, empTasks]) => {
            const overdueTasks = empTasks.filter(t => this.isTaskOverdue(t));
            
            if (overdueTasks.length >= 3) {
                alerts.push({
                    type: 'overdue_tasks',
                    description: `Employee has ${overdueTasks.length} overdue tasks`,
                    severity: overdueTasks.length >= 5 ? 'high' : 'medium',
                    affectedEmployees: [employeeId],
                    recommendations: [
                        'Immediate review of task priorities',
                        'Provide additional support or resources',
                        'Consider task redistribution'
                    ]
                });
            }
        });

        // Check for low completion rate alert
        Object.entries(employeeTasks).forEach(([employeeId, empTasks]) => {
            const completedTasks = empTasks.filter(t => t.status === 'completed');
            const completionRate = empTasks.length > 0 ? completedTasks.length / empTasks.length : 0;
            
            if (completionRate < 0.6 && empTasks.length >= 5) {
                alerts.push({
                    type: 'low_completion_rate',
                    description: `Employee has low task completion rate: ${Math.round(completionRate * 100)}%`,
                    severity: completionRate < 0.4 ? 'high' : 'medium',
                    affectedEmployees: [employeeId],
                    recommendations: [
                        'Performance improvement plan',
                        'Additional training and mentoring',
                        'Review workload and task complexity'
                    ]
                });
            }
        });

        return alerts;
    }
}

export default new TaskCompletionAnalyticsService();