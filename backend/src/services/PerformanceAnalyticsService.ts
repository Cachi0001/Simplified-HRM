import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';

export interface IPerformanceMetric {
    id: string;
    user_id: string;
    metric_type: 'task_completion' | 'attendance' | 'overall';
    score: number;
    calculation_date: string;
    details: any;
    created_at: string;
}

export interface ITaskCompletionAnalytics {
    id: string;
    employee_id: string;
    task_id: string;
    assigned_date: string;
    due_date?: string;
    completed_date?: string;
    completion_status: 'on_time' | 'late' | 'overdue' | 'incomplete';
    delay_days: number;
    performance_impact: number;
    created_at: string;
}

export interface IAttendanceAnalytics {
    id: string;
    employee_id: string;
    date: string;
    expected_check_in: string;
    actual_check_in?: string;
    expected_check_out: string;
    actual_check_out?: string;
    minutes_late: number;
    early_departure_minutes: number;
    attendance_score: number;
    created_at: string;
}

export interface PerformanceReport {
    employee_id: string;
    employee_name: string;
    overall_score: number;
    task_completion_score: number;
    attendance_score: number;
    tasks_completed: number;
    tasks_on_time: number;
    average_delay_days: number;
    attendance_rate: number;
    late_arrivals: number;
    period_start: string;
    period_end: string;
}

export class PerformanceAnalyticsService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = supabase.getClient();
    }

    /**
     * Calculate task completion performance score
     */
    async calculateTaskCompletionScore(employeeId: string, periodDays: number = 30): Promise<number> {
        try {
            logger.info('PerformanceAnalyticsService: Calculating task completion score', { 
                employeeId, 
                periodDays 
            });

            const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

            const { data: tasks, error } = await this.supabase
                .from('tasks')
                .select('id, status, due_date, completed_at, created_at')
                .eq('assigned_to', employeeId)
                .gte('created_at', startDate);

            if (error) {
                logger.error('PerformanceAnalyticsService: Failed to get tasks for score calculation', { 
                    error: error.message 
                });
                throw error;
            }

            if (!tasks || tasks.length === 0) {
                return 50; // Default score if no tasks
            }

            let totalScore = 0;
            let completedTasks = 0;

            for (const task of tasks) {
                if (task.status === 'completed' && task.completed_at) {
                    completedTasks++;
                    const dueDate = task.due_date ? new Date(task.due_date) : null;
                    const completedDate = new Date(task.completed_at);

                    if (dueDate) {
                        const delayDays = Math.max(0, Math.ceil((completedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
                        
                        if (delayDays === 0) {
                            totalScore += 100; // On time
                        } else if (delayDays <= 1) {
                            totalScore += 80; // 1 day late
                        } else if (delayDays <= 3) {
                            totalScore += 60; // 2-3 days late
                        } else {
                            totalScore += 40; // More than 3 days late
                        }
                    } else {
                        totalScore += 70; // No due date, assume average
                    }
                }
            }

            // Factor in completion rate
            const completionRate = completedTasks / tasks.length;
            const averageTaskScore = completedTasks > 0 ? totalScore / completedTasks : 0;
            const finalScore = averageTaskScore * completionRate;

            logger.info('PerformanceAnalyticsService: Task completion score calculated', { 
                employeeId, 
                finalScore: Math.round(finalScore),
                completedTasks,
                totalTasks: tasks.length
            });

            return Math.round(finalScore);
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Calculate task completion score failed', { 
                error: (error as Error).message 
            });
            throw error;
        }
    }

    /**
     * Calculate attendance performance score
     */
    async calculateAttendanceScore(employeeId: string, periodDays: number = 30): Promise<number> {
        try {
            logger.info('PerformanceAnalyticsService: Calculating attendance score', { 
                employeeId, 
                periodDays 
            });

            const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const { data: attendance, error } = await this.supabase
                .from('attendance')
                .select('date, is_late, minutes_late, check_in_time, check_out_time')
                .eq('employee_id', employeeId)
                .gte('date', startDate);

            if (error) {
                logger.error('PerformanceAnalyticsService: Failed to get attendance for score calculation', { 
                    error: error.message 
                });
                throw error;
            }

            if (!attendance || attendance.length === 0) {
                return 50; // Default score if no attendance records
            }

            let totalScore = 0;
            let validDays = 0;

            for (const record of attendance) {
                validDays++;
                
                if (!record.is_late) {
                    totalScore += 100; // On time
                } else {
                    const minutesLate = record.minutes_late || 0;
                    if (minutesLate <= 15) {
                        totalScore += 80; // Up to 15 minutes late
                    } else if (minutesLate <= 30) {
                        totalScore += 60; // 16-30 minutes late
                    } else if (minutesLate <= 60) {
                        totalScore += 40; // 31-60 minutes late
                    } else {
                        totalScore += 20; // More than 1 hour late
                    }
                }

                // Bonus for checking out (if check_out_time exists)
                if (record.check_out_time) {
                    totalScore += 10; // Bonus for proper checkout
                }
            }

            const finalScore = validDays > 0 ? totalScore / validDays : 0;

            logger.info('PerformanceAnalyticsService: Attendance score calculated', { 
                employeeId, 
                finalScore: Math.round(finalScore),
                validDays,
                totalRecords: attendance.length
            });

            return Math.round(finalScore);
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Calculate attendance score failed', { 
                error: (error as Error).message 
            });
            throw error;
        }
    }

    /**
     * Calculate overall performance score
     */
    async calculateOverallScore(employeeId: string, periodDays: number = 30): Promise<number> {
        try {
            const taskScore = await this.calculateTaskCompletionScore(employeeId, periodDays);
            const attendanceScore = await this.calculateAttendanceScore(employeeId, periodDays);

            // Weighted average: 70% task completion, 30% attendance
            const overallScore = Math.round((taskScore * 0.7) + (attendanceScore * 0.3));

            logger.info('PerformanceAnalyticsService: Overall score calculated', { 
                employeeId, 
                overallScore,
                taskScore,
                attendanceScore
            });

            return overallScore;
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Calculate overall score failed', { 
                error: (error as Error).message 
            });
            throw error;
        }
    }

    /**
     * Store performance metric
     */
    async storePerformanceMetric(
        employeeId: string, 
        metricType: 'task_completion' | 'attendance' | 'overall',
        score: number,
        details?: any
    ): Promise<IPerformanceMetric> {
        try {
            logger.info('PerformanceAnalyticsService: Storing performance metric', { 
                employeeId, 
                metricType, 
                score 
            });

            const today = new Date().toISOString().split('T')[0];

            // Check if metric already exists for today
            const { data: existing } = await this.supabase
                .from('performance_metrics')
                .select('id')
                .eq('user_id', employeeId)
                .eq('metric_type', metricType)
                .eq('calculation_date', today)
                .single();

            if (existing) {
                // Update existing metric
                const { data: updated, error } = await this.supabase
                    .from('performance_metrics')
                    .update({
                        score,
                        details: details || {},
                        created_at: new Date().toISOString()
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;
                return updated;
            } else {
                // Create new metric
                const { data: created, error } = await this.supabase
                    .from('performance_metrics')
                    .insert({
                        user_id: employeeId,
                        metric_type: metricType,
                        score,
                        calculation_date: today,
                        details: details || {},
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (error) throw error;
                return created;
            }
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Store performance metric failed', { 
                error: (error as Error).message 
            });
            throw error;
        }
    }

    /**
     * Update employee performance score in employees table
     */
    async updateEmployeePerformanceScore(employeeId: string, score: number): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('employees')
                .update({ performance_score: score })
                .eq('id', employeeId);

            if (error) {
                logger.error('PerformanceAnalyticsService: Failed to update employee performance score', { 
                    error: error.message 
                });
                throw error;
            }

            logger.info('PerformanceAnalyticsService: Employee performance score updated', { 
                employeeId, 
                score 
            });
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Update employee performance score failed', { 
                error: (error as Error).message 
            });
            throw error;
        }
    }

    /**
     * Generate performance report for an employee
     */
    async generateEmployeePerformanceReport(
        employeeId: string, 
        periodDays: number = 30
    ): Promise<PerformanceReport> {
        try {
            logger.info('PerformanceAnalyticsService: Generating employee performance report', { 
                employeeId, 
                periodDays 
            });

            const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
            const endDate = new Date();

            // Get employee details
            const { data: employee, error: empError } = await this.supabase
                .from('employees')
                .select('full_name')
                .eq('id', employeeId)
                .single();

            if (empError) throw empError;

            // Calculate scores
            const taskScore = await this.calculateTaskCompletionScore(employeeId, periodDays);
            const attendanceScore = await this.calculateAttendanceScore(employeeId, periodDays);
            const overallScore = await this.calculateOverallScore(employeeId, periodDays);

            // Get task statistics
            const { data: tasks } = await this.supabase
                .from('tasks')
                .select('id, status, due_date, completed_at')
                .eq('assigned_to', employeeId)
                .gte('created_at', startDate.toISOString());

            const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
            const onTimeTasks = tasks?.filter(t => {
                if (t.status === 'completed' && t.completed_at && t.due_date) {
                    return new Date(t.completed_at) <= new Date(t.due_date);
                }
                return false;
            }).length || 0;

            const lateTasks = tasks?.filter(t => {
                if (t.status === 'completed' && t.completed_at && t.due_date) {
                    return new Date(t.completed_at) > new Date(t.due_date);
                }
                return false;
            }) || [];

            const averageDelayDays = lateTasks.length > 0 ? 
                lateTasks.reduce((sum, task) => {
                    const delay = Math.ceil((new Date(task.completed_at!).getTime() - new Date(task.due_date!).getTime()) / (1000 * 60 * 60 * 24));
                    return sum + Math.max(0, delay);
                }, 0) / lateTasks.length : 0;

            // Get attendance statistics
            const { data: attendance } = await this.supabase
                .from('attendance')
                .select('date, is_late')
                .eq('employee_id', employeeId)
                .gte('date', startDate.toISOString().split('T')[0]);

            const attendanceRate = attendance ? (attendance.length / periodDays) * 100 : 0;
            const lateArrivals = attendance?.filter(a => a.is_late).length || 0;

            const report: PerformanceReport = {
                employee_id: employeeId,
                employee_name: employee.full_name,
                overall_score: overallScore,
                task_completion_score: taskScore,
                attendance_score: attendanceScore,
                tasks_completed: completedTasks,
                tasks_on_time: onTimeTasks,
                average_delay_days: Math.round(averageDelayDays * 10) / 10,
                attendance_rate: Math.round(attendanceRate * 10) / 10,
                late_arrivals: lateArrivals,
                period_start: startDate.toISOString().split('T')[0],
                period_end: endDate.toISOString().split('T')[0]
            };

            logger.info('PerformanceAnalyticsService: Employee performance report generated', { 
                employeeId, 
                overallScore 
            });

            return report;
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Generate employee performance report failed', { 
                error: (error as Error).message 
            });
            throw error;
        }
    }

    /**
     * Get performance metrics for an employee
     */
    async getEmployeePerformanceMetrics(
        employeeId: string, 
        metricType?: 'task_completion' | 'attendance' | 'overall',
        limit: number = 30
    ): Promise<IPerformanceMetric[]> {
        try {
            let query = this.supabase
                .from('performance_metrics')
                .select('*')
                .eq('user_id', employeeId);

            if (metricType) {
                query = query.eq('metric_type', metricType);
            }

            const { data, error } = await query
                .order('calculation_date', { ascending: false })
                .limit(limit);

            if (error) {
                logger.error('PerformanceAnalyticsService: Failed to get employee performance metrics', { 
                    error: error.message 
                });
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Get employee performance metrics failed', { 
                error: (error as Error).message 
            });
            throw error;
        }
    }

    /**
     * Get top performers
     */
    async getTopPerformers(limit: number = 10, periodDays: number = 30): Promise<any[]> {
        try {
            logger.info('PerformanceAnalyticsService: Getting top performers', { limit, periodDays });

            const { data: employees, error } = await this.supabase
                .from('employees')
                .select('id, full_name, performance_score, department')
                .not('performance_score', 'is', null)
                .order('performance_score', { ascending: false })
                .limit(limit);

            if (error) {
                logger.error('PerformanceAnalyticsService: Failed to get top performers', { 
                    error: error.message 
                });
                throw error;
            }

            return employees || [];
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Get top performers failed', { 
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
            logger.info('PerformanceAnalyticsService: Getting department performance summary', { 
                departmentId 
            });

            // Get department members
            const { data: members, error: membersError } = await this.supabase
                .from('department_members')
                .select(`
                    user_id,
                    employee:employees!department_members_user_id_fkey(id, full_name, performance_score)
                `)
                .eq('department_id', departmentId);

            if (membersError) throw membersError;

            if (!members || members.length === 0) {
                return {
                    department_id: departmentId,
                    member_count: 0,
                    average_score: 0,
                    top_performer: null,
                    performance_distribution: {}
                };
            }

            const scores = members
                .map(m => (m.employee as any)?.performance_score || 0)
                .filter(score => score > 0);

            const averageScore = scores.length > 0 ? 
                Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;

            const topPerformer = members
                .filter(m => (m.employee as any)?.performance_score)
                .sort((a, b) => ((b.employee as any)?.performance_score || 0) - ((a.employee as any)?.performance_score || 0))[0];

            // Performance distribution
            const distribution = {
                excellent: scores.filter(s => s >= 90).length,
                good: scores.filter(s => s >= 70 && s < 90).length,
                average: scores.filter(s => s >= 50 && s < 70).length,
                poor: scores.filter(s => s < 50).length
            };

            return {
                department_id: departmentId,
                member_count: members.length,
                average_score: averageScore,
                top_performer: topPerformer?.employee || null,
                performance_distribution: distribution
            };
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Get department performance summary failed', { 
                error: (error as Error).message 
            });
            throw error;
        }
    }

    /**
     * Run daily performance calculation for all employees
     */
    async runDailyPerformanceCalculation(): Promise<void> {
        try {
            logger.info('PerformanceAnalyticsService: Running daily performance calculation');

            const { data: employees, error } = await this.supabase
                .from('employees')
                .select('id')
                .eq('status', 'active');

            if (error) throw error;

            if (!employees || employees.length === 0) {
                logger.info('PerformanceAnalyticsService: No active employees found');
                return;
            }

            let processed = 0;
            let errors = 0;

            for (const employee of employees) {
                try {
                    const overallScore = await this.calculateOverallScore(employee.id);
                    await this.updateEmployeePerformanceScore(employee.id, overallScore);
                    await this.storePerformanceMetric(employee.id, 'overall', overallScore);
                    processed++;
                } catch (error) {
                    logger.error('PerformanceAnalyticsService: Failed to process employee', { 
                        employeeId: employee.id, 
                        error: (error as Error).message 
                    });
                    errors++;
                }
            }

            logger.info('PerformanceAnalyticsService: Daily performance calculation completed', { 
                processed, 
                errors, 
                total: employees.length 
            });
        } catch (error) {
            logger.error('PerformanceAnalyticsService: Run daily performance calculation failed', { 
                error: (error as Error).message 
            });
            throw error;
        }
    }
}

export default new PerformanceAnalyticsService();