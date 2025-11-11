import { pool } from '../config/database';

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_email?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by?: string;
  approver_name?: string;
  approved_at?: Date;
  admin_comments?: string;
  created_at: Date;
  updated_at: Date;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
  year: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateLeaveRequestData {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  notes?: string;
}

export class LeaveRepository {
  async createLeaveRequest(data: CreateLeaveRequestData): Promise<any> {
    const result = await pool.query(
      `SELECT create_leave_request($1, $2, $3, $4, $5, $6) as result`,
      [
        data.employeeId,
        data.leaveType,
        data.startDate,
        data.endDate,
        data.reason,
        data.notes || null
      ]
    );
    return result.rows[0].result;
  }

  async getLeaveRequests(employeeId?: string, status?: string): Promise<LeaveRequest[]> {
    const result = await pool.query(
      `SELECT * FROM get_leave_requests($1, $2)`,
      [employeeId || null, status || null]
    );
    return result.rows;
  }

  async getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
    const result = await pool.query(
      `SELECT * FROM get_leave_requests(NULL, NULL) WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async getAvailableLeaveTypes(employeeId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM get_available_leave_types($1)`,
      [employeeId]
    );
    return result.rows;
  }

  async getLeaveBalances(employeeId: string, year?: number): Promise<LeaveBalance[]> {
    const result = await pool.query(
      `SELECT * FROM get_leave_balances($1, $2)`,
      [employeeId, year || null]
    );
    return result.rows;
  }

  async approveLeaveRequest(leaveRequestId: string, approvedById: string, comments?: string): Promise<any> {
    const result = await pool.query(
      `SELECT approve_leave_request($1, $2, $3) as result`,
      [leaveRequestId, approvedById, comments || null]
    );
    return result.rows[0].result;
  }

  async rejectLeaveRequest(leaveRequestId: string, rejectedById: string, reason: string): Promise<any> {
    const result = await pool.query(
      `SELECT reject_leave_request($1, $2, $3) as result`,
      [leaveRequestId, rejectedById, reason]
    );
    return result.rows[0].result;
  }

  async cancelLeaveRequest(leaveRequestId: string, employeeId: string): Promise<any> {
    const result = await pool.query(
      `SELECT cancel_leave_request($1, $2) as result`,
      [leaveRequestId, employeeId]
    );
    return result.rows[0].result;
  }

  async getLeaveStatistics(employeeId: string, year?: number): Promise<any> {
    const result = await pool.query(
      `SELECT get_leave_statistics($1, $2) as stats`,
      [employeeId, year || null]
    );
    return result.rows[0].stats;
  }

  async getLeaveTypes(): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM leave_types WHERE is_active = TRUE ORDER BY name`
    );
    return result.rows;
  }

  async deleteLeaveRequest(leaveRequestId: string, userId: string): Promise<any> {
    const result = await pool.query(
      `SELECT delete_leave_request($1, $2) as result`,
      [leaveRequestId, userId]
    );
    return result.rows[0].result;
  }

  async resetLeaveBalance(employeeId: string, resetById: string, year?: number): Promise<any> {
    const result = await pool.query(
      'SELECT reset_leave_balance($1, $2, $3) as result',
      [employeeId, resetById, year || null]
    );
    
    return result.rows[0].result;
  }

  async bulkResetLeaveBalances(resetById: string, year?: number): Promise<any> {
    const result = await pool.query(
      'SELECT bulk_reset_leave_balances($1, $2) as result',
      [resetById, year || null]
    );
    
    return result.rows[0].result;
  }
}
