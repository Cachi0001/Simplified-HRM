import { ITaskRepository } from '../repositories/interfaces/ITaskRepository';
import { ITask, CreateTaskRequest, UpdateTaskRequest, TaskQuery } from '../models/SupabaseTask';
import { EmailService } from './EmailService';
import logger from '../utils/logger';

export class TaskService {
  constructor(private taskRepository: ITaskRepository) {}

  private async resolveEmployeeId(userId?: string): Promise<string | null> {
    if (!userId) {
      return null;
    }

    const employee = await this.taskRepository.getEmployeeByUserId(userId);
    if (!employee) {
      logger.warn('TaskService: Employee record not found for user', { userId });
      return null;
    }

    return employee.id;
  }

  // Helper method to map database fields to frontend fields
  private mapDatabaseToFrontend(task: ITask): any {
    const toIso = (value?: string | Date) => value ? new Date(value).toISOString() : undefined;

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      assigneeId: task.assigned_to,
      assignedBy: task.created_by,
      status: task.status,
      priority: task.priority,
      dueDate: toIso(task.due_date)!,
      completedAt: toIso(task.completed_at),
      createdAt: toIso(task.created_at)!,
      updatedAt: toIso(task.updated_at)!,
    };
  }

  private mapFrontendToDatabase(taskData: CreateTaskRequest): any {
    const normalizeDueDate = (value: string) => new Date(value).toISOString();

    return {
      title: taskData.title,
      description: taskData.description,
      assigned_to: taskData.assigned_to ?? taskData.assigneeId,
      priority: taskData.priority ?? 'medium',
      due_date: normalizeDueDate(taskData.due_date ?? taskData.dueDate),
      status: taskData.status ?? 'pending'
    };
  }

  async createTask(taskData: CreateTaskRequest, assignedBy: string, currentUserRole: string): Promise<any> {
    try {
      if (currentUserRole !== 'admin') {
        throw new Error('Only administrators can assign tasks');
      }

      logger.info('TaskService: Creating task', { title: taskData.title, assignedBy, assigneeId: taskData.assigneeId });

      if (!taskData.title || !taskData.assigneeId || !taskData.dueDate) {
        throw new Error('Title, assignee ID, and due date are required');
      }

      // Map frontend fields to database fields
      const mappedTaskData = this.mapFrontendToDatabase(taskData);
      const task = await this.taskRepository.create(mappedTaskData, assignedBy);

      // Send task assignment notification email
      try {
        const emailService = new EmailService();
        // Get employee data from the repository
        const employee = await this.taskRepository.getEmployeeById(taskData.assigneeId);
        if (employee) {
          await emailService.sendTaskNotification(
            employee.email,
            employee.fullName,
            task.title,
            task.description || '',
            new Date(task.due_date).toLocaleDateString()
          );
          logger.info('📧 Task assignment email sent', { assigneeId: taskData.assigneeId, taskId: task.id });
        } else {
          logger.warn('Employee not found for task notification', { assigneeId: taskData.assigneeId });
        }
      } catch (emailError) {
        logger.warn('Task notification email failed (non-critical)', { error: (emailError as Error).message });
      }

      logger.info('TaskService: Task created successfully', { taskId: task.id });

      // Map database format back to frontend format
      return this.mapDatabaseToFrontend(task);
    } catch (error) {
      logger.error('TaskService: Create task failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getAllTasks(query?: TaskQuery, currentUserRole?: string, currentUserId?: string): Promise<{ tasks: any[]; total: number; page: number; limit: number }> {
    try {
      logger.info('TaskService: Getting all tasks', { role: currentUserRole });

      if (currentUserRole !== 'admin') {
        const employeeId = await this.resolveEmployeeId(currentUserId);
        if (!employeeId) {
          return { tasks: [], total: 0, page: query?.page || 1, limit: query?.limit || 10 };
        }
        query = { ...query, assigned_to: employeeId };
      }

      const result = await this.taskRepository.findAll(query);

      // Map database format to frontend format
      const mappedTasks = result.tasks.map(task => this.mapDatabaseToFrontend(task));

      return {
        tasks: mappedTasks,
        total: result.total,
        page: result.page,
        limit: result.limit
      };
    } catch (error) {
      logger.error('TaskService: Get all tasks failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getTaskById(id: string, currentUserRole: string, currentUserId?: string): Promise<any> {
    try {
      const task = await this.taskRepository.findById(id);

      if (!task) {
        return null;
      }

      if (currentUserRole !== 'admin') {
        const employeeId = await this.resolveEmployeeId(currentUserId);
        if (!employeeId || task.assigned_to !== employeeId) {
          throw new Error('Access denied');
        }
      }

      // Map database format to frontend format
      return this.mapDatabaseToFrontend(task);
    } catch (error) {
      logger.error('TaskService: Get task by ID failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getMyTasks(userId: string): Promise<any[]> {
    try {
      const employeeId = await this.resolveEmployeeId(userId);
      if (!employeeId) {
        return [];
      }
      const tasks = await this.taskRepository.findByAssignee(employeeId);

      // Map database format to frontend format
      return tasks.map(task => this.mapDatabaseToFrontend(task));
    } catch (error) {
      logger.error('TaskService: Get my tasks failed', { error: (error as Error).message });
      throw error;
    }
  }

  async updateTask(id: string, taskData: UpdateTaskRequest, currentUserRole: string, currentUserId?: string): Promise<any> {
    try {
      const existingTask = await this.taskRepository.findById(id);
      if (!existingTask) {
        throw new Error('Task not found');
      }

      if (currentUserRole !== 'admin') {
        const employeeId = await this.resolveEmployeeId(currentUserId);
        if (!employeeId || existingTask.assigned_to !== employeeId) {
          throw new Error('Access denied');
        }

        const allowedFields = ['status'];
        const filteredData: UpdateTaskRequest = {};

        allowedFields.forEach(field => {
          if (taskData[field as keyof UpdateTaskRequest] !== undefined) {
            (filteredData as any)[field] = taskData[field as keyof UpdateTaskRequest];
          }
        });

        taskData = filteredData;
      }

      // Map frontend fields to database fields for updates
      const mappedUpdateData: any = {};
      if (taskData.title) mappedUpdateData.title = taskData.title;
      if (taskData.description !== undefined) mappedUpdateData.description = taskData.description;
      if (taskData.status) mappedUpdateData.status = taskData.status;
      if (taskData.priority) mappedUpdateData.priority = taskData.priority;
      if (taskData.assigneeId || taskData.assigned_to) {
        mappedUpdateData.assigned_to = taskData.assigned_to ?? taskData.assigneeId;
      }
      if (taskData.dueDate || (taskData as any).due_date) {
        const dueValue = (taskData as any).due_date ?? taskData.dueDate;
        mappedUpdateData.due_date = dueValue ? new Date(dueValue).toISOString() : undefined;
      }

      const updatedTask = await this.taskRepository.update(id, mappedUpdateData);

      // Map database format back to frontend format
      return this.mapDatabaseToFrontend(updatedTask);
    } catch (error) {
      logger.error('TaskService: Update task failed', { error: (error as Error).message });
      throw error;
    }
  }

  async updateTaskStatus(id: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled', currentUserRole: string, currentUserId?: string): Promise<any> {
    try {
      const existingTask = await this.taskRepository.findById(id);
      if (!existingTask) {
        throw new Error('Task not found');
      }

      const employeeId = await this.resolveEmployeeId(currentUserId);
      if (!employeeId || currentUserRole !== 'employee' || existingTask.assigned_to !== employeeId) {
        throw new Error('Only the assigned employee can update task status');
      }

      const updatedTask = await this.taskRepository.updateStatus(id, status);

      // TODO: Implement completion notifications for Supabase
      if (status === 'completed') {
        try {
          const emailService = new EmailService();
          // Get admin who assigned the task
          const admin = await this.taskRepository.getEmployeeById(existingTask.created_by);
          // Get employee who completed the task
          const employee = await this.taskRepository.getEmployeeById(existingTask.assigned_to);

          if (admin && employee) {
            await emailService.sendTaskCompletionNotification(
              admin.email,
              admin.fullName,
              employee.fullName,
              updatedTask.title
            );
            logger.info('📧 Task completion email sent', { taskId: id, status });
          } else {
            logger.warn('Admin or employee not found for task completion notification', {
              taskId: id,
              adminId: existingTask.created_by,
              employeeId: existingTask.assigned_to
            });
          }
        } catch (emailError) {
          logger.warn('Task completion email failed (non-critical)', { error: (emailError as Error).message });
        }
      }

      logger.info('TaskService: Task status updated successfully', { taskId: id, status });

      // Map database format back to frontend format
      return this.mapDatabaseToFrontend(updatedTask);
    } catch (error) {
      logger.error('TaskService: Update task status failed', { error: (error as Error).message });
      throw error;
    }
  }

  async deleteTask(id: string, currentUserRole: string, currentUserId?: string): Promise<void> {
    try {
      const existingTask = await this.taskRepository.findById(id);
      if (!existingTask) {
        throw new Error('Task not found');
      }

      if (currentUserRole !== 'admin') {
        throw new Error('Only administrators can delete tasks');
      }

      await this.taskRepository.delete(id);

      logger.info('TaskService: Task deleted successfully', { taskId: id });
    } catch (error) {
      logger.error('TaskService: Delete task failed', { error: (error as Error).message });
      throw error;
    }
  }

  async searchTasks(query: string, currentUserRole?: string, currentUserId?: string): Promise<any[]> {
    try {
      logger.info('TaskService: Searching tasks', { query, role: currentUserRole });

      if (currentUserRole !== 'admin') {
        const employeeId = await this.resolveEmployeeId(currentUserId);
        if (!employeeId) {
          return [];
        }
        const myTasks = await this.taskRepository.findByAssignee(employeeId);
        const filteredTasks = myTasks.filter(task =>
          task.title.toLowerCase().includes(query.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(query.toLowerCase()))
        );

        // Map database format to frontend format
        return filteredTasks.map(task => this.mapDatabaseToFrontend(task));
      }

      const tasks = await this.taskRepository.search(query);

      // Map database format to frontend format
      return tasks.map(task => this.mapDatabaseToFrontend(task));
    } catch (error) {
      logger.error('TaskService: Search tasks failed', { error: (error as Error).message });
      throw error;
    }
  }
}
