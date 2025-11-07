import { ProfileRepository } from '../repositories/ProfileRepository';
import { EmailService } from './EmailService';

export class ProfileService {
  private profileRepository: ProfileRepository;
  private emailService: EmailService;

  constructor() {
    this.profileRepository = new ProfileRepository();
    this.emailService = new EmailService();
  }

  async getProfile(userId: string) {
    const profile = await this.profileRepository.getProfileByUserId(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const completionPercentage = await this.profileRepository.calculateProfileCompletion(profile.id);

    return {
      ...profile,
      profile_completion: completionPercentage
    };
  }

  async updateProfile(userId: string, data: {
    full_name?: string;
    phone?: string;
    address?: string;
    date_of_birth?: string;
    position?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    profile_picture?: string;
  }) {
    const profile = await this.profileRepository.getProfileByUserId(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const updatedProfile = await this.profileRepository.updateProfile(profile.id, data);

    const completionPercentage = await this.profileRepository.calculateProfileCompletion(profile.id);

    if (completionPercentage === 100 && !profile.profile_completed) {
      await this.notifySupervisors(profile.id, updatedProfile.full_name);
    }

    return {
      ...updatedProfile,
      profile_completion: completionPercentage
    };
  }

  async updateWorkingDays(userId: string, workingDays: string[]) {
    const profile = await this.profileRepository.getProfileByUserId(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const normalizedDays = workingDays.map(day => day.toLowerCase());
    
    const invalidDays = normalizedDays.filter(day => !validDays.includes(day));
    if (invalidDays.length > 0) {
      throw new Error(`Invalid working days: ${invalidDays.join(', ')}`);
    }

    const updatedProfile = await this.profileRepository.updateWorkingDays(profile.id, normalizedDays);
    return updatedProfile;
  }

  private async notifySupervisors(employeeId: string, employeeName: string) {
    try {
      await this.emailService.sendProfileUpdateNotification(employeeId, employeeName);
    } catch (error) {
      console.error('Failed to notify supervisors:', error);
    }
  }
}
