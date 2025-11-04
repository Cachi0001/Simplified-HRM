import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';
import { TaskService } from '../services/TaskService';
import { SupabaseTaskRepository } from '../repositories/implementations/SupabaseTaskRepository';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

const taskRepository = new SupabaseTaskRepository();
const taskService = new TaskService(taskRepository);
const taskController = new TaskController(taskService);
router.use(authenticateToken);

router.post('/', requireRole(['admin', 'hr', 'superadmin']), (req, res) => taskController.createTask(req, res));
router.get('/', (req, res) => taskController.getAllTasks(req, res));
router.get('/search', (req, res) => taskController.searchTasks(req, res));
router.get('/my-tasks', (req, res) => taskController.getMyTasks(req, res));
router.get('/:id', (req, res) => taskController.getTaskById(req, res));
router.put('/:id', (req, res) => taskController.updateTask(req, res));
router.patch('/:id/status', (req, res) => taskController.updateTaskStatus(req, res));
router.delete('/:id', requireRole(['admin', 'hr', 'superadmin']), (req, res) => taskController.deleteTask(req, res));

// Team lead specific routes
router.post('/team-task', (req, res) => taskController.createTeamTask(req, res));
router.get('/team-members', (req, res) => taskController.getTeamMembers(req, res));
router.get('/assignable-employees', (req, res) => taskController.getAssignableEmployees(req, res));

export default router;
