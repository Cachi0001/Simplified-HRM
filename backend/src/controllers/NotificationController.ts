import { Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService';
import logger from '../utils/logger';

export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  /**
   * Get all notifications for the user
   * GET /api/notifications?page=1&limit=20&unreadOnly=false
   */
  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const unreadOnly = req.query.unreadOnly === 'true';

      if (!userId) {
        res.status(400).json({
          status: 'error',
          message: 'userId is required'
        });
        return;
      }

      logger.info('📬 [NotificationController] Get notifications', {
        userId,
        page,
        limit,
        unreadOnly
      });

      const notifications = await this.notificationService.getNotifications(
        userId,
        limit,
        (page - 1) * limit
      );

      // Filter if unreadOnly requested
      const filtered = unreadOnly
        ? notifications.filter((n) => !n.is_read)
        : notifications;

      res.status(200).json({
        status: 'success',
        data: {
          notifications: filtered,
          count: filtered.length,
          page,
          limit
        }
      });
    } catch (error) {
      logger.error('❌ [NotificationController] Get notifications error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get unread notifications only
   * GET /api/notifications/unread
   */
  async getUnreadNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(400).json({
          status: 'error',
          message: 'userId is required'
        });
        return;
      }

      logger.info('🔔 [NotificationController] Get unread notifications', { userId });

      const notifications = await this.notificationService.getUnreadNotifications(userId);

      res.status(200).json({
        status: 'success',
        data: {
          notifications,
          count: notifications.length
        }
      });
    } catch (error) {
      logger.error('❌ [NotificationController] Get unread notifications error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get unread notification count
   * GET /api/notifications/unread-count
   */
  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(400).json({
          status: 'error',
          message: 'userId is required'
        });
        return;
      }

      logger.info('📊 [NotificationController] Get unread count', { userId });

      const unreadCount = await this.notificationService.getUnreadCount(userId);

      res.status(200).json({
        status: 'success',
        data: { unreadCount }
      });
    } catch (error) {
      logger.error('❌ [NotificationController] Get unread count error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Mark a single notification as read
   * PATCH /api/notifications/:notificationId/read
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.id;

      if (!notificationId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'notificationId and userId are required'
        });
        return;
      }

      logger.info('✅ [NotificationController] Mark notification as read', {
        notificationId,
        userId
      });

      await this.notificationService.markAsRead(notificationId, userId);

      res.status(200).json({
        status: 'success',
        message: 'Notification marked as read'
      });
    } catch (error) {
      logger.error('❌ [NotificationController] Mark as read error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Mark all notifications as read
   * PATCH /api/notifications/mark-all-read
   */
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(400).json({
          status: 'error',
          message: 'userId is required'
        });
        return;
      }

      logger.info('✅ [NotificationController] Mark all notifications as read', { userId });

      await this.notificationService.markAllAsRead(userId);

      res.status(200).json({
        status: 'success',
        message: 'All notifications marked as read'
      });
    } catch (error) {
      logger.error('❌ [NotificationController] Mark all as read error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Delete a notification
   * DELETE /api/notifications/:notificationId
   */
  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.id;

      if (!notificationId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'notificationId and userId are required'
        });
        return;
      }

      logger.info('🗑️ [NotificationController] Delete notification', {
        notificationId,
        userId
      });

      await this.notificationService.deleteNotification(notificationId, userId);

      res.status(204).json({
        status: 'success',
        message: 'Notification deleted'
      });
    } catch (error) {
      logger.error('❌ [NotificationController] Delete notification error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Save FCM push token for the user
   * POST /api/notifications/push-token
   */
  async savePushToken(req: Request, res: Response): Promise<void> {
    try {
      const { pushToken } = req.body;
      const userId = req.user?.id;

      if (!pushToken || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'pushToken and userId are required'
        });
        return;
      }

      logger.info('🔐 [NotificationController] Save push token', {
        userId,
        tokenLength: pushToken.length
      });

      await this.notificationService.savePushToken(userId, pushToken);

      res.status(200).json({
        status: 'success',
        message: 'Push token saved successfully'
      });
    } catch (error) {
      logger.error('❌ [NotificationController] Save push token error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get notifications with highlighting information for profile updates
   * GET /api/notifications/with-highlighting
   */
  async getNotificationsWithHighlighting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      if (!userId) {
        res.status(400).json({
          status: 'error',
          message: 'userId is required'
        });
        return;
      }

      logger.info('🎯 [NotificationController] Get notifications with highlighting', {
        userId,
        page,
        limit
      });

      const notifications = await this.notificationService.getNotificationsWithHighlighting(
        userId,
        limit,
        (page - 1) * limit
      );

      res.status(200).json({
        status: 'success',
        data: {
          notifications,
          count: notifications.length,
          page,
          limit,
          highlightedCount: notifications.filter(n => n.shouldHighlight).length
        }
      });
    } catch (error) {
      logger.error('❌ [NotificationController] Get notifications with highlighting error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Mark profile update notification as read and remove highlighting
   * PATCH /api/notifications/:notificationId/profile-read
   */
  async markProfileUpdateNotificationAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.id;

      if (!notificationId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'notificationId and userId are required'
        });
        return;
      }

      logger.info('✅ [NotificationController] Mark profile update notification as read', {
        notificationId,
        userId
      });

      await this.notificationService.markProfileUpdateNotificationAsRead(notificationId, userId);

      res.status(200).json({
        status: 'success',
        message: 'Profile update notification marked as read'
      });
    } catch (error) {
      logger.error('❌ [NotificationController] Mark profile update notification as read error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Create a new notification
   * POST /api/notifications
   */
  async createNotification(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, title, message, type, data } = req.body;
      const createdBy = req.user?.id;

      if (!user_id || !title || !message) {
        res.status(400).json({
          status: 'error',
          message: 'user_id, title, and message are required'
        });
        return;
      }

      logger.info('📬 [NotificationController] Create notification', {
        user_id,
        title,
        type,
        createdBy
      });

      const notification = await this.notificationService.createNotification({
        userId: user_id,
        title,
        message,
        type: type || 'approval',
        metadata: data ? (typeof data === 'string' ? JSON.parse(data) : data) : undefined
      });

      res.status(201).json({
        status: 'success',
        message: 'Notification created successfully',
        data: { notification }
      });
    } catch (error) {
      logger.error('❌ [NotificationController] Create notification error', {
        error: (error as Error).message
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to create notification'
      });
    }
  }

  /**
   * Get users with push tokens for a specific notification type
   * This is typically called internally when sending notifications
   * GET /api/notifications/push-tokens/:notificationType
   */
  async getUsersWithPushTokens(req: Request, res: Response): Promise<void> {
    try {
      const { notificationType } = req.params;

      if (!notificationType) {
        res.status(400).json({
          status: 'error',
          message: 'notificationType is required'
        });
        return;
      }

      logger.info('🔐 [NotificationController] Get users with push tokens', {
        notificationType
      });

      const users = await this.notificationService.getUsersWithPushTokens([]);

      res.status(200).json({
        status: 'success',
        data: {
          users,
          count: users.length
        }
      });
    } catch (error) {
      logger.error('❌ [NotificationController] Get users with push tokens error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }
}
