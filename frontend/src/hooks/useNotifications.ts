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
    deleteNotification: realtimeDeleteNotification
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
    // Prevent duplicate toasts by checking if we've already shown this notification
    const toastKey = `toast-shown-${notification.id}`;
    const alreadyShown = sessionStorage.getItem(toastKey);
    
    if (alreadyShown) {
      return; // Don't show duplicate toast
    }

    // Mark as shown to prevent duplicates
    sessionStorage.setItem(toastKey, 'true');
    
    // Clear the flag after 5 seconds to allow re-showing if needed
    setTimeout(() => {
      sessionStorage.removeItem(toastKey);
    }, 5000);

    // Show local notification (this will trigger the toast display)
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

    // Get action URL from metadata or determine from notification type/category
    let targetUrl = notification.metadata?.action_url;
    const highlightId = notification.metadata?.highlight_id;

    // If no action_url in metadata, determine from category and type
    if (!targetUrl) {
      switch (notification.category) {
        case 'approval':
          // Approval notifications go to appropriate request pages based on metadata
          if (notification.metadata?.leave_request_id) {
            targetUrl = '/leave-requests';
          } else if (notification.metadata?.purchase_request_id) {
            targetUrl = '/purchase-requests';
          } else if (notification.type === 'signup') {
            targetUrl = '/employee-management';
          } else {
            // Default to notifications page for unknown approval types
            targetUrl = '/notifications';
          }
          break;
        case 'task':
          // If there's a specific task ID, navigate to that task
          if (notification.metadata?.task_id) {
            targetUrl = `/tasks/${notification.metadata.task_id}`;
          } else {
            targetUrl = '/tasks';
          }
          break;
        case 'employee':
          targetUrl = '/employee-management';
          break;
        case 'system':
          // System notifications based on type and content
          if (notification.type === 'warning' && notification.message.toLowerCase().includes('clock out')) {
            targetUrl = '/attendance-report';
          } else if (notification.message.toLowerCase().includes('attendance')) {
            targetUrl = '/attendance-report';
          } else if (notification.message.toLowerCase().includes('chat') || notification.message.toLowerCase().includes('message')) {
            targetUrl = '/chat';
          } else {
            // Default to notifications page for other system notifications
            targetUrl = '/notifications';
          }
          break;
        case 'dashboard':
          // Don't navigate to a specific dashboard - stay on current page
          // User is already on their appropriate dashboard
          targetUrl = null;
          break;
        default:
          // Always fallback to notifications page
          targetUrl = '/notifications';
      }
    }

    // Validate that the target URL exists in our routes
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

    // Check if targetUrl starts with any valid route (for dynamic routes like /tasks/:id)
    const isValidRoute = targetUrl && (
      validRoutes.includes(targetUrl) ||
      validRoutes.some(route => targetUrl.startsWith(route + '/'))
    );

    // If invalid route, fallback to notifications page
    if (targetUrl && !isValidRoute) {
      console.warn(`Invalid notification target URL: ${targetUrl}, redirecting to /notifications`);
      targetUrl = '/notifications';
    }

    // Store highlight information for target page
    if (highlightId) {
      sessionStorage.setItem('highlight_id', highlightId);
      sessionStorage.setItem('highlight_type', notification.category);
    }

    // Navigate to the target URL only if it's valid
    if (targetUrl) {
      navigate(targetUrl);
    }

    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('notificationClick', {
      detail: { notification, url: targetUrl, highlightId }
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
    user_id: realtimeNotif.user_id,
    type: realtimeNotif.type as NotificationType,
    title: realtimeNotif.title,
    message: realtimeNotif.message,
    read: realtimeNotif.is_read,
    created_at: realtimeNotif.created_at,
    read_at: realtimeNotif.read_at,
    priority: (realtimeNotif.priority || 'normal') as 'low' | 'normal' | 'high' | 'urgent',
    category: realtimeNotif.category || 'system',
    metadata: realtimeNotif.metadata || {}
  };
}
