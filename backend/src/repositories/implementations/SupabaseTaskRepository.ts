import { ITaskRepository } from '../interfaces/ITaskRepository';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskQuery } from '../../models/Task';
import logger from '../../utils/logger';

export class SupabaseTaskRepository implements ITaskRepository {
  constructor(private supabase: any) {}

  async create(taskData: CreateTaskRequest, assignedBy: string): Promise<Task> {
    try {
      logger.info('Creating task', { title: taskData.title, assignedBy });

      const { data, error } = await this.supabase
        .from('tasks')
        .insert({
          title: taskData.title,
          description: taskData.description,
          assignee_id: taskData.assigneeId,
          assigned_by: assignedBy,
          status: 'pending',
          priority: taskData.priority || 'medium',
          due_date: taskData.dueDate.toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) {
        logger.error('Task creation error', { error: error.message });
        throw new Error(error.message);
      }

      return this.mapSupabaseTaskToTask(data);
    } catch (error) {
      logger.error('Task creation failed', { error: (error as Error).message });
      throw error;
    }
  }

  async findAll(query?: TaskQuery): Promise<{ tasks: Task[]; total: number; page: number; limit: number }> {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 10;
      const offset = (page - 1) * limit;

      let supabaseQuery = this.supabase.from('tasks').select('*', { count: 'exact' });

      // Apply filters
      if (query?.assigneeId) {
        supabaseQuery = supabaseQuery.eq('assignee_id', query.assigneeId);
      }
      if (query?.assignedBy) {
        supabaseQuery = supabaseQuery.eq('assigned_by', query.assignedBy);
      }
      if (query?.status) {
        supabaseQuery = supabaseQuery.eq('status', query.status);
      }
      if (query?.priority) {
        supabaseQuery = supabaseQuery.eq('priority', query.priority);
      }

      const { data, error, count } = await supabaseQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Find tasks error', { error: error.message });
        throw new Error(error.message);
      }

      return {
        tasks: data.map(this.mapSupabaseTaskToTask),
        total: count || 0,
        page,
        limit
      };
    } catch (error) {
      logger.error('Find tasks failed', { error: (error as Error).message });
      throw error;
    }
  }

  async findById(id: string): Promise<Task | null> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        logger.error('Find task by ID error', { error: error.message });
        throw new Error(error.message);
      }

      return this.mapSupabaseTaskToTask(data);
    } catch (error) {
      logger.error('Find task by ID failed', { error: (error as Error).message });
      throw error;
    }
  }

  async findByAssignee(assigneeId: string): Promise<Task[]> {
    try {
      const { data, error } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('assignee_id', assigneeId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Find tasks by assignee error', { error: error.message });
        throw new Error(error.message);
      }

      return data.map(this.mapSupabaseTaskToTask);
    } catch (error) {
      logger.error('Find tasks by assignee failed', { error: (error as Error).message });
      throw error;
    }
  }

  async update(id: string, taskData: UpdateTaskRequest): Promise<Task> {
    try {
      logger.info('Updating task', { id });

      const updateData: any = {};
      if (taskData.title !== undefined) updateData.title = taskData.title;
      if (taskData.description !== undefined) updateData.description = taskData.description;
      if (taskData.priority !== undefined) updateData.priority = taskData.priority;
      if (taskData.dueDate !== undefined) updateData.due_date = taskData.dueDate.toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Task update error', { error: error.message });
        throw new Error(error.message);
      }

      return this.mapSupabaseTaskToTask(data);
    } catch (error) {
      logger.error('Task update failed', { error: (error as Error).message });
      throw error;
    }
  }

  async updateStatus(id: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled'): Promise<Task> {
    try {
      logger.info('Updating task status', { id, status });

      const updateData: any = { status };

      // Set completed_at if status is completed
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await this.supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Task status update error', { error: error.message });
        throw new Error(error.message);
      }

      return this.mapSupabaseTaskToTask(data);
    } catch (error) {
      logger.error('Task status update failed', { error: (error as Error).message });
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
        logger.error('Task deletion error', { error: error.message });
        throw new Error(error.message);
      }
    } catch (error) {
      logger.error('Task deletion failed', { error: (error as Error).message });
      throw error;
    }
  }

  private mapSupabaseTaskToTask(data: any): Task {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      assigneeId: data.assignee_id,
      assignedBy: data.assigned_by,
      status: data.status,
      priority: data.priority,
      dueDate: new Date(data.due_date),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}
