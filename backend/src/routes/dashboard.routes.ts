import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();
const dashboardController = new DashboardController();

router.use(authenticate);

router.get('/stats', dashboardController.getStats);

export default router;
