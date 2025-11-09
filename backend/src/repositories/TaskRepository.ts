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
    let queryText = `
      SELECT t.*, 
        e1.full_name as assigned_by_name,
        e2.full_name as assignee_name
      FROM tasks t
      LEFT JOIN employees e1 ON t.assigned_by = e1.user_id
      LEFT JOIN employees e2 ON t.assignee_id = e2.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      queryText += ` AND t.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.assigneeId) {
      queryText += ` AND t.assignee_id = $${paramCount}`;
      params.push(filters.assigneeId);
      paramCount++;
    }

    if (filters?.assignedBy) {
      queryText += ` AND t.assigned_by = $${paramCount}`;
      params.push(filters.assignedBy);
      paramCount++;
    }

    queryText += ' ORDER BY t.created_at DESC';

    const result = await pool.query(queryText, params);
    return result.rows;
  }
}
