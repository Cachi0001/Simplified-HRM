"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoTaskRepository = void 0;
const Task_1 = require("../../models/Task");
const logger_1 = __importDefault(require("../../utils/logger"));
class MongoTaskRepository {
    async create(taskData, assignedBy) {
        try {
            logger_1.default.info('🔍 [MongoTaskRepository] Creating task', {
                title: taskData.title,
                assigneeId: taskData.assigneeId,
                assignedBy
            });
            const task = new Task_1.Task({
                ...taskData,
                assignedBy,
                status: 'pending',
            });
            await task.save();
            await task.populate(['assigneeId', 'assignedBy']);
            logger_1.default.info('✅ [MongoTaskRepository] Task created successfully', {
                taskId: task._id,
                title: task.title,
                assigneeId: task.assigneeId
            });
            return task;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoTaskRepository] Create task failed:', error);
            throw error;
        }
    }
    async findAll(query = {}) {
        try {
            logger_1.default.info('🔍 [MongoTaskRepository] Finding all tasks', { query });
            const page = query.page || 1;
            const limit = query.limit || 10;
            const skip = (page - 1) * limit;
            // Build filter
            const filter = {};
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
            const tasks = await Task_1.Task.find(filter)
                .populate(['assigneeId', 'assignedBy'])
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
            const total = await Task_1.Task.countDocuments(filter);
            logger_1.default.info('✅ [MongoTaskRepository] Found tasks', {
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
        }
        catch (error) {
            logger_1.default.error('❌ [MongoTaskRepository] Find all tasks failed:', error);
            throw error;
        }
    }
    async findById(id) {
        try {
            logger_1.default.info('🔍 [MongoTaskRepository] Finding task by ID', { id });
            const task = await Task_1.Task.findById(id).populate(['assigneeId', 'assignedBy']);
            if (task) {
                logger_1.default.info('✅ [MongoTaskRepository] Task found', {
                    taskId: task._id,
                    title: task.title
                });
            }
            else {
                logger_1.default.warn('⚠️ [MongoTaskRepository] Task not found', { id });
            }
            return task;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoTaskRepository] Find task by ID failed:', error);
            throw error;
        }
    }
    async findByAssignee(assigneeId) {
        try {
            logger_1.default.info('🔍 [MongoTaskRepository] Finding tasks by assignee', { assigneeId });
            const tasks = await Task_1.Task.find({ assigneeId })
                .populate(['assigneeId', 'assignedBy'])
                .sort({ createdAt: -1 });
            logger_1.default.info('✅ [MongoTaskRepository] Found tasks by assignee', {
                assigneeId,
                count: tasks.length
            });
            return tasks;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoTaskRepository] Find tasks by assignee failed:', error);
            throw error;
        }
    }
    async update(id, taskData) {
        try {
            logger_1.default.info('🔍 [MongoTaskRepository] Updating task', { id, taskData });
            const task = await Task_1.Task.findByIdAndUpdate(id, { ...taskData, updatedAt: new Date() }, { new: true, runValidators: true }).populate(['assigneeId', 'assignedBy']);
            if (!task) {
                throw new Error('Task not found');
            }
            logger_1.default.info('✅ [MongoTaskRepository] Task updated successfully', {
                taskId: task._id,
                title: task.title
            });
            return task;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoTaskRepository] Update task failed:', error);
            throw error;
        }
    }
    async delete(id) {
        try {
            logger_1.default.info('🔍 [MongoTaskRepository] Deleting task', { id });
            const task = await Task_1.Task.findByIdAndDelete(id);
            if (!task) {
                throw new Error('Task not found');
            }
            logger_1.default.info('✅ [MongoTaskRepository] Task deleted successfully', {
                taskId: id,
                title: task.title
            });
        }
        catch (error) {
            logger_1.default.error('❌ [MongoTaskRepository] Delete task failed:', error);
            throw error;
        }
    }
    async search(query) {
        try {
            logger_1.default.info('🔍 [MongoTaskRepository] Searching tasks', { query });
            const tasks = await Task_1.Task.find({
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                ],
            }).populate(['assigneeId', 'assignedBy']).limit(20);
            logger_1.default.info('✅ [MongoTaskRepository] Search completed', {
                query,
                results: tasks.length
            });
            return tasks;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoTaskRepository] Search tasks failed:', error);
            throw error;
        }
    }
    async updateStatus(id, status) {
        try {
            logger_1.default.info('🔍 [MongoTaskRepository] Updating task status', { id, status });
            const task = await Task_1.Task.findByIdAndUpdate(id, { status, updatedAt: new Date() }, { new: true, runValidators: true }).populate(['assigneeId', 'assignedBy']);
            if (!task) {
                throw new Error('Task not found');
            }
            logger_1.default.info('✅ [MongoTaskRepository] Task status updated successfully', {
                taskId: task._id,
                title: task.title,
                status
            });
            return task;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoTaskRepository] Update task status failed:', error);
            throw error;
        }
    }
}
exports.MongoTaskRepository = MongoTaskRepository;
//# sourceMappingURL=MongoTaskRepository.js.map