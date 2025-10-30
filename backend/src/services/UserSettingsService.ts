import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
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

export class UserSettingsService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = supabase.getClient();
    }

    /**
     * Get user settings
     */
    async getUserSettings(userId: string): Promise<UserSettings> {
        try {
            logger.info('UserSettingsService: Getting user settings', { userId });

            const { data: settings, error } = await this.supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // Not found error
                throw error;
            }

            if (!settings) {
                // Return default settings if none exist
                return this.getDefaultSettings(userId);
            }

            return {
                userId: settings.user_id,
                preferences: settings.preferences,
                metadata: {
                    lastUpdated: new Date(settings.updated_at),
                    version: settings.version || 1,
                    syncStatus: settings.sync_status || 'synced'
                }
            };
        } catch (error) {
            logger.error('UserSettingsService: Failed to get user settings', {
                error: (error as Error).message,
                userId
            });
            throw error;
        }
    }

    /**
     * Update user settings
     */
    async updateUserSettings(userId: string, preferences: any): Promise<UserSettings> {
        try {
            logger.info('UserSettingsService: Updating user settings', { userId });

            const { data: updatedSettings, error } = await this.supabase
                .from('user_settings')
                .upsert({
                    user_id: userId,
                    preferences,
                    version: await this.getNextVersion(userId),
                    sync_status: 'synced',
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            return {
                userId: updatedSettings.user_id,
                preferences: updatedSettings.preferences,
                metadata: {
                    lastUpdated: new Date(updatedSettings.updated_at),
                    version: updatedSettings.version,
                    syncStatus: updatedSettings.sync_status
                }
            };
        } catch (error) {
            logger.error('UserSettingsService: Failed to update user settings', {
                error: (error as Error).message,
                userId
            });
            throw error;
        }
    }

    /**
     * Update specific setting category
     */
    async updateSettingCategory(userId: string, category: string, updates: any): Promise<UserSettings> {
        try {
            const currentSettings = await this.getUserSettings(userId);
            const newPreferences = { ...currentSettings.preferences };
            
            // Type-safe category update
            if (category === 'notifications') {
                newPreferences.notifications = { ...newPreferences.notifications, ...updates };
            } else if (category === 'privacy') {
                newPreferences.privacy = { ...newPreferences.privacy, ...updates };
            } else if (category === 'appearance') {
                newPreferences.appearance = { ...newPreferences.appearance, ...updates };
            } else if (category === 'workflow') {
                newPreferences.workflow = { ...newPreferences.workflow, ...updates };
            }

            return await this.updateUserSettings(userId, newPreferences);
        } catch (error) {
            logger.error('UserSettingsService: Failed to update setting category', {
                error: (error as Error).message,
                userId,
                category
            });
            throw error;
        }
    }

    /**
     * Reset user settings to default
     */
    async resetUserSettings(userId: string, categories?: string[]): Promise<UserSettings> {
        try {
            const defaultSettings = this.getDefaultSettings(userId);
            
            if (categories && categories.length > 0) {
                const currentSettings = await this.getUserSettings(userId);
                const newPreferences = { ...currentSettings.preferences };
                
                categories.forEach(category => {
                    if (category === 'notifications') {
                        newPreferences.notifications = defaultSettings.preferences.notifications;
                    } else if (category === 'privacy') {
                        newPreferences.privacy = defaultSettings.preferences.privacy;
                    } else if (category === 'appearance') {
                        newPreferences.appearance = defaultSettings.preferences.appearance;
                    } else if (category === 'workflow') {
                        newPreferences.workflow = defaultSettings.preferences.workflow;
                    }
                });
                
                return await this.updateUserSettings(userId, newPreferences);
            } else {
                return await this.updateUserSettings(userId, defaultSettings.preferences);
            }
        } catch (error) {
            logger.error('UserSettingsService: Failed to reset user settings', {
                error: (error as Error).message,
                userId
            });
            throw error;
        }
    }

    /**
     * Get notification preferences
     */
    async getNotificationPreferences(userId: string): Promise<any> {
        try {
            const settings = await this.getUserSettings(userId);
            return settings.preferences.notifications;
        } catch (error) {
            logger.error('UserSettingsService: Failed to get notification preferences', {
                error: (error as Error).message,
                userId
            });
            throw error;
        }
    }

    /**
     * Update notification preferences
     */
    async updateNotificationPreferences(userId: string, preferences: any): Promise<any> {
        try {
            const updatedSettings = await this.updateSettingCategory(userId, 'notifications', preferences);
            return updatedSettings.preferences.notifications;
        } catch (error) {
            logger.error('UserSettingsService: Failed to update notification preferences', {
                error: (error as Error).message,
                userId
            });
            throw error;
        }
    }

    /**
     * Get settings sync status
     */
    async getSettingsSyncStatus(userId: string): Promise<any> {
        try {
            const { data: settings, error } = await this.supabase
                .from('user_settings')
                .select('sync_status, updated_at, version')
                .eq('user_id', userId)
                .single();

            if (error) {
                throw error;
            }

            return {
                syncStatus: settings.sync_status || 'synced',
                lastUpdated: settings.updated_at,
                version: settings.version || 1
            };
        } catch (error) {
            logger.error('UserSettingsService: Failed to get sync status', {
                error: (error as Error).message,
                userId
            });
            throw error;
        }
    }

    /**
     * Update sync status
     */
    async updateSyncStatus(userId: string, status: 'synced' | 'pending' | 'error'): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('user_settings')
                .update({ sync_status: status })
                .eq('user_id', userId);

            if (error) {
                throw error;
            }
        } catch (error) {
            logger.error('UserSettingsService: Failed to update sync status', {
                error: (error as Error).message,
                userId
            });
            throw error;
        }
    }

    /**
     * Update category sync status
     */
    async updateCategorySyncStatus(userId: string, category: string, status: 'synced' | 'pending' | 'error'): Promise<void> {
        try {
            // For now, update the overall sync status
            // In a more complex implementation, you might track category-specific sync status
            await this.updateSyncStatus(userId, status);
        } catch (error) {
            logger.error('UserSettingsService: Failed to update category sync status', {
                error: (error as Error).message,
                userId,
                category
            });
            throw error;
        }
    }

    /**
     * Get validation rules
     */
    async getValidationRules(category?: string): Promise<any> {
        const rules = {
            notifications: {
                email: { type: 'boolean', required: true },
                inApp: { type: 'boolean', required: true },
                frequency: { type: 'string', enum: ['immediate', 'daily', 'weekly'] }
            },
            privacy: {
                profileVisibility: { type: 'string', enum: ['public', 'team', 'private'] },
                showOnlineStatus: { type: 'boolean' },
                allowDirectMessages: { type: 'boolean' }
            },
            appearance: {
                theme: { type: 'string', enum: ['light', 'dark', 'auto'] },
                timeFormat: { type: 'string', enum: ['12h', '24h'] }
            },
            workflow: {
                defaultTaskPriority: { type: 'string', enum: ['low', 'medium', 'high'] },
                autoAssignTasks: { type: 'boolean' }
            }
        };

        return category ? rules[category as keyof typeof rules] : rules;
    }

    /**
     * Get setting value
     */
    async getSettingValue(userId: string, settingPath: string): Promise<any> {
        try {
            const settings = await this.getUserSettings(userId);
            const pathParts = settingPath.split('.');
            
            let value: any = settings.preferences;
            for (const part of pathParts) {
                if (value && typeof value === 'object' && part in value) {
                    value = value[part];
                } else {
                    value = undefined;
                    break;
                }
            }
            
            return value;
        } catch (error) {
            logger.error('UserSettingsService: Failed to get setting value', {
                error: (error as Error).message,
                userId,
                settingPath
            });
            throw error;
        }
    }

    // Helper methods

    private getDefaultSettings(userId: string): UserSettings {
        return {
            userId,
            preferences: {
                notifications: {
                    email: true,
                    inApp: true,
                    sms: false,
                    frequency: 'immediate',
                    types: {
                        taskAssignments: true,
                        leaveApprovals: true,
                        purchaseApprovals: true,
                        performanceUpdates: true,
                        departmentAnnouncements: true,
                        systemAlerts: true
                    }
                },
                privacy: {
                    profileVisibility: 'team',
                    showOnlineStatus: true,
                    allowDirectMessages: true
                },
                appearance: {
                    theme: 'light',
                    language: 'en',
                    timezone: 'UTC',
                    dateFormat: 'MM/DD/YYYY',
                    timeFormat: '12h'
                },
                workflow: {
                    defaultTaskPriority: 'medium',
                    autoAssignTasks: false,
                    requireApprovalFor: [],
                    delegationSettings: {
                        allowDelegation: true,
                        autoDelegate: false
                    }
                }
            },
            metadata: {
                lastUpdated: new Date(),
                version: 1,
                syncStatus: 'synced'
            }
        };
    }

    private async getNextVersion(userId: string): Promise<number> {
        try {
            const { data: settings } = await this.supabase
                .from('user_settings')
                .select('version')
                .eq('user_id', userId)
                .single();

            return (settings?.version || 0) + 1;
        } catch (error) {
            return 1;
        }
    }
}

export default new UserSettingsService();