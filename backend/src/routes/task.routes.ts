import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';
import { authenticate } from '../middleware/auth';

const router = Router();
const taskController = new TaskController();

router.use(authenticate);

// Specific routes first (before /:id)
router.get('/my-tasks', taskController.getMyTasks);
router.get('/all', taskController.getAllTasks);

router.post('/', taskController.createTask);
router.get('/', taskController.getMyTasks);

// Dynamic routes last
router.get('/:id', taskController.getTaskById);
router.put('/:id/status', taskController.updateTaskStatus);
router.patch('/:id/status', taskController.updateTaskStatus);
router.delete('/:id', taskController.deleteTask);

export default router;
