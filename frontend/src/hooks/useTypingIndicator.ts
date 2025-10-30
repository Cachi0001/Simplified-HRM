import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../lib/api';
import type { TypingUser } from '../types/chat';

export interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[];
  typingUserNames: string[];
  isCurrentUserTyping: boolean;
  isAnyoneTyping: boolean;
  animationPhase: number; // 0-2 for dot animation
  startTyping: (chatId: string) => Promise<void>;
  stopTyping: (chatId: string) => Promise<void>;
  getTypingUsers: (chatId: string) => Promise<void>;
  isUserTyping: (chatId: string, userId: string) => Promise<boolean>;
  getTypingText: () => string;
}

const TYPING_DEBOUNCE_MS = 500; // Debounce rapid start/stop calls
const TYPING_TTL_MS = 2000; // 2 second TTL from server

export function useTypingIndicator(userId?: string): UseTypingIndicatorReturn {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [animationPhase, setAnimationPhase] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentChatIdRef = useRef<string | null>(null);
  const isTypingRef = useRef(false);

  // Animation for typing dots
  useEffect(() => {
    if (typingUsers.length > 0) {
      const animateTyping = () => {
        setAnimationPhase(prev => (prev + 1) % 3);
        animationTimeoutRef.current = setTimeout(animateTyping, 500);
      };
      animateTyping();
    } else {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      setAnimationPhase(0);
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [typingUsers.length]);

  const stopTyping = useCallback(async (chatId: string) => {
    try {
      if (!isTypingRef.current) return;
      
      isTypingRef.current = false;
      await api.post('/typing/stop', { chatId });
      
      // Remove current user from typing list
      setTypingUsers(prev => prev.filter(user => user.userId !== userId));
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
          setTypingUsers(prev => {
            const isAlreadyTyping = prev.some(user => user.userId === userId);
            if (isAlreadyTyping) return prev;
            
            const newTypingUser: TypingUser = {
              userId: userId || '',
              userName: 'You',
              chatId,
              startedAt: new Date().toISOString()
            };
            return [...prev, newTypingUser];
          });
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
        const users = response.data.data.users.map((user: any) => ({
          userId: user.userId || user.user_id,
          userName: user.userName || user.user_name || 'Unknown User',
          chatId,
          startedAt: user.startedAt || user.started_at || new Date().toISOString()
        }));
        setTypingUsers(users);
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

  const getTypingText = useCallback(() => {
    const otherUsers = typingUsers.filter(user => user.userId !== userId);
    
    if (otherUsers.length === 0) return '';
    
    if (otherUsers.length === 1) {
      return `${otherUsers[0].userName} is typing`;
    }
    
    if (otherUsers.length === 2) {
      return `${otherUsers[0].userName} and ${otherUsers[1].userName} are typing`;
    }
    
    return `${otherUsers[0].userName} and ${otherUsers.length - 1} others are typing`;
  }, [typingUsers, userId]);

  const typingUserNames = typingUsers
    .filter(user => user.userId !== userId)
    .map(user => user.userName);

  const isAnyoneTyping = typingUsers.length > 0;

  return {
    typingUsers,
    typingUserNames,
    isCurrentUserTyping: isTypingRef.current,
    isAnyoneTyping,
    animationPhase,
    startTyping,
    stopTyping,
    getTypingUsers,
    isUserTyping,
    getTypingText
  };
}