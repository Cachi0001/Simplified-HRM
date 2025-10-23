import { ITaskRepository } from '../interfaces/ITaskRepository';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskQuery, ITask } from '../../models/Task';
import databaseConfig from '../../config/database';
import logger from '../../utils/logger';

export class MongoTaskRepository implements ITaskRepository {
  async create(taskData: CreateTaskRequest, assignedBy: string): Promise<ITask> {
    try {
      logger.info('🔍 [MongoTaskRepository] Creating task', {
        title: taskData.title,
        assigneeId: taskData.assigneeId,
        assignedBy
      });

      const task = new Task({
        ...taskData,
        assignedBy,
        status: 'pending',
      });

      await task.save();
      await task.populate(['assigneeId', 'assignedBy']);

      logger.info('✅ [MongoTaskRepository] Task created successfully', {
        taskId: task._id,
        title: task.title,
        assigneeId: task.assigneeId
      });

      return task;

    } catch (error) {
      logger.error('❌ [MongoTaskRepository] Create task failed:', error);
      throw error;
    }
  }

  async findAll(query: TaskQuery = {}): Promise<{ tasks: ITask[]; total: number; page: number; limit: number }> {
    try {
      logger.info('🔍 [MongoTaskRepository] Finding all tasks', { query });

      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {};

      if (query.assigneeId) {
        filter.assigneeId = query.assigneeId;
      }

      if (query.assignedBy) {
        filter.assignedBy = query.assignedBy;
      }

      if (query.status) {
        filter.status = query.status;
      }

      if (query.priority) {
        filter.priority = query.priority;
      }

      // Execute query
      const tasks = await Task.find(filter)
        .populate(['assigneeId', 'assignedBy'])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Task.countDocuments(filter);

      logger.info('✅ [MongoTaskRepository] Found tasks', {
        count: tasks.length,
        total,
        page,
        limit
      });

      return {
        tasks,
        total,
        page,
        limit,
      };

    } catch (error) {
      logger.error('❌ [MongoTaskRepository] Find all tasks failed:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<ITask | null> {
    try {
      logger.info('🔍 [MongoTaskRepository] Finding task by ID', { id });

      const task = await Task.findById(id).populate(['assigneeId', 'assignedBy']);

      if (task) {
        logger.info('✅ [MongoTaskRepository] Task found', {
          taskId: task._id,
          title: task.title
        });
      } else {
        logger.warn('⚠️ [MongoTaskRepository] Task not found', { id });
      }

      return task;

    } catch (error) {
      logger.error('❌ [MongoTaskRepository] Find task by ID failed:', error);
      throw error;
    }
  }

  async findByAssignee(assigneeId: string): Promise<ITask[]> {
    try {
      logger.info('🔍 [MongoTaskRepository] Finding tasks by assignee', { assigneeId });

      const tasks = await Task.find({ assigneeId })
        .populate(['assigneeId', 'assignedBy'])
        .sort({ createdAt: -1 });

      logger.info('✅ [MongoTaskRepository] Found tasks by assignee', {
        assigneeId,
        count: tasks.length
      });

      return tasks;

    } catch (error) {
      logger.error('❌ [MongoTaskRepository] Find tasks by assignee failed:', error);
      throw error;
    }
  }

  async update(id: string, taskData: UpdateTaskRequest): Promise<ITask> {
    try {
      logger.info('🔍 [MongoTaskRepository] Updating task', { id, taskData });

      const task = await Task.findByIdAndUpdate(
        id,
        { ...taskData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate(['assigneeId', 'assignedBy']);

      if (!task) {
        throw new Error('Task not found');
      }

      logger.info('✅ [MongoTaskRepository] Task updated successfully', {
        taskId: task._id,
        title: task.title
      });

      return task;

    } catch (error) {
      logger.error('❌ [MongoTaskRepository] Update task failed:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      logger.info('🔍 [MongoTaskRepository] Deleting task', { id });

      const task = await Task.findByIdAndDelete(id);

      if (!task) {
        throw new Error('Task not found');
      }

      logger.info('✅ [MongoTaskRepository] Task deleted successfully', {
        taskId: id,
        title: task.title
      });

    } catch (error) {
      logger.error('❌ [MongoTaskRepository] Delete task failed:', error);
      throw error;
    }
  }

  async search(query: string): Promise<ITask[]> {
    try {
      logger.info('🔍 [MongoTaskRepository] Searching tasks', { query });

      const tasks = await Task.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
        ],
      }).populate(['assigneeId', 'assignedBy']).limit(20);

      logger.info('✅ [MongoTaskRepository] Search completed', {
        query,
        results: tasks.length
      });

      return tasks;

    } catch (error) {
      logger.error('❌ [MongoTaskRepository] Search tasks failed:', error);
      throw error;
    }
  }

  async updateStatus(id: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled'): Promise<ITask> {
    try {
      logger.info('🔍 [MongoTaskRepository] Updating task status', { id, status });

      const task = await Task.findByIdAndUpdate(
        id,
        { status, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate(['assigneeId', 'assignedBy']);

      if (!task) {
        throw new Error('Task not found');
      }

      logger.info('✅ [MongoTaskRepository] Task status updated successfully', {
        taskId: task._id,
        title: task.title,
        status
      });

      return task;

    } catch (error) {
      logger.error('❌ [MongoTaskRepository] Update task status failed:', error);
      throw error;
    }
  }
}
