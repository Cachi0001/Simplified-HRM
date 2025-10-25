import { ITask, CreateTaskRequest, UpdateTaskRequest, TaskQuery } from '../../models/SupabaseTask';

export interface ITaskRepository {
  create(taskData: CreateTaskRequest, assignedBy: string): Promise<ITask>;
  findAll(query?: TaskQuery): Promise<{ tasks: ITask[]; total: number; page: number; limit: number }>;
  findById(id: string): Promise<ITask | null>;
  findByAssignee(assigneeId: string): Promise<ITask[]>;
  update(id: string, taskData: UpdateTaskRequest): Promise<ITask>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<ITask[]>;
  updateStatus(id: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled'): Promise<ITask>;

  // Additional methods for Supabase
  getEmployeeById(employeeId: string): Promise<any>;
}
