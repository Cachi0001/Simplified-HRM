/**
 * Message Indicator Routes
 */
import express from 'express';
import MessageIndicatorController from '../controllers/MessageIndicatorController';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Message indicator operations
router.post('/', MessageIndicatorController.createIndicator);
router.get('/active', MessageIndicatorController.getActiveIndicators);
router.delete('/:indicatorId', MessageIndicatorController.expireIndicator);
router.get('/stats', MessageIndicatorController.getIndicatorStats);

// Cleanup endpoint (for cron jobs - admin only)
router.post('/cleanup', requireRole('admin'), MessageIndicatorController.cleanupExpiredIndicators);

export default router;