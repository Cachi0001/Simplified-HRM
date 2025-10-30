import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import UserSettingsController from '../controllers/UserSettingsController';

const router = Router();

// Protect all routes with authentication
router.use(authenticateToken);

/**
 * User Settings Management
 */
router.get('/', (req, res) => UserSettingsController.getUserSettings(req, res));
router.put('/', (req, res) => UserSettingsController.updateUserSettings(req, res));
router.patch('/:category', (req, res) => UserSettingsController.updateSettingCategory(req, res));
router.post('/reset', (req, res) => UserSettingsController.resetSettings(req, res));

/**
 * Settings Synchronization
 */
router.get('/sync-status', (req, res) => UserSettingsController.getSettingsSyncStatus(req, res));
router.post('/sync', (req, res) => UserSettingsController.forceSettingsSync(req, res));

/**
 * Notification Preferences
 */
router.get('/notifications', (req, res) => UserSettingsController.getNotificationPreferences(req, res));
router.put('/notifications', (req, res) => UserSettingsController.updateNotificationPreferences(req, res));

/**
 * Approval Workflow Integration
 */
router.post('/request-approval', (req, res) => UserSettingsController.requestSettingsApproval(req, res));

/**
 * Validation and Rules
 */
router.get('/validation-rules', (req, res) => UserSettingsController.getValidationRules(req, res));

export default router;