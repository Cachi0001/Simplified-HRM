import { Go3netNotification, DatabaseNotification, CreateNotificationRequest } from '../models/Notification';
import logger from '../utils/logger';
import supabaseConfig from '../config/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * NotificationService handles both in-app and push notifications
 * - Database notifications: Stored in notifications table
 * - Push notifications: Sent via Firebase Cloud Messaging
 */
export class NotificationService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = supabaseConfig.getClient();
  }

  /**
   * Create a new notification (stored in database)
   */
  async createNotification(request: CreateNotificationRequest): Promise<DatabaseNotification> {
    try {
      logger.info('NotificationService: Creating notification', {
        userId: request.userId,
        type: request.type
      });

      // Validate and sanitize notification type
      const validTypes = ['info', 'success', 'warning', 'error', 'leave_request', 'purchase_request', 'announcement', 'employee_update', 'system_alert'];
      let notificationType = request.type;
      
      if (!validTypes.includes(notificationType)) {
        logger.warn('NotificationService: Invalid notification type, using fallback', {
          originalType: request.type,
          fallbackType: 'info'
        });
        notificationType = 'info';
      }

      const { data, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: request.userId,
          type: notificationType,
          title: request.title,
          message: request.message,
          related_id: request.relatedId || null,
          action_url: request.actionUrl || null,
          is_read: false,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('NotificationService: Failed to create notification', { 
          error: error.message,
          originalType: request.type,
          sanitizedType: notificationType
        });
        throw error;
      }

      logger.info('NotificationService: Notification created successfully', { notificationId: data.id });
      return data;
    } catch (error) {
      logger.error('NotificationService: Create notification failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string, limit: number = 50): Promise<DatabaseNotification[]> {
    try {
      logger.info('NotificationService: Getting unread notifications', { userId, limit });

      const { data, error } = await this.supabase
        .from('notifications')
        .select()
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('NotificationService: Failed to get unread notifications', { error: error.message });
        throw error;
      }

      logger.info('NotificationService: Unread notifications retrieved', { count: data?.length || 0 });
      return data || [];
    } catch (error) {
      logger.error('NotificationService: Get unread notifications failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get all notifications for a user (including read ones)
   */
  async getNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<DatabaseNotification[]> {
    try {
      logger.info('NotificationService: Getting notifications', { userId, limit, offset });

      const { data, error } = await this.supabase
        .from('notifications')
        .select()
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('NotificationService: Failed to get notifications', { error: error.message });
        throw error;
      }

      logger.info('NotificationService: Notifications retrieved', { count: data?.length || 0 });
      return data || [];
    } catch (error) {
      logger.error('NotificationService: Get notifications failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      logger.info('NotificationService: Marking notification as read', { notificationId, userId });

      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        logger.error('NotificationService: Failed to mark notification as read', { error: error.message });
        throw error;
      }

      logger.info('NotificationService: Notification marked as read');
    } catch (error) {
      logger.error('NotificationService: Mark as read failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      logger.info('NotificationService: Marking all notifications as read', { userId });

      const { data, error } = await this.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select();

      if (error) {
        logger.error('NotificationService: Failed to mark all as read', { error: error.message });
        throw error;
      }

      const count = data?.length || 0;
      logger.info('NotificationService: All notifications marked as read', { count });
      return count;
    } catch (error) {
      logger.error('NotificationService: Mark all as read failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    try {
      logger.info('NotificationService: Updating user preferences', { userId });

      // Store user notification preferences
      const { error } = await this.supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          preferences,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      logger.info('NotificationService: User preferences updated', { userId });
    } catch (error) {
      logger.error('NotificationService: Failed to update user preferences', {
        error: (error as Error).message,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      logger.info('NotificationService: Deleting notification', { notificationId, userId });

      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        logger.error('NotificationService: Failed to delete notification', { error: error.message });
        throw error;
      }

      logger.info('NotificationService: Notification deleted');
    } catch (error) {
      logger.error('NotificationService: Delete notification failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { data, error, count } = await this.supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        logger.error('NotificationService: Failed to get unread count', { error: error.message });
        throw error;
      }

      return count || 0;
    } catch (error) {
      logger.error('NotificationService: Get unread count failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Save push token for a user
   */
  async savePushToken(userId: string, token: string): Promise<void> {
    try {
      logger.info('NotificationService: Saving push token', { userId });

      const { error } = await this.supabase
        .from('users')
        .update({ push_token: token })
        .eq('id', userId);

      if (error) {
        logger.error('NotificationService: Failed to save push token', { error: error.message });
        throw error;
      }

      logger.info('NotificationService: Push token saved');
    } catch (error) {
      logger.error('NotificationService: Save push token failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get users who should receive push notifications
   */
  async getUsersWithPushTokens(userIds: string[]): Promise<Array<{ id: string; push_token: string }>> {
    try {
      logger.info('NotificationService: Getting users with push tokens', { count: userIds.length });

      const { data, error } = await this.supabase
        .from('users')
        .select('id, push_token')
        .in('id', userIds)
        .not('push_token', 'is', null);

      if (error) {
        logger.error('NotificationService: Failed to get users with push tokens', { error: error.message });
        throw error;
      }

      const usersWithTokens = data?.filter(u => u.push_token) || [];
      logger.info('NotificationService: Retrieved users with push tokens', { count: usersWithTokens.length });
      return usersWithTokens;
    } catch (error) {
      logger.error('NotificationService: Get users with push tokens failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Create and broadcast a chat notification
   */
  async notifyChatMessage(
    chatId: string,
    senderId: string,
    senderName: string,
    message: string,
    recipientIds: string[]
  ): Promise<void> {
    try {
      logger.info('NotificationService: Creating chat notifications', {
        chatId,
        recipientCount: recipientIds.length
      });

      // Create database notifications for each recipient
      for (const recipientId of recipientIds) {
        await this.createNotification({
          userId: recipientId,
          type: 'chat',
          title: senderName,
          message: message.substring(0, 100), // Truncate to 100 chars
          relatedId: chatId,
          actionUrl: `/chat/${chatId}`
        });
      }

      // TODO: Send push notifications via Firebase
      // const usersWithTokens = await this.getUsersWithPushTokens(recipientIds);
      // await this.sendPushNotifications(usersWithTokens, { ... });

      logger.info('NotificationService: Chat notifications created');
    } catch (error) {
      logger.error('NotificationService: Notify chat message failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Create task notifications
   */
  async notifyTaskUpdate(
    taskId: string,
    taskTitle: string,
    assigneeIds: string[],
    message: string
  ): Promise<void> {
    try {
      logger.info('NotificationService: Creating task notifications', { taskId, taskTitle });

      for (const assigneeId of assigneeIds) {
        await this.createNotification({
          userId: assigneeId,
          type: 'task',
          title: 'Task Update',
          message,
          relatedId: taskId,
          actionUrl: `/tasks/${taskId}`
        });
      }

      logger.info('NotificationService: Task notifications created');
    } catch (error) {
      logger.error('NotificationService: Notify task update failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Create leave request notifications for approvers
   */
  async notifyLeaveRequest(
    leaveId: string,
    employeeName: string,
    approverIds: string[]
  ): Promise<void> {
    try {
      logger.info('NotificationService: Creating leave request notifications', { leaveId });

      for (const approverId of approverIds) {
        await this.createNotification({
          userId: approverId,
          type: 'leave',
          title: 'Leave Request',
          message: `${employeeName} has requested leave`,
          relatedId: leaveId,
          actionUrl: `/leave/${leaveId}`
        });
      }

      logger.info('NotificationService: Leave request notifications created');
    } catch (error) {
      logger.error('NotificationService: Notify leave request failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Create purchase request notifications
   */
  async notifyPurchaseRequest(
    purchaseId: string,
    requesterName: string,
    approverIds: string[]
  ): Promise<void> {
    try {
      logger.info('NotificationService: Creating purchase request notifications', { purchaseId });

      for (const approverId of approverIds) {
        await this.createNotification({
          userId: approverId,
          type: 'purchase',
          title: 'Purchase Request',
          message: `${requesterName} has requested purchase approval`,
          relatedId: purchaseId,
          actionUrl: `/purchases/${purchaseId}`
        });
      }

      logger.info('NotificationService: Purchase request notifications created');
    } catch (error) {
      logger.error('NotificationService: Notify purchase request failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Create birthday notifications
   */
  async notifyBirthday(employeeId: string, employeeName: string, userIds: string[]): Promise<void> {
    try {
      logger.info('NotificationService: Creating birthday notifications', { employeeName });

      for (const userId of userIds) {
        await this.createNotification({
          userId,
          type: 'birthday',
          title: 'Birthday',
          message: `Today is ${employeeName}'s birthday! 🎉`,
          relatedId: employeeId,
          actionUrl: `/employees/${employeeId}`
        });
      }

      logger.info('NotificationService: Birthday notifications created');
    } catch (error) {
      logger.error('NotificationService: Notify birthday failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Create profile update notifications for administrators
   */
  async notifyProfileUpdate(
    employeeId: string,
    employeeName: string,
    updatedFields: string[],
    adminUserIds: string[]
  ): Promise<void> {
    try {
      logger.info('NotificationService: Creating profile update notifications', {
        employeeId,
        employeeName,
        adminCount: adminUserIds.length
      });

      const fieldsText = updatedFields.join(', ');
      const title = 'Employee Profile Updated';
      const message = `${employeeName} has updated their profile (${fieldsText})`;

      for (const adminUserId of adminUserIds) {
        await this.createNotification({
          userId: adminUserId,
          type: 'update',
          title,
          message,
          relatedId: employeeId,
          actionUrl: `/employee-management?highlight=${employeeId}`
        });
      }

      logger.info('NotificationService: Profile update notifications created', {
        employeeId,
        employeeName,
        adminCount: adminUserIds.length
      });
    } catch (error) {
      logger.error('NotificationService: Failed to create profile update notifications', {
        error: (error as Error).message,
        employeeId
      });
      throw error;
    }
  }

  /**
   * Create employee deactivation notifications
   */
  async notifyEmployeeDeactivation(
    employeeId: string,
    employeeName: string,
    deactivatedBy: string,
    adminUserIds: string[]
  ): Promise<void> {
    try {
      logger.info('NotificationService: Creating employee deactivation notifications', {
        employeeId,
        employeeName,
        deactivatedBy
      });

      const title = 'Employee Deactivated';
      const message = `${employeeName} has been deactivated by an administrator`;

      for (const adminUserId of adminUserIds) {
        await this.createNotification({
          userId: adminUserId,
          type: 'update',
          title,
          message,
          relatedId: employeeId,
          actionUrl: `/employee-management?highlight=${employeeId}`
        });
      }

      logger.info('NotificationService: Employee deactivation notifications created', {
        employeeId,
        employeeName,
        adminCount: adminUserIds.length
      });
    } catch (error) {
      logger.error('NotificationService: Failed to create employee deactivation notifications', {
        error: (error as Error).message,
        employeeId
      });
      throw error;
    }
  }

  /**
   * Get notifications with highlighting information
   */
  async getNotificationsWithHighlighting(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Array<DatabaseNotification & { shouldHighlight?: boolean }>> {
    try {
      logger.info('NotificationService: Getting notifications with highlighting', { userId, limit, offset });

      const { data, error } = await this.supabase
        .from('notifications')
        .select()
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('NotificationService: Failed to get notifications', { error: error.message });
        throw error;
      }

      // Add highlighting information for recent profile update notifications
      const notificationsWithHighlighting = (data || []).map(notification => {
        const shouldHighlight = 
          notification.type === 'update' && 
          notification.action_url?.includes('employee-management') &&
          !notification.is_read &&
          new Date(notification.created_at) > new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes

        return {
          ...notification,
          shouldHighlight
        };
      });

      logger.info('NotificationService: Notifications with highlighting retrieved', { 
        count: notificationsWithHighlighting.length,
        highlightedCount: notificationsWithHighlighting.filter(n => n.shouldHighlight).length
      });

      return notificationsWithHighlighting;
    } catch (error) {
      logger.error('NotificationService: Get notifications with highlighting failed', { 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Mark profile update notification as read and remove highlighting
   */
  async markProfileUpdateNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      logger.info('NotificationService: Marking profile update notification as read', { 
        notificationId, 
        userId 
      });

      await this.markAsRead(notificationId, userId);

      // Additional logic for removing highlighting could be added here
      logger.info('NotificationService: Profile update notification marked as read');
    } catch (error) {
      logger.error('NotificationService: Failed to mark profile update notification as read', {
        error: (error as Error).message,
        notificationId
      });
      throw error;
    }
  }

  /**
   * Delete expired notifications (older than 30 days)
   */
  async deleteExpiredNotifications(): Promise<number> {
    try {
      logger.info('NotificationService: Deleting expired notifications');

      const { data, error } = await this.supabase
        .from('notifications')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) {
        logger.error('NotificationService: Failed to delete expired notifications', { error: error.message });
        throw error;
      }

      const count = data?.length || 0;
      logger.info('NotificationService: Expired notifications deleted', { count });
      return count;
    } catch (error) {
      logger.error('NotificationService: Delete expired notifications failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Send batch notifications to multiple users
   */
  async sendBatchNotifications(notifications: CreateNotificationRequest[]): Promise<DatabaseNotification[]> {
    try {
      logger.info('NotificationService: Sending batch notifications', { count: notifications.length });

      const results: DatabaseNotification[] = [];
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Process notifications in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        
        const batchData = batch.map(notification => ({
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          related_id: notification.relatedId || null,
          action_url: notification.actionUrl || null,
          data: notification.data || null,
          batch_id: batchId,
          priority: notification.priority || 'medium',
          is_read: false,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }));

        const { data, error } = await this.supabase
          .from('notifications')
          .insert(batchData)
          .select();

        if (error) {
          logger.error('NotificationService: Batch notification insert failed', { 
            error: error.message,
            batchIndex: i / batchSize
          });
          throw error;
        }

        results.push(...(data || []));
      }

      logger.info('NotificationService: Batch notifications sent successfully', { 
        count: results.length,
        batchId
      });

      return results;
    } catch (error) {
      logger.error('NotificationService: Send batch notifications failed', { 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Check for notification conflicts and prevent duplicates
   */
  async checkNotificationConflicts(
    userId: string,
    type: string,
    relatedId?: string,
    timeWindowMinutes: number = 5
  ): Promise<boolean> {
    try {
      const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();

      let query = this.supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', type)
        .gte('created_at', timeWindow);

      if (relatedId) {
        query = query.eq('related_id', relatedId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('NotificationService: Check conflicts failed', { error: error.message });
        return false; // Allow notification if check fails
      }

      const hasConflict = (data?.length || 0) > 0;
      
      if (hasConflict) {
        logger.info('NotificationService: Notification conflict detected', {
          userId,
          type,
          relatedId,
          existingCount: data?.length
        });
      }

      return hasConflict;
    } catch (error) {
      logger.error('NotificationService: Check notification conflicts failed', { 
        error: (error as Error).message 
      });
      return false; // Allow notification if check fails
    }
  }

  /**
   * Create notification with conflict prevention
   */
  async createNotificationSafe(
    request: CreateNotificationRequest,
    preventDuplicates: boolean = true,
    timeWindowMinutes: number = 5
  ): Promise<DatabaseNotification | null> {
    try {
      if (preventDuplicates) {
        const hasConflict = await this.checkNotificationConflicts(
          request.userId,
          request.type,
          request.relatedId,
          timeWindowMinutes
        );

        if (hasConflict) {
          logger.info('NotificationService: Skipping duplicate notification', {
            userId: request.userId,
            type: request.type,
            relatedId: request.relatedId
          });
          return null;
        }
      }

      return await this.createNotification(request);
    } catch (error) {
      logger.error('NotificationService: Create safe notification failed', { 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Get notification delivery statistics
   */
  async getNotificationStats(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<any> {
    try {
      let query = this.supabase
        .from('notifications')
        .select('type, priority, is_read, created_at');

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('NotificationService: Get stats failed', { error: error.message });
        throw error;
      }

      // Calculate statistics
      const stats = {
        total: data?.length || 0,
        read: data?.filter(n => n.is_read).length || 0,
        unread: data?.filter(n => !n.is_read).length || 0,
        byType: {} as Record<string, number>,
        byPriority: {} as Record<string, number>
      };

      data?.forEach(notification => {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
        stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('NotificationService: Get notification stats failed', { 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Update notification preferences for a user
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Record<string, { system: boolean; email: boolean; push: boolean }>
  ): Promise<void> {
    try {
      logger.info('NotificationService: Updating notification preferences', { userId });

      const updates = Object.entries(preferences).map(([type, prefs]) => ({
        user_id: userId,
        notification_type: type,
        system_enabled: prefs.system,
        email_enabled: prefs.email,
        push_enabled: prefs.push,
        updated_at: new Date().toISOString()
      }));

      const { error } = await this.supabase
        .from('notification_preferences')
        .upsert(updates, { onConflict: 'user_id,notification_type' });

      if (error) {
        logger.error('NotificationService: Update preferences failed', { error: error.message });
        throw error;
      }

      logger.info('NotificationService: Notification preferences updated', { 
        userId,
        preferencesCount: updates.length
      });
    } catch (error) {
      logger.error('NotificationService: Update notification preferences failed', { 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getNotificationPreferences(userId: string): Promise<Record<string, any>> {
    try {
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        logger.error('NotificationService: Get preferences failed', { error: error.message });
        throw error;
      }

      const preferences: Record<string, any> = {};
      data?.forEach(pref => {
        preferences[pref.notification_type] = {
          system: pref.system_enabled,
          email: pref.email_enabled,
          push: pref.push_enabled
        };
      });

      return preferences;
    } catch (error) {
      logger.error('NotificationService: Get notification preferences failed', { 
        error: (error as Error).message 
      });
      throw error;
    }
  }
}

export default new NotificationService();
