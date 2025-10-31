import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import webSocketService, { ChatMessage as WSChatMessage } from '@/services/WebSocketService';

export interface Chat {
  id: string;
  name: string;
  type: 'dm' | 'group' | 'announcement';
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
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  status: 'online' | 'offline' | 'away';
}

export function useChat() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  // Load chats
  const loadChats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

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
      } else {
        // Start with empty chats - no mock data
        setChats([]);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
      setError('Failed to load chats');
      setChats([]); // Start with empty chats on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load users
  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try the specific endpoint for chat users first
      let response;
      try {
        response = await api.get('/employees/for-chat');
      } catch (chatEndpointError) {
        console.warn('Chat endpoint failed, trying fallback:', chatEndpointError);

        // Fallback to general employees endpoint
        try {
          response = await api.get('/employees');
        } catch (fallbackError) {
          console.error('Both endpoints failed:', fallbackError);
          throw fallbackError;
        }
      }

      if (response.data?.status === 'success') {
        const employees: any[] = response.data.data || [];

        const formattedUsers = employees.map((emp: any) => ({
          id: emp.userId || emp.user_id || emp.id, // Use userId for DM chat creation
          employeeId: emp.id, // Keep employee ID for reference
          name: emp.fullName || emp.full_name || emp.name || emp.email || 'Unknown User',
          email: emp.email,
          avatar: emp.profilePicture || emp.profile_picture || emp.avatar,
          role: emp.role || 'Member',
          status: 'online' as const
        }));

        setUsers(formattedUsers);
        setError(null);
      } else {
        setUsers([]);
        setError('No users found');
      }
    } catch (error) {
      console.error('Failed to load users:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to load users';
      if (error instanceof Error) {
        if (error.message.includes('Network Error') || error.message.includes('internet connection')) {
          errorMessage = 'Cannot connect to server. Please check if the backend server is running on port 3000.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Server request timed out. Please try again.';
        } else {
          errorMessage = `Failed to load users: ${error.message}`;
        }
      }

      setError(errorMessage);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load messages for a chat
  const loadMessages = useCallback(async (chatId: string) => {
    try {
      console.log('🔍 DETAILED: Starting loadMessages for chat:', chatId);

      const response = await api.get(`/chat/${chatId}/history?limit=50`);

      console.log('🔍 DETAILED: Raw API response:', {
        status: response.status,
        statusText: response.statusText,
        dataKeys: Object.keys(response.data || {}),
        fullResponse: response.data
      });

      if (response.data?.status === 'success' && response.data?.data) {
        const responseData = response.data.data;

        console.log('🔍 DETAILED: Response data structure:', {
          chatId,
          responseDataKeys: Object.keys(responseData),
          hasMessages: !!responseData.messages,
          messageCount: responseData.messages?.length || 0,
          rawMessages: responseData.messages
        });

        if (responseData.messages && Array.isArray(responseData.messages)) {
          const currentUserId = getCurrentUserId();

          console.log('🔍 DETAILED: Current user ID for comparison:', currentUserId);

          const formattedMessages: ChatMessage[] = responseData.messages.map((msg: any, index: number) => {
            // Try multiple fields for sender name
            const senderName = msg.senderName || msg.sender_name || msg.full_name || msg.name || msg.email || 'Unknown User';
            const isOwn = msg.sender_id === currentUserId;

            console.log(`🔍 DETAILED: Processing message ${index + 1}/${responseData.messages.length}:`, {
              msgId: msg.id,
              senderId: msg.sender_id,
              currentUserId: currentUserId,
              isOwn: isOwn,
              senderName: senderName,
              content: msg.message,
              timestamp: msg.timestamp,
              rawMessage: msg
            });

            return {
              id: msg.id,
              chatId: msg.chat_id,
              senderId: msg.sender_id,
              senderName: senderName,
              senderAvatar: msg.senderAvatar || msg.sender_avatar || msg.avatar,
              content: msg.message,
              timestamp: msg.timestamp,
              isOwn: isOwn,
              status: getMessageStatus(msg) as 'sending' | 'sent' | 'delivered' | 'read'
            };
          });

          console.log('🔍 DETAILED: Final formatted messages:', {
            chatId,
            messageCount: formattedMessages.length,
            ownMessages: formattedMessages.filter(m => m.isOwn).length,
            otherMessages: formattedMessages.filter(m => !m.isOwn).length,
            allMessages: formattedMessages.map(m => ({
              id: m.id,
              sender: m.senderId,
              isOwn: m.isOwn,
              content: m.content.substring(0, 50) + '...'
            }))
          });

          setMessages(prev => {
            const newState = {
              ...prev,
              [chatId]: formattedMessages
            };

            console.log('🔍 DETAILED: Updated messages state:', {
              chatId,
              previousCount: prev[chatId]?.length || 0,
              newCount: formattedMessages.length,
              stateKeys: Object.keys(newState)
            });

            return newState;
          });
        } else {
          console.log('⚠️ DETAILED: No messages array found in response:', {
            responseData,
            hasMessages: !!responseData.messages,
            messagesType: typeof responseData.messages
          });

          setMessages(prev => ({
            ...prev,
            [chatId]: []
          }));
        }
      } else {
        console.log('⚠️ DETAILED: Invalid response structure:', {
          hasData: !!response.data,
          status: response.data?.status,
          hasDataData: !!response.data?.data,
          fullResponse: response.data
        });

        setMessages(prev => ({
          ...prev,
          [chatId]: []
        }));
      }
    } catch (error) {
      console.error('❌ DETAILED: Failed to load messages:', {
        error: error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        chatId
      });

      setMessages(prev => ({
        ...prev,
        [chatId]: []
      }));
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (chatId: string, content: string) => {
    try {
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimisticMessage: ChatMessage = {
        id: messageId,
        chatId,
        senderId: getCurrentUserId(),
        senderName: 'You',
        content,
        timestamp: new Date().toISOString(),
        isOwn: true,
        status: 'sending'
      };

      // Add optimistic message
      setMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), optimisticMessage]
      }));

      // Try WebSocket first if connected
      if (connectionStatus === 'connected') {
        const sent = webSocketService.sendMessage(chatId, content, messageId);
        if (sent) {
          // Update message status to sent
          setMessages(prev => ({
            ...prev,
            [chatId]: prev[chatId]?.map(msg =>
              msg.id === messageId ? { ...msg, status: 'sent' } : msg
            ) || []
          }));
          return; // WebSocket sent successfully
        }
      }

      // Fallback to REST API
      const response = await api.post('/chat/send', {
        chatId,
        message: content
      });

      if (response.data?.status === 'success' && response.data) {
        const responseData = response.data.data as { message?: any };
        if (responseData.message) {
          const serverMessage = responseData.message;
          const realMessage: ChatMessage = {
            id: serverMessage.id,
            chatId: serverMessage.chat_id,
            senderId: serverMessage.sender_id,
            senderName: 'You',
            content: serverMessage.message,
            timestamp: serverMessage.timestamp,
            isOwn: true,
            status: 'sent'
          };

          // Replace optimistic message with real one
          setMessages(prev => ({
            ...prev,
            [chatId]: prev[chatId]?.map(msg =>
              msg.id === messageId ? realMessage : msg
            ) || [realMessage]
          }));
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);

      // Update optimistic message to failed state
      setMessages(prev => ({
        ...prev,
        [chatId]: prev[chatId]?.map(msg =>
          msg.id.startsWith('msg-') ? { ...msg, status: 'failed' as any } : msg
        ) || []
      }));
    }
  }, [connectionStatus]);

  // Create group
  const createGroup = useCallback(async (name: string, description?: string, memberIds?: string[]) => {
    try {
      const response = await api.post('/chat/groups', {
        name,
        description,
        memberIds
      });

      if (response.data?.status === 'success') {
        await loadChats(); // Refresh chats
        return response.data.data;
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  }, [loadChats]);

  // Create or get DM chat
  const createOrGetDM = useCallback(async (recipientId: string) => {
    try {
      const response = await api.post('/chat/dm', {
        recipientId
      });

      if (response.data?.status === 'success' && response.data) {
        const responseData = response.data.data as { chat?: any };
        if (responseData.chat) {
          await loadChats(); // Refresh chats
          return responseData.chat;
        }
      }
    } catch (error) {
      console.error('Failed to create DM:', error);
      throw error;
    }
  }, [loadChats]);

  // Mark chat as read
  const markChatAsRead = useCallback(async (chatId: string) => {
    try {
      // Send via WebSocket if connected
      if (connectionStatus === 'connected') {
        webSocketService.markAsRead(chatId);
      }

      // Also send via REST API for reliability
      await api.patch(`/chat/${chatId}/read`, {});

      // Update local unread count
      setChats(prev => prev.map(chat =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      ));
    } catch (error) {
      console.error('Failed to mark chat as read:', error);
    }
  }, [connectionStatus]);

  // Typing indicators
  const startTyping = useCallback((chatId: string) => {
    if (connectionStatus === 'connected') {
      webSocketService.startTyping(chatId);
    }
  }, [connectionStatus]);

  const stopTyping = useCallback((chatId: string) => {
    if (connectionStatus === 'connected') {
      webSocketService.stopTyping(chatId);
    }
  }, [connectionStatus]);

  // Get total unread count
  const getTotalUnreadCount = useCallback(() => {
    return chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
  }, [chats]);

  // Announcements
  const createAnnouncement = useCallback(async (title: string, content: string, priority: 'low' | 'normal' | 'high' = 'normal') => {
    try {
      const response = await api.post('/announcements', { title, content, priority });
      if (response.data?.status !== 'success') {
        throw new Error(response.data?.message || 'Failed to create announcement');
      }
      return response.data.data;
    } catch (error) {
      console.error('Failed to create announcement:', error);
      throw error;
    }
  }, []);

  // Helper functions
  const getCurrentUserId = () => {
    try {
      console.log('🔍 DETAILED: Getting current user ID...');

      // Try multiple possible keys for user data
      const possibleKeys = ['user', 'currentUser', 'authUser', 'userData'];

      for (const key of possibleKeys) {
        const storedData = localStorage.getItem(key);
        console.log(`🔍 DETAILED: Checking localStorage key '${key}':`, storedData ? 'Found' : 'Not found');

        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            console.log(`🔍 DETAILED: Parsed data from '${key}':`, parsed);

            if (parsed && (parsed.id || parsed.userId || parsed.user_id)) {
              const userId = parsed.id || parsed.userId || parsed.user_id;
              console.log(`🔍 DETAILED: Found user ID '${userId}' in key '${key}'`);
              return userId;
            }
          } catch (parseError) {
            console.log(`🔍 DETAILED: Failed to parse '${key}':`, parseError);
            continue;
          }
        }
      }

      // Try to extract from JWT token
      const token = localStorage.getItem('accessToken');
      console.log('🔍 DETAILED: Checking accessToken:', token ? 'Found' : 'Not found');

      if (token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));

          const decoded = JSON.parse(jsonPayload);
          console.log('🔍 DETAILED: Decoded JWT token:', decoded);

          if (decoded && (decoded.id || decoded.userId || decoded.user_id || decoded.sub)) {
            const userId = decoded.id || decoded.userId || decoded.user_id || decoded.sub;
            console.log(`🔍 DETAILED: Found user ID '${userId}' in JWT token`);
            return userId;
          }
        } catch (tokenError) {
          console.log('🔍 DETAILED: Failed to decode JWT token:', tokenError);
        }
      }

      console.log('🔍 DETAILED: No user ID found in any location');
      return null;
    } catch (error) {
      console.error('🔍 DETAILED: Failed to get current user ID:', error);
      return null;
    }
  };

  const getCurrentUserEmail = () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return user.email as string | null;
      }
    } catch (error) {
      console.error('Failed to get current user email:', error);
    }
    return null;
  };

  const getMessageStatus = (message: any): 'sending' | 'sent' | 'delivered' | 'read' => {
    if (message.read_at) return 'read';
    if (message.delivered_at) return 'delivered';
    if (message.sent_at) return 'sent';
    return 'sending';
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Unknown';
    }
  };

  // Test WebSocket connection
  const testWebSocketConnection = useCallback(async () => {
    console.log('🧪 Testing WebSocket connection...');

    try {
      const wsStatus = webSocketService.getConnectionStatus();
      console.log('WebSocket Status:', wsStatus);
      
      if (wsStatus === 'connected') {
        console.log('✅ WebSocket connection is active');
        return { success: true };
      } else {
        console.log('❌ WebSocket connection is not active:', wsStatus);
        return { success: false, error: `WebSocket status: ${wsStatus}` };
      }
    } catch (error) {
      console.error('❌ WebSocket connection test error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, []);

  // Initialize WebSocket connection and monitoring
  useEffect(() => {
    console.log('🔄 Initializing WebSocket connection monitoring...');
    
    // Monitor connection status
    const handleConnectionChange = (connected: boolean) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected');
      console.log('🔌 WebSocket connection status changed:', connected ? 'connected' : 'disconnected');
    };

    webSocketService.onConnection(handleConnectionChange);

    // Set up typing indicator handler
    const typingHandlerId = webSocketService.onTyping((typingData) => {
      setTypingUsers(prev => {
        const chatTyping = prev[typingData.chatId] || [];
        if (typingData.isTyping) {
          // Add user to typing list if not already there
          if (!chatTyping.includes(typingData.userId)) {
            return {
              ...prev,
              [typingData.chatId]: [...chatTyping, typingData.userId]
            };
          }
        } else {
          // Remove user from typing list
          return {
            ...prev,
            [typingData.chatId]: chatTyping.filter(id => id !== typingData.userId)
          };
        }
        return prev;
      });
    });

    // Authenticate WebSocket if we have credentials
    const token = localStorage.getItem('accessToken');
    const userId = getCurrentUserId();
    if (token && userId) {
      console.log('🔐 Authenticating WebSocket connection...');
      webSocketService.authenticate(userId, token);
    }

    return () => {
      webSocketService.offConnection(handleConnectionChange);
      webSocketService.offTyping(typingHandlerId);
    };
  }, []);

  // Load initial data
  useEffect(() => {
    loadChats();
    loadUsers();

    // Test WebSocket connection on startup
    const initializeConnection = async () => {
      try {
        const result = await testWebSocketConnection();
        if (!result.success) {
          console.warn(`WebSocket connection issue: ${result.error}`);
          // Don't set error for WebSocket issues as it's not critical for basic functionality
        }
      } catch (error) {
        console.error('Failed to test WebSocket connection:', error);
      }
    };

    initializeConnection();
  }, [loadChats, loadUsers, testWebSocketConnection]);

  // Re-try loading users when auth token appears (e.g., after login refresh)
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && users.length === 0) {
      loadUsers();
    }
  }, [loadUsers, users.length]);

  // Realtime subscription for chat messages
  // WebSocket-based real-time subscription
  const subscribeToChat = useCallback((chatId: string) => {
    console.log('🔄 Setting up WebSocket subscription for chat:', chatId);
    
    // Join the chat room
    webSocketService.joinChat(chatId);
    
    // Set up message handler for this chat
    webSocketService.onMessage(chatId, (message: WSChatMessage) => {
      console.log('📨 WebSocket message received:', message);
      
      // Add the new message to the chat
      setMessages(prev => {
        const existingMessages = prev[chatId] || [];
        
        // Check if message already exists to prevent duplicates
        const messageExists = existingMessages.some(msg => msg.id === message.id);
        if (messageExists) {
          console.log('⏭️ Message already exists, skipping duplicate');
          return prev;
        }

        const updatedMessages = [...existingMessages, message];
        console.log('✅ Message added to chat:', {
          chatId,
          messageId: message.id,
          sender: message.senderName,
          isOwn: message.isOwn,
          totalMessages: updatedMessages.length
        });

        return {
          ...prev,
          [chatId]: updatedMessages
        };
      });
    });

    return { chatId }; // Return a simple object for cleanup
  }, []);

  // Cleanup realtime subscription
  const unsubscribeFromChat = useCallback((subscription: any) => {
    if (subscription && subscription.chatId) {
      console.log('🛑 Cleaning up WebSocket subscription for chat:', subscription.chatId);
      
      // Leave the chat room
      webSocketService.leaveChat(subscription.chatId);
      
      // Remove message handler for this chat
      webSocketService.offMessage(subscription.chatId);
      
      console.log('✅ WebSocket subscription cleaned up');
    }
  }, []);

  return {
    chats,
    users,
    messages,
    isLoading,
    error,
    connectionStatus,
    typingUsers,
    loadChats,
    loadUsers,
    loadMessages,
    sendMessage,
    createGroup,
    createOrGetDM,
    markChatAsRead,
    startTyping,
    stopTyping,
    getTotalUnreadCount,
    createAnnouncement,
    subscribeToChat,
    unsubscribeFromChat,
    testWebSocketConnection
  };
}