import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import bcrypt from 'bcrypt';

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
        hireDate: Date;
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

export class ProfileService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = supabase.getClient();
    }

    /**
     * Get user profile
     */
    async getUserProfile(userId: string, requesterId?: string): Promise<UserProfile> {
        try {
            logger.info('ProfileService: Getting user profile', { userId, requesterId });

            const { data: employee, error } = await this.supabase
                .from('employees')
                .select(`
                    id,
                    full_name,
                    email,
                    phone,
                    position,
                    hire_date,
                    profile_picture_url,
                    department:departments!employees_department_id_fkey(id, name),
                    manager:employees!employees_manager_id_fkey(id, full_name)
                `)
                .eq('id', userId)
                .single();

            if (error) {
                throw error;
            }

            // Get additional profile data
            const { data: profileData } = await this.supabase
                .from('employee_profiles')
                .select('*')
                .eq('employee_id', userId)
                .single();

            const profile: UserProfile = {
                userId: employee.id,
                personalInfo: {
                    fullName: employee.full_name,
                    email: employee.email,
                    phone: employee.phone,
                    dateOfBirth: profileData?.date_of_birth ? new Date(profileData.date_of_birth) : undefined,
                    address: profileData?.address
                },
                professionalInfo: {
                    employeeId: employee.id,
                    department: Array.isArray(employee.department) ? (employee.department[0] as any)?.name || '' : (employee.department as any)?.name || '',
                    position: employee.position || '',
                    manager: Array.isArray(employee.manager) ? (employee.manager[0] as any)?.full_name : (employee.manager as any)?.full_name,
                    hireDate: new Date(employee.hire_date),
                    employmentType: profileData?.employment_type || 'full-time',
                    skills: profileData?.skills || [],
                    certifications: profileData?.certifications || []
                },
                preferences: {
                    profileVisibility: profileData?.profile_visibility || 'team',
                    showContactInfo: profileData?.show_contact_info || true,
                    allowDirectMessages: profileData?.allow_direct_messages || true,
                    workingHours: profileData?.working_hours || {
                        start: '09:00',
                        end: '17:00',
                        timezone: 'UTC',
                        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                    }
                },
                metadata: {
                    lastUpdated: new Date(profileData?.updated_at || (employee as any).updated_at || new Date()),
                    profileCompleteness: await this.calculateProfileCompleteness(userId),
                    approvalStatus: profileData?.approval_status || 'approved',
                    version: profileData?.version || 1
                }
            };

            // Filter sensitive information based on privacy settings and requester permissions
            if (requesterId && requesterId !== userId) {
                return this.filterProfileForViewer(profile, requesterId);
            }

            return profile;
        } catch (error) {
            logger.error('ProfileService: Failed to get user profile', {
                error: (error as Error).message,
                userId
            });
            throw error;
        }
    }

    /**
     * Update user profile
     */
    async updateUserProfile(userId: string, profileData: any): Promise<UserProfile> {
        try {
            logger.info('ProfileService: Updating user profile', { userId });

            // Update employee table
            if (profileData.personalInfo) {
                const { error: employeeError } = await this.supabase
                    .from('employees')
                    .update({
                        full_name: profileData.personalInfo.fullName,
                        email: profileData.personalInfo.email,
                        phone: profileData.personalInfo.phone,
                        position: profileData.professionalInfo?.position,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userId);

                if (employeeError) {
                    throw employeeError;
                }
            }

            // Update or insert profile data
            const profileUpdateData = {
                employee_id: userId,
                date_of_birth: profileData.personalInfo?.dateOfBirth,
                address: profileData.personalInfo?.address,
                employment_type: profileData.professionalInfo?.employmentType,
                skills: profileData.professionalInfo?.skills,
                certifications: profileData.professionalInfo?.certifications,
                profile_visibility: profileData.preferences?.profileVisibility,
                show_contact_info: profileData.preferences?.showContactInfo,
                allow_direct_messages: profileData.preferences?.allowDirectMessages,
                working_hours: profileData.preferences?.workingHours,
                version: await this.getNextVersion(userId),
                updated_at: new Date().toISOString()
            };

            const { error: profileError } = await this.supabase
                .from('employee_profiles')
                .upsert(profileUpdateData);

            if (profileError) {
                throw profileError;
            }

            return await this.getUserProfile(userId);
        } catch (error) {
            logger.error('ProfileService: Failed to update user profile', {
                error: (error as Error).message,
                userId
            });
            throw error;
        }
    }

    /**
     * Update profile section
     */
    async updateProfileSection(userId: string, section: string, data: any): Promise<UserProfile> {
        try {
            const currentProfile = await this.getUserProfile(userId);
            const updatedProfile = {
                ...currentProfile,
                [section]: {
                    ...(currentProfile[section as keyof UserProfile] as any),
                    ...data
                }
            };

            return await this.updateUserProfile(userId, updatedProfile);
        } catch (error) {
            logger.error('ProfileService: Failed to update profile section', {
                error: (error as Error).message,
                userId,
                section
            });
            throw error;
        }
    }

    /**
     * Update password
     */
    async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        try {
            logger.info('ProfileService: Updating password', { userId });

            // Get current password hash
            const { data: employee, error: fetchError } = await this.supabase
                .from('employees')
                .select('password_hash')
                .eq('id', userId)
                .single();

            if (fetchError) {
                throw fetchError;
            }

            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, employee.password_hash);
            if (!isCurrentPasswordValid) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const saltRounds = 12;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            // Update password
            const { error: updateError } = await this.supabase
                .from('employees')
                .update({
                    password_hash: newPasswordHash,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (updateError) {
                throw updateError;
            }

            logger.info('ProfileService: Password updated successfully', { userId });
        } catch (error) {
            logger.error('ProfileService: Failed to update password', {
                error: (error as Error).message,
                userId
            });
            throw error;
        }
    }

    /**
     * Upload profile picture
     */
    async uploadProfilePicture(userId: string, imageData: string, fileName?: string): Promise<string> {
        try {
            logger.info('ProfileService: Uploading profile picture', { userId, fileName });

            // In a real implementation, you would upload to a file storage service
            // For now, we'll just store the image data URL
            const profilePictureUrl = imageData; // This would be the actual URL after upload

            const { error } = await this.supabase
                .from('employees')
                .update({
                    profile_picture_url: profilePictureUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                throw error;
            }

            return profilePictureUrl;
        } catch (error) {
            logger.error('ProfileService: Failed to upload profile picture', {
                error: (error as Error).message,
                userId
            });
            throw error;
        }
    }

    /**
     * Calculate profile completeness
     */
    async calculateProfileCompleteness(userId: string): Promise<number> {
        try {
            const { data: employee } = await this.supabase
                .from('employees')
                .select('full_name, email, phone, position, profile_picture_url')
                .eq('id', userId)
                .single();

            const { data: profile } = await this.supabase
                .from('employee_profiles')
                .select('*')
                .eq('employee_id', userId)
                .single();

            let completeness = 0;
            const totalFields = 10;

            // Basic info (40%)
            if (employee?.full_name) completeness += 1;
            if (employee?.email) completeness += 1;
            if (employee?.phone) completeness += 1;
            if (employee?.position) completeness += 1;

            // Profile picture (10%)
            if (employee?.profile_picture_url) completeness += 1;

            // Additional info (50%)
            if (profile?.date_of_birth) completeness += 1;
            if (profile?.address) completeness += 1;
            if (profile?.skills && profile.skills.length > 0) completeness += 1;
            if (profile?.working_hours) completeness += 1;
            if (profile?.certifications && profile.certifications.length > 0) completeness += 1;

            return Math.round((completeness / totalFields) * 100);
        } catch (error) {
            logger.error('ProfileService: Failed to calculate profile completeness', {
                error: (error as Error).message,
                userId
            });
            return 0;
        }
    }

    /**
     * Check if user can view profile
     */
    async canViewProfile(requesterId: string, targetUserId: string): Promise<boolean> {
        try {
            if (requesterId === targetUserId) {
                return true;
            }

            // Get target user's privacy settings
            const { data: profile } = await this.supabase
                .from('employee_profiles')
                .select('profile_visibility')
                .eq('employee_id', targetUserId)
                .single();

            const visibility = profile?.profile_visibility || 'team';

            switch (visibility) {
                case 'public':
                    return true;
                case 'private':
                    return false;
                case 'team':
                default:
                    // Check if they're in the same department
                    const { data: requesterDept } = await this.supabase
                        .from('employees')
                        .select('department_id')
                        .eq('id', requesterId)
                        .single();

                    const { data: targetDept } = await this.supabase
                        .from('employees')
                        .select('department_id')
                        .eq('id', targetUserId)
                        .single();

                    return requesterDept?.department_id === targetDept?.department_id;
            }
        } catch (error) {
            logger.error('ProfileService: Failed to check view permissions', {
                error: (error as Error).message,
                requesterId,
                targetUserId
            });
            return false;
        }
    }

    /**
     * Search profiles
     */
    async searchProfiles(options: {
        query: string;
        department?: string;
        skills?: string[];
        limit?: number;
        requesterId: string;
    }): Promise<UserProfile[]> {
        try {
            logger.info('ProfileService: Searching profiles', options);

            let query = this.supabase
                .from('employees')
                .select(`
                    id,
                    full_name,
                    email,
                    position,
                    profile_picture_url,
                    department:departments!employees_department_id_fkey(id, name)
                `)
                .eq('status', 'active')
                .ilike('full_name', `%${options.query}%`);

            if (options.department) {
                query = query.eq('department.name', options.department);
            }

            if (options.limit) {
                query = query.limit(options.limit);
            }

            const { data: employees, error } = await query;

            if (error) {
                throw error;
            }

            const profiles: UserProfile[] = [];

            for (const employee of employees || []) {
                if (await this.canViewProfile(options.requesterId, employee.id)) {
                    const profile = await this.getUserProfile(employee.id, options.requesterId);
                    profiles.push(profile);
                }
            }

            return profiles;
        } catch (error) {
            logger.error('ProfileService: Failed to search profiles', {
                error: (error as Error).message,
                options
            });
            throw error;
        }
    }

    /**
     * Check if profile update requires approval
     */
    async requiresApproval(userId: string, profileData: any): Promise<boolean> {
        // Define which fields require approval
        const approvalRequiredFields = ['email', 'position', 'department'];
        
        for (const field of approvalRequiredFields) {
            if (profileData.personalInfo?.[field] || profileData.professionalInfo?.[field]) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get profile sync status
     */
    async getProfileSyncStatus(userId: string): Promise<any> {
        try {
            const { data: profile } = await this.supabase
                .from('employee_profiles')
                .select('sync_status, updated_at, version')
                .eq('employee_id', userId)
                .single();

            return {
                syncStatus: profile?.sync_status || 'synced',
                lastUpdated: profile?.updated_at,
                version: profile?.version || 1
            };
        } catch (error) {
            return {
                syncStatus: 'synced',
                lastUpdated: new Date(),
                version: 1
            };
        }
    }

    /**
     * Update sync status
     */
    async updateSyncStatus(userId: string, status: 'synced' | 'pending' | 'error'): Promise<void> {
        try {
            await this.supabase
                .from('employee_profiles')
                .upsert({
                    employee_id: userId,
                    sync_status: status,
                    updated_at: new Date().toISOString()
                });
        } catch (error) {
            logger.error('ProfileService: Failed to update sync status', {
                error: (error as Error).message,
                userId
            });
        }
    }

    /**
     * Update section sync status
     */
    async updateSectionSyncStatus(userId: string, section: string, status: 'synced' | 'pending' | 'error'): Promise<void> {
        // For now, update the overall sync status
        await this.updateSyncStatus(userId, status);
    }

    // Helper methods

    private async getNextVersion(userId: string): Promise<number> {
        try {
            const { data: profile } = await this.supabase
                .from('employee_profiles')
                .select('version')
                .eq('employee_id', userId)
                .single();

            return (profile?.version || 0) + 1;
        } catch (error) {
            return 1;
        }
    }

    private filterProfileForViewer(profile: UserProfile, viewerId: string): UserProfile {
        // Filter sensitive information based on privacy settings
        const filteredProfile = { ...profile };

        if (!profile.preferences.showContactInfo) {
            filteredProfile.personalInfo.phone = undefined;
            filteredProfile.personalInfo.address = undefined;
        }

        return filteredProfile;
    }
}

export default new ProfileService();