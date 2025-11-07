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
    const today = new Date().toISOString().split('T')[0];
    
    const lateStatus = await pool.query(
      'SELECT calculate_late_status($1) as result',
      [new Date()]
    );
    
    const lateInfo = lateStatus.rows[0].result;
    
    const result = await pool.query(
      `INSERT INTO attendance (
        employee_id, date, clock_in, 
        clock_in_lat, clock_in_lng, clock_in_address,
        is_late, late_minutes, status
      ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8)
      ON CONFLICT (employee_id, date) 
      DO UPDATE SET 
        clock_in = NOW(),
        clock_in_lat = $3,
        clock_in_lng = $4,
        clock_in_address = $5,
        is_late = $6,
        late_minutes = $7,
        status = $8,
        updated_at = NOW()
      RETURNING *`,
      [
        data.employee_id,
        today,
        data.lat,
        data.lng,
        data.address,
        lateInfo.is_late,
        lateInfo.late_minutes,
        lateInfo.is_late ? 'late' : 'present'
      ]
    );
    
    return result.rows[0];
  }

  async clockOut(data: ClockOutData): Promise<Attendance> {
    const today = new Date().toISOString().split('T')[0];
    
    const attendance = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
      [data.employee_id, today]
    );
    
    if (!attendance.rows[0]) {
      throw new Error('No clock-in record found for today');
    }
    
    const clockInTime = new Date(attendance.rows[0].clock_in);
    const clockOutTime = new Date();
    const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
    
    const result = await pool.query(
      `UPDATE attendance 
       SET clock_out = NOW(),
           clock_out_lat = $1,
           clock_out_lng = $2,
           clock_out_address = $3,
           hours_worked = $4,
           updated_at = NOW()
       WHERE employee_id = $5 AND date = $6
       RETURNING *`,
      [data.lat, data.lng, data.address, hoursWorked.toFixed(2), data.employee_id, today]
    );
    
    return result.rows[0];
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
    const today = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );
    
    return result.rows[0] || null;
  }

  async validateClockInLocation(employeeId: string, lat: number, lng: number): Promise<any> {
    const result = await pool.query(
      'SELECT validate_clock_in_location($1, $2, $3) as result',
      [employeeId, lat, lng]
    );
    
    return result.rows[0].result;
  }

  async validateClockOutLocation(employeeId: string, lat: number, lng: number): Promise<any> {
    const result = await pool.query(
      'SELECT validate_clock_out_location($1, $2, $3) as result',
      [employeeId, lat, lng]
    );
    
    return result.rows[0].result;
  }
}
