import { Request, Response } from 'express';
import { TaskService } from '../services/TaskService';
import { CreateTaskRequest, UpdateTaskRequest, TaskQuery } from '../models/Task';
import logger from '../utils/logger';

export class TaskController {
  constructor(private taskService: TaskService) {}

  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const taskData: CreateTaskRequest = req.body;
      const assignedBy = req.user?.id;
      const userRole = req.user?.role;

      logger.info('TaskController: Create task request', { assignedBy });

      const task = await this.taskService.createTask(taskData, assignedBy, userRole);

      res.status(201).json({
        status: 'success',
        message: 'Task created successfully',
        data: { task }
      });
    } catch (error) {
      logger.error('TaskController: Create task error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getAllTasks(req: Request, res: Response): Promise<void> {
    try {
      const query: TaskQuery = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        assigneeId: req.query.assigneeId as string,
        assignedBy: req.query.assignedBy as string,
        status: req.query.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
        priority: req.query.priority as 'low' | 'medium' | 'high'
      };

      const userRole = req.user?.role;
      const userId = req.user?.id;

      const result = await this.taskService.getAllTasks(query, userRole, userId);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error('TaskController: Get all tasks error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

    async searchTasks(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        res.status(400).json({
          status: 'error',
          message: 'Search query is required'
        });
        return;
      }

      const userRole = req.user?.role;
      const userId = req.user?.id;

      const tasks = await this.taskService.searchTasks(query, userRole, userId);

      res.status(200).json({
        status: 'success',
        message: 'Tasks found',
        data: { tasks }
      });
    } catch (error) {
      logger.error('TaskController: Search tasks error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getTaskById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      const task = await this.taskService.getTaskById(id, userRole, userId);

      if (!task) {
        res.status(404).json({
          status: 'error',
          message: 'Task not found'
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: { task }
      });
    } catch (error) {
      logger.error('TaskController: Get task by ID error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getMyTasks(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      const tasks = await this.taskService.getMyTasks(userId);

      res.status(200).json({
        status: 'success',
        data: { tasks }
      });
    } catch (error) {
      logger.error('TaskController: Get my tasks error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const taskData: UpdateTaskRequest = req.body;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      const task = await this.taskService.updateTask(id, taskData, userRole, userId);

      res.status(200).json({
        status: 'success',
        message: 'Task updated successfully',
        data: { task }
      });
    } catch (error) {
      logger.error('TaskController: Update task error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async updateTaskStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id) {
        res.status(400).json({
          status: 'error',
          message: 'Task ID is required'
        });
        return;
      }

      if (!status || !['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid status. Must be one of: pending, in_progress, completed, cancelled'
        });
        return;
      }

      const userRole = req.user?.role;
      const userId = req.user?.id;

      const task = await this.taskService.updateTaskStatus(id, status, userRole, userId);

      res.status(200).json({
        status: 'success',
        message: 'Task status updated successfully',
        data: { task }
      });
    } catch (error) {
      logger.error('TaskController: Update task status error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;
      const userId = req.user?.id;

      await this.taskService.deleteTask(id, userRole, userId);

      res.status(204).json({
        status: 'success',
        message: 'Task deleted successfully'
      });
    } catch (error) {
      logger.error('TaskController: Delete task error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }
}
