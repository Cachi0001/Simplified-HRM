/**
 * useMessageIndicators - Hook for managing message indicators
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export interface MessageIndicator {
  id: string;
  user_id: string;
  chat_id: string;
  indicator_type: 'sent' | 'received';
  expires_at: string;
  created_at: string;
}

export const useMessageIndicators = () => {
  const [indicators, setIndicators] = useState<MessageIndicator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a message indicator
  const createIndicator = useCallback(async (chatId: string, indicatorType: 'sent' | 'received') => {
    try {
      setError(null);
      const response = await api.post('/message-indicators', {
        chatId,
        indicatorType
      });
      
      const newIndicator = response.data.data.indicator;
      setIndicators(prev => [...prev, newIndicator]);
      
      // Auto-expire after 3 seconds
      setTimeout(() => {
        setIndicators(prev => prev.filter(ind => ind.id !== newIndicator.id));
      }, 3000);
      
      return newIndicator;
    } catch (error: any) {
      console.error('❌ Error creating message indicator:', error);
      setError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to create indicator');
      throw error;
    }
  }, []);

  // Handle message sent (create sent indicator)
  const handleMessageSent = useCallback(async (userId: string, chatId: string) => {
    try {
      await createIndicator(chatId, 'sent');
      console.log('✨ Message sent indicator created for user:', userId);
    } catch (error) {
      console.error('❌ Failed to create sent indicator:', error);
    }
  }, [createIndicator]);

  // Handle message received (create received indicator)
  const handleMessageReceived = useCallback(async (userId: string, chatId: string) => {
    try {
      await createIndicator(chatId, 'received');
      console.log('✨ Message received indicator created for user:', userId);
    } catch (error) {
      console.error('❌ Failed to create received indicator:', error);
    }
  }, [createIndicator]);

  // Get active indicators
  const getActiveIndicators = useCallback(async (userIds?: string[], chatId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {};
      if (userIds) params.userIds = userIds;
      if (chatId) params.chatId = chatId;
      
      const response = await api.get('/message-indicators/active', { params });
      const activeIndicators = response.data.data.indicators;
      
      setIndicators(activeIndicators);
      return activeIndicators;
    } catch (error: any) {
      console.error('❌ Error fetching active indicators:', error);
      setError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to fetch indicators');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Expire an indicator manually
  const expireIndicator = useCallback(async (indicatorId: string) => {
    try {
      await api.delete(`/message-indicators/${indicatorId}`);
      setIndicators(prev => prev.filter(ind => ind.id !== indicatorId));
    } catch (error: any) {
      console.error('❌ Error expiring indicator:', error);
      setError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to expire indicator');
    }
  }, []);

  // Get indicators for a specific user
  const getUserIndicators = useCallback((userId: string) => {
    return indicators.filter(ind => ind.user_id === userId);
  }, [indicators]);

  // Get indicators for a specific chat
  const getChatIndicators = useCallback((chatId: string) => {
    return indicators.filter(ind => ind.chat_id === chatId);
  }, [indicators]);

  // Check if user has active indicator
  const hasActiveIndicator = useCallback((userId: string, chatId?: string) => {
    return indicators.some(ind => {
      const matchesUser = ind.user_id === userId;
      const matchesChat = chatId ? ind.chat_id === chatId : true;
      const isActive = new Date(ind.expires_at) > new Date();
      return matchesUser && matchesChat && isActive;
    });
  }, [indicators]);

  // Get indicator statistics
  const getIndicatorStats = useCallback(async () => {
    try {
      const response = await api.get('/message-indicators/stats');
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Error fetching indicator stats:', error);
      setError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to fetch stats');
      return null;
    }
  }, []);

  // Cleanup expired indicators from state
  const cleanupExpiredIndicators = useCallback(() => {
    const now = new Date();
    setIndicators(prev => prev.filter(ind => new Date(ind.expires_at) > now));
  }, []);

  // Auto-cleanup expired indicators every 5 seconds
  useEffect(() => {
    const interval = setInterval(cleanupExpiredIndicators, 5000);
    return () => clearInterval(interval);
  }, [cleanupExpiredIndicators]);

  return {
    indicators,
    loading,
    error,
    createIndicator,
    handleMessageSent,
    handleMessageReceived,
    getActiveIndicators,
    expireIndicator,
    getUserIndicators,
    getChatIndicators,
    hasActiveIndicator,
    getIndicatorStats,
    cleanupExpiredIndicators
  };
};