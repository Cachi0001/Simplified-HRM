import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string;
  timestamp: string;
  read_at?: string | null;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (chatId: string, message: string) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  markChatAsRead: (chatId: string) => Promise<void>;
  getChatHistory: (chatId: string, page?: number, limit?: number) => Promise<void>;
  getReadReceipt: (messageId: string) => Promise<any>;
  getChatParticipants: (chatId: string) => Promise<any[]>;
}

export function useChat(userId?: string): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (chatId: string, message: string) => {
      try {
        setError(null);
        const response = await apiClient.post('/chat/send', {
          chatId,
          message
        });
        
        if (response.data?.data?.message) {
          setMessages(prev => [...prev, response.data.data.message]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const markMessageAsRead = useCallback(async (messageId: string) => {
    try {
      setError(null);
      await apiClient.patch(`/chat/message/${messageId}/read`, {});
      
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, read_at: new Date().toISOString() }
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
      await apiClient.patch(`/chat/${chatId}/read`, {});
      
      setMessages(prev =>
        prev.map(m =>
          m.chat_id === chatId
            ? { ...m, read_at: new Date().toISOString() }
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
        const response = await apiClient.get(
          `/chat/${chatId}/history?page=${page}&limit=${limit}`
        );
        
        if (response.data?.data?.messages) {
          setMessages(response.data.data.messages);
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
      const response = await apiClient.get(`/chat/message/${messageId}/read-receipt`);
      return response.data?.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get read receipt';
      console.error(errorMessage);
      return null;
    }
  }, []);

  const getChatParticipants = useCallback(async (chatId: string) => {
    try {
      const response = await apiClient.get(`/chat/${chatId}/participants`);
      return response.data?.data?.participants || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get participants';
      console.error(errorMessage);
      return [];
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    markMessageAsRead,
    markChatAsRead,
    getChatHistory,
    getReadReceipt,
    getChatParticipants
  };
}