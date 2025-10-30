import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import CheckoutMonitoringController from '../controllers/CheckoutMonitoringController';

const router = Router();

// Protect all routes with authentication
router.use(authenticateToken);

/**
 * Checkout Monitoring Statistics and Reports
 */
router.get('/statistics', (req, res) => CheckoutMonitoringController.getCheckoutStatistics(req, res));
router.get('/daily-summary', (req, res) => CheckoutMonitoringController.getDailySummary(req, res));
router.get('/logs', (req, res) => CheckoutMonitoringController.getMonitoringLogs(req, res));

/**
 * Job Management
 */
router.get('/status', (req, res) => CheckoutMonitoringController.getJobStatus(req, res));
router.post('/trigger', (req, res) => CheckoutMonitoringController.triggerManualMonitoring(req, res));

/**
 * Settings Management
 */
router.get('/settings', (req, res) => CheckoutMonitoringController.getMonitoringSettings(req, res));
router.put('/settings', (req, res) => CheckoutMonitoringController.updateMonitoringSettings(req, res));

export default router;