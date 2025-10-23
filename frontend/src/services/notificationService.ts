import { Go3netNotification, NotificationType, PushNotificationPayload } from '../types/notification';

class NotificationService {
  private static instance: NotificationService;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey: string;

  constructor() {
    this.vapidPublicKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || '';
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
        return `/employee/${notification.targetUserId}`;
      case 'approval':
        return `/dashboard#pending-approvals`;
      case 'system':
        return '/dashboard';
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
    // For MongoDB implementation, this would call the API
    console.log('Marking notification as read:', notificationId);
  }

  async getNotifications(userId?: string): Promise<Go3netNotification[]> {
    // For MongoDB implementation, this would call the API
    console.log('Getting notifications for user:', userId);
    return [];
  }
}

export const notificationService = NotificationService.getInstance();
