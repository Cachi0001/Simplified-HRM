import { supabase } from '@/lib/supabaseClient';
import { Go3netNotification, NotificationType, PushNotificationPayload } from '@/types/notification';

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

      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.warn('This browser does not support service workers');
        return false;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return false;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      this.serviceWorkerRegistration = registration;

      // Subscribe to push notifications
      await this.subscribeToPushNotifications();

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  private async subscribeToPushNotifications(): Promise<void> {
    if (!this.serviceWorkerRegistration) return;

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      // Send subscription to backend
      await this.sendSubscriptionToBackend(subscription);
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Store subscription in database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          subscription: JSON.stringify(subscription),
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to store push subscription:', error);
      }
    } catch (error) {
      console.error('Error sending subscription to backend:', error);
    }
  }

  async sendPushNotification(
    userId: string,
    notification: Go3netNotification,
    payload?: Partial<PushNotificationPayload>
  ): Promise<void> {
    try {
      // Get user's push subscription
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', userId)
        .single();

      if (!subscription) return;

      const pushPayload: PushNotificationPayload = {
        title: notification.title,
        body: notification.message,
        icon: (import.meta as any).env?.VITE_PUSH_NOTIFICATION_ICON || '/logo.png',
        badge: (import.meta as any).env?.VITE_PUSH_NOTIFICATION_BADGE || '/badge.png',
        tag: `go3net-${notification.type}`,
        data: {
          notificationId: notification.id,
          type: notification.type,
          url: this.getNotificationUrl(notification),
          action: 'navigate'
        },
        actions: notification.actions?.map(action => ({
          action: action.action,
          title: action.label
        })),
        requireInteraction: notification.priority === 'high' || notification.priority === 'urgent',
        ...payload
      };

      // Send to push service (in production, this would be handled by your backend)
      await fetch('/api/send-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: JSON.parse(subscription.subscription),
          payload: pushPayload
        })
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
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

  async showLocalNotification(notification: Go3netNotification): Promise<void> {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const options: NotificationOptions = {
      body: notification.message,
      icon: import.meta.env.VITE_PUSH_NOTIFICATION_ICON || '/logo.png',
      badge: import.meta.env.VITE_PUSH_NOTIFICATION_BADGE || '/badge.png',
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async getNotifications(userId?: string): Promise<Go3netNotification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(item => ({
        ...item,
        timestamp: new Date(item.created_at),
        metadata: item.metadata || {}
      })) || [];
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  }
}

export const notificationService = NotificationService.getInstance();
