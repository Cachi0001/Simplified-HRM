import { Router } from 'express';
import { dashboardController } from '../controllers/DashboardController';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', (req, res) => dashboardController.getStats(req, res));

export default router;