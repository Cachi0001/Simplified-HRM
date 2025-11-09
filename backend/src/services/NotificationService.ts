import {pool} from '../config/database';
import { EmailService } from './EmailService';

export interface NotificationPayload {
  userId: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  category: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async createNotification(payload: NotificationPayload): Promise<string> {
    const { userId, type, priority, title, message, category, metadata = {} } = payload;

    const result = await pool.query(
      `SELECT create_notification($1, $2, $3, $4, $5, $6, $7) as notification_id`,
      [userId, type, priority, title, message, category, JSON.stringify(metadata)]
    );

    return result.rows[0].notification_id;
  }

  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
  ) {
    const result = await pool.query(
      `SELECT * FROM get_user_notifications($1, $2, $3, $4)`,
      [userId, limit, offset, unreadOnly]
    );

    return result.rows;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT get_unread_notification_count($1) as count`,
      [userId]
    );

    return parseInt(result.rows[0].count);
  }

  async markAsRead(notificationId: string): Promise<void> {
    await pool.query(`SELECT mark_notification_read($1)`, [notificationId]);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT mark_all_notifications_read($1) as count`,
      [userId]
    );

    return parseInt(result.rows[0].count);
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await pool.query(`DELETE FROM notifications WHERE id = $1`, [notificationId]);
  }

  // Send checkout reminders (called by cron job)
  async sendCheckoutReminders(): Promise<number> {
    const result = await pool.query(`SELECT send_checkout_reminders() as count`);
    const count = parseInt(result.rows[0].count);

    // Also send emails
    const employees = await pool.query(`SELECT * FROM get_employees_needing_checkout_reminder()`);
    
    for (const employee of employees.rows) {
      try {
        await this.emailService.sendCheckoutReminderEmail(
          employee.email,
          employee.full_name
        );
      } catch (error) {
        console.error(`Failed to send checkout reminder email to ${employee.email}:`, error);
      }
    }

    return count;
  }

  // Cleanup old notifications (called by cron job)
  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    const result = await pool.query(
      `SELECT cleanup_old_notifications($1) as count`,
      [daysOld]
    );

    return parseInt(result.rows[0].count);
  }

  // Send email notification based on type
  async sendEmailNotification(
    notificationId: string,
    userId: string,
    type: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      // Get user details
      const userResult = await pool.query(
        `SELECT u.email, e.full_name 
         FROM users u 
         LEFT JOIN employees e ON u.id = e.user_id 
         WHERE u.id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        console.error(`User not found: ${userId}`);
        return;
      }

      const { email, full_name } = userResult.rows[0];

      // Send appropriate email based on notification type
      switch (type) {
        case 'task':
          if (metadata.task_title) {
            await this.emailService.sendTaskAssignedEmail(
              email,
              full_name,
              metadata.task_title,
              metadata.due_date
            );
          }
          break;

        case 'approval_success':
          if (metadata.leave_request_id) {
            const leaveResult = await pool.query(
              `SELECT * FROM leave_requests WHERE id = $1`,
              [metadata.leave_request_id]
            );
            if (leaveResult.rows.length > 0) {
              const leave = leaveResult.rows[0];
              await this.emailService.sendLeaveApprovedEmail(
                email,
                full_name,
                leave.leave_type,
                leave.start_date,
                leave.end_date
              );
            }
          } else if (metadata.purchase_request_id) {
            const purchaseResult = await pool.query(
              `SELECT * FROM purchase_requests WHERE id = $1`,
              [metadata.purchase_request_id]
            );
            if (purchaseResult.rows.length > 0) {
              const purchase = purchaseResult.rows[0];
              await this.emailService.sendPurchaseApprovedEmail(
                email,
                full_name,
                purchase.item_name
              );
            }
          }
          break;

        case 'error':
          if (metadata.leave_request_id && metadata.reason) {
            const leaveResult = await pool.query(
              `SELECT * FROM leave_requests WHERE id = $1`,
              [metadata.leave_request_id]
            );
            if (leaveResult.rows.length > 0) {
              const leave = leaveResult.rows[0];
              await this.emailService.sendLeaveRejectedEmail(
                email,
                full_name,
                leave.leave_type,
                metadata.reason
              );
            }
          } else if (metadata.purchase_request_id && metadata.reason) {
            const purchaseResult = await pool.query(
              `SELECT * FROM purchase_requests WHERE id = $1`,
              [metadata.purchase_request_id]
            );
            if (purchaseResult.rows.length > 0) {
              const purchase = purchaseResult.rows[0];
              await this.emailService.sendPurchaseRejectedEmail(
                email,
                full_name,
                purchase.item_name,
                metadata.reason
              );
            }
          }
          break;

        case 'warning':
          if (metadata.action_url === '/attendance') {
            await this.emailService.sendCheckoutReminderEmail(email, full_name);
          }
          break;

        default:
          console.log(`No email handler for notification type: ${type}`);
      }
    } catch (error) {
      console.error(`Failed to send email notification:`, error);
    }
  }
}

export default new NotificationService();
