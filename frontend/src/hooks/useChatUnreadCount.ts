import { useState, useCallback, useEffect } from 'react';
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
  getTotalUnreadCount: () => Promise<void>;
  getChatUnreadCount: (chatId: string) => Promise<number>;
  getAllUnreadCounts: () => Promise<void>;
  markChatAsRead: (chatId: string) => Promise<void>;
  refreshUnreadCounts: () => Promise<void>;
}

export function useChatUnreadCount(): UseChatUnreadCountReturn {
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Initial fetch on mount
  useEffect(() => {
    getAllUnreadCounts();
  }, [getAllUnreadCounts]);

  return {
    totalUnreadCount,
    unreadCounts,
    isLoading,
    error,
    getTotalUnreadCount,
    getChatUnreadCount,
    getAllUnreadCounts,
    markChatAsRead,
    refreshUnreadCounts
  };
}