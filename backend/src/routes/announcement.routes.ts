import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { AnnouncementController } from '../controllers/AnnouncementController';

const router = Router();
const announcementController = new AnnouncementController();

// All routes require authentication
router.use(authenticateToken);

// GET /api/announcements - Get all announcements
router.get('/', (req, res) => announcementController.getAnnouncements(req, res));

// GET /api/announcements/templates - Get announcement templates (must be before /:id route)
router.get('/templates', (req, res) => announcementController.getTemplates(req, res));

// GET /api/announcements/:id - Get specific announcement
router.get('/:id', (req, res) => announcementController.getAnnouncement(req, res));

// POST /api/announcements - Create new announcement (admin/hr only)
router.post('/', (req, res) => announcementController.createAnnouncement(req, res));

// PUT /api/announcements/:id - Update announcement (admin/hr only)
router.put('/:id', (req, res) => announcementController.updateAnnouncement(req, res));

// DELETE /api/announcements/:id - Delete announcement (admin only)
router.delete('/:id', (req, res) => announcementController.deleteAnnouncement(req, res));

// POST /api/announcements/:id/reactions - Add or update reaction
router.post('/:id/reactions', (req, res) => announcementController.addReaction(req, res));

// DELETE /api/announcements/:id/reactions - Remove reaction
router.delete('/:id/reactions', (req, res) => announcementController.removeReaction(req, res));

// GET /api/announcements/:id/reactions - Get reactions for announcement
router.get('/:id/reactions', (req, res) => announcementController.getReactions(req, res));

// GET /api/announcements/status/:status - Get announcements by status
router.get('/status/:status', (req, res) => announcementController.getAnnouncementsByStatus(req, res));

// POST /api/announcements/:id/publish - Publish a draft announcement
router.post('/:id/publish', (req, res) => announcementController.publishAnnouncement(req, res));

// POST /api/announcements/:id/archive - Archive an announcement
router.post('/:id/archive', (req, res) => announcementController.archiveAnnouncement(req, res));

// POST /api/announcements/:id/read - Mark announcement as read
router.post('/:id/read', (req, res) => announcementController.markAsRead(req, res));

export default router;
