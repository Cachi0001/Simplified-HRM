import * as cron from 'node-cron';
import notificationService from './NotificationService';

export class CronService {
  private checkoutReminderJob: cron.ScheduledTask | null = null;
  private cleanupJob: cron.ScheduledTask | null = null;

  // Start all cron jobs
  start(): void {
    this.startCheckoutReminderJob();
    this.startCleanupJob();
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
}

export default new CronService();
