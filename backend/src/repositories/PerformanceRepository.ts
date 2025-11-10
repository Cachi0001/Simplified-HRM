import { pool } from '../config/database';

export interface PerformanceMetrics {
  employee_id: string;
  period_start: Date;
  period_end: Date;
  expected_working_days: number;
  days_present: number;
  days_late: number;
  average_late_minutes: number;
  total_tasks_assigned: number;
  total_tasks_completed: number;
  tasks_completed_on_time: number;
  attendance_score: number;
  punctuality_score: number;
  task_completion_score: number;
  overall_score: number;
}

export class PerformanceRepository {
  async calculatePerformance(
    employeeId: string,
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<PerformanceMetrics> {
    const result = await pool.query(
      'SELECT calculate_employee_performance($1, $2, $3) as metrics',
      [employeeId, periodStart || null, periodEnd || null]
    );
    
    return result.rows[0].metrics;
  }

  async saveSnapshot(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<any> {
    const result = await pool.query(
      'SELECT * FROM save_performance_snapshot($1, $2, $3)',
      [employeeId, periodStart, periodEnd]
    );
    
    return result.rows[0];
  }

  async getHistoricalMetrics(
    employeeId: string,
    limit: number = 12
  ): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM performance_metrics 
       WHERE employee_id = $1 
       ORDER BY period_end DESC 
       LIMIT $2`,
      [employeeId, limit]
    );
    
    return result.rows;
  }

  async getAllEmployeesPerformance(
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<PerformanceMetrics[]> {
    const start = periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = periodEnd || new Date();
    
    const result = await pool.query(
      `SELECT 
        e.id as employee_id,
        e.full_name,
        e.department_id,
        d.name as department_name,
        calculate_employee_performance(e.id, $1, $2) as metrics
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.status = 'active' 
       AND e.role NOT IN ('admin', 'superadmin')
       ORDER BY e.full_name`,
      [start, end]
    );
    
    return result.rows.map(row => ({
      employee_id: row.employee_id,
      full_name: row.full_name,
      department_name: row.department_name,
      ...row.metrics
    }));
  }
}
