import { useState, useEffect, useCallback, useRef } from 'react';
import { useRealtimeNotifications } from './useRealtimeNotifications';

export interface UseNotificationCountReturn {
  count: number;
  hasUnread: boolean;
  isLoading: boolean;
  isRealTimeConnected: boolean;
  error: string | null;
  incrementCount: () => void;
  decrementCount: () => void;
  resetCount: () => void;
  refreshCount: () => Promise<void>;
  animationTrigger: number; // For triggering badge animations
}

export function useNotificationCount(): UseNotificationCountReturn {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animationTrigger, setAnimationTrigger] = useState(0);
  const previousCountRef = useRef(0);

  // Use realtime notifications for live updates
  const {
    unreadCount: realtimeUnreadCount,
    isSubscribed,
    error: realtimeError,
    notifications
  } = useRealtimeNotifications();

  // Update count from realtime data
  useEffect(() => {
    const newCount = realtimeUnreadCount;
    
    // Trigger animation if count increased
    if (newCount > previousCountRef.current) {
      setAnimationTrigger(prev => prev + 1);
    }
    
    previousCountRef.current = newCount;
    setCount(newCount);
  }, [realtimeUnreadCount]);

  // Handle realtime errors
  useEffect(() => {
    if (realtimeError) {
      setError(realtimeError);
    } else {
      setError(null);
    }
  }, [realtimeError]);

  const incrementCount = useCallback(() => {
    setCount(prev => {
      const newCount = prev + 1;
      setAnimationTrigger(trigger => trigger + 1);
      return newCount;
    });
  }, []);

  const decrementCount = useCallback(() => {
    setCount(prev => Math.max(0, prev - 1));
  }, []);

  const resetCount = useCallback(() => {
    setCount(0);
    previousCountRef.current = 0;
  }, []);

  const refreshCount = useCallback(async () => {
    setIsLoading(true);
    try {
      // Count is automatically updated via realtime subscription
      // This function exists for manual refresh if needed
      const unreadNotifications = notifications.filter(n => !n.is_read);
      setCount(unreadNotifications.length);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh count';
      setError(errorMessage);
      console.error('Failed to refresh notification count:', err);
    } finally {
      setIsLoading(false);
    }
  }, [notifications]);

  const hasUnread = count > 0;

  return {
    count,
    hasUnread,
    isLoading,
    isRealTimeConnected: isSubscribed,
    error,
    incrementCount,
    decrementCount,
    resetCount,
    refreshCount,
    animationTrigger
  };
}

export default useNotificationCount;