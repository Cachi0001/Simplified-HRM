import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

export class DashboardController {
  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { timeRange = '30' } = req.query;
      const days = parseInt(timeRange as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get employee counts
      const employeeResult = await pool.query(`
        SELECT 
          COUNT(*) as total_employees,
          COUNT(*) FILTER (WHERE status = 'active') as active_employees,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_employees
        FROM employees
      `);

      // Get leave request counts
      const leaveResult = await pool.query(`
        SELECT 
          COUNT(*) as total_leaves,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_leaves,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_leaves
        FROM leave_requests
        WHERE created_at >= $1
      `, [startDate]);

      // Get purchase request counts
      const purchaseResult = await pool.query(`
        SELECT 
          COUNT(*) as total_purchases,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_purchases,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_purchases
        FROM purchase_requests
        WHERE created_at >= $1
      `, [startDate]);

      // Get task counts
      const taskResult = await pool.query(`
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks
        FROM tasks
        WHERE created_at >= $1
      `, [startDate]);

      // Get department count
      const departmentResult = await pool.query(`
        SELECT COUNT(*) as total_departments
        FROM departments
        WHERE deleted_at IS NULL
      `);

      // Get attendance stats
      const attendanceResult = await pool.query(`
        SELECT 
          COUNT(*) as total_attendance,
          COUNT(*) FILTER (WHERE is_late = true) as late_count,
          AVG(hours_worked) as avg_hours
        FROM attendance
        WHERE date >= $1
      `, [startDate]);

      const stats = {
        totalEmployees: parseInt(employeeResult.rows[0].total_employees) || 0,
        activeEmployees: parseInt(employeeResult.rows[0].active_employees) || 0,
        pendingEmployees: parseInt(employeeResult.rows[0].pending_employees) || 0,
        totalLeaves: parseInt(leaveResult.rows[0].total_leaves) || 0,
        pendingLeaves: parseInt(leaveResult.rows[0].pending_leaves) || 0,
        approvedLeaves: parseInt(leaveResult.rows[0].approved_leaves) || 0,
        totalPurchases: parseInt(purchaseResult.rows[0].total_purchases) || 0,
        pendingPurchases: parseInt(purchaseResult.rows[0].pending_purchases) || 0,
        approvedPurchases: parseInt(purchaseResult.rows[0].approved_purchases) || 0,
        totalTasks: parseInt(taskResult.rows[0].total_tasks) || 0,
        pendingTasks: parseInt(taskResult.rows[0].pending_tasks) || 0,
        completedTasks: parseInt(taskResult.rows[0].completed_tasks) || 0,
        totalDepartments: parseInt(departmentResult.rows[0].total_departments) || 0,
        totalAttendance: parseInt(attendanceResult.rows[0].total_attendance) || 0,
        lateCount: parseInt(attendanceResult.rows[0].late_count) || 0,
        avgHours: parseFloat(attendanceResult.rows[0].avg_hours) || 0,
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  };
}
