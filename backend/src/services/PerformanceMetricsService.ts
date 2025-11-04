import { SupabaseConfig } from '../config/supabase';
import logger from '../utils/logger';

export interface PerformanceMetrics {
  id?: string;
  employeeId: string;
  calculationPeriodStart: string;
  calculationPeriodEnd: string;
  
  // Task Performance Metrics
  totalTasksAssigned: number;
  totalTasksCompleted: number;
  tasksCompletedOnTime: number;
  tasksCompletedLate: number;
  averageTaskCompletionDays: number;
  taskCompletionRate: number;
  taskTimelinessScore: number;
  
  // Attendance Performance Metrics
  totalWorkingDays: number;
  daysPresent: number;
  daysOnTime: number;
  daysLate: number;
  averageArrivalTime?: string;
  attendanceRate: number;
  punctualityScore: number;
  
  // Overall Performance Score
  overallPerformanceScore: number;
  performanceGrade: string;
  
  // Metadata
  calculatedAt: string;
  calculationVersion: string;
  notes?: string;
}

export interface PerformanceWeight {
  id: string;
  weightName: string;
  weightValue: number;
  description: string;
  isActive: boolean;
}

export interface PerformanceSummary {
  employeeId: string;
  employeeName: string;
  department?: string;
  currentPeriodScore: number;
  currentPeriodGrade: string;
  previousPeriodScore?: number;
  trend: 'up' | 'down' | 'stable';
  lastCalculated: string;
}

export class PerformanceMetricsService {
  private supabase = SupabaseConfig.getInstance().getClient();

  /**
   * Calculate performance metrics for a specific employee
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

      logger.info('PerformanceMetricsService: Performance calculated', { 
        employeeId, 
        startDate, 
        endDate 
      });

      return this.mapDatabaseToPerformanceMetrics(data);
    } catch (error) {
      logger.error('PerformanceMetricsService: Calculate performance failed', { 
        error: (error as Error).message,
        employeeId,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Get performance metrics for a specific employee
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

      return this.mapDatabaseToPerformanceMetrics(data);
    } catch (error) {
      logger.error('PerformanceMetricsService: Get performance metrics failed', { 
        error: (error as Error).message,
        employeeId,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Get performance metrics for multiple employees
   */
  async getMultipleEmployeePerformance(
    employeeIds: string[],
    startDate?: string,
    endDate?: string
  ): Promise<PerformanceMetrics[]> {
    try {
      const results = await Promise.all(
        employeeIds.map(employeeId => 
          this.getEmployeePerformanceMetrics(employeeId, startDate, endDate)
        )
      );

      return results;
    } catch (error) {
      logger.error('PerformanceMetricsService: Get multiple employee performance failed', { 
        error: (error as Error).message,
        employeeIds: employeeIds.length
      });
      throw error;
    }
  }

  /**
   * Get performance summary for all employees (for dashboard)
   */
  async getPerformanceSummary(
    departmentId?: string,
    limit: number = 50
  ): Promise<PerformanceSummary[]> {
    try {
      // Get current month metrics
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      const currentMonthEnd = new Date(currentMonthStart);
      currentMonthEnd.setMonth(currentMonthEnd.getMonth() + 1);
      currentMonthEnd.setDate(0);

      // Get previous month metrics for trend calculation
      const previousMonthStart = new Date(currentMonthStart);
      previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
      const previousMonthEnd = new Date(currentMonthStart);
      previousMonthEnd.setDate(0);

      let employeesQuery = this.supabase
        .from('employees')
        .select(`
          id,
          full_name,
          department_id,
          departments(name)
        `)
        .eq('status', 'approved')
        .limit(limit);

      if (departmentId) {
        employeesQuery = employeesQuery.eq('department_id', departmentId);
      }

      const { data: employees, error: employeesError } = await employeesQuery;

      if (employeesError) {
        throw employeesError;
      }

      const summaries: PerformanceSummary[] = [];

      for (const employee of employees || []) {
        try {
          // Get current period metrics
          const currentMetrics = await this.getEmployeePerformanceMetrics(
            employee.id,
            currentMonthStart.toISOString().split('T')[0],
            currentMonthEnd.toISOString().split('T')[0]
          );

          // Get previous period metrics for trend
          let previousScore: number | undefined;
          try {
            const previousMetrics = await this.getEmployeePerformanceMetrics(
              employee.id,
              previousMonthStart.toISOString().split('T')[0],
              previousMonthEnd.toISOString().split('T')[0]
            );
            previousScore = previousMetrics.overallPerformanceScore;
          } catch {
            // Previous metrics might not exist, that's okay
            previousScore = undefined;
          }

          // Calculate trend
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (previousScore !== undefined) {
            const scoreDiff = currentMetrics.overallPerformanceScore - previousScore;
            if (scoreDiff > 2) trend = 'up';
            else if (scoreDiff < -2) trend = 'down';
          }

          summaries.push({
            employeeId: employee.id,
            employeeName: employee.full_name,
            department: (employee.departments as any)?.name,
            currentPeriodScore: currentMetrics.overallPerformanceScore,
            currentPeriodGrade: currentMetrics.performanceGrade,
            previousPeriodScore: previousScore,
            trend,
            lastCalculated: currentMetrics.calculatedAt
          });
        } catch (error) {
          logger.warn('PerformanceMetricsService: Failed to get metrics for employee', {
            employeeId: employee.id,
            error: (error as Error).message
          });
          
          // Add employee with default/empty metrics
          summaries.push({
            employeeId: employee.id,
            employeeName: employee.full_name,
            department: (employee.departments as any)?.name,
            currentPeriodScore: 0,
            currentPeriodGrade: 'N/A',
            trend: 'stable',
            lastCalculated: new Date().toISOString()
          });
        }
      }

      return summaries.sort((a, b) => b.currentPeriodScore - a.currentPeriodScore);
    } catch (error) {
      logger.error('PerformanceMetricsService: Get performance summary failed', { 
        error: (error as Error).message,
        departmentId
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

      return (data || []).map((weight: any) => ({
        id: weight.id,
        weightName: weight.weight_name,
        weightValue: weight.weight_value,
        description: weight.description,
        isActive: weight.is_active
      }));
    } catch (error) {
      logger.error('PerformanceMetricsService: Get performance weights failed', { 
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Update performance weights (admin only)
   */
  async updatePerformanceWeight(
    weightId: string,
    weightValue: number,
    description?: string
  ): Promise<PerformanceWeight> {
    try {
      // Validate weight value
      if (weightValue < 0 || weightValue > 1) {
        throw new Error('Weight value must be between 0 and 1');
      }

      const updateData: any = {
        weight_value: weightValue,
        updated_at: new Date().toISOString()
      };

      if (description !== undefined) {
        updateData.description = description;
      }

      const { data, error } = await this.supabase
        .from('performance_weights')
        .update(updateData)
        .eq('id', weightId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info('PerformanceMetricsService: Performance weight updated', { 
        weightId, 
        weightValue 
      });

      return {
        id: data.id,
        weightName: data.weight_name,
        weightValue: data.weight_value,
        description: data.description,
        isActive: data.is_active
      };
    } catch (error) {
      logger.error('PerformanceMetricsService: Update performance weight failed', { 
        error: (error as Error).message,
        weightId,
        weightValue
      });
      throw error;
    }
  }

  /**
   * Recalculate performance for all employees (batch operation)
   */
  async recalculateAllPerformance(
    startDate?: string,
    endDate?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const { data: employees, error } = await this.supabase
        .from('employees')
        .select('id')
        .eq('status', 'approved');

      if (error) {
        throw error;
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const employee of employees || []) {
        try {
          await this.calculateEmployeePerformance(employee.id, startDate, endDate);
          success++;
        } catch (error) {
          failed++;
          errors.push(`Employee ${employee.id}: ${(error as Error).message}`);
        }
      }

      logger.info('PerformanceMetricsService: Batch recalculation completed', { 
        success, 
        failed, 
        total: employees?.length || 0 
      });

      return { success, failed, errors };
    } catch (error) {
      logger.error('PerformanceMetricsService: Batch recalculation failed', { 
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get performance trends for an employee over multiple periods
   */
  async getEmployeePerformanceTrends(
    employeeId: string,
    months: number = 6
  ): Promise<PerformanceMetrics[]> {
    try {
      const trends: PerformanceMetrics[] = [];
      const currentDate = new Date();

      for (let i = 0; i < months; i++) {
        const periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);

        try {
          const metrics = await this.getEmployeePerformanceMetrics(
            employeeId,
            periodStart.toISOString().split('T')[0],
            periodEnd.toISOString().split('T')[0]
          );
          trends.unshift(metrics); // Add to beginning to maintain chronological order
        } catch (error) {
          // If no data for this period, skip it
          logger.debug('PerformanceMetricsService: No data for period', {
            employeeId,
            period: `${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`
          });
        }
      }

      return trends;
    } catch (error) {
      logger.error('PerformanceMetricsService: Get performance trends failed', { 
        error: (error as Error).message,
        employeeId,
        months
      });
      throw error;
    }
  }

  // Private helper methods

  private mapDatabaseToPerformanceMetrics(data: any): PerformanceMetrics {
    return {
      id: data.id,
      employeeId: data.employee_id,
      calculationPeriodStart: data.calculation_period_start,
      calculationPeriodEnd: data.calculation_period_end,
      totalTasksAssigned: data.total_tasks_assigned || 0,
      totalTasksCompleted: data.total_tasks_completed || 0,
      tasksCompletedOnTime: data.tasks_completed_on_time || 0,
      tasksCompletedLate: data.tasks_completed_late || 0,
      averageTaskCompletionDays: data.average_task_completion_days || 0,
      taskCompletionRate: data.task_completion_rate || 0,
      taskTimelinessScore: data.task_timeliness_score || 0,
      totalWorkingDays: data.total_working_days || 0,
      daysPresent: data.days_present || 0,
      daysOnTime: data.days_on_time || 0,
      daysLate: data.days_late || 0,
      averageArrivalTime: data.average_arrival_time,
      attendanceRate: data.attendance_rate || 0,
      punctualityScore: data.punctuality_score || 0,
      overallPerformanceScore: data.overall_performance_score || 0,
      performanceGrade: data.performance_grade || 'N/A',
      calculatedAt: data.calculated_at || new Date().toISOString(),
      calculationVersion: data.calculation_version || '1.0',
      notes: data.notes
    };
  }
}