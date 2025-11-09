import { pool } from '../config/database';

export interface Task {
  id: string;
  assigned_by: string;
  assignee_id: string;
  title: string;
  description?: string;
  due_date?: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
  assigned_by_name?: string;
  assignee_name?: string;
}

export interface CreateTaskData {
  assignedBy: string;
  assigneeId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
}

export class TaskRepository {
  async create(data: CreateTaskData): Promise<Task> {
    const result = await pool.query(
      `SELECT * FROM assign_task_with_validation($1, $2, $3, $4, $5, $6)`,
      [
        data.title,
        data.description || '',
        data.assigneeId,
        data.assignedBy,
        data.dueDate || null,
        data.priority
      ]
    );
    
    if (result.rows[0]?.success === false) {
      throw new Error(result.rows[0].message);
    }
    
    return result.rows[0];
  }

  async findById(id: string): Promise<Task | null> {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByUserId(userId: string, status?: string): Promise<Task[]> {
    const result = await pool.query(
      `SELECT * FROM get_viewable_tasks($1, $2)`,
      [userId, status || null]
    );
    return result.rows;
  }

  async updateStatus(taskId: string, userId: string, newStatus: string): Promise<Task> {
    const result = await pool.query(
      `SELECT * FROM update_task_status($1, $2, $3)`,
      [taskId, newStatus, userId]
    );
    
    if (result.rows[0]?.success === false) {
      throw new Error(result.rows[0].message);
    }
    
    return result.rows[0];
  }

  async findAll(filters?: { status?: string; assigneeId?: string; assignedBy?: string }): Promise<Task[]> {
    // Use the database function that includes JOINs for employee names
    const result = await pool.query(
      'SELECT * FROM get_all_tasks_with_names()'
    );
    
    let tasks = result.rows;
    
    // Apply filters in memory if provided
    if (filters?.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    if (filters?.assigneeId) {
      tasks = tasks.filter(t => t.assignee_id === filters.assigneeId);
    }
    if (filters?.assignedBy) {
      tasks = tasks.filter(t => t.assigned_by === filters.assignedBy);
    }
    
    return tasks;
  }

  async delete(taskId: string): Promise<void> {
    await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
  }
}
