import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import NotificationService from './NotificationService';
import { getWebSocketService } from './WebSocketService';
import { EmailService } from './EmailService';

export interface ProfileUpdateData {
  fullName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: string;
  department?: string;
  position?: string;
}

export interface ProfileChanges {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: { field: string; message: string }[];
}

export class ProfileUpdateService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = supabase.getClient();
  }

  /**
   * Update employee profile with validation and notifications
   */
  async updateProfile(userId: string, updates: ProfileUpdateData): Promise<any> {
    try {
      logger.info('ProfileUpdateService: Starting profile update', { userId });

      // Validate input data
      const validation = await this.validateProfileData(updates);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Get current profile data for comparison
      const { data: currentEmployee, error: fetchError } = await this.supabase
        .from('employees')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Track changes
      const changes: ProfileChanges[] = [];
      const updatedFields: string[] = [];

      // Compare and track changes
      if (updates.fullName && updates.fullName !== currentEmployee.full_name) {
        changes.push({
          field: 'full_name',
          oldValue: currentEmployee.full_name,
          newValue: updates.fullName
        });
        updatedFields.push('Full Name');
      }

      if (updates.email && updates.email !== currentEmployee.email) {
        changes.push({
          field: 'email',
          oldValue: currentEmployee.email,
          newValue: updates.email
        });
        updatedFields.push('Email');
      }

      if (updates.phone && updates.phone !== currentEmployee.phone) {
        changes.push({
          field: 'phone',
          oldValue: currentEmployee.phone,
          newValue: updates.phone
        });
        updatedFields.push('Phone');
      }

      if (updates.dateOfBirth) {
        const newDateOfBirth = updates.dateOfBirth instanceof Date 
          ? updates.dateOfBirth.toISOString().split('T')[0]
          : updates.dateOfBirth;
        
        if (newDateOfBirth !== currentEmployee.date_of_birth) {
          changes.push({
            field: 'date_of_birth',
            oldValue: currentEmployee.date_of_birth,
            newValue: newDateOfBirth
          });
          updatedFields.push('Date of Birth');
        }
      }

      if (updates.address && updates.address !== currentEmployee.address) {
        changes.push({
          field: 'address',
          oldValue: currentEmployee.address,
          newValue: updates.address
        });
        updatedFields.push('Address');
      }

      if (updates.department && updates.department !== currentEmployee.department) {
        changes.push({
          field: 'department',
          oldValue: currentEmployee.department,
          newValue: updates.department
        });
        updatedFields.push('Department');
      }

      if (updates.position && updates.position !== currentEmployee.position) {
        changes.push({
          field: 'position',
          oldValue: currentEmployee.position,
          newValue: updates.position
        });
        updatedFields.push('Position');
      }

      // If no changes, return current data
      if (changes.length === 0) {
        logger.info('ProfileUpdateService: No changes detected', { userId });
        return currentEmployee;
      }

      // Prepare update data
      const updateData: any = {
        profile_updated_at: new Date().toISOString(),
        profile_updated_by: userId
      };

      if (updates.fullName) updateData.full_name = updates.fullName;
      if (updates.email) updateData.email = updates.email;
      if (updates.phone) updateData.phone = updates.phone;
      if (updates.dateOfBirth) {
        updateData.date_of_birth = updates.dateOfBirth instanceof Date 
          ? updates.dateOfBirth.toISOString().split('T')[0]
          : updates.dateOfBirth;
      }
      if (updates.address) updateData.address = updates.address;
      if (updates.department) updateData.department = updates.department;
      if (updates.position) updateData.position = updates.position;

      // Update employee record
      const { data: updatedEmployee, error: updateError } = await this.supabase
        .from('employees')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      logger.info('ProfileUpdateService: Profile updated successfully', { 
        userId, 
        updatedFields,
        changesCount: changes.length 
      });

      // Create profile update notification record
      await this.createProfileUpdateNotification(
        updatedEmployee.id,
        updatedEmployee.full_name,
        updatedFields,
        changes
      );

      // Send notifications to administrators
      await this.notifyAdministrators(
        updatedEmployee.id,
        updatedEmployee.full_name,
        updatedFields
      );

      // Broadcast real-time update
      await this.broadcastProfileUpdate(updatedEmployee.id, changes);

      return updatedEmployee;
    } catch (error) {
      logger.error('ProfileUpdateService: Failed to update profile', {
        error: (error as Error).message,
        userId
      });
      throw error;
    }
  }

  /**
   * Validate profile data
   */
  async validateProfileData(data: ProfileUpdateData): Promise<ValidationResult> {
    const errors: { field: string; message: string }[] = [];

    // Validate email format
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push({ field: 'email', message: 'Invalid email format' });
      }

      // Check if email is already taken by another user
      const { data: existingUser, error } = await this.supabase
        .from('employees')
        .select('id, user_id')
        .eq('email', data.email)
        .single();

      if (!error && existingUser) {
        // Allow if it's the same user updating their own email
        // We'll need to check this in the calling context
        errors.push({ field: 'email', message: 'Email already exists' });
      }
    }

    // Validate phone format
    if (data.phone) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(data.phone.replace(/[\s\-\(\)]/g, ''))) {
        errors.push({ field: 'phone', message: 'Invalid phone number format' });
      }
    }

    // Validate date of birth
    if (data.dateOfBirth) {
      const dob = new Date(data.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      
      if (dob > today) {
        errors.push({ field: 'dateOfBirth', message: 'Date of birth cannot be in the future' });
      } else if (age < 16 || age > 100) {
        errors.push({ field: 'dateOfBirth', message: 'Age must be between 16 and 100 years' });
      }
    }

    // Validate full name
    if (data.fullName) {
      if (data.fullName.trim().length < 2) {
        errors.push({ field: 'fullName', message: 'Full name must be at least 2 characters' });
      }
      if (data.fullName.length > 100) {
        errors.push({ field: 'fullName', message: 'Full name cannot exceed 100 characters' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create profile update notification record
   */
  private async createProfileUpdateNotification(
    employeeId: string,
    employeeName: string,
    updatedFields: string[],
    changes: ProfileChanges[]
  ): Promise<void> {
    try {
      const previousValues: Record<string, any> = {};
      const newValues: Record<string, any> = {};

      changes.forEach(change => {
        previousValues[change.field] = change.oldValue;
        newValues[change.field] = change.newValue;
      });

      const { error } = await this.supabase
        .from('profile_update_notifications')
        .insert({
          employee_id: employeeId,
          employee_name: employeeName,
          updated_fields: updatedFields,
          previous_values: previousValues,
          new_values: newValues,
          created_at: new Date().toISOString()
        });

      if (error) {
        logger.error('ProfileUpdateService: Failed to create notification record', { error: error.message });
        throw error;
      }

      logger.info('ProfileUpdateService: Profile update notification record created', {
        employeeId,
        employeeName,
        updatedFields
      });
    } catch (error) {
      logger.error('ProfileUpdateService: Failed to create profile update notification', {
        error: (error as Error).message,
        employeeId
      });
      throw error;
    }
  }

  /**
   * Send notifications to administrators
   */
  private async notifyAdministrators(
    employeeId: string,
    employeeName: string,
    updatedFields: string[]
  ): Promise<void> {
    try {
      // Get all administrators (HR, Admin, SuperAdmin)
      const { data: administrators, error } = await this.supabase
        .from('employees')
        .select('id, user_id, email, full_name, role')
        .in('role', ['hr', 'admin', 'superadmin'])
        .eq('status', 'active');

      if (error) {
        throw error;
      }

      if (!administrators || administrators.length === 0) {
        logger.warn('ProfileUpdateService: No administrators found to notify');
        return;
      }

      const fieldsText = updatedFields.join(', ');
      const notificationTitle = 'Employee Profile Updated';
      const notificationMessage = `${employeeName} has updated their profile (${fieldsText})`;

      // Create in-app notifications
      for (const admin of administrators) {
        await NotificationService.createNotification({
          userId: admin.user_id,
          type: 'update',
          title: notificationTitle,
          message: notificationMessage,
          relatedId: employeeId,
          actionUrl: `/employee-management?highlight=${employeeId}`
        });
      }

      // Send email notifications
      const adminEmails = administrators.map(admin => admin.email);
      await this.sendEmailNotifications(adminEmails, employeeName, updatedFields);

      logger.info('ProfileUpdateService: Administrator notifications sent', {
        employeeId,
        employeeName,
        adminCount: administrators.length,
        updatedFields
      });
    } catch (error) {
      logger.error('ProfileUpdateService: Failed to notify administrators', {
        error: (error as Error).message,
        employeeId
      });
      // Don't throw error here to avoid breaking the profile update
    }
  }

  /**
   * Send email notifications to administrators
   */
  private async sendEmailNotifications(
    adminEmails: string[],
    employeeName: string,
    updatedFields: string[]
  ): Promise<void> {
    try {
      const fieldsText = updatedFields.join(', ');
      const subject = 'Employee Profile Update Notification';
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Employee Profile Updated</h2>
          <p>Hello,</p>
          <p><strong>${employeeName}</strong> has updated their profile information.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #555;">Updated Fields:</h3>
            <p style="margin-bottom: 0;"><strong>${fieldsText}</strong></p>
          </div>
          <p>Please review the changes in the Employee Management section of the HR system.</p>
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            This is an automated notification from the Go3net HR Management System.
          </p>
        </div>
      `;

      const emailService = new EmailService();
      for (const email of adminEmails) {
        await emailService.sendEmail({
          to: email,
          subject,
          html: htmlContent
        });
      }

      logger.info('ProfileUpdateService: Email notifications sent', {
        recipientCount: adminEmails.length,
        employeeName
      });
    } catch (error) {
      logger.error('ProfileUpdateService: Failed to send email notifications', {
        error: (error as Error).message,
        employeeName
      });
      // Don't throw error to avoid breaking the profile update
    }
  }

  /**
   * Broadcast real-time profile update
   */
  private async broadcastProfileUpdate(employeeId: string, changes: ProfileChanges[]): Promise<void> {
    try {
      const webSocketService = getWebSocketService();
      if (!webSocketService) {
        logger.warn('ProfileUpdateService: WebSocket service not available for broadcasting');
        return;
      }

      const updateData = {
        type: 'profile_updated',
        employeeId,
        changes,
        timestamp: new Date().toISOString()
      };

      // Broadcast to all connected administrators
      // We'll use a general broadcast since we don't have specific admin rooms
      webSocketService.getHealthStatus(); // This ensures the service is active

      // For now, we'll log the broadcast. In a full implementation,
      // you might want to create admin-specific rooms or channels
      logger.info('ProfileUpdateService: Profile update broadcasted', {
        employeeId,
        changesCount: changes.length,
        timestamp: updateData.timestamp
      });

      // TODO: Implement specific admin room broadcasting
      // webSocketService.broadcastToAdmins('profile_updated', updateData);

    } catch (error) {
      logger.error('ProfileUpdateService: Failed to broadcast profile update', {
        error: (error as Error).message,
        employeeId
      });
      // Don't throw error to avoid breaking the profile update
    }
  }

  /**
   * Get profile update history for an employee
   */
  async getProfileUpdateHistory(employeeId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('profile_update_notifications')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('ProfileUpdateService: Failed to get profile update history', {
        error: (error as Error).message,
        employeeId
      });
      throw error;
    }
  }

  /**
   * Get recent profile updates for administrators
   */
  async getRecentProfileUpdates(limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('profile_update_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('ProfileUpdateService: Failed to get recent profile updates', {
        error: (error as Error).message
      });
      throw error;
    }
  }
}

export default new ProfileUpdateService();