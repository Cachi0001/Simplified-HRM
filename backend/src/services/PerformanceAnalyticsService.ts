import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';

export interface PerformanceMetrics {
    employeeId: string;
    employeeName: string;
    department?: string;
    period: {
        start: Date;
        end: Date;
    };
    scores: {
        overall: number;
        attendance: number;
        taskCompletion: number;
        punctuality: number;
        productivity: number;
    };
    details: {
        totalWorkDays: number;
        presentDays: number;
        lateDays: number;
        totalTasks: number;
        completedTasks: number;
        onTimeTasks: number;
        averageTaskCompletionTime: number;
        attendanceRate: number;
        punctualityRate: number;
        taskCompletionRate: number;
        productivityScore: number;
    };
    trends: {
        attendanceTrend: 'improving' | 'declining' | 'stable';
        taskCompletionTrend: 'improving' | 'declining' | 'stable';
        punctualityTrend: 'improving' | 'declining' | 'stable';
    };
    recommendations: string[];
}

export interface DepartmentPerformance {
    departmentId: string;
    departmentName: string;
    period: {
        start: Date;
        end: Date;
    };
    averageScores: {
        overall: number;
        attendance: number;
        taskCompletion: number;
        punctuality: number;
        productivity: number;
    };
    employeeCount: number;
    topPerformers: Array<{
        employeeId: string;
        employeeName: string;
        overallScore: number;
    }>;
    improvementAreas: string[];
    departmentRanking: number;
}

export interface PerformanceReport {
    id: string;
    reportType: 'individual' | 'department' | 'company';
    period: {
        start: Date;
        end: Date;
    };
    generatedAt: Date;
    generatedBy: string;
    data: any;
    insights: string[];
    recommendations: string[];
}

export class PerformanceAnalyticsService {
    private supabase: SupabaseClient;

    // Performance scoring weights
    private readonly scoringWeights = {
        attendance: 0.25,      // 25% weight
        taskCompletion: 0.35,  // 35% weight
        punctuality: 0.20,     // 20% weight
        productivity: 0.20     // 20% weight
    };

    // Performance thresholds
    private readonly thresholds = {
        excellent: 90,
        good: 75,
        satisfactory: 60,
        needsImprovement: 40
    };

    constructor() {
        this.supabase = supabase.getClient();
    }

    /**
     * Calculate comprehensive performance metrics for an employee
     */
    async calculateEmployeePerformance(
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<PerformanceMetrics> {
        try {
            logger.info('PerformanceAnalyticsService: Calculating employee performance', {
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

            // Calculate attendance metrics
            const attendanceMetrics = await this.calculateAttendanceMetrics(employeeId, startDate, endDate);

            // Calculate task completion metrics
            const taskMetrics = await this.calculateTaskMetrics(employeeId, startDate, endDate);

            // Calculate punctuality metrics
            const punctualityMetrics = await this.calculatePunctualityMetrics(employeeId, startDate, endDate);

            // Calculate productivity metrics
            const productivityMetrics = await this.calculateProductivityMetrics(employeeId, startDate, endDate);

            // Calculate individual scores
            const attendanceScore = this.calculateAttendanceScore(attendanceMetrics);
            const taskCompletionScore = this.calculateTaskCompletionScore(taskMetrics);
            const punctualityScore = this.calculatePunctualityScore(punctualityMetrics);
            const productivityScore = this.calculateProductivityScore(productivityMetrics);

            // Calculate overall score
            const overallScore = this.calculateOverallScore({
                attendance: attendanceScore,
                taskCompletion: taskCompletionScore,
                punctuality: punctualityScore,
                productivity: productivityScore
            });

            // Calculate trends
            const trends = await this.calculatePerformanceTrends(employeeId, startDate, endDate);

            // Generate recommendations
            const recommendations = this.generateRecommendations({
                attendance: attendanceScore,
                taskCompletion: taskCompletionScore,
                punctuality: punctualityScore,
                productivity: productivityScore
            }, attendanceMetrics, taskMetrics);

            const performanceMetrics: PerformanceMetrics = {
                employeeId,
                employeeName: employee.full_name,
                department: (employee.departments as any)?.name,
                period: { start: startDate, end: endDate },
                scores: {
                    overall: overallScore,
                    attendance: attendanceScore,
                    taskCompletion: taskCompletionScore,
                    punctuality: punctualityScore,
                    productivity: productivityScore
                },
                details: {
                    totalWorkDays: attendanceMetrics.totalWorkDays,
                    presentDays: attendanceMetrics.presentDays,
                    lateDays: attendanceMetrics.lateDays,
                    totalTasks: taskMetrics.totalTasks,
                    completedTasks: taskMetrics.completedTasks,
                    onTimeTasks: taskMetrics.onTimeTasks,
                    averageTaskCompletionTime: taskMetrics.averageCompletionTime,
                    attendanceRate: attendanceMetrics.attendanceRate,
                    punctualityRate: punctualityMetrics.punctualityRate,
                    taskCompletionRate: taskMetrics.completionRate,
                    productivityScore: productivityMetrics.productivityScore
                },
                trends,
                recommendations
            };

            // Store performance record
            await this.storePerformanceRecord(performanceMetrics);

            logger.info('PerformanceAnalyticsService: Employee performance calculated', {
                employeeId,
                overallScore
            });

            return performanceMetrics;
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Failed to calculate employee performance', {
                error: (error as Error).message,
                employeeId
            });
            throw error;
        }
    }

    /**
     * Calculate department performance metrics
     */
    async calculateDepartmentPerformance(
        departmentId: string,
        startDate: Date,
        endDate: Date
    ): Promise<DepartmentPerformance> {
        try {
            logger.info('PerformanceAnalyticsService: Calculating department performance', {
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

            if (employees.length === 0) {
                throw new Error(`No employees found in department: ${departmentId}`);
            }

            // Calculate performance for each employee
            const employeePerformances: PerformanceMetrics[] = [];
            for (const employee of employees) {
                try {
                    const performance = await this.calculateEmployeePerformance(
                        employee.id,
                        startDate,
                        endDate
                    );
                    employeePerformances.push(performance);
                } catch (error) {
                    logger.warn('PerformanceAnalyticsService: Failed to calculate performance for employee', {
                        employeeId: employee.id,
                        error: (error as Error).message
                    });
                }
            }

            // Calculate average scores
            const averageScores = this.calculateAverageScores(employeePerformances);

            // Identify top performers
            const topPerformers = employeePerformances
                .sort((a, b) => b.scores.overall - a.scores.overall)
                .slice(0, 5)
                .map(emp => ({
                    employeeId: emp.employeeId,
                    employeeName: emp.employeeName,
                    overallScore: emp.scores.overall
                }));

            // Identify improvement areas
            const improvementAreas = this.identifyDepartmentImprovementAreas(employeePerformances);

            // Get department ranking
            const departmentRanking = await this.calculateDepartmentRanking(departmentId, averageScores.overall);

            const departmentPerformance: DepartmentPerformance = {
                departmentId,
                departmentName: department.name,
                period: { start: startDate, end: endDate },
                averageScores,
                employeeCount: employees.length,
                topPerformers,
                improvementAreas,
                departmentRanking
            };

            logger.info('PerformanceAnalyticsService: Department performance calculated', {
                departmentId,
                averageOverallScore: averageScores.overall
            });

            return departmentPerformance;
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Failed to calculate department performance', {
                error: (error as Error).message,
                departmentId
            });
            throw error;
        }
    }

    /**
     * Get performance rankings for employees
     */
    async getPerformanceRankings(
        startDate: Date,
        endDate: Date,
        departmentId?: string,
        limit: number = 50
    ): Promise<Array<{
        rank: number;
        employeeId: string;
        employeeName: string;
        department: string;
        overallScore: number;
        previousRank?: number;
        rankChange?: number;
    }>> {
        try {
            logger.info('PerformanceAnalyticsService: Getting performance rankings', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                departmentId,
                limit
            });

            let query = this.supabase
                .from('performance_records')
                .select(`
                    employee_id,
                    employee_name,
                    department,
                    overall_score,
                    period_start,
                    period_end
                `)
                .gte('period_start', startDate.toISOString())
                .lte('period_end', endDate.toISOString());

            if (departmentId) {
                query = query.eq('department_id', departmentId);
            }

            const { data: records, error } = await query
                .order('overall_score', { ascending: false })
                .limit(limit);

            if (error) {
                throw error;
            }

            // Get previous period rankings for comparison
            const previousPeriod = this.getPreviousPeriod(startDate, endDate);
            const previousRankings = await this.getPreviousRankings(
                previousPeriod.start,
                previousPeriod.end,
                departmentId
            );

            const rankings = records?.map((record, index) => {
                const previousRank = previousRankings.find(
                    prev => prev.employee_id === record.employee_id
                )?.rank;

                return {
                    rank: index + 1,
                    employeeId: record.employee_id,
                    employeeName: record.employee_name,
                    department: record.department,
                    overallScore: record.overall_score,
                    previousRank,
                    rankChange: previousRank ? previousRank - (index + 1) : undefined
                };
            }) || [];

            logger.info('PerformanceAnalyticsService: Performance rankings retrieved', {
                count: rankings.length
            });

            return rankings;
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Failed to get performance rankings', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Generate performance insights and recommendations
     */
    async generatePerformanceInsights(
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<{
        insights: string[];
        recommendations: string[];
        strengths: string[];
        improvementAreas: string[];
    }> {
        try {
            const performance = await this.calculateEmployeePerformance(employeeId, startDate, endDate);

            const insights: string[] = [];
            const recommendations: string[] = [];
            const strengths: string[] = [];
            const improvementAreas: string[] = [];

            // Analyze overall performance
            if (performance.scores.overall >= this.thresholds.excellent) {
                insights.push('Exceptional overall performance - consistently exceeding expectations');
                strengths.push('Outstanding overall performance');
            } else if (performance.scores.overall >= this.thresholds.good) {
                insights.push('Strong overall performance with room for optimization');
            } else if (performance.scores.overall >= this.thresholds.satisfactory) {
                insights.push('Satisfactory performance with several areas for improvement');
                improvementAreas.push('Overall performance consistency');
            } else {
                insights.push('Performance requires immediate attention and support');
                improvementAreas.push('Comprehensive performance improvement needed');
                recommendations.push('Schedule performance improvement plan meeting');
            }

            // Analyze attendance
            if (performance.scores.attendance >= this.thresholds.excellent) {
                strengths.push('Excellent attendance record');
            } else if (performance.scores.attendance < this.thresholds.satisfactory) {
                improvementAreas.push('Attendance consistency');
                recommendations.push('Review attendance patterns and address barriers');
            }

            // Analyze task completion
            if (performance.scores.taskCompletion >= this.thresholds.excellent) {
                strengths.push('Outstanding task completion rate');
            } else if (performance.scores.taskCompletion < this.thresholds.satisfactory) {
                improvementAreas.push('Task completion efficiency');
                recommendations.push('Provide additional training or resources for task management');
            }

            // Analyze punctuality
            if (performance.scores.punctuality >= this.thresholds.excellent) {
                strengths.push('Excellent punctuality');
            } else if (performance.scores.punctuality < this.thresholds.satisfactory) {
                improvementAreas.push('Punctuality and time management');
                recommendations.push('Discuss schedule flexibility or time management strategies');
            }

            // Analyze trends
            if (performance.trends.attendanceTrend === 'improving') {
                insights.push('Attendance showing positive improvement trend');
            } else if (performance.trends.attendanceTrend === 'declining') {
                insights.push('Attendance trend declining - requires attention');
                recommendations.push('Investigate causes of declining attendance');
            }

            if (performance.trends.taskCompletionTrend === 'improving') {
                insights.push('Task completion efficiency improving over time');
            } else if (performance.trends.taskCompletionTrend === 'declining') {
                insights.push('Task completion trend declining - may need support');
                recommendations.push('Review workload and provide additional support if needed');
            }

            return {
                insights,
                recommendations,
                strengths,
                improvementAreas
            };
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Failed to generate performance insights', {
                error: (error as Error).message,
                employeeId
            });
            throw error;
        }
    }

    /**
     * Calculate attendance metrics for an employee
     */
    private async calculateAttendanceMetrics(
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        const { data: attendanceRecords, error } = await this.supabase
            .from('attendance')
            .select('date, status, is_late')
            .eq('employee_id', employeeId)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0]);

        if (error) throw error;

        const totalWorkDays = this.calculateWorkingDays(startDate, endDate);
        const presentDays = attendanceRecords?.filter(r => r.status !== 'absent').length || 0;
        const lateDays = attendanceRecords?.filter(r => r.is_late).length || 0;
        const attendanceRate = totalWorkDays > 0 ? (presentDays / totalWorkDays) * 100 : 0;

        return {
            totalWorkDays,
            presentDays,
            lateDays,
            attendanceRate
        };
    }

    /**
     * Calculate task metrics for an employee
     */
    private async calculateTaskMetrics(
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        const { data: tasks, error } = await this.supabase
            .from('tasks')
            .select('id, status, due_date, completed_at, created_at')
            .eq('assigned_to', employeeId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (error) throw error;

        const totalTasks = tasks?.length || 0;
        const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
        const onTimeTasks = tasks?.filter(t =>
            t.status === 'completed' &&
            t.completed_at &&
            t.due_date &&
            new Date(t.completed_at) <= new Date(t.due_date)
        ).length || 0;

        const completionTimes = tasks?.filter(t => t.status === 'completed' && t.completed_at)
            .map(t => {
                const created = new Date(t.created_at);
                const completed = new Date(t.completed_at);
                return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
            }) || [];

        const averageCompletionTime = completionTimes.length > 0
            ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
            : 0;

        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        return {
            totalTasks,
            completedTasks,
            onTimeTasks,
            averageCompletionTime,
            completionRate
        };
    }

    /**
     * Calculate punctuality metrics
     */
    private async calculatePunctualityMetrics(
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        const { data: attendanceRecords, error } = await this.supabase
            .from('attendance')
            .select('date, is_late, minutes_late')
            .eq('employee_id', employeeId)
            .eq('status', 'checked_in')
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0]);

        if (error) throw error;

        const totalDays = attendanceRecords?.length || 0;
        const punctualDays = attendanceRecords?.filter(r => !r.is_late).length || 0;
        const punctualityRate = totalDays > 0 ? (punctualDays / totalDays) * 100 : 0;

        const totalMinutesLate = attendanceRecords?.reduce((sum, r) => sum + (r.minutes_late || 0), 0) || 0;
        const averageMinutesLate = totalDays > 0 ? totalMinutesLate / totalDays : 0;

        return {
            totalDays,
            punctualDays,
            punctualityRate,
            totalMinutesLate,
            averageMinutesLate
        };
    }

    /**
     * Calculate productivity metrics
     */
    private async calculateProductivityMetrics(
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        // This is a simplified productivity calculation
        // In a real system, you might have more sophisticated metrics
        const taskMetrics = await this.calculateTaskMetrics(employeeId, startDate, endDate);
        const attendanceMetrics = await this.calculateAttendanceMetrics(employeeId, startDate, endDate);

        // Calculate productivity score based on tasks completed per day present
        const tasksPerDay = attendanceMetrics.presentDays > 0
            ? taskMetrics.completedTasks / attendanceMetrics.presentDays
            : 0;

        // Normalize to 0-100 scale (assuming 2 tasks per day is excellent)
        const productivityScore = Math.min(100, (tasksPerDay / 2) * 100);

        return {
            tasksPerDay,
            productivityScore
        };
    }

    /**
     * Calculate individual performance scores
     */
    private calculateAttendanceScore(metrics: any): number {
        return Math.round(metrics.attendanceRate);
    }

    private calculateTaskCompletionScore(metrics: any): number {
        return Math.round(metrics.completionRate);
    }

    private calculatePunctualityScore(metrics: any): number {
        return Math.round(metrics.punctualityRate);
    }

    private calculateProductivityScore(metrics: any): number {
        return Math.round(metrics.productivityScore);
    }

    /**
     * Calculate overall performance score using weighted average
     */
    private calculateOverallScore(scores: {
        attendance: number;
        taskCompletion: number;
        punctuality: number;
        productivity: number;
    }): number {
        const weightedScore =
            (scores.attendance * this.scoringWeights.attendance) +
            (scores.taskCompletion * this.scoringWeights.taskCompletion) +
            (scores.punctuality * this.scoringWeights.punctuality) +
            (scores.productivity * this.scoringWeights.productivity);

        return Math.round(weightedScore);
    }

    /**
     * Calculate performance trends
     */
    private async calculatePerformanceTrends(
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        // Get previous period for comparison
        const previousPeriod = this.getPreviousPeriod(startDate, endDate);

        try {
            const currentMetrics = await this.calculateEmployeePerformance(employeeId, startDate, endDate);
            const previousMetrics = await this.calculateEmployeePerformance(
                employeeId,
                previousPeriod.start,
                previousPeriod.end
            );

            return {
                attendanceTrend: this.calculateTrend(
                    previousMetrics.scores.attendance,
                    currentMetrics.scores.attendance
                ),
                taskCompletionTrend: this.calculateTrend(
                    previousMetrics.scores.taskCompletion,
                    currentMetrics.scores.taskCompletion
                ),
                punctualityTrend: this.calculateTrend(
                    previousMetrics.scores.punctuality,
                    currentMetrics.scores.punctuality
                )
            };
        } catch (error) {
            // If previous period data is not available, return stable trends
            return {
                attendanceTrend: 'stable',
                taskCompletionTrend: 'stable',
                punctualityTrend: 'stable'
            };
        }
    }

    /**
     * Calculate trend direction
     */
    private calculateTrend(previousScore: number, currentScore: number): 'improving' | 'declining' | 'stable' {
        const difference = currentScore - previousScore;
        const threshold = 5; // 5% threshold for trend detection

        if (difference > threshold) return 'improving';
        if (difference < -threshold) return 'declining';
        return 'stable';
    }

    /**
     * Generate performance recommendations
     */
    private generateRecommendations(
        scores: any,
        attendanceMetrics: any,
        taskMetrics: any
    ): string[] {
        const recommendations: string[] = [];

        if (scores.attendance < this.thresholds.satisfactory) {
            recommendations.push('Focus on improving attendance consistency');
        }

        if (scores.taskCompletion < this.thresholds.satisfactory) {
            recommendations.push('Work on task completion efficiency and time management');
        }

        if (scores.punctuality < this.thresholds.satisfactory) {
            recommendations.push('Improve punctuality and arrival times');
        }

        if (scores.productivity < this.thresholds.satisfactory) {
            recommendations.push('Enhance productivity through better task prioritization');
        }

        if (taskMetrics.averageCompletionTime > 7) { // More than a week average
            recommendations.push('Consider breaking down large tasks into smaller, manageable pieces');
        }

        if (recommendations.length === 0) {
            recommendations.push('Continue maintaining excellent performance standards');
        }

        return recommendations;
    }

    /**
     * Store performance record in database
     */
    private async storePerformanceRecord(metrics: PerformanceMetrics): Promise<void> {
        try {
            await this.supabase
                .from('performance_records')
                .upsert({
                    employee_id: metrics.employeeId,
                    employee_name: metrics.employeeName,
                    department: metrics.department,
                    period_start: metrics.period.start.toISOString(),
                    period_end: metrics.period.end.toISOString(),
                    overall_score: metrics.scores.overall,
                    attendance_score: metrics.scores.attendance,
                    task_completion_score: metrics.scores.taskCompletion,
                    punctuality_score: metrics.scores.punctuality,
                    productivity_score: metrics.scores.productivity,
                    metrics_data: metrics.details,
                    trends_data: metrics.trends,
                    recommendations: metrics.recommendations,
                    calculated_at: new Date().toISOString()
                });
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Failed to store performance record', {
                error: (error as Error).message,
                employeeId: metrics.employeeId
            });
        }
    }

    /**
     * Calculate average scores for department
     */
    private calculateAverageScores(performances: PerformanceMetrics[]): any {
        if (performances.length === 0) {
            return {
                overall: 0,
                attendance: 0,
                taskCompletion: 0,
                punctuality: 0,
                productivity: 0
            };
        }

        const totals = performances.reduce((acc, perf) => ({
            overall: acc.overall + perf.scores.overall,
            attendance: acc.attendance + perf.scores.attendance,
            taskCompletion: acc.taskCompletion + perf.scores.taskCompletion,
            punctuality: acc.punctuality + perf.scores.punctuality,
            productivity: acc.productivity + perf.scores.productivity
        }), { overall: 0, attendance: 0, taskCompletion: 0, punctuality: 0, productivity: 0 });

        const count = performances.length;

        return {
            overall: Math.round(totals.overall / count),
            attendance: Math.round(totals.attendance / count),
            taskCompletion: Math.round(totals.taskCompletion / count),
            punctuality: Math.round(totals.punctuality / count),
            productivity: Math.round(totals.productivity / count)
        };
    }

    /**
     * Identify department improvement areas
     */
    private identifyDepartmentImprovementAreas(performances: PerformanceMetrics[]): string[] {
        const averageScores = this.calculateAverageScores(performances);
        const areas: string[] = [];

        if (averageScores.attendance < this.thresholds.good) {
            areas.push('Department-wide attendance improvement needed');
        }

        if (averageScores.taskCompletion < this.thresholds.good) {
            areas.push('Task completion efficiency across the department');
        }

        if (averageScores.punctuality < this.thresholds.good) {
            areas.push('Punctuality standards need reinforcement');
        }

        if (averageScores.productivity < this.thresholds.good) {
            areas.push('Overall productivity enhancement opportunities');
        }

        return areas;
    }

    /**
     * Calculate department ranking
     */
    private async calculateDepartmentRanking(departmentId: string, overallScore: number): Promise<number> {
        try {
            const { data: departments, error } = await this.supabase
                .from('department_performance')
                .select('department_id, average_overall_score')
                .order('average_overall_score', { ascending: false });

            if (error) throw error;

            const ranking = departments?.findIndex(dept => dept.department_id === departmentId) + 1 || 1;
            return ranking;
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Failed to calculate department ranking', {
                error: (error as Error).message,
                departmentId
            });
            return 1;
        }
    }

    /**
     * Get previous period for trend analysis
     */
    private getPreviousPeriod(startDate: Date, endDate: Date): { start: Date; end: Date } {
        const periodLength = endDate.getTime() - startDate.getTime();
        const previousEnd = new Date(startDate.getTime() - 1);
        const previousStart = new Date(previousEnd.getTime() - periodLength);

        return { start: previousStart, end: previousEnd };
    }

    /**
     * Get previous rankings for comparison
     */
    private async getPreviousRankings(
        startDate: Date,
        endDate: Date,
        departmentId?: string
    ): Promise<Array<{ employee_id: string; rank: number }>> {
        try {
            let query = this.supabase
                .from('performance_records')
                .select('employee_id, overall_score')
                .gte('period_start', startDate.toISOString())
                .lte('period_end', endDate.toISOString());

            if (departmentId) {
                query = query.eq('department_id', departmentId);
            }

            const { data: records, error } = await query
                .order('overall_score', { ascending: false });

            if (error) throw error;

            return records?.map((record, index) => ({
                employee_id: record.employee_id,
                rank: index + 1
            })) || [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Calculate working days between two dates
     */
    private calculateWorkingDays(startDate: Date, endDate: Date): number {
        let count = 0;
        const current = new Date(startDate);

        while (current <= endDate) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
                count++;
            }
            current.setDate(current.getDate() + 1);
        }

        return count;
    }
    /**
     * Generate employee performance report
     */
    async generateEmployeePerformanceReport(employeeId: string, periodDays: number): Promise<any> {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - periodDays);

            const performance = await this.calculateEmployeePerformance(employeeId, startDate, endDate);
            
            return {
                employeeId,
                period: { startDate, endDate },
                performance,
                generatedAt: new Date()
            };
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Failed to generate employee performance report', {
                error: (error as Error).message,
                employeeId
            });
            throw error;
        }
    }

    /**
     * Get employee performance metrics
     */
    async getEmployeePerformanceMetrics(employeeId: string, startDate: Date, endDate: Date): Promise<any> {
        try {
            return await this.calculateEmployeePerformance(employeeId, startDate, endDate);
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Failed to get employee performance metrics', {
                error: (error as Error).message,
                employeeId
            });
            throw error;
        }
    }

    /**
     * Store performance metric
     */
    async storePerformanceMetric(employeeId: string, metricType: string, value: number): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('performance_metrics')
                .insert({
                    employee_id: employeeId,
                    metric_type: metricType,
                    value,
                    recorded_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Failed to store performance metric', {
                error: (error as Error).message,
                employeeId,
                metricType
            });
            throw error;
        }
    }

    /**
     * Update employee performance score
     */
    async updateEmployeePerformanceScore(employeeId: string, score: number): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('employees')
                .update({
                    performance_score: score,
                    updated_at: new Date().toISOString()
                })
                .eq('id', employeeId);

            if (error) throw error;
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Failed to update employee performance score', {
                error: (error as Error).message,
                employeeId
            });
            throw error;
        }
    }

    /**
     * Get top performers
     */
    async getTopPerformers(limit: number, periodDays: number): Promise<any[]> {
        try {
            const { data: employees, error } = await this.supabase
                .from('employees')
                .select('id, full_name, performance_score')
                .order('performance_score', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return employees || [];
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Failed to get top performers', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Get department performance summary
     */
    async getDepartmentPerformanceSummary(departmentId: string): Promise<any> {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30); // Last 30 days

            return await this.calculateDepartmentPerformance(departmentId, startDate, endDate);
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Failed to get department performance summary', {
                error: (error as Error).message,
                departmentId
            });
            throw error;
        }
    }

    /**
     * Run daily performance calculation
     */
    async runDailyPerformanceCalculation(): Promise<void> {
        try {
            logger.info('PerformanceAnalyticsService: Running daily performance calculation');

            const { data: employees, error } = await this.supabase
                .from('employees')
                .select('id');

            if (error) throw error;

            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 7); // Last 7 days

            for (const employee of employees || []) {
                try {
                    await this.calculateEmployeePerformance(employee.id, startDate, endDate);
                } catch (error) {
                    logger.error('PerformanceAnalyticsService: Failed to calculate performance for employee', {
                        error: (error as Error).message,
                        employeeId: employee.id
                    });
                }
            }

            logger.info('PerformanceAnalyticsService: Daily performance calculation completed');
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Failed to run daily performance calculation', {
                error: (error as Error).message
            });
            throw error;
        }
    }
}

export default new PerformanceAnalyticsService();