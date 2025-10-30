import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '@/services/notificationService';
import { Go3netNotification, NotificationType } from '@/types/notification';
import { useRealtimeNotifications } from './useRealtimeNotifications';

interface UseNotificationsReturn {
  notifications: Go3netNotification[];
  unreadCount: number;
  isLoading: boolean;
  isRealTimeConnected: boolean;
  error: string | null;
  showToast: (notification: Go3netNotification) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  getNotificationsByType: (type: NotificationType) => Go3netNotification[];
  getUnreadNotifications: () => Go3netNotification[];
  handleNotificationClick: (notification: Go3netNotification) => void;
  clearAllNotifications: () => Promise<void>;
}

export function useNotifications(userId?: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Go3netNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const lastNotificationRef = useRef<string | null>(null);

  // Use realtime notifications hook
  const {
    notifications: realtimeNotifications,
    unreadCount: realtimeUnreadCount,
    isSubscribed,
    error: realtimeError,
    markAsRead: realtimeMarkAsRead,
    markAllAsRead: realtimeMarkAllAsRead,
    deleteNotification: realtimeDeleteNotification,
    getNotificationsByType: realtimeGetNotificationsByType,
    getUnreadNotifications: realtimeGetUnreadNotifications
  } = useRealtimeNotifications();

  // Merge realtime notifications with local state
  useEffect(() => {
    if (realtimeNotifications.length > 0) {
      const convertedNotifications = realtimeNotifications.map(convertRealtimeNotification);
      setNotifications(convertedNotifications);
      
      // Show toast for new notifications
      const latestNotification = realtimeNotifications[0];
      if (latestNotification && latestNotification.id !== lastNotificationRef.current) {
        lastNotificationRef.current = latestNotification.id;
        if (!latestNotification.is_read) {
          showToast(convertRealtimeNotification(latestNotification));
        }
      }
    }
  }, [realtimeNotifications]);

  // Handle realtime errors
  useEffect(() => {
    if (realtimeError) {
      setError(realtimeError);
    }
  }, [realtimeError]);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await notificationService.getNotifications(userId);
      setNotifications(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(errorMessage);
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Use realtime function for immediate update
      await realtimeMarkAsRead(notificationId);
      
      // Also update via service for consistency
      await notificationService.markNotificationAsRead(notificationId);
      
      // Update local state optimistically
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark notification as read';
      setError(errorMessage);
      console.error('Failed to mark notification as read:', err);
    }
  }, [realtimeMarkAsRead]);

  const markAllAsRead = useCallback(async () => {
    try {
      // Use realtime function for immediate update
      await realtimeMarkAllAsRead();
      
      // Update local state optimistically
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark all notifications as read';
      setError(errorMessage);
      console.error('Failed to mark all notifications as read:', err);
    }
  }, [realtimeMarkAllAsRead]);

  const showToast = useCallback((notification: Go3netNotification) => {
    // Show local notification
    notificationService.showLocalNotification(notification);

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: `notification-${notification.id}`,
          requireInteraction: false,
        });
      } catch (err) {
        console.warn('Failed to show browser notification:', err);
      }
    }

    // Add to local state if not already there
    setNotifications(prev => {
      const exists = prev.find(n => n.id === notification.id);
      if (exists) return prev;
      return [notification, ...prev];
    });
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await realtimeDeleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete notification';
      setError(errorMessage);
      console.error('Failed to delete notification:', err);
    }
  }, [realtimeDeleteNotification]);

  const getNotificationsByType = useCallback((type: NotificationType) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(n => !n.read);
  }, [notifications]);

  const handleNotificationClick = useCallback((notification: Go3netNotification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate if there's an action URL
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else {
      // Default navigation based on type
      const defaultUrls: Record<NotificationType, string> = {
        chat: '/chat',
        leave: '/leave-requests',
        purchase: '/purchase-requests',
        task: '/tasks',
        birthday: '/team',
        checkout: '/attendance',
        system: '/notifications',
        announcement: '/announcements'
      };

      const url = defaultUrls[notification.type] || '/notifications';
      navigate(url);
    }

    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('notificationClick', {
      detail: { notification, url: notification.actionUrl }
    }));
  }, [navigate, markAsRead]);

  const clearAllNotifications = useCallback(async () => {
    try {
      const notificationIds = notifications.map(n => n.id);
      await Promise.all(notificationIds.map(id => realtimeDeleteNotification(id)));
      setNotifications([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear all notifications';
      setError(errorMessage);
      console.error('Failed to clear all notifications:', err);
    }
  }, [notifications, realtimeDeleteNotification]);

  // Listen for navigation events from notifications
  useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      const { url, notificationId } = event.detail;
      if (url) {
        navigate(url);
        if (notificationId) {
          markAsRead(notificationId);
        }
      }
    };

    window.addEventListener('navigate', handleNavigate as EventListener);
    return () => window.removeEventListener('navigate', handleNavigate as EventListener);
  }, [navigate, markAsRead]);

  // Initial fetch only if no realtime notifications
  useEffect(() => {
    if (realtimeNotifications.length === 0) {
      fetchNotifications();
    }
  }, [fetchNotifications, realtimeNotifications.length]);

  // Use realtime unread count if available, otherwise calculate locally
  const unreadCount = realtimeUnreadCount > 0 ? realtimeUnreadCount : notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    isRealTimeConnected: isSubscribed,
    error,
    showToast,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications,
    deleteNotification,
    getNotificationsByType,
    getUnreadNotifications,
    handleNotificationClick,
    clearAllNotifications
  };
}

// Helper function to convert realtime notification to Go3netNotification
function convertRealtimeNotification(realtimeNotif: any): Go3netNotification {
  return {
    id: realtimeNotif.id,
    userId: realtimeNotif.user_id,
    type: realtimeNotif.type as NotificationType,
    title: realtimeNotif.title,
    message: realtimeNotif.message,
    read: realtimeNotif.is_read,
    createdAt: realtimeNotif.created_at,
    updatedAt: realtimeNotif.updated_at,
    actionUrl: realtimeNotif.action_url,
    relatedId: realtimeNotif.related_id,
    expiresAt: realtimeNotif.expires_at,
    priority: 'medium', // Default priority
    category: realtimeNotif.type
  };
}
