import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import PerformanceAnalyticsService from './PerformanceAnalyticsService';
import AttendanceAnalyticsService from './AttendanceAnalyticsService';
import TaskCompletionAnalyticsService from './TaskCompletionAnalyticsService';

export interface DepartmentMetrics {
    departmentId: string;
    departmentName: string;
    period: {
        start: Date;
        end: Date;
    };
    employeeCount: number;
    performance: {
        averageOverallScore: number;
        averageAttendanceScore: number;
        averageTaskCompletionScore: number;
        averagePunctualityScore: number;
        averageProductivityScore: number;
        topPerformers: Array<{
            employeeId: string;
            employeeName: string;
            overallScore: number;
        }>;
        underPerformers: Array<{
            employeeId: string;
            employeeName: string;
            overallScore: number;
            issues: string[];
        }>;
    };
    attendance: {
        averageAttendanceRate: number;
        averagePunctualityRate: number;
        totalAbsences: number;
        totalLateArrivals: number;
        attendanceTrend: 'improving' | 'declining' | 'stable';
        concerningPatterns: Array<{
            employeeId: string;
            employeeName: string;
            issues: string[];
        }>;
    };
    tasks: {
        totalTasks: number;
        completedTasks: number;
        averageCompletionRate: number;
        averageOnTimeRate: number;
        averageCompletionTime: number;
        taskTrend: 'improving' | 'declining' | 'stable';
        bottlenecks: Array<{
            type: 'employee' | 'task_type' | 'process';
            description: string;
            impact: 'high' | 'medium' | 'low';
        }>;
    };
    insights: string[];
    recommendations: string[];
    healthScore: number;
    ranking: number;
}

export interface DepartmentComparison {
    departments: Array<{
        departmentId: string;
        departmentName: string;
        metrics: {
            performanceScore: number;
            attendanceRate: number;
            taskCompletionRate: number;
            employeeCount: number;
            healthScore: number;
        };
        ranking: number;
        trend: 'improving' | 'declining' | 'stable';
    }>;
    topPerforming: {
        departmentId: string;
        departmentName: string;
        score: number;
    };
    needsAttention: Array<{
        departmentId: string;
        departmentName: string;
        issues: string[];
        priority: 'high' | 'medium' | 'low';
    }>;
    insights: string[];
    recommendations: string[];
}

export class DepartmentAnalyticsService {
    private supabase: SupabaseClient;
    private performanceService: typeof PerformanceAnalyticsService;
    private attendanceService: typeof AttendanceAnalyticsService;
    private taskService: typeof TaskCompletionAnalyticsService;

    // Health score weights
    private readonly healthWeights = {
        performance: 0.4,
        attendance: 0.3,
        taskCompletion: 0.3
    };

    // Thresholds for analysis
    private readonly thresholds = {
        excellentScore: 90,
        goodScore: 75,
        satisfactoryScore: 60,
        concerningScore: 40
    };

    constructor() {
        this.supabase = supabase.getClient();
        this.performanceService = PerformanceAnalyticsService;
        this.attendanceService = AttendanceAnalyticsService;
        this.taskService = TaskCompletionAnalyticsService;
    }

    /**
     * Get comprehensive department metrics
     */
    async getDepartmentMetrics(
        departmentId: string,
        startDate: Date,
        endDate: Date
    ): Promise<DepartmentMetrics> {
        try {
            logger.info('DepartmentAnalyticsService: Getting department metrics', {
                departmentId,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });

            // Get department details
            const { data: department, error: deptError } = await this.supabase
                .from('departments')
                .select('id, name')
                .eq('id', departmentId)
                .single();

            if (deptError || !department) {
                throw new Error(`Department not found: ${departmentId}`);
            }

            // Get department employees
            const { data: employees, error: empError } = await this.supabase
                .from('employees')
                .select('id, full_name')
                .eq('department_id', departmentId)
                .eq('status', 'active');

            if (empError) {
                throw empError;
            }

            const employeeList = employees || [];
            const employeeCount = employeeList.length;

            if (employeeCount === 0) {
                return this.createEmptyDepartmentMetrics(departmentId, department.name, startDate, endDate);
            }

            // Get analytics from different services
            const [performanceAnalytics, attendanceAnalytics, taskAnalytics] = await Promise.all([
                this.calculateDepartmentPerformance(departmentId, startDate, endDate),
                this.attendanceService.analyzeDepartmentAttendance(departmentId, startDate, endDate),
                this.taskService.analyzeDepartmentTaskCompletion(departmentId, startDate, endDate)
            ]);

            // Calculate health score
            const healthScore = this.calculateDepartmentHealthScore(
                performanceAnalytics.averageScores.overall,
                attendanceAnalytics.metrics.averageAttendanceRate,
                taskAnalytics.metrics.averageCompletionRate
            );

            // Get department ranking
            const ranking = await this.calculateDepartmentRanking(departmentId, healthScore);

            // Generate insights and recommendations
            const insights = this.generateDepartmentInsights(
                performanceAnalytics,
                attendanceAnalytics,
                taskAnalytics,
                healthScore
            );

            const recommendations = this.generateDepartmentRecommendations(
                performanceAnalytics,
                attendanceAnalytics,
                taskAnalytics,
                healthScore
            );

            const metrics: DepartmentMetrics = {
                departmentId,
                departmentName: department.name,
                period: { start: startDate, end: endDate },
                employeeCount,
                performance: {
                    averageOverallScore: performanceAnalytics.averageScores.overall,
                    averageAttendanceScore: performanceAnalytics.averageScores.attendance,
                    averageTaskCompletionScore: performanceAnalytics.averageScores.taskCompletion,
                    averagePunctualityScore: performanceAnalytics.averageScores.punctuality,
                    averageProductivityScore: performanceAnalytics.averageScores.productivity,
                    topPerformers: performanceAnalytics.topPerformers,
                    underPerformers: await this.identifyUnderPerformers(departmentId, startDate, endDate)
                },
                attendance: {
                    averageAttendanceRate: attendanceAnalytics.metrics.averageAttendanceRate,
                    averagePunctualityRate: attendanceAnalytics.metrics.averagePunctualityRate,
                    totalAbsences: attendanceAnalytics.metrics.totalAbsences,
                    totalLateArrivals: attendanceAnalytics.metrics.totalLateArrivals,
                    attendanceTrend: attendanceAnalytics.trends.attendanceTrend,
                    concerningPatterns: attendanceAnalytics.concerningPatterns
                },
                tasks: {
                    totalTasks: taskAnalytics.metrics.totalTasks,
                    completedTasks: taskAnalytics.metrics.completedTasks,
                    averageCompletionRate: taskAnalytics.metrics.averageCompletionRate,
                    averageOnTimeRate: taskAnalytics.metrics.averageOnTimeRate,
                    averageCompletionTime: taskAnalytics.metrics.averageCompletionTime,
                    taskTrend: taskAnalytics.trends.completionTrend,
                    bottlenecks: taskAnalytics.bottlenecks
                },
                insights,
                recommendations,
                healthScore,
                ranking
            };

            logger.info('DepartmentAnalyticsService: Department metrics calculated', {
                departmentId,
                healthScore,
                ranking
            });

            return metrics;
        } catch (error) {
            logger.error('DepartmentAnalyticsService: Failed to get department metrics', {
                error: (error as Error).message,
                departmentId
            });
            throw error;
        }
    }

    /**
     * Compare all departments
     */
    async compareDepartments(
        startDate: Date,
        endDate: Date
    ): Promise<DepartmentComparison> {
        try {
            logger.info('DepartmentAnalyticsService: Comparing departments', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });

            // Get all active departments
            const { data: departments, error } = await this.supabase
                .from('departments')
                .select('id, name')
                .eq('is_active', true)
                .order('name');

            if (error) {
                throw error;
            }

            const departmentList = departments || [];
            const departmentMetrics: any[] = [];

            // Get metrics for each department
            for (const dept of departmentList) {
                try {
                    const metrics = await this.getDepartmentMetrics(dept.id, startDate, endDate);
                    departmentMetrics.push({
                        departmentId: dept.id,
                        departmentName: dept.name,
                        metrics: {
                            performanceScore: metrics.performance.averageOverallScore,
                            attendanceRate: metrics.attendance.averageAttendanceRate,
                            taskCompletionRate: metrics.tasks.averageCompletionRate,
                            employeeCount: metrics.employeeCount,
                            healthScore: metrics.healthScore
                        },
                        ranking: metrics.ranking,
                        trend: this.calculateOverallTrend(metrics)
                    });
                } catch (error) {
                    logger.warn('DepartmentAnalyticsService: Failed to get metrics for department', {
                        departmentId: dept.id,
                        error: (error as Error).message
                    });
                }
            }

            // Sort by health score
            departmentMetrics.sort((a, b) => b.metrics.healthScore - a.metrics.healthScore);

            // Update rankings
            departmentMetrics.forEach((dept, index) => {
                dept.ranking = index + 1;
            });

            // Identify top performing department
            const topPerforming = departmentMetrics.length > 0 ? {
                departmentId: departmentMetrics[0].departmentId,
                departmentName: departmentMetrics[0].departmentName,
                score: departmentMetrics[0].metrics.healthScore
            } : null;

            // Identify departments needing attention
            const needsAttention = departmentMetrics
                .filter(dept => dept.metrics.healthScore < this.thresholds.satisfactoryScore)
                .map(dept => ({
                    departmentId: dept.departmentId,
                    departmentName: dept.departmentName,
                    issues: this.identifyDepartmentIssues(dept.metrics),
                    priority: dept.metrics.healthScore < this.thresholds.concerningScore ? 'high' as const : 'medium' as const
                }));

            // Generate comparison insights
            const insights = this.generateComparisonInsights(departmentMetrics);
            const recommendations = this.generateComparisonRecommendations(departmentMetrics, needsAttention);

            const comparison: DepartmentComparison = {
                departments: departmentMetrics,
                topPerforming: topPerforming!,
                needsAttention,
                insights,
                recommendations
            };

            logger.info('DepartmentAnalyticsService: Department comparison completed', {
                totalDepartments: departmentMetrics.length,
                needsAttentionCount: needsAttention.length
            });

            return comparison;
        } catch (error) {
            logger.error('DepartmentAnalyticsService: Failed to compare departments', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Calculate department performance using existing PerformanceAnalyticsService
     */
    private async calculateDepartmentPerformance(
        departmentId: string,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        return await this.performanceService.calculateDepartmentPerformance(departmentId, startDate, endDate);
    }

    /**
     * Calculate department health score
     */
    private calculateDepartmentHealthScore(
        performanceScore: number,
        attendanceRate: number,
        taskCompletionRate: number
    ): number {
        const weightedScore = 
            (performanceScore * this.healthWeights.performance) +
            (attendanceRate * this.healthWeights.attendance) +
            (taskCompletionRate * this.healthWeights.taskCompletion);

        return Math.round(weightedScore * 100) / 100;
    }

    /**
     * Calculate department ranking
     */
    private async calculateDepartmentRanking(departmentId: string, healthScore: number): Promise<number> {
        try {
            // This would typically query all departments and rank them
            // For now, returning a simple ranking based on score
            if (healthScore >= this.thresholds.excellentScore) return 1;
            if (healthScore >= this.thresholds.goodScore) return 2;
            if (healthScore >= this.thresholds.satisfactoryScore) return 3;
            return 4;
        } catch (error) {
            return 1;
        }
    }

    /**
     * Identify under-performing employees
     */
    private async identifyUnderPerformers(
        departmentId: string,
        startDate: Date,
        endDate: Date
    ): Promise<Array<{ employeeId: string; employeeName: string; overallScore: number; issues: string[] }>> {
        try {
            const { data: employees, error } = await this.supabase
                .from('employees')
                .select('id, full_name')
                .eq('department_id', departmentId)
                .eq('status', 'active');

            if (error) throw error;

            const underPerformers: Array<{ employeeId: string; employeeName: string; overallScore: number; issues: string[] }> = [];

            for (const employee of employees || []) {
                try {
                    const performance = await this.performanceService.calculateEmployeePerformance(
                        employee.id,
                        startDate,
                        endDate
                    );

                    if (performance.scores.overall < this.thresholds.satisfactoryScore) {
                        const issues: string[] = [];
                        
                        if (performance.scores.attendance < this.thresholds.satisfactoryScore) {
                            issues.push('Poor attendance');
                        }
                        if (performance.scores.taskCompletion < this.thresholds.satisfactoryScore) {
                            issues.push('Low task completion rate');
                        }
                        if (performance.scores.punctuality < this.thresholds.satisfactoryScore) {
                            issues.push('Punctuality issues');
                        }
                        if (performance.scores.productivity < this.thresholds.satisfactoryScore) {
                            issues.push('Low productivity');
                        }

                        underPerformers.push({
                            employeeId: employee.id,
                            employeeName: employee.full_name,
                            overallScore: performance.scores.overall,
                            issues
                        });
                    }
                } catch (error) {
                    logger.warn('DepartmentAnalyticsService: Failed to analyze employee performance', {
                        employeeId: employee.id,
                        error: (error as Error).message
                    });
                }
            }

            return underPerformers.sort((a, b) => a.overallScore - b.overallScore);
        } catch (error) {
            logger.error('DepartmentAnalyticsService: Failed to identify under-performers', {
                error: (error as Error).message,
                departmentId
            });
            return [];
        }
    }

    /**
     * Generate department insights
     */
    private generateDepartmentInsights(
        performance: any,
        attendance: any,
        tasks: any,
        healthScore: number
    ): string[] {
        const insights: string[] = [];

        // Overall health insights
        if (healthScore >= this.thresholds.excellentScore) {
            insights.push('Department is performing exceptionally well across all metrics');
        } else if (healthScore >= this.thresholds.goodScore) {
            insights.push('Department shows strong performance with room for optimization');
        } else if (healthScore >= this.thresholds.satisfactoryScore) {
            insights.push('Department performance is satisfactory but needs improvement in key areas');
        } else {
            insights.push('Department requires immediate attention and intervention');
        }

        // Performance insights
        if (performance.averageScores.overall >= this.thresholds.excellentScore) {
            insights.push('Team consistently exceeds performance expectations');
        } else if (performance.averageScores.overall < this.thresholds.satisfactoryScore) {
            insights.push('Team performance is below acceptable standards');
        }

        // Attendance insights
        if (attendance.metrics.averageAttendanceRate >= 95) {
            insights.push('Excellent attendance record across the department');
        } else if (attendance.metrics.averageAttendanceRate < 85) {
            insights.push('Attendance issues are impacting department productivity');
        }

        // Task completion insights
        if (tasks.metrics.averageCompletionRate >= 90) {
            insights.push('Outstanding task completion and delivery performance');
        } else if (tasks.metrics.averageCompletionRate < 70) {
            insights.push('Task completion rates need significant improvement');
        }

        return insights;
    }

    /**
     * Generate department recommendations
     */
    private generateDepartmentRecommendations(
        performance: any,
        attendance: any,
        tasks: any,
        healthScore: number
    ): string[] {
        const recommendations: string[] = [];

        if (healthScore < this.thresholds.satisfactoryScore) {
            recommendations.push('Implement comprehensive department improvement plan');
        }

        if (performance.averageScores.overall < this.thresholds.goodScore) {
            recommendations.push('Provide additional training and development opportunities');
        }

        if (attendance.metrics.averageAttendanceRate < 90) {
            recommendations.push('Address attendance issues through policy review and support programs');
        }

        if (tasks.metrics.averageCompletionRate < 80) {
            recommendations.push('Review task allocation and provide project management training');
        }

        if (recommendations.length === 0) {
            recommendations.push('Continue maintaining excellent department standards');
        }

        return recommendations;
    }

    /**
     * Calculate overall trend for department
     */
    private calculateOverallTrend(metrics: DepartmentMetrics): 'improving' | 'declining' | 'stable' {
        // This would typically compare with historical data
        // For now, using attendance trend as proxy
        return metrics.attendance.attendanceTrend;
    }

    /**
     * Identify department issues
     */
    private identifyDepartmentIssues(metrics: any): string[] {
        const issues: string[] = [];

        if (metrics.performanceScore < this.thresholds.satisfactoryScore) {
            issues.push('Low overall performance scores');
        }

        if (metrics.attendanceRate < 85) {
            issues.push('Poor attendance rates');
        }

        if (metrics.taskCompletionRate < 75) {
            issues.push('Low task completion rates');
        }

        if (metrics.employeeCount < 3) {
            issues.push('Understaffed department');
        }

        return issues;
    }

    /**
     * Generate comparison insights
     */
    private generateComparisonInsights(departmentMetrics: any[]): string[] {
        const insights: string[] = [];

        if (departmentMetrics.length === 0) {
            return ['No departments available for comparison'];
        }

        const avgHealthScore = departmentMetrics.reduce((sum, dept) => sum + dept.metrics.healthScore, 0) / departmentMetrics.length;
        const topScore = departmentMetrics[0]?.metrics.healthScore || 0;
        const bottomScore = departmentMetrics[departmentMetrics.length - 1]?.metrics.healthScore || 0;

        insights.push(`Average department health score: ${Math.round(avgHealthScore)}`);
        insights.push(`Performance gap between top and bottom departments: ${Math.round(topScore - bottomScore)} points`);

        const excellentDepts = departmentMetrics.filter(d => d.metrics.healthScore >= this.thresholds.excellentScore).length;
        const concerningDepts = departmentMetrics.filter(d => d.metrics.healthScore < this.thresholds.satisfactoryScore).length;

        if (excellentDepts > 0) {
            insights.push(`${excellentDepts} department(s) performing at excellent level`);
        }

        if (concerningDepts > 0) {
            insights.push(`${concerningDepts} department(s) require immediate attention`);
        }

        return insights;
    }

    /**
     * Generate comparison recommendations
     */
    private generateComparisonRecommendations(departmentMetrics: any[], needsAttention: any[]): string[] {
        const recommendations: string[] = [];

        if (needsAttention.length > 0) {
            recommendations.push('Prioritize support for underperforming departments');
            recommendations.push('Implement knowledge sharing between high and low performing departments');
        }

        const performanceGap = departmentMetrics.length > 1 ? 
            departmentMetrics[0].metrics.healthScore - departmentMetrics[departmentMetrics.length - 1].metrics.healthScore : 0;

        if (performanceGap > 30) {
            recommendations.push('Address significant performance gaps between departments');
        }

        if (departmentMetrics.some(d => d.metrics.employeeCount < 3)) {
            recommendations.push('Review staffing levels in smaller departments');
        }

        recommendations.push('Establish regular cross-department collaboration initiatives');
        recommendations.push('Create best practice sharing sessions between departments');

        return recommendations;
    }

    /**
     * Create empty department metrics for departments with no employees
     */
    private createEmptyDepartmentMetrics(
        departmentId: string,
        departmentName: string,
        startDate: Date,
        endDate: Date
    ): DepartmentMetrics {
        return {
            departmentId,
            departmentName,
            period: { start: startDate, end: endDate },
            employeeCount: 0,
            performance: {
                averageOverallScore: 0,
                averageAttendanceScore: 0,
                averageTaskCompletionScore: 0,
                averagePunctualityScore: 0,
                averageProductivityScore: 0,
                topPerformers: [],
                underPerformers: []
            },
            attendance: {
                averageAttendanceRate: 0,
                averagePunctualityRate: 0,
                totalAbsences: 0,
                totalLateArrivals: 0,
                attendanceTrend: 'stable',
                concerningPatterns: []
            },
            tasks: {
                totalTasks: 0,
                completedTasks: 0,
                averageCompletionRate: 0,
                averageOnTimeRate: 0,
                averageCompletionTime: 0,
                taskTrend: 'stable',
                bottlenecks: []
            },
            insights: ['Department has no active employees'],
            recommendations: ['Assign employees to this department or consider deactivating it'],
            healthScore: 0,
            ranking: 999
        };
    }
}

export default new DepartmentAnalyticsService();