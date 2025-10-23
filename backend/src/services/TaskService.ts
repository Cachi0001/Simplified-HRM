import { ITaskRepository } from '../repositories/interfaces/ITaskRepository';
import { Task as TaskModel, ITask, CreateTaskRequest, UpdateTaskRequest, TaskQuery } from '../models/Task';
import logger from '../utils/logger';

export class TaskService {
  constructor(private taskRepository: ITaskRepository) {}

  async createTask(taskData: CreateTaskRequest, assignedBy: string, currentUserRole: string): Promise<ITask> {
    try {
      if (currentUserRole !== 'admin') {
        throw new Error('Only administrators can assign tasks');
      }

      logger.info('TaskService: Creating task', { title: taskData.title, assignedBy });

      if (!taskData.title || !taskData.assigneeId || !taskData.dueDate) {
        throw new Error('Title, assignee ID, and due date are required');
      }

      const task = await this.taskRepository.create(taskData, assignedBy);

      // Send notification email to assignee
      try {
        const emailService = new (await import('../services/EmailService')).EmailService();
        await emailService.sendTaskNotification(
          taskData.assigneeId,
          task.title,
          task.description || '',
          new Date(task.dueDate).toLocaleDateString()
        );
        logger.info('Task notification email sent', { assigneeId: taskData.assigneeId, taskId: task.id });
      } catch (emailError) {
        logger.warn('Task notification email failed (non-critical)', { error: (emailError as Error).message });
      }

      logger.info('TaskService: Task created successfully', { taskId: task.id });
      return task;
    } catch (error) {
      logger.error('TaskService: Create task failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getAllTasks(query?: TaskQuery, currentUserRole?: string, currentUserId?: string): Promise<{ tasks: ITask[]; total: number; page: number; limit: number }> {
    try {
      logger.info('TaskService: Getting all tasks', { role: currentUserRole });

      if (currentUserRole !== 'admin') {
        query = { ...query, assigneeId: currentUserId };
      }

      return await this.taskRepository.findAll(query);
    } catch (error) {
      logger.error('TaskService: Get all tasks failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getTaskById(id: string, currentUserRole: string, currentUserId?: string): Promise<ITask | null> {
    try {
      const task = await this.taskRepository.findById(id);

      if (!task) {
        return null;
      }

      if (currentUserRole !== 'admin' && task.assigneeId !== currentUserId) {
        throw new Error('Access denied');
      }

      return task;
    } catch (error) {
      logger.error('TaskService: Get task by ID failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getMyTasks(userId: string): Promise<ITask[]> {
    try {
      return await this.taskRepository.findByAssignee(userId);
    } catch (error) {
      logger.error('TaskService: Get my tasks failed', { error: (error as Error).message });
      throw error;
    }
  }

  async updateTask(id: string, taskData: UpdateTaskRequest, currentUserRole: string, currentUserId?: string): Promise<ITask> {
    try {
      const existingTask = await this.taskRepository.findById(id);
      if (!existingTask) {
        throw new Error('Task not found');
      }
      if (currentUserRole !== 'admin' && existingTask.assigneeId !== currentUserId) {
        throw new Error('Access denied');
      }

      if (currentUserRole !== 'admin') {
        const allowedFields = ['status'];
        const filteredData: UpdateTaskRequest = {};

        allowedFields.forEach(field => {
          if (taskData[field as keyof UpdateTaskRequest] !== undefined) {
            (filteredData as any)[field] = taskData[field as keyof UpdateTaskRequest];
          }
        });

        taskData = filteredData;
      }

      const updatedTask = await this.taskRepository.update(id, taskData);

      logger.info('TaskService: Task updated successfully', { taskId: id });
      return updatedTask;
    } catch (error) {
      logger.error('TaskService: Update task failed', { error: (error as Error).message });
      throw error;
    }
  }

  async updateTaskStatus(id: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled', currentUserRole: string, currentUserId?: string): Promise<ITask> {
    try {
      const existingTask = await this.taskRepository.findById(id);
      if (!existingTask) {
        throw new Error('Task not found');
      }

      if (currentUserRole !== 'admin' && existingTask.assigneeId !== currentUserId) {
        throw new Error('Access denied');
      }

      const updatedTask = await this.taskRepository.updateStatus(id, status);

      // Send notification if task is completed
      if (status === 'completed') {
        try {
          const emailService = new (await import('../services/EmailService')).EmailService();
          await emailService.sendTaskCompletionNotification(
            existingTask.assigneeId,
            updatedTask.title,
            'Task completed successfully!'
          );
          logger.info('Task completion notification sent', { assigneeId: existingTask.assigneeId, taskId: id });
        } catch (emailError) {
          logger.warn('Task completion notification failed (non-critical)', { error: (emailError as Error).message });
        }
      }

      logger.info('TaskService: Task status updated successfully', { taskId: id, status });
      return updatedTask;
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

  async searchTasks(query: string, currentUserRole?: string, currentUserId?: string): Promise<ITask[]> {
    try {
      logger.info('TaskService: Searching tasks', { query, role: currentUserRole });

      if (currentUserRole !== 'admin') {
        const myTasks = await this.taskRepository.findByAssignee(currentUserId!);
        return myTasks.filter(task =>
          task.title.toLowerCase().includes(query.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(query.toLowerCase()))
        );
      }

      return await this.taskRepository.search(query);
    } catch (error) {
      logger.error('TaskService: Search tasks failed', { error: (error as Error).message });
      throw error;
    }
  }
}
