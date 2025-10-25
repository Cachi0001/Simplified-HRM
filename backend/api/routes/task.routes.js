"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const express_1 = require("express");
const TaskController_1 = require("../controllers/TaskController");
const TaskService_1 = require("../services/TaskService");
const MongoTaskRepository_1 = require("../repositories/implementations/MongoTaskRepository");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const taskRepository = new MongoTaskRepository_1.MongoTaskRepository();
const taskService = new TaskService_1.TaskService(taskRepository);
const taskController = new TaskController_1.TaskController(taskService);
router.use(auth_middleware_1.authenticateToken);
router.post('/', (0, auth_middleware_1.requireRole)(['admin']), (req, res) => taskController.createTask(req, res));
router.get('/', (req, res) => taskController.getAllTasks(req, res));
router.get('/search', (req, res) => taskController.searchTasks(req, res));
router.get('/my-tasks', (req, res) => taskController.getMyTasks(req, res));
router.get('/:id', (req, res) => taskController.getTaskById(req, res));
router.put('/:id', (req, res) => taskController.updateTask(req, res));
router.patch('/:id/status', (req, res) => taskController.updateTaskStatus(req, res));
router.delete('/:id', (0, auth_middleware_1.requireRole)(['admin']), (req, res) => taskController.deleteTask(req, res));
exports.default = router;
//# sourceMappingURL=task.routes.js.map