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
  assigneeId?: string;
  assignedBy?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  page?: number;
  limit?: number;
}

class TaskService {
  async createTask(taskData: CreateTaskRequest): Promise<{ message: string; task: Task }> {
    try {
      const response = await api.post('/tasks', taskData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create task');
    }
  }

  async getAllTasks(query?: TaskQuery): Promise<{ tasks: Task[]; total: number; page: number; limit: number }> {
    try {
      const params = new URLSearchParams();
      if (query?.assigneeId) params.append('assigneeId', query.assigneeId);
      if (query?.assignedBy) params.append('assignedBy', query.assignedBy);
      if (query?.status) params.append('status', query.status);
      if (query?.priority) params.append('priority', query.priority);
      if (query?.page) params.append('page', query.page.toString());
      if (query?.limit) params.append('limit', query.limit.toString());

      const response = await api.get(`/tasks?${params.toString()}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get tasks');
    }
  }

  async searchTasks(query: string): Promise<Task[]> {
    try {
      const response = await api.get(`/tasks/search?q=${encodeURIComponent(query)}`);
      return response.data.data.tasks;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to search tasks');
    }
  }

  async getTaskById(id: string): Promise<Task> {
    try {
      const response = await api.get(`/tasks/${id}`);
      return response.data.data.task;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get task');
    }
  }

  async getMyTasks(): Promise<Task[]> {
    try {
      const response = await api.get('/tasks/my-tasks');
      return response.data.data.tasks;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get my tasks');
    }
  }

  async updateTask(id: string, taskData: UpdateTaskRequest): Promise<{ message: string; task: Task }> {
    try {
      const response = await api.put(`/tasks/${id}`, taskData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update task');
    }
  }

  async updateTaskStatus(id: string, status: string): Promise<{ message: string; task: Task }> {
    try {
      const response = await api.patch(`/tasks/${id}/status`, { status });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update task status');
    }
  }

  async deleteTask(id: string): Promise<{ message: string }> {
    try {
      const response = await api.delete(`/tasks/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete task');
    }
  }
}

export const taskService = new TaskService();
