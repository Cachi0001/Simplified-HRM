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
    // Use action_url from metadata if available
    if (notification.metadata?.action_url) {
      // Validate the action_url is a valid route
      const validRoutes = [
        '/dashboard',
        '/employee-dashboard',
        '/hr-dashboard',
        '/teamlead-dashboard',
        '/super-admin-dashboard',
        '/tasks',
        '/attendance-report',
        '/settings',
        '/leave-requests',
        '/purchase-requests',
        '/chat',
        '/notifications',
        '/employee-management',
        '/performance-metrics'
      ];

      const isValidRoute = validRoutes.includes(notification.metadata.action_url) ||
                          validRoutes.some(route => notification.metadata.action_url?.startsWith(route + '/'));

      if (isValidRoute) {
        return notification.metadata.action_url;
      }
      
      console.warn(`Invalid action_url in notification metadata: ${notification.metadata.action_url}, using fallback`);
    }

    // Fallback to category-based routing with valid routes
    switch (notification.category) {
      case 'approval':
        // Check what type of approval
        if (notification.metadata?.leave_request_id) {
          return '/leave-requests';
        } else if (notification.metadata?.purchase_request_id) {
          return '/purchase-requests';
        } else if (notification.type === 'signup') {
          return '/employee-management';
        }
        return '/notifications';
      case 'task':
        // If there's a specific task ID, navigate to that task
        if (notification.metadata?.task_id) {
          return `/tasks/${notification.metadata.task_id}`;
        }
        return '/tasks';
      case 'employee':
        return '/employee-management';
      case 'system':
        // Check message content for specific routing
        const message = notification.message.toLowerCase();
        if (notification.type === 'warning' && message.includes('clock out')) {
          return '/attendance-report';
        } else if (message.includes('attendance')) {
          return '/attendance-report';
        } else if (message.includes('chat') || message.includes('message')) {
          return '/chat';
        }
        return '/notifications';
      case 'dashboard':
        // Don't navigate to a specific dashboard - return notifications page
        // User should stay on their current dashboard
        return '/notifications';
      default:
        return '/notifications';
    }
  }

  getNotificationActionUrl(notification: Go3netNotification): string {
    return this.getNotificationUrl(notification);
  }

  getHighlightId(notification: Go3netNotification): string | undefined {
    // Try highlight_id first, then fall back to request IDs
    return notification.metadata?.highlight_id || 
           notification.metadata?.leave_request_id || 
           notification.metadata?.purchase_request_id ||
           notification.metadata?.task_id ||
           notification.metadata?.employee_id;
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
    try {
      await api.patch(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    return this.markNotificationAsRead(notificationId);
  }

  async getNotifications(userId?: string, limit: number = 50, offset: number = 0, unreadOnly: boolean = false): Promise<Go3netNotification[]> {
    try {
      const response = await api.get('/notifications', {
        params: { limit, offset, unreadOnly }
      });

      const notifications = response.data || [];
      
      // Transform backend notifications to frontend format
      return notifications.map((n: any) => ({
        id: n.id,
        type: n.type as NotificationType,
        priority: n.priority,
        title: n.title,
        message: n.message,
        read: n.read,
        read_at: n.read_at,
        created_at: n.created_at,
        timestamp: new Date(n.created_at),
        category: n.category,
        metadata: n.metadata || {},
        source: n.source || 'system',
        user_id: n.user_id
      }));
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get('/notifications/unread-count');
      return response.data.count || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await api.patch('/notifications/mark-all-read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await api.delete(`/notifications/${notificationId}`);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();
