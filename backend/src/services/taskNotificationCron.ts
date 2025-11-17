import * as cron from 'node-cron';
import { pool } from '../config/database';

/**
 * Task Due Notification Cron Job
 * Runs every 15 minutes to check for tasks due within the next hour
 * and sends notifications to assignees and creators
 */

let cronJob: cron.ScheduledTask | null = null;

export const startTaskNotificationCron = () => {
  // Run every 15 minutes
  cronJob = cron.schedule('*/15 * * * *', async () => {
    console.log('[TaskNotificationCron] Running task due notification check...');
    
    try {
      await pool.query('SELECT send_task_due_notifications()');
      console.log('[TaskNotificationCron] Task due notifications sent successfully');
    } catch (error) {
      console.error('[TaskNotificationCron] Error sending task due notifications:', error);
    }
  });

  console.log('[TaskNotificationCron] Cron job started - running every 15 minutes');
};

export const stopTaskNotificationCron = () => {
  if (cronJob) {
    cronJob.stop();
    console.log('[TaskNotificationCron] Cron job stopped');
  }
};

// Manual trigger for testing
export const triggerTaskNotifications = async () => {
  console.log('[TaskNotificationCron] Manually triggering task due notifications...');
  
  try {
    await pool.query('SELECT send_task_due_notifications()');
    console.log('[TaskNotificationCron] Task due notifications sent successfully');
    return { success: true, message: 'Notifications sent successfully' };
  } catch (error: any) {
    console.error('[TaskNotificationCron] Error sending task due notifications:', error);
    return { success: false, message: error.message };
  }
};
