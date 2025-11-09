import { Router } from 'express';
import notificationController from '../controllers/NotificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user notifications
router.get('/', notificationController.getNotifications);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark notification as read
router.patch('/:notificationId/read', notificationController.markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', notificationController.markAllAsRead);

// Delete notification
router.delete('/:notificationId', notificationController.deleteNotification);

// Create notification (admin only)
router.post('/', notificationController.createNotification);

// Trigger checkout reminders (admin only)
router.post('/checkout-reminders', notificationController.triggerCheckoutReminders);

export default router;
