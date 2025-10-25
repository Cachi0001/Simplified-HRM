import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ITaskRepository } from '../interfaces/ITaskRepository';
import { ITask, CreateTaskRequest, UpdateTaskRequest, TaskQuery } from '../../models/SupabaseTask';
import logger from '../../utils/logger';

export class SupabaseTaskRepository implements ITaskRepository {
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
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error('❌ [SupabaseTaskRepository] Find by ID failed:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseTaskRepository] Find by ID failed:', error);
      throw error;
    }
  }

  async findByEmployeeId(employeeId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', employeeId);

      if (error) {
        logger.error('❌ [SupabaseTaskRepository] Find by employee ID failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('❌ [SupabaseTaskRepository] Find by employee ID failed:', error);
      throw error;
    }
  }

  async findAll(query?: any): Promise<{ tasks: any[]; total: number; page: number; limit: number }> {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 10;
      const offset = (page - 1) * limit;

      let supabaseQuery = this.supabase.from('tasks').select('*', { count: 'exact' });

      if (query?.status) {
        supabaseQuery = supabaseQuery.eq('status', query.status);
      }

      if (query?.assigned_to) {
        supabaseQuery = supabaseQuery.eq('assigned_to', query.assigned_to);
      }

      if (query?.created_by) {
        supabaseQuery = supabaseQuery.eq('created_by', query.created_by);
      }

      const { data, error, count } = await supabaseQuery
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('❌ [SupabaseTaskRepository] Find all failed:', error);
        throw error;
      }

      return {
        tasks: data || [],
        total: count || 0,
        page,
        limit
      };
    } catch (error) {
      logger.error('❌ [SupabaseTaskRepository] Find all failed:', error);
      throw error;
    }
  }

  async create(taskData: CreateTaskRequest, assignedBy: string): Promise<any> {
    try {
      const taskInsertData = {
        ...taskData,
        created_by: assignedBy,
        assigned_to: taskData.assigneeId
      };

      const { data, error } = await this.supabase
        .from('tasks')
        .insert(taskInsertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create task: ${error.message}`);
      }

      logger.info('✅ [SupabaseTaskRepository] Task created', {
        taskId: data.id,
        title: data.title,
        assignedTo: data.assigned_to,
        createdBy: data.created_by
      });

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseTaskRepository] Create failed:', error);
      throw error;
    }
  }

  async update(id: string, taskData: UpdateTaskRequest): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .update(taskData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update task: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseTaskRepository] Update failed:', error);
      throw error;
    }
  }

  async findByAssignee(assigneeId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', assigneeId);

      if (error) {
        logger.error('❌ [SupabaseTaskRepository] Find by assignee failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('❌ [SupabaseTaskRepository] Find by assignee failed:', error);
      throw error;
    }
  }

  async search(query: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

      if (error) {
        logger.error('❌ [SupabaseTaskRepository] Search failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('❌ [SupabaseTaskRepository] Search failed:', error);
      throw error;
    }
  }

  async getEmployeeById(employeeId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('id, full_name, email')
        .eq('id', employeeId)
        .single();

      if (error) {
        logger.error('❌ [SupabaseTaskRepository] Get employee by ID failed:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseTaskRepository] Get employee by ID failed:', error);
      throw error;
    }
  }
  async updateStatus(id: string, status: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update task status: ${error.message}`);
      }

      logger.info('✅ [SupabaseTaskRepository] Task status updated', { id, status });
      return data;
    } catch (error) {
      logger.error('❌ [SupabaseTaskRepository] Update status failed:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete task: ${error.message}`);
      }

      logger.info('✅ [SupabaseTaskRepository] Task deleted', { id });
    } catch (error) {
      logger.error('❌ [SupabaseTaskRepository] Delete failed:', error);
      throw error;
    }
  }
}
