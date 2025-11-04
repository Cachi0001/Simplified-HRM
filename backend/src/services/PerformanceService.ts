import { SupabaseConfig } from '../config/supabase';
import logger from '../utils/logger';

export interface PerformanceMetrics {
  employee_id: string;
  calculation_period_start: string;
  calculation_period_end: string;
  
  // Task Performance
  total_tasks_assigned: number;
  total_tasks_completed: number;
  tasks_completed_on_time: number;
  tasks_completed_late: number;
  average_task_completion_days: number;
  task_completion_rate: number;
  task_timeliness_score: number;
  
  // Attendance Performance
  total_working_days: number;
  days_present: number;
  days_on_time: number;
  days_late: number;
  average_arrival_time?: string;
  attendance_rate: number;
  punctuality_score: number;
  
  // Overall Performance
  overall_performance_score: number;
  performance_grade: string;
  
  calculated_at: string;
}

export interface PerformanceWeight {
  id: string;
  weight_name: string;
  weight_value: number;
  description: string;
  is_active: boolean;
}

export interface PerformanceSummary {
  current_period: PerformanceMetrics;
  previous_period?: PerformanceMetrics;
  trend: {
    overall_score_change: number;
    task_completion_change: number;
    attendance_change: number;
    punctuality_change: number;
  };
  recommendations: string[];
}

export class PerformanceService {
  private supabase = SupabaseConfig.getInstance().getClient();

  /**
   * Get performance metrics for an employee
   */
  async getEmployeePerformanceMetrics(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<PerformanceMetrics> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_employee_performance_metrics', {
          p_employee_id: employeeId,
          p_start_date: startDate || null,
          p_end_date: endDate || null
        });

      if (error) {
        throw error;
      }

      return data as PerformanceMetrics;
    } catch (error) {
      logger.error('PerformanceService: Get employee performance metrics failed', {
        error: (error as Error).message,
        employeeId,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Calculate performance metrics for an employee
   */
  async calculateEmployeePerformance(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<PerformanceMetrics> {
    try {
      const { data, error } = await this.supabase
        .rpc('calculate_employee_performance', {
          p_employee_id: employeeId,
          p_start_date: startDate || null,
          p_end_date: endDate || null
        });

      if (error) {
        throw error;
      }

      logger.info('PerformanceService: Performance calculated successfully', {
        employeeId,
        startDate,
        endDate,
        overallScore: data.overall_performance_score
      });

      return data as PerformanceMetrics;
    } catch (error) {
      logger.error('PerformanceService: Calculate employee performance failed', {
        error: (error as Error).message,
        employeeId,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Get performance summary with trends and recommendations
   */
  async getPerformanceSummary(employeeId: string): Promise<PerformanceSummary> {
    try {
      // Get current month performance
      const currentDate = new Date();
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        .toISOString().split('T')[0];
      const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        .toISOString().split('T')[0];

      // Get previous month performance
      const previousMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
        .toISOString().split('T')[0];
      const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)
        .toISOString().split('T')[0];

      const [currentPeriod, previousPeriod] = await Promise.all([
        this.getEmployeePerformanceMetrics(employeeId, currentMonthStart, currentMonthEnd),
        this.getEmployeePerformanceMetrics(employeeId, previousMonthStart, previousMonthEnd)
          .catch(() => null) // Previous period might not exist
      ]);

      // Calculate trends
      const trend = {
        overall_score_change: previousPeriod 
          ? currentPeriod.overall_performance_score - previousPeriod.overall_performance_score
          : 0,
        task_completion_change: previousPeriod
          ? currentPeriod.task_completion_rate - previousPeriod.task_completion_rate
          : 0,
        attendance_change: previousPeriod
          ? currentPeriod.attendance_rate - previousPeriod.attendance_rate
          : 0,
        punctuality_change: previousPeriod
          ? currentPeriod.punctuality_score - previousPeriod.punctuality_score
          : 0
      };

      // Generate recommendations
      const recommendations = this.generateRecommendations(currentPeriod, trend);

      return {
        current_period: currentPeriod,
        previous_period: previousPeriod || undefined,
        trend,
        recommendations
      };
    } catch (error) {
      logger.error('PerformanceService: Get performance summary failed', {
        error: (error as Error).message,
        employeeId
      });
      throw error;
    }
  }

  /**
   * Get performance metrics for multiple employees (for managers/HR)
   */
  async getTeamPerformanceMetrics(
    employeeIds: string[],
    startDate?: string,
    endDate?: string
  ): Promise<PerformanceMetrics[]> {
    try {
      const promises = employeeIds.map(employeeId =>
        this.getEmployeePerformanceMetrics(employeeId, startDate, endDate)
          .catch(error => {
            logger.warn('Failed to get performance for employee', { employeeId, error: error.message });
            return null;
          })
      );

      const results = await Promise.all(promises);
      return results.filter(result => result !== null) as PerformanceMetrics[];
    } catch (error) {
      logger.error('PerformanceService: Get team performance metrics failed', {
        error: (error as Error).message,
        employeeIds,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Get performance weights configuration
   */
  async getPerformanceWeights(): Promise<PerformanceWeight[]> {
    try {
      const { data, error } = await this.supabase
        .from('performance_weights')
        .select('*')
        .eq('is_active', true)
        .order('weight_name');

      if (error) {
        throw error;
      }

      return data as PerformanceWeight[];
    } catch (error) {
      logger.error('PerformanceService: Get performance weights failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Update performance weights (admin only)
   */
  async updatePerformanceWeights(weights: Partial<PerformanceWeight>[]): Promise<PerformanceWeight[]> {
    try {
      const updates = weights.map(async (weight) => {
        if (!weight.id) return null;

        const { data, error } = await this.supabase
          .from('performance_weights')
          .update({
            weight_value: weight.weight_value,
            description: weight.description,
            is_active: weight.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', weight.id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return data;
      });

      const results = await Promise.all(updates);
      const validResults = results.filter((result: any) => result !== null) as PerformanceWeight[];

      logger.info('PerformanceService: Performance weights updated', {
        updatedCount: validResults.length
      });

      return validResults;
    } catch (error) {
      logger.error('PerformanceService: Update performance weights failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get performance history for an employee
   */
  async getPerformanceHistory(
    employeeId: string,
    months: number = 6
  ): Promise<PerformanceMetrics[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error } = await this.supabase
        .from('performance_metrics')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('calculation_period_start', startDate.toISOString().split('T')[0])
        .lte('calculation_period_end', endDate.toISOString().split('T')[0])
        .order('calculation_period_start', { ascending: false });

      if (error) {
        throw error;
      }

      return data as PerformanceMetrics[];
    } catch (error) {
      logger.error('PerformanceService: Get performance history failed', {
        error: (error as Error).message,
        employeeId,
        months
      });
      throw error;
    }
  }

  /**
   * Generate performance recommendations based on metrics
   */
  private generateRecommendations(metrics: PerformanceMetrics, trend: any): string[] {
    const recommendations: string[] = [];

    // Task completion recommendations
    if (metrics.task_completion_rate < 80) {
      recommendations.push('Focus on improving task completion rate. Consider breaking down large tasks into smaller, manageable pieces.');
    }
    if (metrics.task_timeliness_score < 70) {
      recommendations.push('Work on completing tasks on time. Consider setting personal deadlines before the actual due dates.');
    }
    if (trend.task_completion_change < -5) {
      recommendations.push('Task completion has declined recently. Review your workload and time management strategies.');
    }

    // Attendance recommendations
    if (metrics.attendance_rate < 90) {
      recommendations.push('Improve attendance consistency. Consider addressing any barriers to regular attendance.');
    }
    if (metrics.punctuality_score < 80) {
      recommendations.push('Focus on arriving on time. Consider adjusting your morning routine or commute planning.');
    }
    if (trend.attendance_change < -5) {
      recommendations.push('Attendance has decreased recently. Ensure you\'re maintaining good work-life balance.');
    }

    // Overall performance recommendations
    if (metrics.overall_performance_score >= 90) {
      recommendations.push('Excellent performance! Consider mentoring others or taking on additional responsibilities.');
    } else if (metrics.overall_performance_score >= 80) {
      recommendations.push('Good performance overall. Focus on areas with lower scores for continued improvement.');
    } else if (metrics.overall_performance_score >= 70) {
      recommendations.push('Performance is meeting expectations. Identify key areas for improvement to excel.');
    } else {
      recommendations.push('Performance needs improvement. Consider discussing development opportunities with your manager.');
    }

    // Trend-based recommendations
    if (trend.overall_score_change > 5) {
      recommendations.push('Great improvement trend! Keep up the excellent work.');
    } else if (trend.overall_score_change < -5) {
      recommendations.push('Performance has declined recently. Consider reviewing recent changes in workload or processes.');
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }
}