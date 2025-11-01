/**
 * Typing Indicator Routes
 */
import express from 'express';
import TypingIndicatorController from '../controllers/TypingIndicatorController';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/roleAuth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Typing indicator operations
router.post('/status', TypingIndicatorController.setTypingStatus);
router.get('/chat/:chatId', TypingIndicatorController.getTypingUsers);
router.post('/timeout', TypingIndicatorController.handleTypingTimeout);

// Cleanup endpoint (for cron jobs - admin only)
router.post('/cleanup', requireRole('admin'), TypingIndicatorController.cleanupExpiredIndicators);

export default router;