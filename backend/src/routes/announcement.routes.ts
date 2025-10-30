import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { AnnouncementController } from '../controllers/AnnouncementController';

const router = Router();
const announcementController = new AnnouncementController();

// All routes require authentication
router.use(authenticateToken);

// GET /api/announcements - Get all announcements
router.get('/', (req, res) => announcementController.getAnnouncements(req, res));

// GET /api/announcements/:id - Get specific announcement
router.get('/:id', (req, res) => announcementController.getAnnouncement(req, res));

// POST /api/announcements - Create new announcement (admin/hr only)
router.post('/', (req, res) => announcementController.createAnnouncement(req, res));

// PUT /api/announcements/:id - Update announcement (admin/hr only)
router.put('/:id', (req, res) => announcementController.updateAnnouncement(req, res));

// DELETE /api/announcements/:id - Delete announcement (admin only)
router.delete('/:id', (req, res) => announcementController.deleteAnnouncement(req, res));

export default router;
