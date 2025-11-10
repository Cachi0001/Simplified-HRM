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
    // Chat feature disabled
    setTotalUnreadCount(0);
    return;
  }, []);

  const getChatUnreadCount = useCallback(async (chatId: string): Promise<number> => {
    // Chat feature disabled
    return 0;
  }, []);

  const getAllUnreadCounts = useCallback(async () => {
    // Chat feature disabled - return early
    setUnreadCounts([]);
    setTotalUnreadCount(0);
    setIsLoading(false);
    return;
  }, []);

  const markChatAsRead = useCallback(async (chatId: string) => {
    // Chat feature disabled
    return;
  }, []);

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
    // Chat feature disabled
    return;
  }, []);

  const unsubscribeFromRealtimeUpdates = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        const { supabase } = await import('../lib/supabase');
        await supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        setIsRealTimeConnected(false);
        // Silently unsubscribe
      } catch (err) {
        console.error('Error unsubscribing from unread counts:', err);
      }
    }
  }, []);

  // Initial fetch and realtime subscription on mount (once)
  useEffect(() => {
    getAllUnreadCounts();
    subscribeToRealtimeUpdates();

    return () => {
      unsubscribeFromRealtimeUpdates();
    };
  // Intentionally not depending on subscribe/unsubscribe to avoid re-subscribe loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAllUnreadCounts]);

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