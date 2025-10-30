import { useState, useCallback, useEffect } from 'react';
import api from '@/lib/api';
import type { ChatMessage } from '../types/chat';
import { useRealtimeChat } from './useRealtimeChat';

const toIsoString = (value: string | Date | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  return typeof value === 'string' ? value : value.toISOString();
};

const normalizeChatMessage = (message: any): ChatMessage => {
  const timestamp =
    toIsoString(message.timestamp) ||
    toIsoString(message.sent_at) ||
    toIsoString(message.created_at) ||
    new Date().toISOString();

  return {
    id: message.id,
    chat_id: message.chat_id,
    sender_id: message.sender_id,
    message: message.message,
    timestamp,
    created_at: toIsoString(message.created_at) || timestamp,
    sent_at: toIsoString(message.sent_at),
    delivered_at: toIsoString(message.delivered_at),
    read_at: toIsoString(message.read_at),
    edited_at: toIsoString(message.edited_at),
    senderName: message.senderName ?? message.sender_name,
    senderAvatar: message.senderAvatar ?? message.sender_avatar,
    updated_at: toIsoString(message.updated_at),
  };
};

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  sendMessage: (chatId: string, message: string) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  markChatAsRead: (chatId: string) => Promise<void>;
  getChatHistory: (chatId: string, page?: number, limit?: number) => Promise<void>;
  getReadReceipt: (messageId: string) => Promise<any>;
  getChatParticipants: (chatId: string) => Promise<any[]>;
  refreshMessages: () => Promise<void>;
  clearMessages: () => void;
}

export function useChat(chatId?: string, userId?: string): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use realtime chat hook for live updates
  const { 
    realtimeMessages, 
    isSubscribed, 
    error: realtimeError,
    clearRealtimeMessages 
  } = useRealtimeChat(chatId || null);

  // Merge realtime messages with local messages
  useEffect(() => {
    if (realtimeMessages.length > 0) {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMessages = realtimeMessages.filter(m => !existingIds.has(m.id));
        return [...prev, ...newMessages].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    }
  }, [realtimeMessages]);

  // Handle realtime errors
  useEffect(() => {
    if (realtimeError) {
      setError(realtimeError);
    }
  }, [realtimeError]);

  const sendMessage = useCallback(
    async (targetChatId: string, message: string) => {
      try {
        setError(null);
        
        // Optimistically add message to UI
        const optimisticMessage: ChatMessage = {
          id: `temp-${Date.now()}`,
          chat_id: targetChatId,
          sender_id: userId || '',
          message,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
          sent_at: null,
          delivered_at: null,
          read_at: null,
          edited_at: null,
          senderName: 'You',
          senderAvatar: null,
          updated_at: null
        };
        
        setMessages(prev => [...prev, optimisticMessage]);
        
        const response = await api.post('/chat/send', {
          chatId: targetChatId,
          message
        });
        
        // Replace optimistic message with real one
        if (response.data?.data?.message) {
          const realMessage = normalizeChatMessage(response.data.data.message);
          setMessages(prev => 
            prev.map(m => m.id === optimisticMessage.id ? realMessage : m)
          );
        }
      } catch (err) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        throw err;
      }
    },
    [userId]
  );

  const markMessageAsRead = useCallback(async (messageId: string) => {
    try {
      setError(null);
      await api.patch(`/chat/message/${messageId}/read`, {});
      
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, read_at: new Date().toISOString(), delivered_at: new Date().toISOString() }
            : m
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark message as read';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const markChatAsRead = useCallback(async (chatId: string) => {
    try {
      setError(null);
      await api.patch(`/chat/${chatId}/read`, {});
      
      setMessages(prev =>
        prev.map(m =>
          m.chat_id === chatId
            ? { ...m, read_at: new Date().toISOString(), delivered_at: new Date().toISOString() }
            : m
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark chat as read';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getChatHistory = useCallback(
    async (chatId: string, page = 1, limit = 50) => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get(
          `/chat/${chatId}/history?page=${page}&limit=${limit}`
        );
        
        if (response.data?.data?.messages) {
          setMessages(response.data.data.messages.map(normalizeChatMessage));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load chat history';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getReadReceipt = useCallback(async (messageId: string) => {
    try {
      const response = await api.get(`/chat/message/${messageId}/read-receipt`);
      return response.data?.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get read receipt';
      console.error(errorMessage);
      return null;
    }
  }, []);

  const getChatParticipants = useCallback(async (chatId: string) => {
    try {
      const response = await api.get(`/chat/${chatId}/participants`);
      return response.data?.data?.participants || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get participants';
      console.error(errorMessage);
      return [];
    }
  }, []);

  const refreshMessages = useCallback(async () => {
    if (chatId) {
      await getChatHistory(chatId);
    }
  }, [chatId, getChatHistory]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    clearRealtimeMessages();
  }, [clearRealtimeMessages]);

  return {
    messages,
    isLoading,
    error,
    isConnected: isSubscribed,
    sendMessage,
    markMessageAsRead,
    markChatAsRead,
    getChatHistory,
    getReadReceipt,
    getChatParticipants,
    refreshMessages,
    clearMessages
  };
}