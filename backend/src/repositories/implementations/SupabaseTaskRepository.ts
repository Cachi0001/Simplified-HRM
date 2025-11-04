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

  async getEmployeeByUserId(userId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('id, email, status, full_name')
        .eq('user_id', userId)
        .single();

      if (error) {
        logger.error('❌ [SupabaseTaskRepository] Get employee by user ID failed:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('❌ [SupabaseTaskRepository] Get employee by user ID failed:', error);
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
      const { data: creator, error: creatorError } = await this.supabase
        .from('employees')
        .select('id, email, status, full_name, user_id')
        .eq('user_id', assignedBy)
        .single();

      if (creatorError || !creator) {
        throw new Error(`Task creator not found: ${creatorError?.message || 'Employee record does not exist'}`);
      }

      const validatedAssigneeId = taskData.assigned_to;
      if (validatedAssigneeId) {
        const { data: assignee, error: assigneeError } = await this.supabase
          .from('employees')
          .select('id, email, status, full_name')
          .eq('id', validatedAssigneeId)
          .single();

        if (assigneeError || !assignee) {
          throw new Error(`Task assignee not found: ${assigneeError?.message || 'Employee does not exist'}`);
        }

      }

      const taskInsertData = {
        ...taskData,
        created_by: creator.id,
        assigned_to: validatedAssigneeId,
        priority: taskData.priority ?? 'medium',
        status: taskData.status ?? 'pending'
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
      const updateData: any = { ...taskData };

      if ((taskData as any).dueDate || (taskData as any).due_date) {
        updateData.due_date = (taskData as any).due_date ?? (taskData as any).dueDate;
      }

      const { data, error } = await this.supabase
        .from('tasks')
        .update(updateData)
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
      const updatePayload: any = { status };

      if (status === 'completed') {
        updatePayload.completed_at = new Date().toISOString();
      }

      const { data, error } = await this.supabase
        .from('tasks')
        .update(updatePayload)
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

  async getAllEmployees(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('id, full_name, email, role, department, status')
        .eq('status', 'active')
        .order('full_name');

      if (error) {
        logger.error('❌ [SupabaseTaskRepository] Get all employees failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('❌ [SupabaseTaskRepository] Get all employees failed:', error);
      throw error;
    }
  }

  async getTeamMembersByLeadId(leadId: string): Promise<any[]> {
    try {
      // First get the team lead's department
      const { data: leadData, error: leadError } = await this.supabase
        .from('employees')
        .select('department')
        .eq('id', leadId)
        .single();

      if (leadError || !leadData) {
        logger.error('❌ [SupabaseTaskRepository] Get team lead failed:', leadError);
        return [];
      }

      // Get all employees in the same department (excluding the lead)
      const { data, error } = await this.supabase
        .from('employees')
        .select('id, full_name, email, role, department, status')
        .eq('department', leadData.department)
        .eq('status', 'active')
        .neq('id', leadId)
        .order('full_name');

      if (error) {
        logger.error('❌ [SupabaseTaskRepository] Get team members failed:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('❌ [SupabaseTaskRepository] Get team members failed:', error);
      throw error;
    }
  }
}
