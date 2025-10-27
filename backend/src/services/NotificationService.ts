import { Go3netNotification } from '../models/Notification';
import logger from '../utils/logger';
import supabaseConfig from '../config/supabase';

export class NotificationService {
  async getNotifications(userId: string, userRole: string): Promise<Go3netNotification[]> {
    try {
      logger.info('NotificationService: Getting notifications', { userId, userRole });

      const notifications: Go3netNotification[] = [];

      if (userRole === 'admin') {
        const supabase = supabaseConfig.getClient();
        const recentThreshold = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

        const { data: adminEmployee, error: adminError } = await supabase
          .from('employees')
          .select('id, full_name')
          .eq('user_id', userId)
          .single();

        if (adminError || !adminEmployee?.id) {
          logger.warn('NotificationService: Admin employee record not found for notifications', {
            userId,
            error: adminError?.message
          });
          return notifications;
        }

        const { data: tasks, error: taskError } = await supabase
          .from('tasks')
          .select('id, title, status, updated_at, assigned_to')
          .eq('created_by', adminEmployee.id)
          .in('status', ['in_progress', 'completed'])
          .gte('updated_at', recentThreshold)
          .order('updated_at', { ascending: false });

        if (taskError) {
          logger.error('NotificationService: Failed to fetch task updates for notifications', { error: taskError.message });
        } else if (tasks && tasks.length > 0) {
          const assigneeIds = Array.from(new Set(tasks.map(task => task.assigned_to).filter(Boolean)));

          let assigneesMap: Record<string, string> = {};

          if (assigneeIds.length > 0) {
            const { data: assignees, error: assigneeError } = await supabase
              .from('employees')
              .select('id, full_name')
              .in('id', assigneeIds as string[]);

            if (assigneeError) {
              logger.error('NotificationService: Failed to fetch assignee names for task notifications', { error: assigneeError.message });
            } else if (assignees) {
              assigneesMap = assignees.reduce((map, employee) => {
                if (employee.id) {
                  map[employee.id] = employee.full_name || 'Unknown Employee';
                }
                return map;
              }, {} as Record<string, string>);
            }
          }

          tasks.forEach(task => {
            const employeeName = task.assigned_to ? assigneesMap[task.assigned_to] || 'Unknown Employee' : 'Unknown Employee';
            const title = task.title || 'Untitled Task';
            const updatedAt = task.updated_at ? new Date(task.updated_at) : new Date();
            const statusMessage = task.status === 'completed'
              ? `${employeeName} completed the task "${title}"`
              : `${employeeName} started working on "${title}"`;

            notifications.push({
              id: `task-${task.id}-${task.status}-${task.updated_at ?? updatedAt.toISOString()}`,
              type: 'task',
              priority: task.status === 'completed' ? 'high' : 'normal',
              title: task.status === 'completed' ? 'Task Completed' : 'Task Started',
              message: statusMessage,
              timestamp: updatedAt,
              read: false,
              userId,
              targetUserId: userId,
              source: 'employee',
              category: 'task'
            });
          });
        }
      } else {
        logger.info('NotificationService: Employee user - checking for task assignments');
      }

      return notifications;
    } catch (error) {
      logger.error('NotificationService: Get notifications failed', { error: (error as Error).message });
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      logger.info('NotificationService: Marking notification as read', { notificationId, userId });
    } catch (error) {
      logger.error('NotificationService: Mark as read failed', { error: (error as Error).message });
      throw error;
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      logger.info('NotificationService: Deleting notification', { notificationId, userId });
    } catch (error) {
      logger.error('NotificationService: Delete notification failed', { error: (error as Error).message });
      throw error;
    }
  }
}
