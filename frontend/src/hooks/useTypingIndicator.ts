import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../lib/api';

export interface UseTypingIndicatorReturn {
  typingUsers: string[];
  isCurrentUserTyping: boolean;
  startTyping: (chatId: string) => Promise<void>;
  stopTyping: (chatId: string) => Promise<void>;
  getTypingUsers: (chatId: string) => Promise<void>;
  isUserTyping: (chatId: string, userId: string) => Promise<boolean>;
}

const TYPING_DEBOUNCE_MS = 500; // Debounce rapid start/stop calls
const TYPING_TTL_MS = 2000; // 2 second TTL from server

export function useTypingIndicator(userId?: string): UseTypingIndicatorReturn {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentChatIdRef = useRef<string | null>(null);
  const isTypingRef = useRef(false);

  const stopTyping = useCallback(async (chatId: string) => {
    try {
      if (!isTypingRef.current) return;
      
      isTypingRef.current = false;
      await api.post('/typing/stop', { chatId });
      
      // Remove current user from typing list
      setTypingUsers(prev => prev.filter(id => id !== userId));
    } catch (error) {
      console.error('Failed to stop typing indicator:', error);
    }
  }, [userId]);

  const startTyping = useCallback(
    async (chatId: string) => {
      try {
        currentChatIdRef.current = chatId;
        
        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Send start typing if not already typing
        if (!isTypingRef.current) {
          isTypingRef.current = true;
          await api.post('/typing/start', { chatId });
          
          // Add current user to typing list if not already there
          setTypingUsers(prev =>
            prev.includes(userId || '') ? prev : [...prev, userId || '']
          );
        }

        // Auto-stop after TTL + buffer
        typingTimeoutRef.current = setTimeout(() => {
          stopTyping(chatId);
        }, TYPING_TTL_MS + TYPING_DEBOUNCE_MS);
      } catch (error) {
        console.error('Failed to start typing indicator:', error);
        isTypingRef.current = false;
      }
    },
    [userId, stopTyping]
  );

  const getTypingUsers = useCallback(async (chatId: string) => {
    try {
      const response = await api.get(`/typing/${chatId}`);
      if (response.data?.data?.users) {
        setTypingUsers(response.data.data.users);
      }
    } catch (error) {
      console.error('Failed to fetch typing users:', error);
    }
  }, []);

  const isUserTyping = useCallback(async (chatId: string, userIdToCheck: string): Promise<boolean> => {
    try {
      const response = await api.get(`/typing/${chatId}/${userIdToCheck}`);
      return response.data?.data?.isTyping || false;
    } catch (error) {
      console.error('Failed to check typing status:', error);
      return false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Stop typing when component unmounts
      if (currentChatIdRef.current && isTypingRef.current) {
        stopTyping(currentChatIdRef.current).catch(err =>
          console.error('Failed to cleanup typing indicator:', err)
        );
      }
    };
  }, [stopTyping]);

  return {
    typingUsers,
    isCurrentUserTyping: isTypingRef.current,
    startTyping,
    stopTyping,
    getTypingUsers,
    isUserTyping
  };
}