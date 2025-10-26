import { Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService';
import logger from '../utils/logger';

export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      const notifications = await this.notificationService.getNotifications(userId, userRole);

      res.status(200).json({
        status: 'success',
        data: {
          notifications,
          total: notifications.length
        }
      });
    } catch (error) {
      logger.error('NotificationController: Get notifications error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      await this.notificationService.markAsRead(notificationId, userId);

      res.status(200).json({
        status: 'success',
        message: 'Notification marked as read'
      });
    } catch (error) {
      logger.error('NotificationController: Mark as read error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      await this.notificationService.deleteNotification(id, userId);

      res.status(200).json({
        status: 'success',
        message: 'Notification deleted'
      });
    } catch (error) {
      logger.error('NotificationController: Delete notification error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }
}
