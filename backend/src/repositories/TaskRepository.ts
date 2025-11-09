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
    try {
      // Try to use the database function that includes JOINs for employee names
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
    } catch (error) {
      console.error('Error calling get_all_tasks_with_names, falling back to direct query:', error);
      
      // Fallback: Direct query with JOINs
      let query = `
        SELECT 
          t.id,
          t.title,
          t.description,
          t.assignee_id,
          t.assigned_by,
          t.due_date,
          t.priority,
          t.status,
          t.category,
          t.estimated_hours,
          t.actual_hours,
          t.started_at,
          t.completed_at,
          t.notes,
          t.created_at,
          t.updated_at,
          e1.full_name as assignee_name,
          e2.full_name as assigned_by_name
        FROM tasks t
        LEFT JOIN employees e1 ON t.assignee_id = e1.id
        LEFT JOIN employees e2 ON t.assigned_by = e2.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;
      
      if (filters?.status) {
        query += ` AND t.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }
      if (filters?.assigneeId) {
        query += ` AND t.assignee_id = $${paramIndex}`;
        params.push(filters.assigneeId);
        paramIndex++;
      }
      if (filters?.assignedBy) {
        query += ` AND t.assigned_by = $${paramIndex}`;
        params.push(filters.assignedBy);
        paramIndex++;
      }
      
      query += ' ORDER BY t.created_at DESC';
      
      const result = await pool.query(query, params);
      return result.rows;
    }
  }

  async delete(taskId: string): Promise<void> {
    await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
  }
}
