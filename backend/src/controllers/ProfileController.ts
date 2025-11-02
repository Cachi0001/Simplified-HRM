import { Request, Response } from 'express';
import ProfileService from '../services/ProfileService';
import ProfileUpdateService from '../services/ProfileUpdateService';
import { ApprovalWorkflowService } from '../services/ApprovalWorkflowService';
import NotificationService, { NotificationService as NotificationServiceClass } from '../services/NotificationService';
import logger from '../utils/logger';

export interface UserProfile {
    userId: string;
    personalInfo: {
        fullName: string;
        email: string;
        phone?: string;
        dateOfBirth?: Date;
        address?: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
        };
    };
    professionalInfo: {
        employeeId: string;
        department: string;
        position: string;
        manager?: string;
        startDate: Date;
        employmentType: 'full-time' | 'part-time' | 'contract' | 'intern';
        skills: string[];
        certifications: Array<{
            name: string;
            issuer: string;
            dateObtained: Date;
            expiryDate?: Date;
        }>;
    };
    preferences: {
        profileVisibility: 'public' | 'team' | 'private';
        showContactInfo: boolean;
        allowDirectMessages: boolean;
        workingHours: {
            start: string;
            end: string;
            timezone: string;
            workDays: string[];
        };
    };
    metadata: {
        lastUpdated: Date;
        profileCompleteness: number;
        approvalStatus: 'approved' | 'pending' | 'rejected';
        version: number;
    };
}

export class ProfileController {
    private profileService: typeof ProfileService;
    private profileUpdateService: typeof ProfileUpdateService;
    private notificationService: typeof NotificationService;

    constructor() {
        this.profileService = ProfileService;
        this.profileUpdateService = ProfileUpdateService;
        this.notificationService = NotificationService;
    }

    /**
     * Get user profile
     * GET /api/profile
     */
    async getUserProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;

            if (!userId) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID is required'
                });
                return;
            }

            logger.info('👤 [ProfileController] Get user profile', { userId });

            const profile = await this.profileService.getUserProfile(userId);

            res.status(200).json({
                status: 'success',
                data: { profile }
            });
        } catch (error) {
            logger.error('❌ [ProfileController] Get user profile error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get profile by user ID (for viewing other profiles)
     * GET /api/profile/:userId
     */
    async getProfileById(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;
            const requesterId = req.user?.employeeId || req.user?.id;

            if (!userId) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID is required'
                });
                return;
            }

            logger.info('👤 [ProfileController] Get profile by ID', { 
                userId, 
                requesterId 
            });

            // Check if requester has permission to view this profile
            const canView = await this.profileService.canViewProfile(requesterId, userId);
            if (!canView) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to view this profile'
                });
                return;
            }

            const profile = await this.profileService.getUserProfile(userId, requesterId);

            res.status(200).json({
                status: 'success',
                data: { profile }
            });
        } catch (error) {
            logger.error('❌ [ProfileController] Get profile by ID error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Update user profile
     * PUT /api/profile
     */
    async updateUserProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id; // Use user ID from JWT token
            const profileData = req.body;

            if (!userId || !profileData) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID and profile data are required'
                });
                return;
            }

            logger.info('👤 [ProfileController] Update user profile', { userId });

            // Use the enhanced ProfileUpdateService which handles validation, notifications, and real-time updates
            const updatedEmployee = await this.profileUpdateService.updateProfile(userId, profileData);

            res.status(200).json({
                status: 'success',
                message: 'Profile updated successfully',
                data: { employee: updatedEmployee }
            });
        } catch (error) {
            logger.error('❌ [ProfileController] Update user profile error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Update profile section
     * PATCH /api/profile/:section
     */
    async updateProfileSection(req: Request, res: Response): Promise<void> {
        try {
            const { section } = req.params;
            const userId = req.user?.employeeId || req.user?.id;
            const updates = req.body;

            if (!userId || !section || !updates) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID, section, and updates are required'
                });
                return;
            }

            const validSections = ['personalInfo', 'professionalInfo', 'preferences'];
            if (!validSections.includes(section)) {
                res.status(400).json({
                    status: 'error',
                    message: 'Invalid profile section'
                });
                return;
            }

            logger.info('👤 [ProfileController] Update profile section', { 
                userId, 
                section 
            });

            // Validate section-specific updates
            const validationResult = await this.validateSectionData(section, updates);
            if (!validationResult.isValid) {
                res.status(400).json({
                    status: 'error',
                    message: 'Invalid section data',
                    errors: validationResult.errors
                });
                return;
            }

            const updatedProfile = await this.profileService.updateProfileSection(
                userId, 
                section, 
                updates
            );

            // Trigger real-time sync for the specific section
            await this.syncProfileSectionRealTime(userId, section, updates);

            res.status(200).json({
                status: 'success',
                message: `${section} updated successfully`,
                data: { profile: updatedProfile }
            });
        } catch (error) {
            logger.error('❌ [ProfileController] Update profile section error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Upload profile picture
     * POST /api/profile/picture
     */
    async uploadProfilePicture(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;
            const { imageData, fileName } = req.body;

            if (!userId || !imageData) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID and image data are required'
                });
                return;
            }

            logger.info('📷 [ProfileController] Upload profile picture', { 
                userId, 
                fileName 
            });

            const profilePicture = await this.profileService.uploadProfilePicture(
                userId, 
                imageData, 
                fileName
            );

            // Trigger real-time sync
            await this.syncProfileRealTime(userId, { profilePicture });

            res.status(200).json({
                status: 'success',
                message: 'Profile picture uploaded successfully',
                data: { profilePicture }
            });
        } catch (error) {
            logger.error('❌ [ProfileController] Upload profile picture error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get profile completeness
     * GET /api/profile/completeness
     */
    async getProfileCompleteness(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;

            if (!userId) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID is required'
                });
                return;
            }

            const completeness = await this.profileService.calculateProfileCompleteness(userId);

            res.status(200).json({
                status: 'success',
                data: { completeness }
            });
        } catch (error) {
            logger.error('❌ [ProfileController] Get profile completeness error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Request profile approval
     * POST /api/profile/request-approval
     */
    async requestProfileApproval(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;
            const { changes, reason } = req.body;

            if (!userId || !changes) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID and changes are required'
                });
                return;
            }

            logger.info('📋 [ProfileController] Request profile approval', { userId });

            // TODO: Implement profile approval workflow
            const approvalRequest = {
                id: `profile_${userId}_${Date.now()}`,
                type: 'profile_update',
                status: 'pending',
                userId,
                changes,
                reason: reason || 'Profile update requiring approval'
            };

            res.status(201).json({
                status: 'success',
                message: 'Profile approval request created successfully',
                data: { approvalRequest }
            });
        } catch (error) {
            logger.error('❌ [ProfileController] Request profile approval error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get profile sync status
     * GET /api/profile/sync-status
     */
    async getProfileSyncStatus(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;

            if (!userId) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID is required'
                });
                return;
            }

            const syncStatus = await this.profileService.getProfileSyncStatus(userId);

            res.status(200).json({
                status: 'success',
                data: { syncStatus }
            });
        } catch (error) {
            logger.error('❌ [ProfileController] Get profile sync status error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Force profile sync
     * POST /api/profile/sync
     */
    async forceProfileSync(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;

            if (!userId) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID is required'
                });
                return;
            }

            logger.info('🔄 [ProfileController] Force profile sync', { userId });

            const profile = await this.profileService.getUserProfile(userId);
            await this.syncProfileRealTime(userId, profile);

            res.status(200).json({
                status: 'success',
                message: 'Profile sync completed'
            });
        } catch (error) {
            logger.error('❌ [ProfileController] Force profile sync error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Search profiles
     * GET /api/profile/search
     */
    async searchProfiles(req: Request, res: Response): Promise<void> {
        try {
            const { query, department, skills, limit } = req.query;
            const requesterId = req.user?.employeeId || req.user?.id;

            if (!query) {
                res.status(400).json({
                    status: 'error',
                    message: 'Search query is required'
                });
                return;
            }

            logger.info('🔍 [ProfileController] Search profiles', { 
                query, 
                department, 
                skills,
                requesterId 
            });

            const profiles = await this.profileService.searchProfiles({
                query: query as string,
                department: department as string,
                skills: skills ? (skills as string).split(',') : undefined,
                limit: limit ? parseInt(limit as string) : 20,
                requesterId
            });

            res.status(200).json({
                status: 'success',
                data: { profiles, count: profiles.length }
            });
        } catch (error) {
            logger.error('❌ [ProfileController] Search profiles error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    // Helper methods

    private async validateProfileData(profileData: any): Promise<{ isValid: boolean; errors: string[] }> {
        const errors: string[] = [];

        // Validate personal info
        if (profileData.personalInfo) {
            if (!profileData.personalInfo.fullName || profileData.personalInfo.fullName.trim().length === 0) {
                errors.push('Full name is required');
            }
            if (profileData.personalInfo.email && !this.isValidEmail(profileData.personalInfo.email)) {
                errors.push('Invalid email format');
            }
        }

        // Validate professional info
        if (profileData.professionalInfo) {
            if (profileData.professionalInfo.employmentType && 
                !['full-time', 'part-time', 'contract', 'intern'].includes(profileData.professionalInfo.employmentType)) {
                errors.push('Invalid employment type');
            }
        }

        // Validate preferences
        if (profileData.preferences) {
            if (profileData.preferences.profileVisibility && 
                !['public', 'team', 'private'].includes(profileData.preferences.profileVisibility)) {
                errors.push('Invalid profile visibility setting');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private async validateSectionData(section: string, data: any): Promise<{ isValid: boolean; errors: string[] }> {
        const errors: string[] = [];

        switch (section) {
            case 'personalInfo':
                if (data.email && !this.isValidEmail(data.email)) {
                    errors.push('Invalid email format');
                }
                if (data.phone && !this.isValidPhone(data.phone)) {
                    errors.push('Invalid phone format');
                }
                break;

            case 'professionalInfo':
                if (data.employmentType && 
                    !['full-time', 'part-time', 'contract', 'intern'].includes(data.employmentType)) {
                    errors.push('Invalid employment type');
                }
                if (data.workDays) {
                    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                    const invalidDays = data.workDays.filter((day: string) => !validDays.includes(day.toLowerCase()));
                    
                    if (invalidDays.length > 0) {
                        errors.push(`Invalid working days: ${invalidDays.join(', ')}`);
                    }
                    
                    if (data.workDays.length === 0) {
                        errors.push('At least one working day must be selected');
                    }
                }
                break;

            case 'preferences':
                if (data.profileVisibility && 
                    !['public', 'team', 'private'].includes(data.profileVisibility)) {
                    errors.push('Invalid profile visibility');
                }
                if (data.workingHours) {
                    if (data.workingHours.start && data.workingHours.end) {
                        const startTime = new Date(`2000-01-01T${data.workingHours.start}:00`);
                        const endTime = new Date(`2000-01-01T${data.workingHours.end}:00`);
                        
                        if (startTime >= endTime) {
                            errors.push('Start time must be before end time');
                        }
                    }
                }
                break;
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private isValidPhone(phone: string): boolean {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        return phoneRegex.test(phone);
    }

    private async syncProfileRealTime(userId: string, profileData: any): Promise<void> {
        try {
            // Broadcast profile update to all user sessions
            logger.info('🔄 [ProfileController] Broadcasting profile update', { userId });
            
            // Update profile sync status
            await this.profileService.updateSyncStatus(userId, 'synced');
        } catch (error) {
            logger.error('❌ [ProfileController] Real-time sync failed', {
                error: (error as Error).message,
                userId
            });
            
            await this.profileService.updateSyncStatus(userId, 'error');
        }
    }

    private async syncProfileSectionRealTime(userId: string, section: string, data: any): Promise<void> {
        try {
            // Broadcast section-specific update
            logger.info('🔄 [ProfileController] Broadcasting section update', { 
                userId, 
                section 
            });
            
            await this.profileService.updateSectionSyncStatus(userId, section, 'synced');
        } catch (error) {
            logger.error('❌ [ProfileController] Section sync failed', {
                error: (error as Error).message,
                userId,
                section
            });
            
            await this.profileService.updateSectionSyncStatus(userId, section, 'error');
        }
    }

    /**
     * Update password
     * PUT /api/profile/password
     */
    async updatePassword(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;
            const { currentPassword, newPassword, confirmPassword } = req.body;

            if (!userId || !currentPassword || !newPassword || !confirmPassword) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID, current password, new password, and confirm password are required'
                });
                return;
            }

            if (newPassword !== confirmPassword) {
                res.status(400).json({
                    status: 'error',
                    message: 'New password and confirm password do not match'
                });
                return;
            }

            // Validate password strength
            if (newPassword.length < 8) {
                res.status(400).json({
                    status: 'error',
                    message: 'Password must be at least 8 characters long'
                });
                return;
            }

            logger.info('🔐 [ProfileController] Update password', { userId });

            await this.profileService.updatePassword(userId, currentPassword, newPassword);

            // Trigger real-time sync for password update
            await this.syncProfileRealTime(userId, { passwordUpdated: true });

            // Send notification about password change
            await this.notificationService.createNotification({
                userId,
                title: 'Password Updated',
                message: 'Your password has been updated successfully',
                type: 'security_update',
                priority: 'medium'
            });

            res.status(200).json({
                status: 'success',
                message: 'Password updated successfully'
            });
        } catch (error) {
            logger.error('❌ [ProfileController] Update password error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get profile update history for an employee
     * GET /api/profile/update-history/:employeeId
     */
    async getProfileUpdateHistory(req: Request, res: Response): Promise<void> {
        try {
            const { employeeId } = req.params;
            const { limit } = req.query;
            const requesterId = req.user?.employeeId || req.user?.id;

            if (!employeeId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Employee ID is required'
                });
                return;
            }

            // Check if requester has permission to view update history
            // Only allow viewing own history or if requester is admin/hr/superadmin
            const requesterRole = req.user?.role;
            if (employeeId !== requesterId && !['admin', 'hr', 'superadmin'].includes(requesterRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to view profile update history'
                });
                return;
            }

            logger.info('📋 [ProfileController] Get profile update history', { 
                employeeId, 
                requesterId 
            });

            const history = await this.profileUpdateService.getProfileUpdateHistory(
                employeeId,
                limit ? parseInt(limit as string) : 10
            );

            res.status(200).json({
                status: 'success',
                data: { history, count: history.length }
            });
        } catch (error) {
            logger.error('❌ [ProfileController] Get profile update history error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Update working days for an employee
     * PATCH /api/profile/working-days
     */
    async updateWorkingDays(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            const { workDays, workingHours } = req.body;

            if (!userId) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID is required'
                });
                return;
            }

            if (!workDays && !workingHours) {
                res.status(400).json({
                    status: 'error',
                    message: 'Working days or working hours data is required'
                });
                return;
            }

            logger.info('📅 [ProfileController] Update working days', { 
                userId,
                workDays,
                workingHours
            });

            // Prepare update data
            const updateData: any = {};
            if (workDays) updateData.workDays = workDays;
            if (workingHours) updateData.workingHours = workingHours;

            // Use the enhanced ProfileUpdateService
            const updatedEmployee = await this.profileUpdateService.updateProfile(userId, updateData);

            res.status(200).json({
                status: 'success',
                message: 'Working days updated successfully',
                data: { 
                    employee: updatedEmployee,
                    workDays: updatedEmployee.work_days
                }
            });
        } catch (error) {
            logger.error('❌ [ProfileController] Update working days error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get recent profile updates for administrators
     * GET /api/profile/recent-updates
     */
    async getRecentProfileUpdates(req: Request, res: Response): Promise<void> {
        try {
            const { limit } = req.query;
            const requesterRole = req.user?.role;

            // Only allow administrators to view recent updates
            if (!['admin', 'hr', 'superadmin'].includes(requesterRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to view recent profile updates'
                });
                return;
            }

            logger.info('📋 [ProfileController] Get recent profile updates', { 
                requesterRole 
            });

            const updates = await this.profileUpdateService.getRecentProfileUpdates(
                limit ? parseInt(limit as string) : 20
            );

            res.status(200).json({
                status: 'success',
                data: { updates, count: updates.length }
            });
        } catch (error) {
            logger.error('❌ [ProfileController] Get recent profile updates error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }
}

export default new ProfileController();