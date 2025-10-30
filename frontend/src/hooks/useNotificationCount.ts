import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService';

export interface UseNotificationCountReturn {
  unreadCount: number;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  refreshCount: () => Promise<void>;
}

/**
 * Hook for managing notification counts
 * Provides unread and total notification counts with real-time updates
 */
export const useNotificationCount = (): UseNotificationCountReturn => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refresh notification counts from the server
   */
  const refreshCount = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all notifications
      const notifications = await notificationService.getNotifications();
      
      // Calculate counts
      const total = notifications.length;
      const unread = notifications.filter(n => !n.read).length;

      setTotalCount(total);
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to refresh notification count:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load counts on mount
  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  // Set up periodic refresh (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshCount]);

  // Listen for notification updates in localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'notifications:lastInteraction') {
        // Refresh counts when notifications are interacted with
        refreshCount();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshCount]);

  return {
    unreadCount,
    totalCount,
    isLoading,
    error,
    refreshCount
  };
};

export default useNotificationCount;