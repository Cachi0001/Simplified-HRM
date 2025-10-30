import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import RequestNotificationController from '../controllers/RequestNotificationController';

const router = Router();

// Protect all routes with authentication
router.use(authenticateToken);

/**
 * Notification Triggers
 */
router.post('/status-change', (req, res) => RequestNotificationController.sendStatusChangeNotification(req, res));
router.post('/reminder', (req, res) => RequestNotificationController.sendReminderNotification(req, res));
router.post('/delegation', (req, res) => RequestNotificationController.sendDelegationNotification(req, res));
router.post('/escalation', (req, res) => RequestNotificationController.sendEscalationNotification(req, res));
router.post('/bulk', (req, res) => RequestNotificationController.sendBulkNotifications(req, res));

/**
 * Notification Management
 */
router.get('/:requestType/:requestId/history', (req, res) => RequestNotificationController.getNotificationHistory(req, res));

/**
 * Notification Preferences
 */
router.post('/preferences', (req, res) => RequestNotificationController.setNotificationPreferences(req, res));
router.get('/preferences/:requestType', (req, res) => RequestNotificationController.getNotificationPreferences(req, res));

/**
 * Testing and Administration
 */
router.post('/test', (req, res) => RequestNotificationController.testNotification(req, res));

export default router;