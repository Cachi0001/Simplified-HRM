"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const Employee_1 = require("../models/Employee");
const logger_1 = __importDefault(require("../utils/logger"));
class TaskService {
    taskRepository;
    constructor(taskRepository) {
        this.taskRepository = taskRepository;
    }
    async resolveEmployeeId(userId) {
        if (!userId) {
            return null;
        }
        const employee = await Employee_1.Employee.findOne({ userId }).select('_id');
        if (!employee) {
            logger_1.default.warn('TaskService: No employee found for user', { userId });
            return null;
        }
        return employee._id.toString();
    }
    async createTask(taskData, assignedBy, currentUserRole) {
        try {
            if (currentUserRole !== 'admin') {
                throw new Error('Only administrators can assign tasks');
            }
            logger_1.default.info('TaskService: Creating task', { title: taskData.title, assignedBy, assigneeId: taskData.assigneeId });
            if (!taskData.title || !taskData.assigneeId || !taskData.dueDate) {
                throw new Error('Title, assignee ID, and due date are required');
            }
            if (!taskData.assigneeId.match(/^[0-9a-f]{24}$/i)) {
                logger_1.default.error('TaskService: Invalid assigneeId format', {
                    assigneeId: taskData.assigneeId,
                    type: typeof taskData.assigneeId,
                    isString: typeof taskData.assigneeId === 'string'
                });
                throw new Error('Invalid assignee ID format. Expected MongoDB ObjectId.');
            }
            const task = await this.taskRepository.create(taskData, assignedBy);
            try {
                const employee = await Employee_1.Employee.findById(taskData.assigneeId);
                if (employee) {
                    const emailService = new (await Promise.resolve().then(() => __importStar(require('../services/EmailService')))).EmailService();
                    await emailService.sendTaskNotification(employee.email, employee.fullName, task.title, task.description || '', new Date(task.dueDate).toLocaleDateString());
                    logger_1.default.info('Task notification email sent', { assigneeId: taskData.assigneeId, taskId: task.id });
                }
                else {
                    logger_1.default.warn('Employee not found for task notification', { assigneeId: taskData.assigneeId });
                }
            }
            catch (emailError) {
                logger_1.default.warn('Task notification email failed (non-critical)', { error: emailError.message });
            }
            logger_1.default.info('TaskService: Task created successfully', { taskId: task.id });
            return task;
        }
        catch (error) {
            logger_1.default.error('TaskService: Create task failed', { error: error.message });
            throw error;
        }
    }
    async getAllTasks(query, currentUserRole, currentUserId) {
        try {
            logger_1.default.info('TaskService: Getting all tasks', { role: currentUserRole });
            if (currentUserRole !== 'admin') {
                const employeeId = await this.resolveEmployeeId(currentUserId);
                if (!employeeId) {
                    return { tasks: [], total: 0, page: query?.page || 1, limit: query?.limit || 10 };
                }
                query = { ...query, assigneeId: employeeId };
            }
            return await this.taskRepository.findAll(query);
        }
        catch (error) {
            logger_1.default.error('TaskService: Get all tasks failed', { error: error.message });
            throw error;
        }
    }
    async getTaskById(id, currentUserRole, currentUserId) {
        try {
            const task = await this.taskRepository.findById(id);
            if (!task) {
                return null;
            }
            if (currentUserRole !== 'admin') {
                const employeeId = await this.resolveEmployeeId(currentUserId);
                if (!employeeId || task.assigneeId.toString() !== employeeId) {
                    throw new Error('Access denied');
                }
            }
            return task;
        }
        catch (error) {
            logger_1.default.error('TaskService: Get task by ID failed', { error: error.message });
            throw error;
        }
    }
    async getMyTasks(userId) {
        try {
            const employeeId = await this.resolveEmployeeId(userId);
            if (!employeeId) {
                return [];
            }
            return await this.taskRepository.findByAssignee(employeeId);
        }
        catch (error) {
            logger_1.default.error('TaskService: Get my tasks failed', { error: error.message });
            throw error;
        }
    }
    async updateTask(id, taskData, currentUserRole, currentUserId) {
        try {
            const existingTask = await this.taskRepository.findById(id);
            if (!existingTask) {
                throw new Error('Task not found');
            }
            if (currentUserRole !== 'admin') {
                const employeeId = await this.resolveEmployeeId(currentUserId);
                if (!employeeId || existingTask.assigneeId.toString() !== employeeId) {
                    throw new Error('Access denied');
                }
                const allowedFields = ['status'];
                const filteredData = {};
                allowedFields.forEach(field => {
                    if (taskData[field] !== undefined) {
                        filteredData[field] = taskData[field];
                    }
                });
                taskData = filteredData;
            }
            const updatedTask = await this.taskRepository.update(id, taskData);
            logger_1.default.info('TaskService: Task updated successfully', { taskId: id });
            return updatedTask;
        }
        catch (error) {
            logger_1.default.error('TaskService: Update task failed', { error: error.message });
            throw error;
        }
    }
    async updateTaskStatus(id, status, currentUserRole, currentUserId) {
        try {
            const existingTask = await this.taskRepository.findById(id);
            if (!existingTask) {
                throw new Error('Task not found');
            }
            const employeeId = await this.resolveEmployeeId(currentUserId);
            if (!employeeId || currentUserRole !== 'employee' || existingTask.assigneeId.toString() !== employeeId) {
                throw new Error('Only the assigned employee can update task status');
            }
            const updatedTask = await this.taskRepository.updateStatus(id, status);
            if (status === 'completed') {
                try {
                    const admin = await Employee_1.Employee.findById(existingTask.assignedBy);
                    const employee = await Employee_1.Employee.findById(existingTask.assigneeId);
                    if (admin && employee) {
                        const emailService = new (await Promise.resolve().then(() => __importStar(require('../services/EmailService')))).EmailService();
                        await emailService.sendTaskCompletionNotification(admin.email, admin.fullName, employee.fullName, updatedTask.title);
                        logger_1.default.info('Task completion notification sent', { adminId: existingTask.assignedBy, taskId: id });
                    }
                }
                catch (emailError) {
                    logger_1.default.warn('Task completion notification failed (non-critical)', { error: emailError.message });
                }
            }
            logger_1.default.info('TaskService: Task status updated successfully', { taskId: id, status });
            return updatedTask;
        }
        catch (error) {
            logger_1.default.error('TaskService: Update task status failed', { error: error.message });
            throw error;
        }
    }
    async deleteTask(id, currentUserRole, currentUserId) {
        try {
            const existingTask = await this.taskRepository.findById(id);
            if (!existingTask) {
                throw new Error('Task not found');
            }
            if (currentUserRole !== 'admin') {
                throw new Error('Only administrators can delete tasks');
            }
            await this.taskRepository.delete(id);
            logger_1.default.info('TaskService: Task deleted successfully', { taskId: id });
        }
        catch (error) {
            logger_1.default.error('TaskService: Delete task failed', { error: error.message });
            throw error;
        }
    }
    async searchTasks(query, currentUserRole, currentUserId) {
        try {
            logger_1.default.info('TaskService: Searching tasks', { query, role: currentUserRole });
            if (currentUserRole !== 'admin') {
                const employeeId = await this.resolveEmployeeId(currentUserId);
                if (!employeeId) {
                    return [];
                }
                const myTasks = await this.taskRepository.findByAssignee(employeeId);
                return myTasks.filter(task => task.title.toLowerCase().includes(query.toLowerCase()) ||
                    (task.description && task.description.toLowerCase().includes(query.toLowerCase())));
            }
            return await this.taskRepository.search(query);
        }
        catch (error) {
            logger_1.default.error('TaskService: Search tasks failed', { error: error.message });
            throw error;
        }
    }
}
exports.TaskService = TaskService;
//# sourceMappingURL=TaskService.js.map