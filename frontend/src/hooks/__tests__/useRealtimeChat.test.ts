import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRealtimeChat } from '../useRealtimeChat';

// Mock Supabase
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
};

const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    })),
  },
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
};

// Mock API
const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
};

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

vi.mock('@/lib/api', () => ({
  default: mockApi,
}));

describe('useRealtimeChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default localStorage mock
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'user') {
        return JSON.stringify({ id: 'user-1', name: 'Test User' });
      }
      return null;
    });

    // Default Supabase auth mock
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useRealtimeChat());

      expect(result.current.chats).toEqual([]);
      expect(result.current.users).toEqual([]);
      expect(result.current.messages).toEqual({});
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.connectionStatus).toBe('disconnected');
    });

    it('should set connection status to connected when authenticated', async () => {
      const { result } = renderHook(() => useRealtimeChat());

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });
    });

    it('should handle authentication failure', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useRealtimeChat());

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('disconnected');
      });
    });
  });

  describe('Loading Data', () => {
    it('should load chats successfully', async () => {
      const mockChats = [
        {
          id: 'chat-1',
          name: 'Test Chat',
          type: 'dm',
          lastMessage: 'Hello',
          unreadCount: 2,
        },
      ];

      mockApi.get.mockResolvedValue({
        data: { data: mockChats },
      });

      const { result } = renderHook(() => useRealtimeChat());

      await act(async () => {
        await result.current.loadChats();
      });

      expect(result.current.chats).toHaveLength(1);
      expect(result.current.chats[0].name).toBe('Test Chat');
      expect(mockApi.get).toHaveBeenCalledWith('/chat/list');
    });

    it('should load users successfully', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          full_name: 'John Doe',
          email: 'john@example.com',
        },
      ];

      mockApi.get.mockResolvedValue({
        data: { data: mockUsers },
      });

      const { result } = renderHook(() => useRealtimeChat());

      await act(async () => {
        await result.current.loadUsers();
      });

      expect(result.current.users).toHaveLength(1);
      expect(result.current.users[0].name).toBe('John Doe');
      expect(mockApi.get).toHaveBeenCalledWith('/employees/for-chat');
    });

    it('should fallback to employees endpoint if chat endpoint fails', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          full_name: 'Jane Doe',
          email: 'jane@example.com',
        },
      ];

      mockApi.get
        .mockRejectedValueOnce(new Error('Chat endpoint failed'))
        .mockResolvedValueOnce({
          data: { data: mockUsers },
        });

      const { result } = renderHook(() => useRealtimeChat());

      await act(async () => {
        await result.current.loadUsers();
      });

      expect(result.current.users).toHaveLength(1);
      expect(result.current.users[0].name).toBe('Jane Doe');
      expect(mockApi.get).toHaveBeenCalledWith('/employees/for-chat');
      expect(mockApi.get).toHaveBeenCalledWith('/employees');
    });

    it('should load messages for a chat', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          chat_id: 'chat-1',
          sender_id: 'user-1',
          sender_name: 'John Doe',
          message: 'Hello world',
          created_at: '2024-01-01T10:00:00Z',
        },
      ];

      mockApi.get.mockResolvedValue({
        data: { data: mockMessages },
      });

      const { result } = renderHook(() => useRealtimeChat());

      await act(async () => {
        await result.current.loadMessages('chat-1');
      });

      expect(result.current.messages['chat-1']).toHaveLength(1);
      expect(result.current.messages['chat-1'][0].content).toBe('Hello world');
      expect(mockApi.get).toHaveBeenCalledWith('/chat/chat-1/history?limit=50');
    });
  });

  describe('Sending Messages', () => {
    it('should send a message successfully', async () => {
      const mockResponse = {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        content: 'Test message',
        timestamp: '2024-01-01T10:00:00Z',
      };

      mockApi.post.mockResolvedValue({
        data: { data: mockResponse },
      });

      const { result } = renderHook(() => useRealtimeChat());

      let sentMessage;
      await act(async () => {
        sentMessage = await result.current.sendMessage('chat-1', 'Test message');
      });

      expect(sentMessage).toBeTruthy();
      expect(sentMessage?.content).toBe('Test message');
      expect(mockApi.post).toHaveBeenCalledWith('/chat/send', {
        chatId: 'chat-1',
        message: 'Test message',
      });
    });

    it('should handle optimistic updates', async () => {
      // Delay the API response to test optimistic updates
      let resolveApiCall: (value: any) => void;
      const apiPromise = new Promise((resolve) => {
        resolveApiCall = resolve;
      });
      mockApi.post.mockReturnValue(apiPromise);

      const { result } = renderHook(() => useRealtimeChat());

      // Start sending message
      act(() => {
        result.current.sendMessage('chat-1', 'Test message');
      });

      // Check optimistic message is added
      expect(result.current.messages['chat-1']).toHaveLength(1);
      expect(result.current.messages['chat-1'][0].status).toBe('sending');

      // Resolve API call
      await act(async () => {
        resolveApiCall!({
          data: {
            data: {
              id: 'msg-1',
              chatId: 'chat-1',
              content: 'Test message',
              timestamp: '2024-01-01T10:00:00Z',
            },
          },
        });
      });

      // Check optimistic message is replaced with real message
      expect(result.current.messages['chat-1']).toHaveLength(1);
      expect(result.current.messages['chat-1'][0].status).toBe('sent');
      expect(result.current.messages['chat-1'][0].id).toBe('msg-1');
    });

    it('should handle send message failure', async () => {
      mockApi.post.mockRejectedValue(new Error('Send failed'));

      const { result } = renderHook(() => useRealtimeChat());

      await act(async () => {
        try {
          await result.current.sendMessage('chat-1', 'Test message');
        } catch (error) {
          // Expected to throw
        }
      });

      // Check message is marked as failed
      expect(result.current.messages['chat-1']).toHaveLength(1);
      expect(result.current.messages['chat-1'][0].status).toBe('failed');
    });
  });

  describe('DM Creation', () => {
    it('should create or get DM chat', async () => {
      const mockDMChat = {
        id: 'dm-chat-1',
        name: 'John Doe',
        type: 'dm',
        participants: ['user-1', 'user-2'],
      };

      mockApi.post.mockResolvedValue({
        data: { data: mockDMChat },
      });

      const { result } = renderHook(() => useRealtimeChat());

      let dmChat;
      await act(async () => {
        dmChat = await result.current.createOrGetDM('user-2');
      });

      expect(dmChat).toBeTruthy();
      expect(dmChat?.name).toBe('John Doe');
      expect(mockApi.post).toHaveBeenCalledWith('/chat/dm', {
        recipientId: 'user-2',
      });
    });
  });

  describe('Realtime Subscriptions', () => {
    it('should subscribe to chat messages', () => {
      const { result } = renderHook(() => useRealtimeChat());

      act(() => {
        result.current.subscribeToChat('chat-1');
      });

      expect(mockSupabase.channel).toHaveBeenCalledWith('chat_chat-1');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: 'chat_id=eq.chat-1',
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should handle realtime message updates', () => {
      const { result } = renderHook(() => useRealtimeChat());

      // Subscribe to chat
      act(() => {
        result.current.subscribeToChat('chat-1');
      });

      // Get the callback function passed to channel.on
      const messageCallback = mockChannel.on.mock.calls[0][2];

      // Simulate receiving a realtime message
      act(() => {
        messageCallback({
          new: {
            id: 'msg-1',
            chat_id: 'chat-1',
            sender_id: 'user-2',
            sender_full_name: 'Jane Doe',
            message: 'Hello from realtime!',
            timestamp: '2024-01-01T10:00:00Z',
          },
        });
      });

      // Check message was added
      expect(result.current.messages['chat-1']).toHaveLength(1);
      expect(result.current.messages['chat-1'][0].content).toBe('Hello from realtime!');
      expect(result.current.messages['chat-1'][0].senderName).toBe('Jane Doe');
    });

    it('should prevent duplicate messages', () => {
      const { result } = renderHook(() => useRealtimeChat());

      // Add initial message
      act(() => {
        result.current.subscribeToChat('chat-1');
      });

      const messageCallback = mockChannel.on.mock.calls[0][2];
      const messageData = {
        new: {
          id: 'msg-1',
          chat_id: 'chat-1',
          sender_id: 'user-2',
          message: 'Hello',
          timestamp: '2024-01-01T10:00:00Z',
        },
      };

      // Add message twice
      act(() => {
        messageCallback(messageData);
        messageCallback(messageData);
      });

      // Should only have one message
      expect(result.current.messages['chat-1']).toHaveLength(1);
    });

    it('should unsubscribe from chat', () => {
      const { result } = renderHook(() => useRealtimeChat());

      // Subscribe first
      let subscription;
      act(() => {
        subscription = result.current.subscribeToChat('chat-1');
      });

      // Then unsubscribe
      act(() => {
        result.current.unsubscribeFromChat(subscription);
      });

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });

  describe('Helper Functions', () => {
    it('should calculate total unread count', () => {
      const { result } = renderHook(() => useRealtimeChat());

      // Set some chats with unread counts
      act(() => {
        result.current.loadChats();
      });

      // Mock chats with unread counts
      mockApi.get.mockResolvedValue({
        data: {
          data: [
            { id: 'chat-1', name: 'Chat 1', unreadCount: 3 },
            { id: 'chat-2', name: 'Chat 2', unreadCount: 2 },
          ],
        },
      });

      act(async () => {
        await result.current.loadChats();
      });

      expect(result.current.getTotalUnreadCount()).toBe(5);
    });

    it('should retry failed messages', async () => {
      const { result } = renderHook(() => useRealtimeChat());

      // Add a failed message
      act(() => {
        result.current.sendMessage('chat-1', 'Failed message').catch(() => {});
      });

      // Mock API failure then success
      mockApi.post
        .mockRejectedValueOnce(new Error('Send failed'))
        .mockResolvedValueOnce({
          data: {
            data: {
              id: 'msg-1',
              chatId: 'chat-1',
              content: 'Failed message',
              timestamp: '2024-01-01T10:00:00Z',
            },
          },
        });

      await act(async () => {
        try {
          await result.current.sendMessage('chat-1', 'Failed message');
        } catch (error) {
          // Expected to fail first time
        }
      });

      // Get the failed message ID
      const failedMessage = result.current.messages['chat-1'].find(m => m.status === 'failed');
      expect(failedMessage).toBeTruthy();

      // Retry the message
      await act(async () => {
        await result.current.retryMessage('chat-1', failedMessage!.id);
      });

      // Should have sent successfully
      expect(mockApi.post).toHaveBeenCalledTimes(2);
    });

    it('should clear cache', () => {
      const { result } = renderHook(() => useRealtimeChat());

      // Add some data first
      act(() => {
        result.current.loadChats();
        result.current.loadUsers();
      });

      // Clear cache
      act(() => {
        result.current.clearCache();
      });

      expect(result.current.chats).toEqual([]);
      expect(result.current.users).toEqual([]);
      expect(result.current.messages).toEqual({});
    });

    it('should force refresh data', async () => {
      mockApi.get.mockResolvedValue({
        data: { data: [] },
      });

      const { result } = renderHook(() => useRealtimeChat());

      await act(async () => {
        await result.current.forceRefresh();
      });

      expect(mockApi.get).toHaveBeenCalledWith('/chat/list');
      expect(mockApi.get).toHaveBeenCalledWith('/employees/for-chat');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useRealtimeChat());

      await act(async () => {
        await result.current.loadChats();
      });

      expect(result.current.error).toBe('Failed to load chats');
      expect(result.current.chats).toEqual([]);
    });

    it('should handle Supabase auth errors', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Auth error'));

      const { result } = renderHook(() => useRealtimeChat());

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('disconnected');
      });
    });

    it('should handle missing user data', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useRealtimeChat());

      expect(() => {
        result.current.sendMessage('chat-1', 'Test');
      }).rejects.toThrow('No current user found');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete chat flow', async () => {
      // Mock all API responses
      mockApi.get
        .mockResolvedValueOnce({
          data: { data: [{ id: 'chat-1', name: 'Test Chat', unreadCount: 0 }] },
        })
        .mockResolvedValueOnce({
          data: { data: [{ id: 'user-1', full_name: 'John Doe' }] },
        })
        .mockResolvedValueOnce({
          data: { data: [] },
        });

      mockApi.post.mockResolvedValue({
        data: {
          data: {
            id: 'msg-1',
            chatId: 'chat-1',
            content: 'Hello',
            timestamp: '2024-01-01T10:00:00Z',
          },
        },
      });

      const { result } = renderHook(() => useRealtimeChat());

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Load data
      await act(async () => {
        await result.current.loadChats();
        await result.current.loadUsers();
        await result.current.loadMessages('chat-1');
      });

      // Send message
      await act(async () => {
        await result.current.sendMessage('chat-1', 'Hello');
      });

      // Subscribe to realtime
      act(() => {
        result.current.subscribeToChat('chat-1');
      });

      // Verify everything worked
      expect(result.current.chats).toHaveLength(1);
      expect(result.current.users).toHaveLength(1);
      expect(result.current.messages['chat-1']).toHaveLength(1);
      expect(mockSupabase.channel).toHaveBeenCalled();
    });
  });
});