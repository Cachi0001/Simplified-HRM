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

// Protect all routes with authentication
router.use(authenticateToken);

/**
 * Notification Creation
 */
router.post('/', (req, res) => notificationController.createNotification(req, res));

/**
 * Notification Retrieval
 */
router.get('/', (req, res) => notificationController.getNotifications(req, res));
router.get('/unread', (req, res) => notificationController.getUnreadNotifications(req, res));
router.get('/unread-count', (req, res) => notificationController.getUnreadCount(req, res));

/**
 * Notification Management
 */
router.patch('/:notificationId/read', (req, res) => notificationController.markAsRead(req, res));
router.patch('/mark-all-read', (req, res) => notificationController.markAllAsRead(req, res));
router.delete('/:notificationId', (req, res) => notificationController.deleteNotification(req, res));

/**
 * Profile Update Notifications
 */
router.get('/with-highlighting', (req, res) => notificationController.getNotificationsWithHighlighting(req, res));
router.patch('/:notificationId/profile-read', (req, res) => notificationController.markProfileUpdateNotificationAsRead(req, res));

/**
 * Push Token Management
 */
router.post('/push-token', (req, res) => notificationController.savePushToken(req, res));
router.get('/push-tokens/:notificationType', (req, res) => notificationController.getUsersWithPushTokens(req, res));

export default router;
