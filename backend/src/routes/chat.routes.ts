import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router } from 'express';
import { ChatController } from '../controllers/ChatController';
import { ChatService } from '../services/ChatService';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

const chatService = new ChatService();
const chatController = new ChatController(chatService);

// Protect all routes with authentication
router.use(authenticateToken);

/**
 * Message Management
 */
router.post('/send', (req, res) => chatController.sendMessage(req, res));
router.patch('/message/:messageId/read', (req, res) => chatController.markMessageAsRead(req, res));
router.patch('/:chatId/read', (req, res) => chatController.markChatAsRead(req, res));
router.get('/:chatId/history', (req, res) => chatController.getChatHistory(req, res));

/**
 * Unread Count Management
 */
router.get('/unread-count/total', (req, res) => chatController.getTotalUnreadCount(req, res));
router.get('/unread-counts', (req, res) => chatController.getAllUnreadCounts(req, res));
router.get('/:chatId/unread-count', (req, res) => chatController.getChatUnreadCount(req, res));

/**
 * Message Metadata
 */
router.get('/message/:messageId/read-receipt', (req, res) => chatController.getMessageReadReceipt(req, res));
router.get('/:chatId/participants', (req, res) => chatController.getChatParticipants(req, res));

/**
 * Typing Indicators (Redis-based)
 */
router.post('/:chatId/typing/start', (req, res) => chatController.startTyping(req, res));
router.post('/:chatId/typing/stop', (req, res) => chatController.stopTyping(req, res));
router.get('/:chatId/typing', (req, res) => chatController.getTypingUsers(req, res));
router.get('/:chatId/typing/:userId', (req, res) => chatController.isUserTyping(req, res));
router.delete('/:chatId/typing', (req, res) => chatController.clearChatTyping(req, res));
router.get('/typing/stats', (req, res) => chatController.getTypingStats(req, res));

export default router;
