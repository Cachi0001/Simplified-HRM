import { useEffect, useRef, useCallback, useState } from 'react';

export interface Notification {
  id: string;
  user_id: string;
  type: 'chat' | 'leave' | 'purchase' | 'task' | 'birthday' | 'checkout';
  title: string;
  message: string;
  related_id?: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
  expires_at?: string;
  updated_at: string;
}

/**
 * Hook for real-time notifications via Supabase Realtime
 * Handles new notifications and status updates
 */
export const useRealtimeNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  /**
   * Subscribe to notification changes for current user
   */
  const subscribeToNotifications = useCallback(async () => {
    try {
      const { supabase } = await import('../lib/supabase');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.warn('No authenticated user, cannot subscribe to notifications');
        setIsSubscribed(false);
        return;
      }

      console.info(`🔔 Subscribing to notifications for user: ${user.id}`);

      const subscription = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            console.info('📬 New notification:', payload);
            const newNotification = payload.new as Notification;
            
            setNotifications((prev) => [newNotification, ...prev]);
            
            // Increment unread count
            if (!newNotification.is_read) {
              setUnreadCount((prev) => prev + 1);
            }

            // Show toast notification
            showNotificationToast(newNotification);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            console.info('✏️  Notification updated:', payload);
            const updatedNotification = payload.new as Notification;
            const previousNotification = payload.old as Notification;

            setNotifications((prev) =>
              prev.map((notif) =>
                notif.id === updatedNotification.id ? updatedNotification : notif
              )
            );

            // Update unread count if status changed
            if (!previousNotification.is_read && updatedNotification.is_read) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            } else if (previousNotification.is_read && !updatedNotification.is_read) {
              setUnreadCount((prev) => prev + 1);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            console.info('🗑️  Notification deleted:', payload);
            const deletedNotification = payload.old as Notification;

            setNotifications((prev) =>
              prev.filter((notif) => notif.id !== deletedNotification.id)
            );

            // Update unread count
            if (!deletedNotification.is_read) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe((status: string) => {
          console.info(`📡 Notification subscription status: ${status}`);
          if (status === 'SUBSCRIBED') {
            setIsSubscribed(true);
            setError(null);
          } else if (status === 'CHANNEL_ERROR') {
            setError('Failed to subscribe to notifications');
            setIsSubscribed(false);
          }
        });

      subscriptionRef.current = subscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Failed to subscribe to notifications:', errorMessage);
      setError(errorMessage);
      setIsSubscribed(false);
    }
  }, []);

  /**
   * Unsubscribe from notifications
   */
  const unsubscribeFromNotifications = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        const { supabase } = await import('../lib/supabase');
        await supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        setIsSubscribed(false);
        console.info('🔌 Unsubscribed from notifications');
      } catch (err) {
        console.error('Error unsubscribing:', err);
      }
    }
  }, []);

  /**
   * Effect: Subscribe on mount
   */
  useEffect(() => {
    subscribeToNotifications();

    return () => {
      unsubscribeFromNotifications();
    };
  }, [subscribeToNotifications, unsubscribeFromNotifications]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { supabase } = await import('../lib/supabase');

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Failed to mark notification as read:', error);
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Failed to mark all as read:', error);
      } else {
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, []);

  /**
   * Delete notification
   */
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { supabase } = await import('../lib/supabase');

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Failed to delete notification:', error);
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, []);

  /**
   * Get notifications by type
   */
  const getNotificationsByType = useCallback(
    (type: Notification['type']) => notifications.filter((n) => n.type === type),
    [notifications]
  );

  /**
   * Get unread notifications
   */
  const getUnreadNotifications = useCallback(
    () => notifications.filter((n) => !n.is_read),
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    isSubscribed,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationsByType,
    getUnreadNotifications,
    subscribeToNotifications,
    unsubscribeFromNotifications,
  };
};

/**
 * Show browser notification toast (foreground)
 */
function showNotificationToast(notification: Notification): void {
  // Check if browser supports notifications
  if ('Notification' in window) {
    try {
      // Request permission if needed
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: `notification-${notification.id}`,
          requireInteraction: false,
        });
      }
    } catch (err) {
      console.warn('Failed to show notification toast:', err);
    }
  }
}

export default useRealtimeNotifications;