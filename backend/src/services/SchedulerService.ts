import * as cron from 'node-cron';
import supabaseConfig from '../config/supabase';
import logger from '../utils/logger';

export class SchedulerService {
  private static instance: SchedulerService;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  private constructor() {}

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Initialize all scheduled jobs
   */
  public initializeJobs(): void {
    this.scheduleCheckoutReminders();
    logger.info('📅 [SchedulerService] All scheduled jobs initialized');
  }

  /**
   * Schedule checkout reminders for 6:00 PM Monday-Saturday
   */
  private scheduleCheckoutReminders(): void {
    // Schedule for 6:00 PM Monday through Saturday (1-6)
    const checkoutReminderJob = cron.schedule('0 18 * * 1-6', async () => {
      try {
        logger.info('🔔 [SchedulerService] Sending scheduled checkout reminders');
        await this.sendAutomaticCheckoutReminders();
      } catch (error) {
        logger.error('❌ [SchedulerService] Failed to send checkout reminders', {
          error: (error as Error).message
        });
      }
    }, {
      timezone: 'Africa/Lagos' // Adjust timezone as needed
    });

    this.jobs.set('checkoutReminders', checkoutReminderJob);
    
    logger.info('📅 [SchedulerService] Checkout reminder job scheduled for 6:00 PM (Mon-Sat)');
  }

  /**
   * Send automatic checkout reminders to all checked-in employees
   */
  private async sendAutomaticCheckoutReminders(): Promise<void> {
    try {
      const supabase = supabaseConfig.getClient();

      // Get all employees who are currently checked in
      const today = new Date().toISOString().split('T')[0];
      const { data: activeAttendance, error } = await supabase
        .from('attendance')
        .select(`
          employee_id,
          employees!inner(
            id,
            full_name,
            email,
            user_id
          )
        `)
        .eq('date', today)
        .eq('status', 'checked_in');

      if (error) {
        throw error;
      }

      if (!activeAttendance || activeAttendance.length === 0) {
        logger.info('📅 [SchedulerService] No active employees to remind for checkout');
        return;
      }

      // Create notifications for all active employees
      const notifications = activeAttendance.map((record: any) => ({
        user_id: record.employees.id, // Use employee ID for notifications
        title: '🕕 Checkout Reminder',
        message: 'It\'s 6:00 PM! Don\'t forget to check out before leaving the office.',
        type: 'reminder',
        data: {
          type: 'checkout_reminder',
          time: '18:00',
          date: today
        },
        related_id: null
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        throw notificationError;
      }

      // Send email notifications
      try {
        const { EmailService } = await import('./EmailService');
        const emailService = new EmailService(supabase as any);
        
        for (const record of activeAttendance) {
          await emailService.sendCheckoutReminder(
            (record as any).employees.email,
            (record as any).employees.full_name
          );
        }
        
        logger.info('📧 [SchedulerService] Checkout reminder emails sent', {
          count: activeAttendance.length
        });
      } catch (emailError) {
        logger.error('❌ [SchedulerService] Failed to send checkout reminder emails', {
          error: emailError
        });
      }

      logger.info('🔔 [SchedulerService] Checkout reminders sent successfully', {
        remindersSent: activeAttendance.length,
        employees: activeAttendance.map((r: any) => r.employees.full_name)
      });

    } catch (error) {
      logger.error('❌ [SchedulerService] Failed to send automatic checkout reminders', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Stop a specific scheduled job
   */
  public stopJob(jobName: string): void {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      logger.info(`📅 [SchedulerService] Stopped job: ${jobName}`);
    }
  }

  /**
   * Start a specific scheduled job
   */
  public startJob(jobName: string): void {
    const job = this.jobs.get(jobName);
    if (job) {
      job.start();
      logger.info(`📅 [SchedulerService] Started job: ${jobName}`);
    }
  }

  /**
   * Stop all scheduled jobs
   */
  public stopAllJobs(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`📅 [SchedulerService] Stopped job: ${name}`);
    });
  }

  /**
   * Get status of all jobs
   */
  public getJobsStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.jobs.forEach((job, name) => {
      status[name] = (job as any).running || false;
    });
    return status;
  }

  /**
   * Manually trigger checkout reminders (for testing)
   */
  public async triggerCheckoutReminders(): Promise<void> {
    logger.info('🔔 [SchedulerService] Manually triggering checkout reminders');
    await this.sendAutomaticCheckoutReminders();
  }
}

export default SchedulerService;