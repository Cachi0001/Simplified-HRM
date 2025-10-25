import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from '../../utils/logger';

export class SupabaseEmployeeRepository {
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
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error('❌ [SupabaseEmployeeRepository] Find by ID failed:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseEmployeeRepository] Find by ID failed:', error);
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        logger.error('❌ [SupabaseEmployeeRepository] Find by user ID failed:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseEmployeeRepository] Find by user ID failed:', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        logger.error('❌ [SupabaseEmployeeRepository] Find by email failed:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseEmployeeRepository] Find by email failed:', error);
      throw error;
    }
  }

  async findAll(query?: any): Promise<{ employees: any[]; total: number; page: number; limit: number }> {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 10;
      const offset = (page - 1) * limit;

      let supabaseQuery = this.supabase.from('employees').select('*', { count: 'exact' });

      if (query?.status) {
        supabaseQuery = supabaseQuery.eq('status', query.status);
      }

      if (query?.department) {
        supabaseQuery = supabaseQuery.eq('department', query.department);
      }

      if (query?.role) {
        supabaseQuery = supabaseQuery.eq('role', query.role);
      }

      const { data, error, count } = await supabaseQuery
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('❌ [SupabaseEmployeeRepository] Find all failed:', error);
        throw error;
      }

      return {
        employees: data || [],
        total: count || 0,
        page,
        limit
      };
    } catch (error) {
      logger.error('❌ [SupabaseEmployeeRepository] Find all failed:', error);
      throw error;
    }
  }

  async updateStatus(userId: string, status: 'active' | 'pending' | 'rejected'): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('employees')
        .update({ status })
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to update employee status: ${error.message}`);
      }

      logger.info('✅ [SupabaseEmployeeRepository] Employee status updated', { userId, status });
    } catch (error) {
      logger.error('❌ [SupabaseEmployeeRepository] Update status failed:', error);
      throw error;
    }
  }

  async updateEmailVerification(userId: string, verified: boolean): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('employees')
        .update({
          email_verified: verified,
          email_verification_token: verified ? null : undefined,
          email_verification_expires: verified ? null : undefined
        })
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to update email verification: ${error.message}`);
      }

      logger.info('✅ [SupabaseEmployeeRepository] Email verification updated', { userId, verified });
    } catch (error) {
      logger.error('❌ [SupabaseEmployeeRepository] Update email verification failed:', error);
      throw error;
    }
  }

  async create(employeeData: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .insert(employeeData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create employee: ${error.message}`);
      }

      logger.info('✅ [SupabaseEmployeeRepository] Employee created', {
        employeeId: data.id,
        userId: data.user_id,
        email: data.email
      });

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseEmployeeRepository] Create failed:', error);
      throw error;
    }
  }

  async update(id: string, updateData: any): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update employee: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseEmployeeRepository] Update failed:', error);
      throw error;
    }
  }

  async search(query: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,department.ilike.%${query}%`);

      if (error) {
        logger.error('❌ [SupabaseEmployeeRepository] Search failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('❌ [SupabaseEmployeeRepository] Search failed:', error);
      throw error;
    }
  }

  async getPendingApprovals(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .eq('status', 'pending')
        .neq('role', 'admin'); // Exclude admin users from pending approvals

      if (error) {
        logger.error('❌ [SupabaseEmployeeRepository] Get pending approvals failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('❌ [SupabaseEmployeeRepository] Get pending approvals failed:', error);
      throw error;
    }
  }

  async approve(id: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .update({ status: 'active' })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to approve employee: ${error.message}`);
      }

      logger.info('✅ [SupabaseEmployeeRepository] Employee approved', { id });
      return data;
    } catch (error) {
      logger.error('❌ [SupabaseEmployeeRepository] Approve failed:', error);
      throw error;
    }
  }

  async assignDepartment(id: string, department: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .update({ department })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to assign department: ${error.message}`);
      }

      logger.info('✅ [SupabaseEmployeeRepository] Department assigned', { id, department });
      return data;
    } catch (error) {
      logger.error('❌ [SupabaseEmployeeRepository] Assign department failed:', error);
      throw error;
    }
  }

  async getEmployeeStats(): Promise<{ total: number; active: number; pending: number; rejected: number }> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('status, role') // Also select role to filter out admins
        .neq('role', 'admin'); // Exclude admin users from employee stats

      if (error) {
        logger.error('❌ [SupabaseEmployeeRepository] Get employee stats failed:', error);
        throw error;
      }

      const stats = {
        total: data?.length || 0,
        active: data?.filter(e => e.status === 'active').length || 0,
        pending: data?.filter(e => e.status === 'pending').length || 0,
        rejected: data?.filter(e => e.status === 'rejected').length || 0,
      };

      logger.info('✅ [SupabaseEmployeeRepository] Employee stats calculated', {
        total: stats.total,
        active: stats.active,
        pending: stats.pending,
        rejected: stats.rejected
      });

      return stats;
    } catch (error) {
      logger.error('❌ [SupabaseEmployeeRepository] Get employee stats failed:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete employee: ${error.message}`);
      }

      logger.info('✅ [SupabaseEmployeeRepository] Employee deleted', { id });
    } catch (error) {
      logger.error('❌ [SupabaseEmployeeRepository] Delete failed:', error);
      throw error;
    }
  }
}
