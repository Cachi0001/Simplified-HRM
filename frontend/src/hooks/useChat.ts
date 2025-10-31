import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

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
          id: emp.id,
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
      const response = await api.get(`/chat/${chatId}/history?limit=50`);
      if (response.data?.status === 'success' && response.data) {
        const responseData = response.data.data as { messages?: any[] };
        if (responseData.messages && Array.isArray(responseData.messages)) {
          const currentUserId = getCurrentUserId();
          const formattedMessages: ChatMessage[] = responseData.messages.map((msg: any) => {
            // Try multiple fields for sender name
            const senderName = msg.senderName || msg.sender_name || msg.full_name || msg.name || msg.email || 'Unknown User';
            
            // Debug logging only in development
            if (process.env.NODE_ENV === 'development') {
              console.log('Message formatting:', {
                msgId: msg.id,
                senderId: msg.sender_id,
                senderName: senderName
              });
            }
            
            return {
              id: msg.id,
              chatId: msg.chat_id,
              senderId: msg.sender_id,
              senderName: senderName,
              senderAvatar: msg.senderAvatar || msg.sender_avatar || msg.avatar,
              content: msg.message,
              timestamp: msg.timestamp,
              isOwn: msg.sender_id === currentUserId,
              status: getMessageStatus(msg) as 'sending' | 'sent' | 'delivered' | 'read'
            };
          });

          setMessages(prev => ({
            ...prev,
            [chatId]: formattedMessages
          }));
        } else {
          // No messages found - start with empty array
          setMessages(prev => ({
            ...prev,
            [chatId]: []
          }));
        }
      } else {
        // No messages found - start with empty array
        setMessages(prev => ({
          ...prev,
          [chatId]: []
        }));
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages(prev => ({
        ...prev,
        [chatId]: []
      }));
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (chatId: string, content: string) => {
    try {
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
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
              msg.id === optimisticMessage.id ? realMessage : msg
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
          msg.id.startsWith('temp-') ? { ...msg, status: 'failed' as any } : msg
        ) || []
      }));
    }
  }, []);

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
      await api.patch(`/chat/${chatId}/read`, {});

      // Update local unread count
      setChats(prev => prev.map(chat =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      ));
    } catch (error) {
      console.error('Failed to mark chat as read:', error);
    }
  }, []);

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
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return user.id;
      }
    } catch (error) {
      console.error('Failed to get current user ID:', error);
    }
    return null;
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

  // Load initial data
  useEffect(() => {
    loadChats();
    loadUsers();
  }, [loadChats, loadUsers]);

  // Re-try loading users when auth token appears (e.g., after login refresh)
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && users.length === 0) {
      loadUsers();
    }
  }, [loadUsers, users.length]);

  return {
    chats,
    users,
    messages,
    isLoading,
    error,
    loadChats,
    loadUsers,
    loadMessages,
    sendMessage,
    createGroup,
    createOrGetDM,
    markChatAsRead,
    getTotalUnreadCount,
    createAnnouncement
  };
}