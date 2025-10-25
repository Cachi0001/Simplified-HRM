// Supabase-compatible Task interface (no Mongoose dependencies)
export interface ITask {
  id: string;
  title: string;
  description?: string;
  assigneeId: string; // Changed from ObjectId to string for Supabase
  assignedBy: string; // Changed from ObjectId to string for Supabase
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
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
  assigneeId?: string;
  assignedBy?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  page?: number;
  limit?: number;
}
