import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireConversationAccess } from '../middleware/roleAuth';
import ConversationHistoryController from '../controllers/ConversationHistoryController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/conversation-history - Get conversation history based on role permissions
router.get('/', requireConversationAccess, (req, res) => 
  ConversationHistoryController.getConversationHistory(req, res)
);

// GET /api/conversation-history/search - Search conversations
router.get('/search', requireConversationAccess, (req, res) => 
  ConversationHistoryController.searchConversations(req, res)
);

// GET /api/conversation-history/export - Export conversations (admin only)
router.get('/export', (req, res) => 
  ConversationHistoryController.exportConversations(req, res)
);

// GET /api/conversation-history/access-logs - Get access logs (admin only)
router.get('/access-logs', (req, res) => 
  ConversationHistoryController.getAccessLogs(req, res)
);

export default router;