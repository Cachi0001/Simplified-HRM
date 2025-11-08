import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/TaskService';
import { ValidationError } from '../middleware/errorHandler';

export class TaskController {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
  }

  createTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const { assigneeId, title, description, dueDate, priority } = req.body;

      if (!assigneeId || !title) {
        throw new ValidationError('Assignee ID and title are required');
      }

      const task = await this.taskService.createTask({
        assignedBy: userId,
        assigneeId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority: priority || 'medium'
      });

      res.status(201).json({
        success: true,
        data: task
      });
    } catch (error) {
      next(error);
    }
  };

  getMyTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const { status } = req.query;
      const tasks = await this.taskService.getTasksByUserId(userId, status as string);

      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      next(error);
    }
  };

  getTaskById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await this.taskService.getTaskById(req.params.id);
      
      if (!task) {
        throw new ValidationError('Task not found');
      }

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      next(error);
    }
  };

  updateTaskStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const { status } = req.body;
      if (!status) {
        throw new ValidationError('Status is required');
      }

      const task = await this.taskService.updateTaskStatus(req.params.id, userId, status);

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      next(error);
    }
  };

  getAllTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, assigneeId, assignedBy } = req.query;
      
      const tasks = await this.taskService.getAllTasks({
        status: status as string,
        assigneeId: assigneeId as string,
        assignedBy: assignedBy as string
      });

      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      next(error);
    }
  };
}
