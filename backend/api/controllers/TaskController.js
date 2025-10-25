"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class TaskController {
    taskService;
    constructor(taskService) {
        this.taskService = taskService;
    }
    async createTask(req, res) {
        try {
            const taskData = req.body;
            const assignedBy = req.user?.id;
            const userRole = req.user?.role;
            logger_1.default.info('TaskController: Create task request', { assignedBy });
            const task = await this.taskService.createTask(taskData, assignedBy, userRole);
            res.status(201).json({
                status: 'success',
                message: 'Task created successfully',
                data: { task }
            });
        }
        catch (error) {
            logger_1.default.error('TaskController: Create task error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async getAllTasks(req, res) {
        try {
            const query = {
                page: req.query.page ? parseInt(req.query.page) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit) : undefined,
                assigneeId: req.query.assigneeId,
                assignedBy: req.query.assignedBy,
                status: req.query.status,
                priority: req.query.priority
            };
            const userRole = req.user?.role;
            const userId = req.user?.id;
            const result = await this.taskService.getAllTasks(query, userRole, userId);
            res.status(200).json({
                status: 'success',
                data: result
            });
        }
        catch (error) {
            logger_1.default.error('TaskController: Get all tasks error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async searchTasks(req, res) {
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
        }
        catch (error) {
            logger_1.default.error('TaskController: Search tasks error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async getTaskById(req, res) {
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
        }
        catch (error) {
            logger_1.default.error('TaskController: Get task by ID error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async getMyTasks(req, res) {
        try {
            const userId = req.user?.id;
            const tasks = await this.taskService.getMyTasks(userId);
            res.status(200).json({
                status: 'success',
                data: { tasks }
            });
        }
        catch (error) {
            logger_1.default.error('TaskController: Get my tasks error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async updateTask(req, res) {
        try {
            const { id } = req.params;
            const taskData = req.body;
            const userRole = req.user?.role;
            const userId = req.user?.id;
            const task = await this.taskService.updateTask(id, taskData, userRole, userId);
            res.status(200).json({
                status: 'success',
                message: 'Task updated successfully',
                data: { task }
            });
        }
        catch (error) {
            logger_1.default.error('TaskController: Update task error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async updateTaskStatus(req, res) {
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
        }
        catch (error) {
            logger_1.default.error('TaskController: Update task status error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async deleteTask(req, res) {
        try {
            const { id } = req.params;
            const userRole = req.user?.role;
            const userId = req.user?.id;
            await this.taskService.deleteTask(id, userRole, userId);
            res.status(204).json({
                status: 'success',
                message: 'Task deleted successfully'
            });
        }
        catch (error) {
            logger_1.default.error('TaskController: Delete task error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
}
exports.TaskController = TaskController;
//# sourceMappingURL=TaskController.js.map