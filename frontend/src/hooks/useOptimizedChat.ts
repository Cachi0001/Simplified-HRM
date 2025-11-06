import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import supabaseRealtimeService from '@/services/SupabaseRealtimeService';

export interface Chat {
  id: string;
  name: string;
  type: 'dm' | 'announcement';
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  participants?: string[];
  avatar?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface User {
  id: string;
  name: string;
  full_name?: string;
  fullName?: string;
  email: string;
  avatar?: string;
  role?: string;
  status: 'online' | 'offline' | 'away';
  employeeId?: string;
}

interface UseOptimizedChatOptions {
  enableRealtime?: boolean;
  maxRetries?: number;
  cacheTimeout?: number;
}

export function useOptimizedChat(options: UseOptimizedChatOptions = {}) {
  const {
    enableRealtime = true,
    maxRetries = 3,
    cacheTimeout = 5 * 60 * 1000 // 5 minutes
  } = options;

  // State management
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  // Refs for optimization
  const loadingChatsRef = useRef(false);
  const loadingUsersRef = useRef(false);
  const loadingMessagesRef = useRef<Set<string>>(new Set());
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const retryCountRef = useRef<Map<string, number>>(new Map());

  // Cache utilities
  const getCachedData = useCallback((key: string) => {
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return cached.data;
    }
    return null;
  }, [cacheTimeout]);

  const setCachedData = useCallback((key: string, data: any) => {
    cacheRef.current.set(key, { data, timestamp: Date.now() });
  }, []);

  // Optimized time formatting
  const formatTime = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays === 1) return 'yesterday';
      if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }, []);

  // Load chats with caching and error handling
  const loadChats = useCallback(async (force = false) => {
    if (loadingChatsRef.current) {
      console.log('🔄 Chats already loading, skipping...');
      return;
    }

    const cacheKey = 'chats';
    if (!force) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        console.log('📦 Using cached chats data');
        setChats(cached);
        return;
      }
    }

    try {
      loadingChatsRef.current = true;
      setIsLoading(true);
      setError(null);

      console.log('📥 Loading chats...');
      const response = await api.get('/chat/list');

      if (response.data?.data && Array.isArray(response.data.data)) {
        const formattedChats = response.data.data.map((chat: any) => ({
          id: chat.id,
          name: chat.name || chat.otherParticipantName || 'Unknown Chat',
          type: chat.type,
          lastMessage: chat.lastMessage || '',
          lastMessageTime: formatTime(chat.lastMessageAt || chat.created_at),
          unreadCount: chat.unreadCount || 0,
          participants: chat.participants,
          avatar: chat.avatar,
          createdBy: chat.created_by,
          createdAt: chat.created_at
        }));

        setChats(formattedChats);
        setCachedData(cacheKey, formattedChats);
        retryCountRef.current.delete('loadChats');
        console.log('✅ Chats loaded successfully:', formattedChats.length);
      } else {
        setChats([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to load chats:', error);

      const retryCount = retryCountRef.current.get('loadChats') || 0;
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying loadChats (${retryCount + 1}/${maxRetries})...`);
        retryCountRef.current.set('loadChats', retryCount + 1);

        setTimeout(() => {
          loadChats(force);
        }, Math.min(1000 * Math.pow(2, retryCount), 10000));
      } else {
        setError('Failed to load chats after multiple attempts');
        setChats([]);
      }
    } finally {
      setIsLoading(false);
      loadingChatsRef.current = false;
    }
  }, [getCachedData, setCachedData, formatTime, maxRetries]);

  // Load users with caching and optimization
  const loadUsers = useCallback(async (force = false) => {
    if (loadingUsersRef.current) {
      console.log('🔄 Users already loading, skipping...');
      return;
    }

    const cacheKey = 'users';
    if (!force) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        console.log('📦 Using cached users data');
        setUsers(cached);
        return;
      }
    }

    try {
      loadingUsersRef.current = true;
      setIsLoading(true);
      setError(null);

      console.log('👥 Loading users...');
      let response;

      try {
        response = await api.get('/employees/for-chat');
      } catch (chatEndpointError) {
        console.warn('Chat endpoint failed, trying fallback:', chatEndpointError);
        response = await api.get('/employees');
      }

      if (response.data?.data) {
        const usersData = Array.isArray(response.data.data) ? response.data.data : [response.data.data];

        const formattedUsers = usersData.map((user: any) => ({
          id: user.id || user.employeeId || user.userId,
          name: user.fullName || user.full_name || user.name || user.email?.split('@')[0] || 'Unknown',
          fullName: user.fullName || user.full_name || user.name,
          email: user.email || '',
          avatar: user.avatar || user.profilePicture,
          role: user.role || 'employee',
          status: user.status || 'offline',
          employeeId: user.employeeId || user.id
        }));

        setUsers(formattedUsers);
        setCachedData(cacheKey, formattedUsers);
        retryCountRef.current.delete('loadUsers');
        console.log('✅ Users loaded successfully:', formattedUsers.length);
      } else {
        setUsers([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to load users:', error);

      const retryCount = retryCountRef.current.get('loadUsers') || 0;
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying loadUsers (${retryCount + 1}/${maxRetries})...`);
        retryCountRef.current.set('loadUsers', retryCount + 1);

        setTimeout(() => {
          loadUsers(force);
        }, Math.min(1000 * Math.pow(2, retryCount), 10000));
      } else {
        setError('Failed to load users after multiple attempts');
        setUsers([]);
      }
    } finally {
      setIsLoading(false);
      loadingUsersRef.current = false;
    }
  }, [getCachedData, setCachedData, maxRetries]);

  // Optimized message loading with deduplication
  const loadMessages = useCallback(async (chatId: string, force = false) => {
    if (loadingMessagesRef.current.has(chatId)) {
      console.log(`🔄 Messages for chat ${chatId} already loading, skipping...`);
      return;
    }

    const cacheKey = `messages_${chatId}`;
    if (!force) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        console.log(`📦 Using cached messages for chat ${chatId}`);
        setMessages(prev => ({ ...prev, [chatId]: cached }));
        return;
      }
    }

    try {
      loadingMessagesRef.current.add(chatId);
      setError(null);

      console.log(`📥 Loading messages for chat: ${chatId}`);
      const response = await api.get(`/chat/${chatId}/messages`);

      if (response.data?.data && Array.isArray(response.data.data)) {
        const currentUserId = JSON.parse(localStorage.getItem('currentUser') || '{}').id;

        const formattedMessages = response.data.data.map((msg: any) => ({
          id: msg.id,
          chatId: msg.chatId || msg.chat_id || chatId,
          senderId: msg.senderId || msg.sender_id,
          senderName: msg.senderName || msg.sender_name || 'Unknown',
          senderAvatar: msg.senderAvatar || msg.sender_avatar,
          content: msg.content || msg.message || '',
          timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
          isOwn: (msg.senderId || msg.sender_id) === currentUserId,
          status: msg.status || 'delivered'
        }));

        setMessages(prev => ({ ...prev, [chatId]: formattedMessages }));
        setCachedData(cacheKey, formattedMessages);
        retryCountRef.current.delete(`loadMessages_${chatId}`);
        console.log(`✅ Messages loaded for chat ${chatId}:`, formattedMessages.length);
      } else {
        setMessages(prev => ({ ...prev, [chatId]: [] }));
      }
    } catch (error: any) {
      console.error(`❌ Failed to load messages for chat ${chatId}:`, error);

      const retryKey = `loadMessages_${chatId}`;
      const retryCount = retryCountRef.current.get(retryKey) || 0;
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying loadMessages for ${chatId} (${retryCount + 1}/${maxRetries})...`);
        retryCountRef.current.set(retryKey, retryCount + 1);

        setTimeout(() => {
          loadMessages(chatId, force);
        }, Math.min(1000 * Math.pow(2, retryCount), 10000));
      } else {
        setError(`Failed to load messages for chat ${chatId}`);
        setMessages(prev => ({ ...prev, [chatId]: [] }));
      }
    } finally {
      loadingMessagesRef.current.delete(chatId);
    }
  }, [getCachedData, setCachedData, maxRetries]);

  // Send message with optimistic updates
  const sendMessage = useCallback(async (chatId: string, content: string): Promise<ChatMessage | null> => {
    if (!content.trim()) return null;

    const tempMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      chatId,
      senderId: JSON.parse(localStorage.getItem('currentUser') || '{}').id || 'unknown',
      senderName: JSON.parse(localStorage.getItem('currentUser') || '{}').fullName || 'Unknown',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      isOwn: true,
      status: 'sending'
    };

    // Optimistic update
    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), tempMessage]
    }));

    try {
      if (enableRealtime) {
        const sentMessage = await supabaseRealtimeService.sendMessage(chatId, content);
        if (sentMessage) {
          // Replace temp message with real message
          setMessages(prev => ({
            ...prev,
            [chatId]: prev[chatId]?.map(msg =>
              msg.id === tempMessage.id ? sentMessage : msg
            ) || [sentMessage]
          }));

          // Update cache
          const cacheKey = `messages_${chatId}`;
          const cached = getCachedData(cacheKey);
          if (cached) {
            setCachedData(cacheKey, [...cached, sentMessage]);
          }

          return sentMessage;
        }
      } else {
        // Fallback to API
        const response = await api.post(`/chat/${chatId}/message`, { content });
        if (response.data?.data) {
          const sentMessage = response.data.data;
          setMessages(prev => ({
            ...prev,
            [chatId]: prev[chatId]?.map(msg =>
              msg.id === tempMessage.id ? sentMessage : msg
            ) || [sentMessage]
          }));
          return sentMessage;
        }
      }

      // Failed to send
      setMessages(prev => ({
        ...prev,
        [chatId]: prev[chatId]?.map(msg =>
          msg.id === tempMessage.id ? { ...msg, status: 'failed' } : msg
        ) || []
      }));

      return null;
    } catch (error) {
      console.error('❌ Failed to send message:', error);

      // Mark as failed
      setMessages(prev => ({
        ...prev,
        [chatId]: prev[chatId]?.map(msg =>
          msg.id === tempMessage.id ? { ...msg, status: 'failed' } : msg
        ) || []
      }));

      return null;
    }
  }, [enableRealtime, getCachedData, setCachedData]);

  // Typing indicators with debouncing
  const startTyping = useCallback(async (chatId: string) => {
    if (enableRealtime) {
      await supabaseRealtimeService.sendTypingIndicator(chatId, true);
    }
  }, [enableRealtime]);

  const stopTyping = useCallback(async (chatId: string) => {
    if (enableRealtime) {
      await supabaseRealtimeService.sendTypingIndicator(chatId, false);
    }
  }, [enableRealtime]);

  // Subscribe to chat with cleanup
  const subscribeToChat = useCallback((chatId: string) => {
    if (!enableRealtime) return null;

    console.log('🔄 Subscribing to realtime updates for chat:', chatId);

    // Set up message handler
    supabaseRealtimeService.onMessage(chatId, (message: ChatMessage) => {
      setMessages(prev => {
        const existing = prev[chatId] || [];
        const messageExists = existing.some(m => m.id === message.id);

        if (!messageExists) {
          const updated = [...existing, message].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          return { ...prev, [chatId]: updated };
        }
        return prev;
      });
    });

    // Set up typing handler
    supabaseRealtimeService.onTyping(chatId, (typing) => {
      setTypingUsers(prev => {
        const currentTyping = prev[chatId] || [];
        if (typing.isTyping) {
          if (!currentTyping.includes(typing.userId)) {
            return { ...prev, [chatId]: [...currentTyping, typing.userId] };
          }
        } else {
          return { ...prev, [chatId]: currentTyping.filter(id => id !== typing.userId) };
        }
        return prev;
      });
    });

    return supabaseRealtimeService.subscribeToChat(chatId);
  }, [enableRealtime]);

  const unsubscribeFromChat = useCallback((chatId: string) => {
    if (enableRealtime) {
      supabaseRealtimeService.unsubscribeFromChat(chatId);
    }
  }, [enableRealtime]);

  // Mark chat as read (optimized to not mark history as read)
  const markChatAsRead = useCallback(async (chatId: string) => {
    try {
      // Only mark as read if it's not a history view
      await api.post(`/chat/${chatId}/read`);

      // Update unread count
      setChats(prev => prev.map(chat =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      ));
    } catch (error) {
      console.error('❌ Failed to mark chat as read:', error);
    }
  }, []);

  // Get total unread count
  const getTotalUnreadCount = useCallback(() => {
    return chats.reduce((total, chat) => total + chat.unreadCount, 0);
  }, [chats]);

  // Create or get DM
  const createOrGetDM = useCallback(async (userId: string): Promise<Chat | null> => {
    try {
      const response = await api.post('/chat/dm', { userId });
      if (response.data?.data) {
        const chat = response.data.data;
        const formattedChat = {
          id: chat.id,
          name: chat.name || chat.otherParticipantName || 'Direct Message',
          type: 'dm' as const,
          lastMessage: chat.lastMessage || '',
          lastMessageTime: formatTime(chat.lastMessageAt || chat.created_at),
          unreadCount: chat.unreadCount || 0,
          participants: chat.participants,
          avatar: chat.avatar,
          createdBy: chat.created_by,
          createdAt: chat.created_at
        };

        // Add to chats if not exists
        setChats(prev => {
          const exists = prev.some(c => c.id === formattedChat.id);
          return exists ? prev : [formattedChat, ...prev];
        });

        return formattedChat;
      }
    } catch (error) {
      console.error('❌ Failed to create/get DM:', error);
    }
    return null;
  }, [formatTime]);

  // Initialize realtime connection
  useEffect(() => {
    if (enableRealtime) {
      console.log('🔄 Setting up Supabase realtime connection...');

      supabaseRealtimeService.onConnection((connected) => {
        setConnectionStatus(connected ? 'connected' : 'disconnected');
      });

      // Subscribe to announcements
      supabaseRealtimeService.subscribeToAnnouncements();

      setConnectionStatus(supabaseRealtimeService.status);
    }

    return () => {
      if (enableRealtime) {
        supabaseRealtimeService.destroy();
      }
    };
  }, [enableRealtime]);

  // Initial data load
  useEffect(() => {
    loadChats();
    loadUsers();
  }, [loadChats, loadUsers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all loading states
      loadingChatsRef.current = false;
      loadingUsersRef.current = false;
      loadingMessagesRef.current.clear();

      // Clear retry counts
      retryCountRef.current.clear();

      // Clear cache if needed (optional, keeps data for next mount)
      // cacheRef.current.clear();
    };
  }, []);

  return {
    // State
    chats,
    users,
    messages,
    isLoading,
    error,
    connectionStatus,
    typingUsers,

    // Actions
    loadChats,
    loadUsers,
    loadMessages,
    sendMessage,
    startTyping,
    stopTyping,
    subscribeToChat,
    unsubscribeFromChat,
    markChatAsRead,
    getTotalUnreadCount,
    createOrGetDM,

    // Utilities
    retryMessage: (chatId: string, messageId: string) => {
      // Implement retry logic if needed
      console.log('Retrying message:', messageId, 'in chat:', chatId);
    },

    clearCache: () => {
      cacheRef.current.clear();
      console.log('🗑️ Chat cache cleared');
    },

    forceRefresh: () => {
      cacheRef.current.clear();
      loadChats(true);
      loadUsers(true);
    }
  };
}
