import { useState, useCallback, useEffect, useRef } from 'react';
import api from '@/lib/api';

export interface UnreadCount {
  chat_id: string;
  unread_count: number;
}

export interface UseChatUnreadCountReturn {
  totalUnreadCount: number;
  unreadCounts: UnreadCount[];
  isLoading: boolean;
  error: string | null;
  isRealTimeConnected: boolean;
  getTotalUnreadCount: () => Promise<void>;
  getChatUnreadCount: (chatId: string) => Promise<number>;
  getAllUnreadCounts: () => Promise<void>;
  markChatAsRead: (chatId: string) => Promise<void>;
  refreshUnreadCounts: () => Promise<void>;
  incrementUnreadCount: (chatId: string) => void;
  decrementUnreadCount: (chatId: string, amount?: number) => void;
  subscribeToRealtimeUpdates: () => Promise<void>;
  unsubscribeFromRealtimeUpdates: () => Promise<void>;
}

export function useChatUnreadCount(): UseChatUnreadCountReturn {
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const subscriptionRef = useRef<any>(null);

  const getTotalUnreadCount = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/chat/unread-count/total');
      
      if (response.data?.data?.unreadCount !== undefined) {
        setTotalUnreadCount(response.data.data.unreadCount);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get total unread count';
      setError(errorMessage);
      console.error(errorMessage);
    }
  }, []);

  const getChatUnreadCount = useCallback(async (chatId: string): Promise<number> => {
    try {
      setError(null);
      const response = await api.get(`/chat/${chatId}/unread-count`);
      return response.data?.data?.unreadCount || 0;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get chat unread count';
      setError(errorMessage);
      console.error(errorMessage);
      return 0;
    }
  }, []);

  const getAllUnreadCounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/chat/unread-counts');
      
      if (response.data?.data?.unreadCounts) {
        // Ensure unreadCounts is an array
        const counts = Array.isArray(response.data.data.unreadCounts) 
          ? response.data.data.unreadCounts 
          : [];
        
        setUnreadCounts(counts);
        
        // Calculate total - only if we have a valid array
        const total = Array.isArray(counts) 
          ? counts.reduce(
              (sum: number, uc: UnreadCount) => sum + (uc.unread_count || 0),
              0
            )
          : 0;
        setTotalUnreadCount(total);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get unread counts';
      setError(errorMessage);
      console.error('Failed to get unread counts:', errorMessage, err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markChatAsRead = useCallback(async (chatId: string) => {
    try {
      setError(null);
      await api.patch(`/chat/${chatId}/read`, {});
      
      // Update local state
      setUnreadCounts(prev => {
        if (!Array.isArray(prev)) return [];
        return prev.map(uc =>
          uc.chat_id === chatId
            ? { ...uc, unread_count: 0 }
            : uc
        );
      });
      
      // Recalculate total - ensure we have a valid array
      const validCounts = Array.isArray(unreadCounts) ? unreadCounts : [];
      const total = validCounts.reduce(
        (sum, uc) => sum + (uc.chat_id === chatId ? 0 : uc.unread_count),
        0
      );
      setTotalUnreadCount(total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark chat as read';
      setError(errorMessage);
      console.error('Failed to mark chat as read:', errorMessage, err);
      throw err;
    }
  }, [unreadCounts]);

  const refreshUnreadCounts = useCallback(async () => {
    await getAllUnreadCounts();
  }, [getAllUnreadCounts]);

  const incrementUnreadCount = useCallback((chatId: string) => {
    setUnreadCounts(prev => {
      const existingIndex = prev.findIndex(uc => uc.chat_id === chatId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          unread_count: updated[existingIndex].unread_count + 1
        };
        return updated;
      } else {
        return [...prev, { chat_id: chatId, unread_count: 1 }];
      }
    });
    
    setTotalUnreadCount(prev => prev + 1);
  }, []);

  const decrementUnreadCount = useCallback((chatId: string, amount = 1) => {
    setUnreadCounts(prev => {
      const updated = prev.map(uc => {
        if (uc.chat_id === chatId) {
          const newCount = Math.max(0, uc.unread_count - amount);
          return { ...uc, unread_count: newCount };
        }
        return uc;
      });
      return updated;
    });
    
    setTotalUnreadCount(prev => Math.max(0, prev - amount));
  }, []);

  const subscribeToRealtimeUpdates = useCallback(async () => {
    try {
      const { supabase } = await import('../lib/supabase');
      
      console.info('🔗 Subscribing to unread count updates');
      
      const subscription = supabase
        .channel('unread_counts')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
          },
          (payload: any) => {
            console.info('📨 New message - updating unread count:', payload);
            incrementUnreadCount(payload.new.chat_id);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_unread_counts',
          },
          (payload: any) => {
            console.info('📊 Unread count updated:', payload);
            const { chat_id, unread_count } = payload.new;
            setUnreadCounts(prev => {
              const existingIndex = prev.findIndex(uc => uc.chat_id === chat_id);
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = { chat_id, unread_count };
                return updated;
              } else {
                return [...prev, { chat_id, unread_count }];
              }
            });
            
            // Recalculate total
            setTotalUnreadCount(prev => {
              const currentCounts = unreadCounts.filter(uc => uc.chat_id !== chat_id);
              return currentCounts.reduce((sum, uc) => sum + uc.unread_count, 0) + unread_count;
            });
          }
        )
        .subscribe(async (status: string) => {
          console.info(`📡 Unread count subscription status: ${status}`);
          if (status === 'SUBSCRIBED') {
            setIsRealTimeConnected(true);
            setError(null);
          } else if (status === 'CHANNEL_ERROR') {
            setError('Failed to subscribe to unread count updates');
            setIsRealTimeConnected(false);
          }
        });

      subscriptionRef.current = subscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Failed to subscribe to unread counts:', errorMessage);
      setError(errorMessage);
      setIsRealTimeConnected(false);
    }
  }, [incrementUnreadCount, unreadCounts]);

  const unsubscribeFromRealtimeUpdates = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        const { supabase } = await import('../lib/supabase');
        await supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        setIsRealTimeConnected(false);
        console.info('🔌 Unsubscribed from unread count updates');
      } catch (err) {
        console.error('Error unsubscribing from unread counts:', err);
      }
    }
  }, []);

  // Initial fetch and realtime subscription on mount
  useEffect(() => {
    getAllUnreadCounts();
    subscribeToRealtimeUpdates();

    return () => {
      unsubscribeFromRealtimeUpdates();
    };
  }, [getAllUnreadCounts, subscribeToRealtimeUpdates, unsubscribeFromRealtimeUpdates]);

  return {
    totalUnreadCount,
    unreadCounts,
    isLoading,
    error,
    isRealTimeConnected,
    getTotalUnreadCount,
    getChatUnreadCount,
    getAllUnreadCounts,
    markChatAsRead,
    refreshUnreadCounts,
    incrementUnreadCount,
    decrementUnreadCount,
    subscribeToRealtimeUpdates,
    unsubscribeFromRealtimeUpdates
  };
}