import { Router } from 'express';
import { ProfileController } from '../controllers/ProfileController';
import { authenticate } from '../middleware/auth';

const router = Router();
const profileController = new ProfileController();

router.get('/', authenticate, profileController.getProfile);
router.put('/', authenticate, profileController.updateProfile);
router.put('/working-days', authenticate, profileController.updateWorkingDays);

export default router;
