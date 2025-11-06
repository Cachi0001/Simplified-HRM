import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

export function useRealtimeChat() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [realtimeChannels, setRealtimeChannels] = useState<Map<string, RealtimeChannel>>(new Map());

  // Helper function to get current user ID
  const getCurrentUserId = useCallback(() => {
    try {
      // Try multiple possible keys for user data
      const possibleKeys = ['user', 'currentUser', 'authUser', 'userData'];
      
      for (const key of possibleKeys) {
        const storedData = localStorage.getItem(key);
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            if (parsed && (parsed.id || parsed.userId || parsed.user_id || parsed.employeeId)) {
              return parsed.id || parsed.userId || parsed.user_id || parsed.employeeId;
            }
          } catch (parseError) {
            continue;
          }
        }
      }

      // Try to extract from JWT token
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              })
              .join('')
          );

          const decoded = JSON.parse(jsonPayload);
          if (decoded && (decoded.id || decoded.userId || decoded.user_id || decoded.sub)) {
            return decoded.id || decoded.userId || decoded.user_id || decoded.sub;
          }
        } catch (tokenError) {
          // Silent fail
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get current user ID:', error);
      return null;
    }
  }, []);

  // Helper function to format time
  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Load chats from API
  const loadChats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📥 Loading chats...');
      const response = await api.get('/chat/list');

      if (response.data?.data && Array.isArray(response.data.data)) {
        const formattedChats = response.data.data.map((chat: any) => ({
          id: chat.id || chat.chatId,
          name: chat.name || chat.chatName || 'Unknown Chat',
          type: chat.type || 'dm',
          lastMessage: chat.lastMessage || chat.last_message || '',
          lastMessageTime: chat.lastMessageTime || chat.last_message_time || '',
          unreadCount: chat.unreadCount || chat.unread_count || 0,
          participants: chat.participants || [],
          avatar: chat.avatar,
          createdBy: chat.createdBy || chat.created_by,
          createdAt: chat.createdAt || chat.created_at
        }));

        setChats(formattedChats);
        console.log('✅ Chats loaded:', formattedChats.length);
      } else {
        console.warn('⚠️ No chats data received');
        setChats([]);
      }
    } catch (error) {
      console.error('❌ Failed to load chats:', error);
      setError('Failed to load chats');
      setChats([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load users from API
  const loadUsers = useCallback(async () => {
    try {
      setError(null);

      let response;
      try {
        response = await api.get('/employees/for-chat');
      } catch (chatEndpointError) {
        console.warn('Chat endpoint failed, trying fallback:', chatEndpointError);
        response = await api.get('/employees');
      }

      if (response.data?.data && Array.isArray(response.data.data)) {
        const formattedUsers = response.data.data.map((user: any) => ({
          id: user.id || user.employeeId,
          name: user.full_name || user.fullName || user.name || user.email,
          full_name: user.full_name,
          fullName: user.fullName || user.full_name,
          email: user.email,
          avatar: user.avatar || user.profilePicture,
          role: user.role,
          status: 'offline' as const,
          employeeId: user.employeeId || user.id
        }));

        setUsers(formattedUsers);
        console.log('✅ Users loaded:', formattedUsers.length);
      } else {
        console.warn('⚠️ No users data received');
        setUsers([]);
      }
    } catch (error) {
      console.error('❌ Failed to load users:', error);
      setError('Failed to load users');
      setUsers([]);
    }
  }, []);

  // Load messages for a specific chat
  const loadMessages = useCallback(async (chatId: string, limit: number = 50) => {
    try {
      setError(null);

      console.log(`📥 Loading messages for chat: ${chatId}`);
      const response = await api.get(`/chat/${chatId}/history?limit=${limit}`);

      if (response.data?.data && Array.isArray(response.data.data)) {
        const currentUserId = getCurrentUserId();

        const formattedMessages = response.data.data.map((msg: any) => ({
          id: msg.id,
          chatId: msg.chatId || msg.chat_id || chatId,
          senderId: msg.senderId || msg.sender_id,
          senderName: msg.senderName || msg.sender_name || msg.sender_full_name || 'Unknown',
          senderAvatar: msg.senderAvatar || msg.sender_avatar,
          content: String(msg.content || msg.message || ''),
          timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
          isOwn: (msg.senderId || msg.sender_id) === currentUserId,
          status: 'delivered' as const
        }));

        setMessages(prev => ({
          ...prev,
          [chatId]: formattedMessages.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        }));

        console.log('✅ Messages loaded:', formattedMessages.length);
      } else {
        console.warn('⚠️ No messages data received');
        setMessages(prev => ({ ...prev, [chatId]: [] }));
      }
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      setError('Failed to load messages');
    }
  }, [getCurrentUserId]);

  // Send a message
  const sendMessage = useCallback(async (chatId: string, content: string): Promise<ChatMessage | null> => {
    try {
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        throw new Error('No current user found');
      }

      // Create optimistic message
      const optimisticMessage: ChatMessage = {
        id: `temp_${Date.now()}`,
        chatId,
        senderId: currentUserId,
        senderName: 'You',
        content,
        timestamp: new Date().toISOString(),
        isOwn: true,
        status: 'sending'
      };

      // Add optimistic message immediately
      setMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), optimisticMessage]
      }));

      // Send via API
      const response = await api.post('/chat/send', {
        chatId,
        message: content
      });

      if (response.data?.data) {
        const sentMessage = response.data.data;
        const formattedMessage: ChatMessage = {
          id: sentMessage.id,
          chatId: sentMessage.chatId || sentMessage.chat_id || chatId,
          senderId: sentMessage.senderId || sentMessage.sender_id || currentUserId,
          senderName: sentMessage.senderName || sentMessage.sender_name || 'You',
          content: String(sentMessage.content || sentMessage.message || content),
          timestamp: sentMessage.timestamp || sentMessage.created_at || new Date().toISOString(),
          isOwn: true,
          status: 'sent'
        };

        // Replace optimistic message with real message
        setMessages(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || [])
            .filter(msg => msg.id !== optimisticMessage.id)
            .concat(formattedMessage)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        }));

        return formattedMessage;
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      // Mark optimistic message as failed
      setMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(msg => 
          msg.status === 'sending' && msg.content === content
            ? { ...msg, status: 'failed' as const }
            : msg
        )
      }));

      throw error;
    }
  }, [getCurrentUserId]);

  // Create or get DM chat
  const createOrGetDM = useCallback(async (recipientId: string): Promise<Chat | null> => {
    try {
      console.log('🔄 Creating/getting DM for recipient:', recipientId);
      
      const response = await api.post('/chat/dm', {
        recipientId
      });

      console.log('📥 DM API response:', response.data);

      if (response.data?.data) {
        const chat = response.data.data;
        
        // Generate a fallback ID if none provided
        const chatId = chat.id || chat.chatId || `dm_${getCurrentUserId()}_${recipientId}`;
        
        console.log('🆔 Using chat ID:', chatId);
        
        const formattedChat: Chat = {
          id: chatId,
          name: chat.name || chat.chatName || `Chat with ${recipientId.substring(0, 8)}`,
          type: 'dm',
          lastMessage: chat.lastMessage || '',
          lastMessageTime: chat.lastMessageTime || '',
          unreadCount: 0,
          participants: chat.participants || [recipientId],
          avatar: chat.avatar,
          createdBy: chat.createdBy,
          createdAt: chat.createdAt
        };

        // Add to chats list if not already there
        setChats(prev => {
          const exists = prev.some(c => c.id === formattedChat.id);
          return exists ? prev : [...prev, formattedChat];
        });

        console.log('✅ DM chat created/retrieved:', formattedChat);
        return formattedChat;
      }

      console.log('❌ No data in DM response');
      return null;
    } catch (error) {
      console.error('❌ Failed to create/get DM:', error);
      
      // Fallback: create a local DM chat if API fails
      const fallbackChatId = `dm_${getCurrentUserId()}_${recipientId}`;
      const fallbackChat: Chat = {
        id: fallbackChatId,
        name: `Chat ${fallbackChatId.substring(0, 8)}`,
        type: 'dm',
        lastMessage: '',
        lastMessageTime: '',
        unreadCount: 0,
        participants: [recipientId],
        createdAt: new Date().toISOString()
      };
      
      console.log('🔄 Using fallback DM chat:', fallbackChat);
      return fallbackChat;
    }
  }, [getCurrentUserId]);

  // Mark chat as read
  const markChatAsRead = useCallback(async (chatId: string) => {
    try {
      await api.post(`/chat/${chatId}/read`);

      // Update local unread count
      setChats(prev => prev.map(chat => 
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      ));
    } catch (error) {
      console.error('❌ Failed to mark chat as read:', error);
    }
  }, []);

  // Initialize Supabase Realtime connection
  useEffect(() => {
    console.log('🔄 Initializing Supabase Realtime connection...');
    
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) {
          setConnectionStatus('connected');
          console.log('✅ Supabase Realtime connected');
        } else {
          setConnectionStatus('disconnected');
          console.log('⚠️ No Supabase session found');
        }
      } catch (error) {
        console.error('❌ Supabase auth check failed:', error);
        setConnectionStatus('disconnected');
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Supabase auth state changed:', event);
      if (session) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Supabase Realtime subscription for chat messages
  const subscribeToChat = useCallback((chatId: string) => {
    console.log('🔄 Setting up Supabase Realtime subscription for chat:', chatId);
    
    // Create a channel for this chat
    const channel = supabase
      .channel(`chat_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          console.log('📨 Supabase Realtime message received:', payload);
          
          const messageData = payload.new;
          const currentUserId = getCurrentUserId();
          
          const message: ChatMessage = {
            id: messageData.id,
            chatId: messageData.chat_id,
            senderId: messageData.sender_id,
            senderName: messageData.sender_full_name || messageData.sender_employee_name || 'Unknown',
            senderAvatar: messageData.sender_avatar,
            content: String(messageData.message || ''),
            timestamp: messageData.timestamp || messageData.created_at,
            isOwn: messageData.sender_id === currentUserId,
            status: 'delivered'
          };
          
          // Add the new message to the chat with deduplication
          setMessages(prev => {
            const existingMessages = prev[chatId] || [];
            
            // Check if message already exists (prevent duplicates)
            const messageExists = existingMessages.some(m => m.id === message.id);
            if (messageExists) {
              console.log('⚠️ Duplicate message ignored:', message.id);
              return prev;
            }

            const updatedMessages = [...existingMessages, message];
            console.log('✅ Supabase Realtime message added:', {
              chatId,
              messageId: message.id,
              totalMessages: updatedMessages.length
            });

            return {
              ...prev,
              [chatId]: updatedMessages.sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              )
            };
          });

          // Update chat list with latest message
          setChats(prev => prev.map(chat => 
            chat.id === chatId 
              ? { 
                  ...chat, 
                  lastMessage: message.content,
                  lastMessageTime: formatTime(message.timestamp),
                  unreadCount: message.isOwn ? chat.unreadCount : chat.unreadCount + 1
                }
              : chat
          ));
        }
      )
      .subscribe();

    // Store the channel for cleanup
    setRealtimeChannels(prev => new Map(prev.set(chatId, channel)));

    return { chatId, channel };
  }, [getCurrentUserId, formatTime]);

  // Cleanup realtime subscription
  const unsubscribeFromChat = useCallback((subscription: any) => {
    if (subscription && subscription.chatId) {
      console.log('🛑 Cleaning up Supabase Realtime subscription for chat:', subscription.chatId);
      
      const channel = realtimeChannels.get(subscription.chatId);
      if (channel) {
        supabase.removeChannel(channel);
        setRealtimeChannels(prev => {
          const newMap = new Map(prev);
          newMap.delete(subscription.chatId);
          return newMap;
        });
      }
      
      console.log('✅ Supabase Realtime subscription cleaned up');
    }
  }, [realtimeChannels]);

  // Load initial data
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([loadChats(), loadUsers()]);
      } catch (error) {
        console.error('Failed to initialize chat data:', error);
      }
    };

    if (connectionStatus === 'connected') {
      initializeData();
    }
  }, [connectionStatus, loadChats, loadUsers]);

  // Additional helper functions for compatibility
  const getTotalUnreadCount = useCallback(() => {
    return chats.reduce((total, chat) => total + chat.unreadCount, 0);
  }, [chats]);

  const retryMessage = useCallback(async (chatId: string, messageId: string) => {
    // Find the failed message and retry sending it
    const chatMessages = messages[chatId] || [];
    const failedMessage = chatMessages.find(m => m.id === messageId && m.status === 'failed');
    
    if (failedMessage) {
      return sendMessage(chatId, failedMessage.content);
    }
    return null;
  }, [messages, sendMessage]);

  const clearCache = useCallback(() => {
    // Clear local state (for compatibility)
    setChats([]);
    setUsers([]);
    setMessages({});
  }, []);

  const forceRefresh = useCallback(async () => {
    // Force refresh all data
    await Promise.all([loadChats(), loadUsers()]);
  }, [loadChats, loadUsers]);

  return {
    chats,
    users,
    messages,
    isLoading,
    error,
    connectionStatus,
    loadChats,
    loadUsers,
    loadMessages,
    sendMessage,
    createOrGetDM,
    markChatAsRead,
    subscribeToChat,
    unsubscribeFromChat,
    getTotalUnreadCount,
    retryMessage,
    clearCache,
    forceRefresh
  };
}