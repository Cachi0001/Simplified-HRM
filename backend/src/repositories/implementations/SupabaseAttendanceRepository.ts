import { IAttendanceRepository } from '../interfaces/IAttendanceRepository';
import { Attendance, CreateAttendanceRequest, AttendanceQuery } from '../../models/Attendance';
import logger from '../../utils/logger';

export class SupabaseAttendanceRepository implements IAttendanceRepository {
  constructor(private supabase: any) {}

  async checkIn(employeeId: string, attendanceData: CreateAttendanceRequest): Promise<Attendance> {
    try {
      // Check if employee is already checked in today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: existingCheckin } = await this.supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'checked_in')
        .gte('check_in_time', today.toISOString())
        .lt('check_in_time', tomorrow.toISOString())
        .single();

      if (existingCheckin) {
        throw new Error('Employee is already checked in');
      }

      const { data, error } = await this.supabase
        .from('attendance')
        .insert({
          employee_id: employeeId,
          check_in_time: new Date().toISOString(),
          location: attendanceData.location,
          status: 'checked_in',
          date: new Date().toISOString().split('T')[0],
          notes: attendanceData.notes
        })
        .select()
        .single();

      if (error) {
        logger.error('Check-in error', { error: error.message });
        throw new Error(error.message);
      }

      return this.mapSupabaseAttendanceToAttendance(data);
    } catch (error) {
      logger.error('Check-in failed', { error: (error as Error).message });
      throw error;
    }
  }

  async checkOut(employeeId: string, attendanceData: CreateAttendanceRequest): Promise<Attendance> {
    try {
      // Find the current check-in for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: checkin, error: findError } = await this.supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'checked_in')
        .gte('check_in_time', today.toISOString())
        .lt('check_in_time', tomorrow.toISOString())
        .order('check_in_time', { ascending: false })
        .limit(1)
        .single();

      if (findError || !checkin) {
        throw new Error('No active check-in found for today');
      }

      // Calculate total hours
      const checkInTime = new Date(checkin.check_in_time);
      const checkOutTime = new Date();
      const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      const { data, error } = await this.supabase
        .from('attendance')
        .update({
          check_out_time: checkOutTime.toISOString(),
          location: attendanceData.location,
          status: 'checked_out',
          total_hours: Math.round(totalHours * 100) / 100,
          notes: attendanceData.notes
        })
        .eq('id', checkin.id)
        .select()
        .single();

      if (error) {
        logger.error('Check-out error', { error: error.message });
        throw new Error(error.message);
      }

      return this.mapSupabaseAttendanceToAttendance(data);
    } catch (error) {
      logger.error('Check-out failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getCurrentStatus(employeeId: string): Promise<Attendance | null> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await this.supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('check_in_time', today.toISOString())
        .lt('check_in_time', tomorrow.toISOString())
        .order('check_in_time', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Get current status error', { error: error.message });
        throw new Error(error.message);
      }

      return data ? this.mapSupabaseAttendanceToAttendance(data) : null;
    } catch (error) {
      logger.error('Get current status failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getAttendanceHistory(query: AttendanceQuery): Promise<{ attendances: Attendance[]; total: number; page: number; limit: number }> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const offset = (page - 1) * limit;

      let supabaseQuery = this.supabase.from('attendance').select('*', { count: 'exact' });

      if (query.employeeId) {
        supabaseQuery = supabaseQuery.eq('employee_id', query.employeeId);
      }
      if (query.startDate) {
        supabaseQuery = supabaseQuery.gte('date', query.startDate.toISOString().split('T')[0]);
      }
      if (query.endDate) {
        supabaseQuery = supabaseQuery.lte('date', query.endDate.toISOString().split('T')[0]);
      }
      if (query.status) {
        supabaseQuery = supabaseQuery.eq('status', query.status);
      }

      const { data, error, count } = await supabaseQuery
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Get attendance history error', { error: error.message });
        throw new Error(error.message);
      }

      return {
        attendances: data.map(this.mapSupabaseAttendanceToAttendance),
        total: count || 0,
        page,
        limit
      };
    } catch (error) {
      logger.error('Get attendance history failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getEmployeeAttendance(employeeId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]> {
    try {
      let query = this.supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId);

      if (startDate) {
        query = query.gte('date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        query = query.lte('date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false });

      if (error) {
        logger.error('Get employee attendance error', { error: error.message });
        throw new Error(error.message);
      }

      return data.map(this.mapSupabaseAttendanceToAttendance);
    } catch (error) {
      logger.error('Get employee attendance failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getAttendanceById(id: string): Promise<Attendance | null> {
    try {
      const { data, error } = await this.supabase
        .from('attendance')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Get attendance by ID error', { error: error.message });
        throw new Error(error.message);
      }

      return this.mapSupabaseAttendanceToAttendance(data);
    } catch (error) {
      logger.error('Get attendance by ID failed', { error: (error as Error).message });
      throw error;
    }
  }

  async updateAttendance(id: string, attendanceData: Partial<Attendance>): Promise<Attendance> {
    try {
      const updateData: any = {};
      if (attendanceData.checkOutTime) updateData.check_out_time = attendanceData.checkOutTime.toISOString();
      if (attendanceData.location) updateData.location = attendanceData.location;
      if (attendanceData.notes) updateData.notes = attendanceData.notes;
      if (attendanceData.totalHours !== undefined) updateData.total_hours = attendanceData.totalHours;

      const { data, error } = await this.supabase
        .from('attendance')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Update attendance error', { error: error.message });
        throw new Error(error.message);
      }

      return this.mapSupabaseAttendanceToAttendance(data);
    } catch (error) {
      logger.error('Update attendance failed', { error: (error as Error).message });
      throw error;
    }
  }

  async deleteAttendance(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('attendance')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Delete attendance error', { error: error.message });
        throw new Error(error.message);
      }
    } catch (error) {
      logger.error('Delete attendance failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getAttendanceReport(employeeId?: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      let query = this.supabase
        .from('attendance')
        .select(`
          *,
          employees!inner(full_name, department)
        `);

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      if (startDate) {
        query = query.gte('date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        query = query.lte('date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false });

      if (error) {
        logger.error('Get attendance report error', { error: error.message });
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      logger.error('Get attendance report failed', { error: (error as Error).message });
      throw error;
    }
  }

  private mapSupabaseAttendanceToAttendance(data: any): Attendance {
    return {
      id: data.id,
      employeeId: data.employee_id,
      checkInTime: new Date(data.check_in_time),
      checkOutTime: data.check_out_time ? new Date(data.check_out_time) : undefined,
      location: data.location,
      status: data.status,
      date: new Date(data.date),
      totalHours: data.total_hours,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  async getEmployeeIdFromUserId(userId: string): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error) {
        logger.error('Get employee ID from user ID error', { error: error.message });
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Employee not found');
      }

      return data.id;
    } catch (error) {
      logger.error('Get employee ID from user ID failed', { error: (error as Error).message });
      throw error;
    }
  }
}
