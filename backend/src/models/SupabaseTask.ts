// Supabase-compatible Task interface (no Mongoose dependencies)
export interface ITask {
  id: string;
  title: string;
  description?: string;
  assigned_to: string; // Changed to match database schema
  created_by: string; // Changed to match database schema
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date: Date; // Changed to match database schema
  completed_at?: Date; // Changed to match database schema
  created_at: Date; // Changed to match database schema
  updated_at: Date; // Changed to match database schema
}

// Request/Response interfaces
export interface CreateTaskRequest {
  title: string;
  description?: string;
  assigneeId: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate: Date;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
}

export interface TaskQuery {
  assigned_to?: string; // Changed to match database schema
  created_by?: string; // Changed to match database schema
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  page?: number;
  limit?: number;
}
