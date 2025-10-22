import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '@/services/notificationService';
import { Go3netNotification, NotificationType } from '@/types/notification';
import { supabase } from '../lib/supabase';

interface UseNotificationsReturn {
  notifications: Go3netNotification[];
  unreadCount: number;
  isLoading: boolean;
  showToast: (notification: Go3netNotification) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export function useNotifications(userId?: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Go3netNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await notificationService.getNotifications(userId);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      await Promise.all(unreadIds.map(id => notificationService.markNotificationAsRead(id)));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [notifications]);

  const showToast = useCallback((notification: Go3netNotification) => {
    // Show local notification
    notificationService.showLocalNotification(notification);

    // Add to local state if not already there
    setNotifications(prev => {
      const exists = prev.find(n => n.id === notification.id);
      if (exists) return prev;
      return [notification, ...prev];
    });
  }, []);

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

  // Set up realtime subscription for notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification: Go3netNotification = {
            ...payload.new as any,
            timestamp: new Date(payload.new.created_at),
            metadata: payload.new.metadata || {}
          };

          setNotifications(prev => [newNotification, ...prev]);
          showToast(newNotification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, showToast]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    showToast,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications
  };
}
