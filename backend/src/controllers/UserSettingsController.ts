import { Request, Response } from 'express';
import UserSettingsService from '../services/UserSettingsService';
import { ApprovalWorkflowService } from '../services/ApprovalWorkflowService';
import NotificationService from '../services/NotificationService';
import logger from '../utils/logger';

export interface UserSettings {
    userId: string;
    preferences: {
        notifications: {
            email: boolean;
            inApp: boolean;
            sms: boolean;
            frequency: 'immediate' | 'daily' | 'weekly';
            types: {
                taskAssignments: boolean;
                leaveApprovals: boolean;
                purchaseApprovals: boolean;
                performanceUpdates: boolean;
                departmentAnnouncements: boolean;
                systemAlerts: boolean;
            };
        };
        privacy: {
            profileVisibility: 'public' | 'team' | 'private';
            showOnlineStatus: boolean;
            allowDirectMessages: boolean;
        };
        appearance: {
            theme: 'light' | 'dark' | 'auto';
            language: string;
            timezone: string;
            dateFormat: string;
            timeFormat: '12h' | '24h';
        };
        workflow: {
            defaultTaskPriority: 'low' | 'medium' | 'high';
            autoAssignTasks: boolean;
            requireApprovalFor: string[];
            delegationSettings: {
                allowDelegation: boolean;
                defaultDelegate?: string;
                autoDelegate: boolean;
            };
        };
    };
    metadata: {
        lastUpdated: Date;
        version: number;
        syncStatus: 'synced' | 'pending' | 'error';
    };
}

export class UserSettingsController {
    private userSettingsService: typeof UserSettingsService;
    private notificationService: typeof NotificationService;

    constructor() {
        this.userSettingsService = UserSettingsService;
        this.notificationService = NotificationService;
    }

    /**
     * Get user settings
     * GET /api/settings
     */
    async getUserSettings(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;

            if (!userId) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID is required'
                });
                return;
            }

            logger.info('⚙️ [UserSettingsController] Get user settings', { userId });

            const settings = await this.userSettingsService.getUserSettings(userId);

            res.status(200).json({
                status: 'success',
                data: { settings }
            });
        } catch (error) {
            logger.error('❌ [UserSettingsController] Get user settings error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Update user settings
     * PUT /api/settings
     */
    async updateUserSettings(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;
            const { preferences, requiresApproval } = req.body;

            if (!userId || !preferences) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID and preferences are required'
                });
                return;
            }

            logger.info('⚙️ [UserSettingsController] Update user settings', { 
                userId,
                requiresApproval: requiresApproval || false
            });

            // Validate settings
            const validationResult = await this.validateSettings(preferences);
            if (!validationResult.isValid) {
                res.status(400).json({
                    status: 'error',
                    message: 'Invalid settings',
                    errors: validationResult.errors
                });
                return;
            }

            let updatedSettings;

            if (requiresApproval) {
                // Create approval workflow for sensitive settings changes
                // TODO: Implement settings approval workflow
                const approvalRequest = {
                    id: `settings_${userId}_${Date.now()}`,
                    type: 'settings_change',
                    status: 'pending',
                    userId,
                    preferences,
                    reason: 'User settings update requiring approval'
                };

                res.status(202).json({
                    status: 'success',
                    message: 'Settings update submitted for approval',
                    data: { 
                        approvalRequest,
                        pendingChanges: preferences
                    }
                });
                return;
            } else {
                // Update settings directly
                updatedSettings = await this.userSettingsService.updateUserSettings(userId, preferences);

                // Trigger real-time sync
                await this.syncSettingsRealTime(userId, updatedSettings);
            }

            res.status(200).json({
                status: 'success',
                message: 'Settings updated successfully',
                data: { settings: updatedSettings }
            });
        } catch (error) {
            logger.error('❌ [UserSettingsController] Update user settings error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Update specific setting category
     * PATCH /api/settings/:category
     */
    async updateSettingCategory(req: Request, res: Response): Promise<void> {
        try {
            const { category } = req.params as { category: keyof UserSettings['preferences'] };
            const userId = req.user?.employeeId || req.user?.id;
            const updates = req.body;

            if (!userId || !category || !updates) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID, category, and updates are required'
                });
                return;
            }

            const validCategories = ['notifications', 'privacy', 'appearance', 'workflow'];
            if (!validCategories.includes(category)) {
                res.status(400).json({
                    status: 'error',
                    message: 'Invalid settings category'
                });
                return;
            }

            logger.info('⚙️ [UserSettingsController] Update setting category', { 
                userId, 
                category 
            });

            // Validate category-specific updates
            const validationResult = await this.validateCategorySettings(category, updates);
            if (!validationResult.isValid) {
                res.status(400).json({
                    status: 'error',
                    message: 'Invalid category settings',
                    errors: validationResult.errors
                });
                return;
            }

            const updatedSettings = await this.userSettingsService.updateSettingCategory(
                userId, 
                category, 
                updates
            );

            // Trigger real-time sync for the specific category
            await this.syncCategoryRealTime(userId, category, updates);

            res.status(200).json({
                status: 'success',
                message: `${category} settings updated successfully`,
                data: { settings: updatedSettings }
            });
        } catch (error) {
            logger.error('❌ [UserSettingsController] Update setting category error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Reset settings to default
     * POST /api/settings/reset
     */
    async resetSettings(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;
            const { categories } = req.body;

            if (!userId) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID is required'
                });
                return;
            }

            logger.info('🔄 [UserSettingsController] Reset settings', { 
                userId, 
                categories: categories || 'all' 
            });

            const resetSettings = await this.userSettingsService.resetUserSettings(
                userId, 
                categories
            );

            // Trigger real-time sync
            await this.syncSettingsRealTime(userId, resetSettings);

            res.status(200).json({
                status: 'success',
                message: 'Settings reset successfully',
                data: { settings: resetSettings }
            });
        } catch (error) {
            logger.error('❌ [UserSettingsController] Reset settings error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get settings sync status
     * GET /api/settings/sync-status
     */
    async getSettingsSyncStatus(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;

            if (!userId) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID is required'
                });
                return;
            }

            const syncStatus = await this.userSettingsService.getSettingsSyncStatus(userId);

            res.status(200).json({
                status: 'success',
                data: { syncStatus }
            });
        } catch (error) {
            logger.error('❌ [UserSettingsController] Get settings sync status error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Force settings sync
     * POST /api/settings/sync
     */
    async forceSettingsSync(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;

            if (!userId) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID is required'
                });
                return;
            }

            logger.info('🔄 [UserSettingsController] Force settings sync', { userId });

            const settings = await this.userSettingsService.getUserSettings(userId);
            await this.syncSettingsRealTime(userId, settings);

            res.status(200).json({
                status: 'success',
                message: 'Settings sync completed'
            });
        } catch (error) {
            logger.error('❌ [UserSettingsController] Force settings sync error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get notification preferences
     * GET /api/settings/notifications
     */
    async getNotificationPreferences(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;

            if (!userId) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID is required'
                });
                return;
            }

            const preferences = await this.userSettingsService.getNotificationPreferences(userId);

            res.status(200).json({
                status: 'success',
                data: { preferences }
            });
        } catch (error) {
            logger.error('❌ [UserSettingsController] Get notification preferences error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Update notification preferences
     * PUT /api/settings/notifications
     */
    async updateNotificationPreferences(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;
            const { preferences } = req.body;

            if (!userId || !preferences) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID and preferences are required'
                });
                return;
            }

            logger.info('🔔 [UserSettingsController] Update notification preferences', { userId });

            const updatedPreferences = await this.userSettingsService.updateNotificationPreferences(
                userId, 
                preferences
            );

            // Update notification service with new preferences
            await this.notificationService.updateUserPreferences(userId, updatedPreferences);

            res.status(200).json({
                status: 'success',
                message: 'Notification preferences updated successfully',
                data: { preferences: updatedPreferences }
            });
        } catch (error) {
            logger.error('❌ [UserSettingsController] Update notification preferences error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Trigger approval workflow for settings change
     * POST /api/settings/request-approval
     */
    async requestSettingsApproval(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;
            const { settingType, newValue, reason } = req.body;

            if (!userId || !settingType || newValue === undefined) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID, setting type, and new value are required'
                });
                return;
            }

            logger.info('📋 [UserSettingsController] Request settings approval', { 
                userId, 
                settingType 
            });

            // TODO: Implement settings approval workflow
            const approvalRequest = {
                id: `settings_${userId}_${settingType}_${Date.now()}`,
                type: 'settings_change',
                status: 'pending',
                userId,
                settingType,
                newValue,
                reason: reason || 'Settings change requiring approval'
            };

            res.status(201).json({
                status: 'success',
                message: 'Settings approval request created successfully',
                data: { approvalRequest }
            });
        } catch (error) {
            logger.error('❌ [UserSettingsController] Request settings approval error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get settings validation rules
     * GET /api/settings/validation-rules
     */
    async getValidationRules(req: Request, res: Response): Promise<void> {
        try {
            const { category } = req.query;

            const rules = await this.userSettingsService.getValidationRules(category as string);

            res.status(200).json({
                status: 'success',
                data: { rules }
            });
        } catch (error) {
            logger.error('❌ [UserSettingsController] Get validation rules error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    // Helper methods

    private async validateSettings(preferences: any): Promise<{ isValid: boolean; errors: string[] }> {
        const errors: string[] = [];

        // Validate notification preferences
        if (preferences.notifications) {
            if (typeof preferences.notifications.email !== 'boolean') {
                errors.push('Email notification preference must be boolean');
            }
            if (typeof preferences.notifications.inApp !== 'boolean') {
                errors.push('In-app notification preference must be boolean');
            }
            if (preferences.notifications.frequency && 
                !['immediate', 'daily', 'weekly'].includes(preferences.notifications.frequency)) {
                errors.push('Invalid notification frequency');
            }
        }

        // Validate privacy preferences
        if (preferences.privacy) {
            if (preferences.privacy.profileVisibility && 
                !['public', 'team', 'private'].includes(preferences.privacy.profileVisibility)) {
                errors.push('Invalid profile visibility setting');
            }
        }

        // Validate appearance preferences
        if (preferences.appearance) {
            if (preferences.appearance.theme && 
                !['light', 'dark', 'auto'].includes(preferences.appearance.theme)) {
                errors.push('Invalid theme setting');
            }
            if (preferences.appearance.timeFormat && 
                !['12h', '24h'].includes(preferences.appearance.timeFormat)) {
                errors.push('Invalid time format setting');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private async validateCategorySettings(category: string, updates: any): Promise<{ isValid: boolean; errors: string[] }> {
        const errors: string[] = [];

        switch (category) {
            case 'notifications':
                if (updates.email !== undefined && typeof updates.email !== 'boolean') {
                    errors.push('Email notification must be boolean');
                }
                if (updates.frequency && !['immediate', 'daily', 'weekly'].includes(updates.frequency)) {
                    errors.push('Invalid notification frequency');
                }
                break;

            case 'privacy':
                if (updates.profileVisibility && !['public', 'team', 'private'].includes(updates.profileVisibility)) {
                    errors.push('Invalid profile visibility');
                }
                break;

            case 'appearance':
                if (updates.theme && !['light', 'dark', 'auto'].includes(updates.theme)) {
                    errors.push('Invalid theme');
                }
                break;

            case 'workflow':
                if (updates.defaultTaskPriority && !['low', 'medium', 'high'].includes(updates.defaultTaskPriority)) {
                    errors.push('Invalid default task priority');
                }
                break;
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private async syncSettingsRealTime(userId: string, settings: UserSettings): Promise<void> {
        try {
            // Broadcast settings update to all user sessions
            // This would typically use WebSocket or Server-Sent Events
            logger.info('🔄 [UserSettingsController] Broadcasting settings update', { userId });
            
            // Update settings sync status
            await this.userSettingsService.updateSyncStatus(userId, 'synced');
        } catch (error) {
            logger.error('❌ [UserSettingsController] Real-time sync failed', {
                error: (error as Error).message,
                userId
            });
            
            // Update sync status to error
            await this.userSettingsService.updateSyncStatus(userId, 'error');
        }
    }

    private async syncCategoryRealTime(userId: string, category: keyof UserSettings['preferences'], updates: any): Promise<void> {
        try {
            // Broadcast category-specific update
            logger.info('🔄 [UserSettingsController] Broadcasting category update', { 
                userId, 
                category 
            });
            
            // Update specific category sync status
            await this.userSettingsService.updateCategorySyncStatus(userId, category, 'synced');
        } catch (error) {
            logger.error('❌ [UserSettingsController] Category sync failed', {
                error: (error as Error).message,
                userId,
                category
            });
            
            await this.userSettingsService.updateCategorySyncStatus(userId, category, 'error');
        }
    }
}

export default new UserSettingsController();