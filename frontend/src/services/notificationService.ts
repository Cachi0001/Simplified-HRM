import { Go3netNotification, NotificationType, PushNotificationPayload } from '../types/notification';
import api from '../lib/api';

class NotificationService {
  private static instance: NotificationService;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey: string;

  constructor() {
    this.vapidPublicKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || '';
  }

  private getReadStorageKey(userId: string) {
    return `read-notifications:${userId}`;
  }

  private getReadNotificationIds(userId: string): string[] {
    try {
      const stored = localStorage.getItem(this.getReadStorageKey(userId));
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter((id): id is string => typeof id === 'string');
      }
      return [];
    } catch {
      return [];
    }
  }

  private saveReadNotificationIds(userId: string, ids: string[]) {
    try {
      localStorage.setItem(this.getReadStorageKey(userId), JSON.stringify(Array.from(new Set(ids))));
    } catch {
      /* noop */
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initializePushNotifications(): Promise<boolean> {
    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  async sendPushNotification(
    userId: string,
    notification: Go3netNotification,
    payload?: Partial<PushNotificationPayload>
  ): Promise<void> {
    try {
      // For now, just show local notification
      await this.showLocalNotification(notification);
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  async showLocalNotification(notification: Go3netNotification): Promise<void> {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    // Only show notification if current user is the target or if it's a system notification for admins
    const currentUser = localStorage.getItem('user');
    if (currentUser) {
      const user = JSON.parse(currentUser);

      // For employee-specific notifications, only show if current user is the target
      if (notification.category === 'employee' && notification.targetUserId) {
        if (user.id !== notification.targetUserId && user.role !== 'admin') {
          return; // Don't show notification to non-target users
        }
      }

      // For admin notifications (like pending approvals), only show to admins
      if (notification.category === 'approval' && user.role !== 'admin') {
        // Check if this is an approval success notification for the current user
        if (notification.type === 'approval_success' && notification.targetUserId === user.id) {
          // Allow employee to see their own approval notification
        } else {
          return; // Don't show admin notifications to non-admins (except their own approval)
        }
      }
    }

    const options: NotificationOptions = {
      body: notification.message,
      icon: (import.meta as any).env?.VITE_PUSH_NOTIFICATION_ICON || '/logo.png',
      badge: (import.meta as any).env?.VITE_PUSH_NOTIFICATION_BADGE || '/badge.png',
      tag: `go3net-${notification.id}`,
      data: {
        notificationId: notification.id,
        url: this.getNotificationUrl(notification)
      },
      requireInteraction: notification.priority === 'high' || notification.priority === 'urgent',
      silent: notification.priority === 'low'
    };

    const n = new Notification(notification.title, options);

    n.onclick = () => {
      window.focus();
      this.handleNotificationClick(notification);
      n.close();
    };

    // Auto-close after 5 seconds for low priority notifications
    if (notification.priority === 'low') {
      setTimeout(() => n.close(), 5000);
    }
  }

  private getNotificationUrl(notification: Go3netNotification): string {
    switch (notification.category) {
      case 'dashboard':
        return '/dashboard';
      case 'employee':
        // For employee notifications, navigate to login if it's an approval success
        if (notification.type === 'approval_success' || notification.message.includes('approved') || notification.message.includes('Welcome')) {
          return '/auth';
        }
        return 'employee-dashboard';
      case 'approval':
        return '/dashboard#pending-approvals';
      case 'system':
        return '/dashboard';
      case 'task':
        return '/tasks';
      default:
        return '/dashboard';
    }
  }

  private handleNotificationClick(notification: Go3netNotification): void {
    const url = this.getNotificationUrl(notification);

    // Navigate to the appropriate page
    if (typeof window !== 'undefined') {
      if (url.startsWith('http')) {
        window.location.href = url;
      } else {
        // Use React Router navigation if available
        const navigationEvent = new CustomEvent('navigate', {
          detail: { url, notificationId: notification.id }
        });
        window.dispatchEvent(navigationEvent);
      }
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const currentUserRaw = localStorage.getItem('user');
    if (!currentUserRaw) {
      return;
    }

    try {
      const currentUser = JSON.parse(currentUserRaw);
      const userId = currentUser?.id || currentUser?._id;
      if (!userId) {
        return;
      }

      const existing = this.getReadNotificationIds(userId);
      if (!existing.includes(notificationId)) {
        existing.push(notificationId);
        this.saveReadNotificationIds(userId, existing);
      }
    } catch {
      /* noop */
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    return this.markNotificationAsRead(notificationId);
  }

  async getNotifications(userId?: string): Promise<Go3netNotification[]> {
    try {
      const allNotifications: Go3netNotification[] = [];

      // Get current user from localStorage
      const currentUser = localStorage.getItem('user');
      if (!currentUser) {
        return [];
      }

      const user = JSON.parse(currentUser);
      const effectiveUserId = userId || user?.id || user?._id;
      const readIds = effectiveUserId ? this.getReadNotificationIds(effectiveUserId) : [];

      if (user.role === 'admin') {
        // ADMIN: Fetch pending approvals
        try {
          const response = await api.get('/employees/pending');
          const data = response.data;
          const pendingEmployees = data.employees || [];

          // Create notifications for each pending approval
          pendingEmployees.forEach((emp: any, index: number) => {
            const id = `pending-${emp.id || emp._id}-${Date.now()}-${index}`;
            allNotifications.push({
              id,
              type: 'info' as NotificationType,
              priority: 'normal',
              title: 'New Employee Signup',
              message: `${emp.fullName} (${emp.email}) requires approval`,
              timestamp: new Date(emp.createdAt || Date.now()),
              read: readIds.includes(id),
              targetUserId: emp.id || emp._id,
              actions: [{ label: 'Review', action: 'review', url: '/dashboard#pending-approvals' }],
              source: 'system',
              category: 'approval' as any
            });
          });
        } catch (error) {
          console.warn('Failed to fetch pending approvals for notifications:', error);
        }
      } else if (user.role === 'employee') {
        // EMPLOYEE: Check if employee is approved and show welcome notification
        try {
          // Check employee status via notifications endpoint or keep existing logic
          const employeeResponse = await api.get(`/employees/me`);
          const employee = employeeResponse.data.data?.employee;

          if (employee && employee.status === 'active') {
            // Employee is approved - show welcome notification if not already shown
            const welcomeNotificationId = `welcome-${user.id}`;
            const existingWelcomeNotification = allNotifications.find(n => n.id === welcomeNotificationId);

            if (!existingWelcomeNotification) {
              allNotifications.push({
                id: welcomeNotificationId,
                type: 'approval_success' as NotificationType,
                priority: 'normal',
                title: 'Welcome to Go3net!',
                message: `Your account has been approved! You can now access all features.`,
                timestamp: new Date(),
                read: readIds.includes(welcomeNotificationId),
                targetUserId: user.id,
                actions: [{ label: 'Get Started', action: 'login', url: '/auth' }],
                source: 'system',
                category: 'approval' as any
              });
            }
          }
        } catch (error) {
          console.warn('Failed to fetch employee status for notifications:', error);
        }

        // EMPLOYEE: Fetch real task assignments
        try {
          // Fetch tasks assigned to this employee
          const tasksResponse = await api.get(`/tasks?assigneeId=${effectiveUserId}`);
          const tasks = tasksResponse.data.data?.tasks || tasksResponse.data.tasks || [];

          // Create notifications for tasks that haven't been viewed yet
          // Filter for pending and in_progress tasks (real assignments)
          tasks
            .filter((task: any) => ['pending', 'in_progress'].includes(task.status))
            .forEach((task: any, index: number) => {
              const id = `task-${task.id || task._id}-${index}`;
              allNotifications.push({
                id,
                type: 'info' as NotificationType,
                priority: task.priority === 'high' ? 'high' : 'normal',
                title: 'New Task Assigned',
                message: `You have been assigned: ${task.title}`,
                timestamp: new Date(task.createdAt || Date.now()),
                read: readIds.includes(id),
                targetUserId: effectiveUserId,
                actions: [{ label: 'View Task', action: 'view', url: '/tasks' }],
                source: 'system',
                category: 'employee' as any
              });
            });
        } catch (error) {
          console.warn('Failed to fetch task notifications for employee:', error);
        }
      }

      return allNotifications;
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
  }
}

export const notificationService = NotificationService.getInstance();
