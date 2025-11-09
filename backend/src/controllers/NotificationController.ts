import { Request, Response } from 'express';
import notificationService from '../services/NotificationService';

interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    role: string;
  };
}

export class NotificationController {
  async getNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unreadOnly === 'true';

      const notifications = await notificationService.getUserNotifications(
        userId,
        limit,
        offset,
        unreadOnly
      );

      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const count = await notificationService.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;

      await notificationService.markAsRead(notificationId);
      res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const count = await notificationService.markAllAsRead(userId);
      res.json({ success: true, count, message: `${count} notifications marked as read` });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  }

  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;

      await notificationService.deleteNotification(notificationId);
      res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }

  async createNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, type, priority, title, message, category, metadata } = req.body;

      if (!userId || !type || !title || !message) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const notificationId = await notificationService.createNotification({
        userId,
        type,
        priority: priority || 'normal',
        title,
        message,
        category: category || 'system',
        metadata: metadata || {}
      });

      // Send email notification if applicable
      if (metadata?.sendEmail !== false) {
        await notificationService.sendEmailNotification(
          notificationId,
          userId,
          type,
          metadata || {}
        );
      }

      res.json({ success: true, notificationId });
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ error: 'Failed to create notification' });
    }
  }

  // Admin endpoint to trigger checkout reminders manually
  async triggerCheckoutReminders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;
      if (!['superadmin', 'admin', 'hr'].includes(userRole || '')) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const count = await notificationService.sendCheckoutReminders();
      res.json({ 
        success: true, 
        count, 
        message: `Sent checkout reminders to ${count} employees` 
      });
    } catch (error) {
      console.error('Error sending checkout reminders:', error);
      res.status(500).json({ error: 'Failed to send checkout reminders' });
    }
  }
}

export default new NotificationController();
