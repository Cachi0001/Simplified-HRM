import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/ProfileService';

export class ProfileController {
  private profileService: ProfileService;

  constructor() {
    this.profileService = new ProfileService();
  }

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const profile = await this.profileService.getProfile(userId);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const {
        full_name,
        phone,
        address,
        date_of_birth,
        position,
        emergency_contact_name,
        emergency_contact_phone,
        profile_picture
      } = req.body;

      const updatedProfile = await this.profileService.updateProfile(userId, {
        full_name,
        phone,
        address,
        date_of_birth,
        position,
        emergency_contact_name,
        emergency_contact_phone,
        profile_picture
      });

      res.json({
        message: 'Profile updated successfully',
        profile: updatedProfile
      });
    } catch (error) {
      next(error);
    }
  };

  updateWorkingDays = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { working_days } = req.body;

      if (!Array.isArray(working_days)) {
        return res.status(400).json({ error: 'working_days must be an array' });
      }

      const updatedProfile = await this.profileService.updateWorkingDays(userId, working_days);

      res.json({
        message: 'Working days updated successfully',
        working_days: updatedProfile.working_days
      });
    } catch (error) {
      next(error);
    }
  };
}
