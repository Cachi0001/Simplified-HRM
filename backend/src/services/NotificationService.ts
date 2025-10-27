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

      const { data, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: request.userId,
          type: request.type,
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
        logger.error('NotificationService: Failed to create notification', { error: error.message });
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
}

export default new NotificationService();
