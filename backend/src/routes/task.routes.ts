import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';
import { TaskService } from '../services/TaskService';
import { SupabaseTaskRepository } from '../repositories/implementations/SupabaseTaskRepository';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
const taskRepository = new SupabaseTaskRepository(supabase);
const taskService = new TaskService(taskRepository);
const taskController = new TaskController(taskService);
router.use(authenticateToken);

router.post('/', requireRole(['admin']), (req, res) => taskController.createTask(req, res));
router.get('/', (req, res) => taskController.getAllTasks(req, res));
router.get('/search', (req, res) => taskController.searchTasks(req, res));
router.get('/my-tasks', (req, res) => taskController.getMyTasks(req, res));
router.get('/:id', (req, res) => taskController.getTaskById(req, res));
router.put('/:id', (req, res) => taskController.updateTask(req, res));
router.patch('/:id/status', (req, res) => taskController.updateTaskStatus(req, res));
router.delete('/:id', requireRole(['admin']), (req, res) => taskController.deleteTask(req, res));

export default router;
