import api from '../lib/api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId: string;
  assignedBy: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  assigneeId: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface TaskQuery {
  assigned_to?: string; // Changed from assigneeId to match Supabase schema
  assignedBy?: string; // Changed from assignedBy to match Supabase schema
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  page?: number;
  limit?: number;
}

const extractId = (value: any): string => {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    if (value._id) {
      return extractId(value._id);
    }
    if (value.id) {
      return extractId(value.id);
    }
    if (typeof value.toString === 'function') {
      return value.toString();
    }
  }
  return String(value);
};

const toIsoString = (value: any): string => {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
};

const normalizeTask = (task: any): Task => ({
  id: extractId(task?._id ?? task?.id ?? ''),
  title: task?.title ?? '',
  description: task?.description ?? undefined,
  assigneeId: extractId(task?.assigned_to ?? task?.assigneeId ?? ''),
  assignedBy: extractId(task?.created_by ?? task?.assignedBy ?? ''),
  status: task?.status ?? 'pending',
  priority: task?.priority ?? 'medium',
  dueDate: toIsoString(task?.due_date ?? task?.dueDate ?? new Date().toISOString()),
  completedAt: task?.completed_at ? toIsoString(task.completed_at) : task?.completedAt ? toIsoString(task.completedAt) : undefined,
  createdAt: toIsoString(task?.created_at ?? task?.createdAt ?? new Date().toISOString()),
  updatedAt: toIsoString(task?.updated_at ?? task?.updatedAt ?? new Date().toISOString())
});

class TaskService {
  async createTask(taskData: CreateTaskRequest): Promise<{ message: string; task: Task }> {
    const response = await api.post('/tasks', taskData);
    const payload = response.data?.data?.task ?? response.data?.task;
    return {
      message: response.data?.message ?? 'Task created successfully',
      task: normalizeTask(payload)
    };
  }

  async getAllTasks(query?: TaskQuery): Promise<{ tasks: Task[]; total: number; page: number; limit: number }> {
    const params = new URLSearchParams();
    if (query?.assigned_to) params.append('assigned_to', query.assigned_to);
    if (query?.assignedBy) params.append('created_by', query.assignedBy);
    if (query?.status) params.append('status', query.status);
    if (query?.priority) params.append('priority', query.priority);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());

    const response = await api.get(`/tasks?${params.toString()}`);
    const data = response.data?.data ?? response.data;

    return {
      tasks: (data?.tasks ?? []).map(normalizeTask),
      total: data?.total ?? 0,
      page: data?.page ?? 1,
      limit: data?.limit ?? (query?.limit ?? 10)
    };
  }

  async searchTasks(query: string): Promise<Task[]> {
    const response = await api.get(`/tasks/search?q=${encodeURIComponent(query)}`);
    const tasks = response.data?.data?.tasks ?? response.data?.tasks ?? [];
    return tasks.map(normalizeTask);
  }

  async getTaskById(id: string): Promise<Task> {
    const response = await api.get(`/tasks/${id}`);
    const task = response.data?.data?.task ?? response.data?.task;
    return normalizeTask(task);
  }

  async getMyTasks(): Promise<Task[]> {
    const response = await api.get('/tasks/my-tasks');
    const tasks = response.data?.data?.tasks ?? response.data?.tasks ?? [];
    return tasks.map(normalizeTask);
  }

  async updateTask(id: string, taskData: UpdateTaskRequest): Promise<{ message: string; task: Task }> {
    const response = await api.put(`/tasks/${id}`, taskData);
    const payload = response.data?.data?.task ?? response.data?.task;
    return {
      message: response.data?.message ?? 'Task updated successfully',
      task: normalizeTask(payload)
    };
  }

  async updateTaskStatus(id: string, status: string): Promise<{ message: string; task: Task }> {
    const response = await api.patch(`/tasks/${id}/status`, { status });
    const payload = response.data?.data?.task ?? response.data?.task;
    return {
      message: response.data?.message ?? 'Task status updated successfully',
      task: normalizeTask(payload)
    };
  }

  async deleteTask(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/tasks/${id}`);
    return { message: response.data?.message ?? 'Task deleted successfully' };
  }
}

export const taskService = new TaskService();
