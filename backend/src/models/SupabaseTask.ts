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

// Frontend request/response interfaces (camelCase for API)
export interface CreateTaskRequest {
  title: string;
  description?: string;
  assigneeId: string; // Frontend sends camelCase
  priority?: 'low' | 'medium' | 'high';
  dueDate: Date; // Frontend sends camelCase
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date; // Frontend sends camelCase
}

export interface TaskQuery {
  assigned_to?: string; // Database field name for internal queries
  created_by?: string; // Database field name for internal queries
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  page?: number;
  limit?: number;
}

// Frontend response interface (camelCase for frontend consumption)
export interface TaskResponse {
  id: string;
  title: string;
  description?: string;
  assigneeId: string; // Frontend expects camelCase
  assignedBy: string; // Frontend expects camelCase
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate: string; // Frontend expects camelCase
  completedAt?: string; // Frontend expects camelCase
  createdAt: string; // Frontend expects camelCase
  updatedAt: string; // Frontend expects camelCase
}
