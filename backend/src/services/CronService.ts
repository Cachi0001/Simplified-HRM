import * as cron from 'node-cron';
import notificationService from './NotificationService';
import { pool } from '../config/database';

export class CronService {
  private checkoutReminderJob: cron.ScheduledTask | null = null;
  private cleanupJob: cron.ScheduledTask | null = null;
  private birthdayJob: cron.ScheduledTask | null = null;
  private taskDueNotificationJob: cron.ScheduledTask | null = null;

  start(): void {
    this.startCheckoutReminderJob();
    this.startCleanupJob();
    this.startBirthdayJob();
    this.startTaskDueNotificationJob();
    console.log('✅ Cron jobs started');
  }

  // Stop all cron jobs
  stop(): void {
    if (this.checkoutReminderJob) {
      this.checkoutReminderJob.stop();
      console.log('⏹️  Checkout reminder job stopped');
    }
    if (this.cleanupJob) {
      this.cleanupJob.stop();
      console.log('⏹️  Cleanup job stopped');
    }
    if (this.birthdayJob) {
      this.birthdayJob.stop();
      console.log('⏹️  Birthday job stopped');
    }
    if (this.taskDueNotificationJob) {
      this.taskDueNotificationJob.stop();
      console.log('⏹️  Task due notification job stopped');
    }
  }

  // Checkout reminder job - runs Monday to Friday at 6:00 PM
  private startCheckoutReminderJob(): void {
    // Cron format: minute hour day month day-of-week
    // 0 18 * * 1-5 = At 6:00 PM, Monday through Friday
    this.checkoutReminderJob = cron.schedule('0 18 * * 1-5', async () => {
      try {
        console.log('🔔 Running checkout reminder job...');
        const count = await notificationService.sendCheckoutReminders();
        console.log(`✅ Sent checkout reminders to ${count} employees`);
      } catch (error) {
        console.error('❌ Error in checkout reminder job:', error);
      }
    }, {
      timezone: 'Africa/Lagos' // Adjust to your timezone
    });

    console.log('✅ Checkout reminder job scheduled (Mon-Fri at 6:00 PM)');
  }

  // Cleanup old notifications job - runs daily at 2:00 AM
  private startCleanupJob(): void {
    // 0 2 * * * = At 2:00 AM every day
    this.cleanupJob = cron.schedule('0 2 * * *', async () => {
      try {
        console.log('🧹 Running notification cleanup job...');
        const count = await notificationService.cleanupOldNotifications(90);
        console.log(`✅ Cleaned up ${count} old notifications`);
      } catch (error) {
        console.error('❌ Error in cleanup job:', error);
      }
    }, {
      timezone: 'Africa/Lagos' // Adjust to your timezone
    });

    console.log('✅ Notification cleanup job scheduled (Daily at 2:00 AM)');
  }

  // Birthday notification job - runs daily at 9:00 AM
  private startBirthdayJob(): void {
    // 0 9 * * * = At 9:00 AM every day
    this.birthdayJob = cron.schedule('0 9 * * *', async () => {
      try {
        console.log('🎂 Running birthday notification job...');
        const count = await notificationService.sendBirthdayNotifications();
        if (count > 0) {
          console.log(`✅ Sent birthday notifications for ${count} celebrant(s)`);
        } else {
          console.log('ℹ️  No birthdays today');
        }
      } catch (error) {
        console.error('❌ Error in birthday notification job:', error);
      }
    }, {
      timezone: 'Africa/Lagos' // Adjust to your timezone
    });

    console.log('✅ Birthday notification job scheduled (Daily at 9:00 AM)');
  }

  // Task due notification job - runs every 15 minutes
  private startTaskDueNotificationJob(): void {
    // */15 * * * * = Every 15 minutes
    this.taskDueNotificationJob = cron.schedule('*/15 * * * *', async () => {
      try {
        console.log('📋 Running task due notification job...');
        await pool.query('SELECT send_task_due_notifications()');
        console.log('✅ Task due notifications processed');
      } catch (error) {
        console.error('❌ Error in task due notification job:', error);
      }
    }, {
      timezone: 'Africa/Lagos' // Adjust to your timezone
    });

    console.log('✅ Task due notification job scheduled (Every 15 minutes)');
  }

  // Manual trigger for testing
  async triggerCheckoutReminder(): Promise<number> {
    console.log('🔔 Manually triggering checkout reminder...');
    const count = await notificationService.sendCheckoutReminders();
    console.log(`✅ Sent checkout reminders to ${count} employees`);
    return count;
  }

  async triggerCleanup(): Promise<number> {
    console.log('🧹 Manually triggering cleanup...');
    const count = await notificationService.cleanupOldNotifications(90);
    console.log(`✅ Cleaned up ${count} old notifications`);
    return count;
  }

  async triggerBirthdayNotifications(): Promise<number> {
    console.log('🎂 Manually triggering birthday notifications...');
    const count = await notificationService.sendBirthdayNotifications();
    console.log(`✅ Sent birthday notifications for ${count} celebrant(s)`);
    return count;
  }

  async triggerTaskDueNotifications(): Promise<void> {
    console.log('📋 Manually triggering task due notifications...');
    await pool.query('SELECT send_task_due_notifications()');
    console.log('✅ Task due notifications processed');
  }
}

export default new CronService();
