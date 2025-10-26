import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { NotificationService } from '../services/NotificationService';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

const notificationService = new NotificationService();
const notificationController = new NotificationController(notificationService);

router.use(authenticateToken);

router.get('/', (req, res) => notificationController.getNotifications(req, res));
router.post('/mark-read', (req, res) => notificationController.markAsRead(req, res));
router.delete('/:id', (req, res) => notificationController.deleteNotification(req, res));

export default router;
