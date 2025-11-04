import { SupabaseConfig } from '../config/supabase';
import logger from '../utils/logger';

export interface WorkingDaysConfig {
  id?: string;
  employee_id: string;
  working_days: string[];
  working_hours: { start: string; end: string };
  timezone: string;
  effective_from?: string;
  effective_until?: string;
  is_active?: boolean;
}

export class WorkingDaysService {
  private supabase = SupabaseConfig.getInstance().getClient();

  /**
   * Get current working days configuration for an employee
   */
  async getWorkingDaysConfig(employeeId: string): Promise<WorkingDaysConfig | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_employee_working_days', { p_employee_id: employeeId });

      if (error) {
        throw error;
      }

      // Also get working hours and timezone from employees table
      const { data: employeeData, error: employeeError } = await this.supabase
        .from('employees')
        .select('working_hours, timezone')
        .eq('id', employeeId)
        .single();

      if (employeeError) {
        logger.warn('Could not fetch employee working hours/timezone', { employeeId, error: employeeError });
      }

      return {
        employee_id: employeeId,
        working_days: data || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        working_hours: employeeData?.working_hours || { start: '09:00', end: '17:00' },
        timezone: employeeData?.timezone || 'UTC'
      };
    } catch (error) {
      logger.error('WorkingDaysService: Get working days config failed', { 
        error: (error as Error).message,
        employeeId 
      });
      throw error;
    }
  }

  /**
   * Update working days configuration for an employee
   */
  async updateWorkingDaysConfig(
    employeeId: string, 
    config: Partial<WorkingDaysConfig>
  ): Promise<WorkingDaysConfig> {
    try {
      // Validate working days
      if (config.working_days) {
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const invalidDays = config.working_days.filter(day => !validDays.includes(day.toLowerCase()));
        
        if (invalidDays.length > 0) {
          throw new Error(`Invalid working days: ${invalidDays.join(', ')}`);
        }

        if (config.working_days.length === 0) {
          throw new Error('At least one working day must be specified');
        }
      }

      // Validate working hours
      if (config.working_hours) {
        const startTime = new Date(`2000-01-01T${config.working_hours.start}:00`);
        const endTime = new Date(`2000-01-01T${config.working_hours.end}:00`);
        
        if (startTime >= endTime) {
          throw new Error('Start time must be before end time');
        }
      }

      // Use the database function to update working days
      const { data, error } = await this.supabase
        .rpc('update_employee_working_days', {
          p_employee_id: employeeId,
          p_working_days: config.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          p_working_hours: config.working_hours || { start: '09:00', end: '17:00' },
          p_timezone: config.timezone || 'UTC',
          p_effective_from: config.effective_from || new Date().toISOString().split('T')[0]
        });

      if (error) {
        throw error;
      }

      logger.info('WorkingDaysService: Working days updated successfully', { 
        employeeId,
        workingDays: config.working_days,
        workingHours: config.working_hours,
        timezone: config.timezone
      });

      return {
        employee_id: employeeId,
        working_days: config.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        working_hours: config.working_hours || { start: '09:00', end: '17:00' },
        timezone: config.timezone || 'UTC',
        is_active: true
      };
    } catch (error) {
      logger.error('WorkingDaysService: Update working days config failed', { 
        error: (error as Error).message,
        employeeId,
        config 
      });
      throw error;
    }
  }

  /**
   * Calculate working days between two dates for an employee
   */
  async calculateWorkingDaysBetween(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .rpc('calculate_working_days_between', {
          p_employee_id: employeeId,
          p_start_date: startDate,
          p_end_date: endDate
        });

      if (error) {
        throw error;
      }

      return data || 0;
    } catch (error) {
      logger.error('WorkingDaysService: Calculate working days failed', { 
        error: (error as Error).message,
        employeeId,
        startDate,
        endDate 
      });
      throw error;
    }
  }

  /**
   * Check if a specific date is a working day for an employee
   */
  async isWorkingDay(employeeId: string, date: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('is_working_day', {
          p_employee_id: employeeId,
          p_date: date
        });

      if (error) {
        throw error;
      }

      return data || false;
    } catch (error) {
      logger.error('WorkingDaysService: Check working day failed', { 
        error: (error as Error).message,
        employeeId,
        date 
      });
      throw error;
    }
  }

  /**
   * Get working days statistics for an employee
   */
  async getWorkingDaysStats(employeeId: string, month?: string): Promise<any> {
    try {
      const currentMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM format
      const startDate = `${currentMonth}-01`;
      const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0)
        .toISOString().split('T')[0];

      const totalWorkingDays = await this.calculateWorkingDaysBetween(employeeId, startDate, endDate);
      const config = await this.getWorkingDaysConfig(employeeId);

      return {
        month: currentMonth,
        total_working_days: totalWorkingDays,
        working_days_config: config?.working_days || [],
        working_hours: config?.working_hours || { start: '09:00', end: '17:00' },
        timezone: config?.timezone || 'UTC'
      };
    } catch (error) {
      logger.error('WorkingDaysService: Get working days stats failed', { 
        error: (error as Error).message,
        employeeId,
        month 
      });
      throw error;
    }
  }
}