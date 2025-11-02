import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import ProfileController from '../controllers/ProfileController';

const router = Router();

// Protect all routes with authentication
router.use(authenticateToken);

/**
 * Profile Management
 */
router.get('/', (req, res) => ProfileController.getUserProfile(req, res));
router.put('/', (req, res) => ProfileController.updateUserProfile(req, res));
router.patch('/:section', (req, res) => ProfileController.updateProfileSection(req, res));

/**
 * Profile Picture Management
 */
router.post('/picture', (req, res) => ProfileController.uploadProfilePicture(req, res));

/**
 * Password Management
 */
router.put('/password', (req, res) => ProfileController.updatePassword(req, res));

/**
 * Profile Information and Analytics
 */
router.get('/completeness', (req, res) => ProfileController.getProfileCompleteness(req, res));

/**
 * Profile Synchronization
 */
router.get('/sync-status', (req, res) => ProfileController.getProfileSyncStatus(req, res));
router.post('/sync', (req, res) => ProfileController.forceProfileSync(req, res));

/**
 * Profile Search and Discovery
 */
router.get('/search', (req, res) => ProfileController.searchProfiles(req, res));

/**
 * Approval Workflow Integration
 */
router.post('/request-approval', (req, res) => ProfileController.requestProfileApproval(req, res));

/**
 * Profile Update History and Management
 */
router.get('/update-history/:employeeId', (req, res) => ProfileController.getProfileUpdateHistory(req, res));
router.get('/recent-updates', (req, res) => ProfileController.getRecentProfileUpdates(req, res));

/**
 * View Other Profiles
 */
router.get('/:userId', (req, res) => ProfileController.getProfileById(req, res));

export default router;