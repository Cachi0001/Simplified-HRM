import { IAttendanceRepository } from '../interfaces/IAttendanceRepository';
import { CreateAttendanceRequest } from '../../models/SupabaseAttendance';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from '../../utils/logger';

export class SupabaseAttendanceRepository implements IAttendanceRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async findById(id: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('attendance')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error('❌ [SupabaseAttendanceRepository] Find by ID failed:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Find by ID failed:', error);
      throw error;
    }
  }

  async findByEmployeeId(employeeId: string, date?: string): Promise<any[]> {
    try {
      let query = this.supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId);

      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('❌ [SupabaseAttendanceRepository] Find by employee ID failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Find by employee ID failed:', error);
      throw error;
    }
  }

  async findByDateRange(employeeId: string, startDate: string, endDate: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) {
        logger.error('❌ [SupabaseAttendanceRepository] Find by date range failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Find by date range failed:', error);
      throw error;
    }
  }

  async findAll(query?: any): Promise<{ attendances: any[]; total: number; page: number; limit: number }> {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 10;
      const offset = (page - 1) * limit;

      let supabaseQuery = this.supabase.from('attendance').select('*', { count: 'exact' });

      if (query?.employee_id) {
        supabaseQuery = supabaseQuery.eq('employee_id', query.employee_id);
      }

      if (query?.status) {
        supabaseQuery = supabaseQuery.eq('status', query.status);
      }

      if (query?.start_date && query?.end_date) {
        supabaseQuery = supabaseQuery.gte('date', query.start_date).lte('date', query.end_date);
      }

      const { data, error, count } = await supabaseQuery
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('❌ [SupabaseAttendanceRepository] Find all failed:', error);
        throw error;
      }

      return {
        attendances: data || [],
        total: count || 0,
        page,
        limit
      };
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Find all failed:', error);
      throw error;
    }
  }

  async create(attendanceData: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('attendance')
        .insert(attendanceData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create attendance record: ${error.message}`);
      }

      logger.info('✅ [SupabaseAttendanceRepository] Attendance record created', {
        attendanceId: data.id,
        employeeId: data.employee_id,
        date: data.date,
        status: data.status
      });

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Create failed:', error);
      throw error;
    }
  }

  async update(id: string, updateData: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('attendance')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update attendance record: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Update failed:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('attendance')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete attendance record: ${error.message}`);
      }

      logger.info('✅ [SupabaseAttendanceRepository] Attendance record deleted', { id });
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Delete failed:', error);
      throw error;
    }
  }

  async checkIn(employeeId: string, attendanceData: CreateAttendanceRequest): Promise<any> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if already checked in today
      const { data: existing } = await this.supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .single();

      if (existing) {
        throw new Error('Already checked in today');
      }

      const createData = {
        employee_id: employeeId,
        date: today,
        check_in_time: new Date().toISOString(),
        status: 'checked_in',
        ...(attendanceData.check_in_location && { check_in_location: attendanceData.check_in_location })
      };

      return await this.create(createData);
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Check in failed:', error);
      throw error;
    }
  }

  async checkOut(employeeId: string, attendanceData: CreateAttendanceRequest): Promise<any> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: existing } = await this.supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .single();

      if (!existing) {
        throw new Error('No attendance record found for today');
      }

      // Update the existing record with check-out time
      const updateData = {
        check_out_time: new Date().toISOString(),
        status: 'checked_out',
        ...(attendanceData.check_out_location && { check_out_location: attendanceData.check_out_location })
      };

      const { data, error } = await this.supabase
        .from('attendance')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to check out: ${error.message}`);
      }

      logger.info('✅ [SupabaseAttendanceRepository] Check out successful', {
        attendanceId: data.id,
        employeeId: data.employee_id
      });

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Check out failed:', error);
      throw error;
    }
  }

  async getEmployeeIdFromUserId(userId: string): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        logger.error('❌ [SupabaseAttendanceRepository] Get employee ID from user ID failed:', error);
        throw new Error('Employee not found');
      }

      return data.id;
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Get employee ID from user ID failed:', error);
      throw error;
    }
  }

  async getCurrentStatus(employeeId: string): Promise<any> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('❌ [SupabaseAttendanceRepository] Get current status failed:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Get current status failed:', error);
      throw error;
    }
  }

  async getAttendanceHistory(query: any): Promise<{ attendances: any[]; total: number; page: number; limit: number }> {
    try {
      let supabaseQuery = this.supabase.from('attendance').select('*', { count: 'exact' });

      if (query.employee_id) {
        supabaseQuery = supabaseQuery.eq('employee_id', query.employee_id);
      }

      if (query.start_date && query.end_date) {
        supabaseQuery = supabaseQuery.gte('date', query.start_date).lte('date', query.end_date);
      }

      const { data, error, count } = await supabaseQuery
        .range((query.page - 1) * query.limit, query.page * query.limit - 1);

      if (error) {
        logger.error('❌ [SupabaseAttendanceRepository] Get attendance history failed:', error);
        throw error;
      }

      return {
        attendances: data || [],
        total: count || 0,
        page: query.page,
        limit: query.limit
      };
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Get attendance history failed:', error);
      throw error;
    }
  }

  async getEmployeeAttendance(employeeId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      let query = this.supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId);

      if (startDate && endDate) {
        query = query.gte('date', startDate.toISOString().split('T')[0])
                    .lte('date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('❌ [SupabaseAttendanceRepository] Get employee attendance failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Get employee attendance failed:', error);
      throw error;
    }
  }

  async getAttendanceById(id: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('attendance')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error('❌ [SupabaseAttendanceRepository] Get attendance by ID failed:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Get attendance by ID failed:', error);
      throw error;
    }
  }

  async updateAttendance(id: string, attendanceData: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('attendance')
        .update(attendanceData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update attendance: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Update attendance failed:', error);
      throw error;
    }
  }

  async getAttendanceReport(employeeId?: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      let query = this.supabase
        .from('attendance')
        .select(
          `id, employee_id, date, check_in_time, check_out_time, total_hours, status,
           check_in_location, check_out_location,
           created_at, updated_at,
           employee:employees (id, full_name, department)`
        );

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      if (startDate) {
        query = query.gte('date', startDate.toISOString().split('T')[0]);
      }

      if (endDate) {
        query = query.lte('date', endDate.toISOString().split('T')[0]);
      }

      query = query.order('date', { ascending: false }).order('check_in_time', { ascending: false });

      const { data, error } = await query;

      if (error) {
        logger.error('❌ [SupabaseAttendanceRepository] Get attendance report failed:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(record => {
        const rawEmployee = (record as any)?.employee;
        const employeeId = rawEmployee?.id ?? record.employee_id;
        const employeeName = rawEmployee?.full_name ?? 'Unknown Employee';
        const date = record.date ?? (record as any)?.created_at ?? new Date().toISOString();
        const checkInLocation = this.parseLocation((record as any)?.check_in_location);
        const checkOutLocation = this.parseLocation((record as any)?.check_out_location);

        return {
          _id: {
            employeeId,
            employeeName,
            date
          },
          employeeId,
          employeeName,
          employee: rawEmployee
            ? {
                id: rawEmployee.id,
                fullName: rawEmployee.full_name,
                department: rawEmployee.department
              }
            : undefined,
          date,
          checkInTime: record.check_in_time,
          checkOutTime: record.check_out_time,
          checkInLocation,
          checkOutLocation,
          totalHours: record.total_hours,
          status: record.status,
          createdAt: record.created_at,
          updatedAt: record.updated_at
        };
      });
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Get attendance report failed:', error);
      throw error;
    }
  }

  private parseLocation(location: any): any {
    if (!location) {
      return null;
    }

    if (typeof location === 'string') {
      try {
        return JSON.parse(location);
      } catch {
        return null;
      }
    }

    return location;
  }

  async deleteAttendance(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('attendance')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete attendance record: ${error.message}`);
      }

      logger.info('✅ [SupabaseAttendanceRepository] Attendance record deleted', { id });
    } catch (error) {
      logger.error('❌ [SupabaseAttendanceRepository] Delete attendance failed:', error);
      throw error;
    }
  }
}
