import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router } from 'express';
import { TypingController } from '../controllers/TypingController';
import { TypingService } from '../services/TypingService';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

const typingService = new TypingService();
const typingController = new TypingController(typingService);

// Protect all routes with authentication
router.use(authenticateToken);

/**
 * Typing Indicator Management
 */
router.post('/start', (req, res) => typingController.startTyping(req, res));
router.post('/stop', (req, res) => typingController.stopTyping(req, res));

/**
 * Typing Status Queries
 */
router.get('/:chatId', (req, res) => typingController.getTypingUsers(req, res));
router.get('/:chatId/:userId', (req, res) => typingController.isUserTyping(req, res));

export default router;