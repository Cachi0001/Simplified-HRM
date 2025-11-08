import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';
import { authenticate } from '../middleware/auth';

const router = Router();
const taskController = new TaskController();

router.use(authenticate);

router.post('/', taskController.createTask);
router.get('/', taskController.getMyTasks);
router.get('/all', taskController.getAllTasks);
router.get('/:id', taskController.getTaskById);
router.put('/:id/status', taskController.updateTaskStatus);

export default router;
