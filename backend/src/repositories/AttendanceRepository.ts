import { pool } from '../config/database';

export interface Attendance {
  id: string;
  employee_id: string;
  date: Date;
  clock_in?: Date;
  clock_out?: Date;
  clock_in_lat?: number;
  clock_in_lng?: number;
  clock_in_address?: string;
  clock_out_lat?: number;
  clock_out_lng?: number;
  clock_out_address?: string;
  hours_worked?: number;
  status: string;
  late_minutes: number;
  is_late: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ClockInData {
  employee_id: string;
  lat: number;
  lng: number;
  address?: string;
}

export interface ClockOutData {
  employee_id: string;
  lat: number;
  lng: number;
  address?: string;
}

export class AttendanceRepository {
  async clockIn(data: ClockInData): Promise<Attendance> {
    // Optimized: Use single database function call instead of multiple queries
    const result = await pool.query(
      'SELECT optimized_clock_in($1, $2, $3, $4) as result',
      [data.employee_id, data.lat, data.lng, data.address || null]
    );
    
    const response = result.rows[0].result;
    
    if (!response.success) {
      throw new Error(response.message || 'Clock-in failed');
    }
    
    return response.data;
  }

  async clockOut(data: ClockOutData): Promise<Attendance> {
    // Optimized: Use single database function call instead of multiple queries
    const result = await pool.query(
      'SELECT optimized_clock_out($1, $2, $3, $4) as result',
      [data.employee_id, data.lat, data.lng, data.address || null]
    );
    
    const response = result.rows[0].result;
    
    if (!response.success) {
      throw new Error(response.message || 'Clock-out failed');
    }
    
    return response.data;
  }

  async getMyRecords(employeeId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    
    const result = await pool.query(
      `SELECT * FROM attendance 
       WHERE employee_id = $1 
       AND date BETWEEN $2 AND $3
       ORDER BY date DESC`,
      [employeeId, start, end]
    );
    
    return result.rows;
  }

  async getTodayAttendance(employeeId: string): Promise<Attendance | null> {
    // Optimized: Use dedicated function for today's attendance lookup
    const result = await pool.query(
      'SELECT * FROM get_today_attendance($1)',
      [employeeId]
    );
    
    return result.rows[0] || null;
  }

  async validateClockInLocation(employeeId: string, lat: number, lng: number, date?: Date): Promise<any> {
    const checkDate = date || new Date();
    const result = await pool.query(
      'SELECT validate_clock_in_location($1, $2, $3, $4) as result',
      [employeeId, lat, lng, checkDate.toISOString().split('T')[0]]
    );
    
    return result.rows[0].result;
  }

  async validateClockOutLocation(employeeId: string, lat: number, lng: number, date?: Date): Promise<any> {
    const checkDate = date || new Date();
    const result = await pool.query(
      'SELECT validate_clock_out_location($1, $2, $3, $4) as result',
      [employeeId, lat, lng, checkDate.toISOString().split('T')[0]]
    );
    
    return result.rows[0].result;
  }

  async getAttendanceReport(employeeId?: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    
    let query = `
      SELECT 
        a.id,
        a.employee_id,
        a.date,
        a.clock_in,
        a.clock_out,
        a.hours_worked,
        a.status,
        a.is_late,
        a.late_minutes,
        a.auto_clocked_out,
        e.full_name as employee_name,
        d.name as department_name
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE a.date BETWEEN $1 AND $2
    `;
    
    const params: any[] = [start, end];
    
    if (employeeId) {
      query += ' AND a.employee_id = $3';
      params.push(employeeId);
    }
    
    query += ' ORDER BY a.date DESC, e.full_name ASC';
    
    const result = await pool.query(query, params);
    
    // Transform to match frontend expectations
    return result.rows.map(row => ({
      _id: {
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        date: row.date
      },
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      department: row.department_name,
      date: row.date,
      checkInTime: row.clock_in,
      checkOutTime: row.clock_out,
      totalHours: row.hours_worked ? parseFloat(row.hours_worked) : 0,
      status: row.clock_out ? 'checked_out' : 'checked_in',
      isLate: row.is_late,
      lateMinutes: row.late_minutes,
      autoClockedOut: row.auto_clocked_out || false,
      locationStatus: 'onsite', // Default, can be enhanced
      distanceFromOffice: null
    }));
  }
}
