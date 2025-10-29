import { useEffect, useRef, useCallback, useState } from 'react';

export interface TypingUser {
  userId: string;
  userName: string;
  typingAt: Date;
}

/**
 * Hook for real-time typing indicators via Supabase Realtime
 * Handles typing status for multiple users in a chat
 */
export const useRealtimeTyping = (chatId: string | null) => {
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);
  const cleanupTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Subscribe to typing status changes
   */
  const subscribeToTyping = useCallback(async () => {
    if (!chatId) {
      setIsSubscribed(false);
      return;
    }

    try {
      const { supabase } = await import('../lib/supabase');

      console.info(`🎯 Subscribing to typing indicators: ${chatId}`);

      const subscription = supabase
        .channel(`typing:${chatId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'typing_status',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload: any) => {
            const { user_id, started_at, expires_at } = payload.new;
            console.info(`✍️  User typing: ${user_id}`);

            setTypingUsers((prev) => {
              const updated = new Map(prev);
              updated.set(user_id, {
                userId: user_id,
                userName: `User ${user_id.slice(0, 8)}`, // Fallback name
                typingAt: new Date(started_at),
              });
              return updated;
            });

            // Schedule removal when typing expires
            scheduleTypingExpiry(user_id, new Date(expires_at));
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'typing_status',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload: any) => {
            const { user_id, expires_at } = payload.new;
            console.info(`✍️  Typing update: ${user_id}`);

            // Reschedule expiry
            scheduleTypingExpiry(user_id, new Date(expires_at));
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'typing_status',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload: any) => {
            const { user_id } = payload.old;
            console.info(`⛔ User stopped typing: ${user_id}`);

            setTypingUsers((prev) => {
              const updated = new Map(prev);
              updated.delete(user_id);
              return updated;
            });

            // Cancel scheduled removal
            const timer = cleanupTimersRef.current.get(user_id);
            if (timer) {
              clearTimeout(timer);
              cleanupTimersRef.current.delete(user_id);
            }
          }
        )
        .subscribe((status: string) => {
          console.info(`📡 Typing subscription status: ${status}`);
          if (status === 'SUBSCRIBED') {
            setIsSubscribed(true);
            setError(null);
          } else if (status === 'CHANNEL_ERROR') {
            setError('Failed to subscribe to typing updates');
            setIsSubscribed(false);
          }
        });

      subscriptionRef.current = subscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Failed to subscribe to typing:', errorMessage);
      setError(errorMessage);
      setIsSubscribed(false);
    }
  }, [chatId]);

  /**
   * Schedule removal of typing indicator when it expires
   */
  const scheduleTypingExpiry = useCallback((userId: string, expiresAt: Date) => {
    // Cancel previous timer if exists
    const prevTimer = cleanupTimersRef.current.get(userId);
    if (prevTimer) {
      clearTimeout(prevTimer);
    }

    // Calculate time until expiry
    const timeUntilExpiry = expiresAt.getTime() - Date.now();
    
    if (timeUntilExpiry <= 0) {
      // Already expired, remove immediately
      setTypingUsers((prev) => {
        const updated = new Map(prev);
        updated.delete(userId);
        return updated;
      });
      return;
    }

    // Schedule removal with buffer (add 500ms to be safe)
    const timer = setTimeout(() => {
      console.info(`⏰ Typing indicator expired for: ${userId}`);
      setTypingUsers((prev) => {
        const updated = new Map(prev);
        updated.delete(userId);
        return updated;
      });
      cleanupTimersRef.current.delete(userId);
    }, timeUntilExpiry + 500);

    cleanupTimersRef.current.set(userId, timer);
  }, []);

  /**
   * Unsubscribe from typing updates
   */
  const unsubscribeFromTyping = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        const { supabase } = await import('../lib/supabase');
        await supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        setIsSubscribed(false);
        console.info('🔌 Unsubscribed from typing realtime');
      } catch (err) {
        console.error('Error unsubscribing:', err);
      }
    }

    // Clear all pending timers
    cleanupTimersRef.current.forEach((timer) => clearTimeout(timer));
    cleanupTimersRef.current.clear();
  }, []);

  /**
   * Effect: Subscribe/unsubscribe on mount/unmount
   */
  useEffect(() => {
    subscribeToTyping();

    return () => {
      unsubscribeFromTyping();
    };
  }, [chatId, subscribeToTyping, unsubscribeFromTyping]);

  /**
   * Get formatted list of typing users
   */
  const getTypingText = useCallback(() => {
    const users = Array.from(typingUsers.values());
    if (users.length === 0) return '';
    if (users.length === 1) return `${users[0].userName} is typing`;
    if (users.length === 2) return `${users[0].userName} and ${users[1].userName} are typing`;
    return `${users.length} people are typing`;
  }, [typingUsers]);

  /**
   * Check if specific user is typing
   */
  const isUserTyping = useCallback(
    (userId: string) => typingUsers.has(userId),
    [typingUsers]
  );

  return {
    typingUsers: Array.from(typingUsers.values()),
    isSubscribed,
    error,
    getTypingText,
    isUserTyping,
    subscribeToTyping,
    unsubscribeFromTyping,
  };
};

export default useRealtimeTyping;