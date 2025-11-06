import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase for E2E tests
const mockRealtimeChannel = {
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
  channel: vi.fn(() => mockRealtimeChannel),
  removeChannel: vi.fn(),
};

const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

vi.mock('@/lib/api', () => ({
  default: mockApi,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('End-to-End Chat Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'user') {
        return JSON.stringify({
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
        });
      }
      return null;
    });

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete Chat Workflow', () => {
    it('should handle complete user journey from login to message sending', async () => {
      // Import the hook after mocks are set up
      const { useRealtimeChat } = await import('../../hooks/useRealtimeChat');
      const { renderHook, act, waitFor } = await import('@testing-library/react');

      // Mock API responses for the complete flow
      const mockChats = [
        {
          id: 'chat-1',
          name: 'John Doe',
          type: 'dm',
          lastMessage: '',
          unreadCount: 0,
        },
      ];

      const mockUsers = [
        {
          id: 'user-2',
          full_name: 'John Doe',
          email: 'john@example.com',
        },
      ];

      const mockMessages = [];

      const mockSentMessage = {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        content: 'Hello John!',
        timestamp: '2024-01-01T10:00:00Z',
      };

      // Setup API mock responses
      mockApi.get
        .mockResolvedValueOnce({ data: { data: mockChats } }) // loadChats
        .mockResolvedValueOnce({ data: { data: mockUsers } }) // loadUsers
        .mockResolvedValueOnce({ data: { data: mockMessages } }); // loadMessages

      mockApi.post.mockResolvedValueOnce({ data: { data: mockSentMessage } }); // sendMessage

      // Render the hook
      const { result } = renderHook(() => useRealtimeChat());

      // Step 1: Wait for authentication
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Step 2: Load initial data
      await act(async () => {
        await result.current.loadChats();
        await result.current.loadUsers();
      });

      // Verify data loaded
      expect(result.current.chats).toHaveLength(1);
      expect(result.current.users).toHaveLength(1);
      expect(result.current.chats[0].name).toBe('John Doe');

      // Step 3: Select a chat and load messages
      await act(async () => {
        await result.current.loadMessages('chat-1');
      });

      // Step 4: Subscribe to realtime updates
      act(() => {
        result.current.subscribeToChat('chat-1');
      });

      // Verify subscription was set up
      expect(mockSupabase.channel).toHaveBeenCalledWith('chat_chat-1');
      expect(mockRealtimeChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          table: 'chat_messages',
          filter: 'chat_id=eq.chat-1',
        }),
        expect.any(Function)
      );

      // Step 5: Send a message
      let sentMessage;
      await act(async () => {
        sentMessage = await result.current.sendMessage('chat-1', 'Hello John!');
      });

      // Verify message was sent
      expect(sentMessage).toBeTruthy();
      expect(sentMessage?.content).toBe('Hello John!');
      expect(mockApi.post).toHaveBeenCalledWith('/chat/send', {
        chatId: 'chat-1',
        message: 'Hello John!',
      });

      // Step 6: Simulate receiving a realtime message
      const realtimeCallback = mockRealtimeChannel.on.mock.calls[0][2];
      
      act(() => {
        realtimeCallback({
          new: {
            id: 'msg-2',
            chat_id: 'chat-1',
            sender_id: 'user-2',
            sender_full_name: 'John Doe',
            message: 'Hello back!',
            timestamp: '2024-01-01T10:01:00Z',
          },
        });
      });

      // Verify realtime message was added
      expect(result.current.messages['chat-1']).toHaveLength(2);
      expect(result.current.messages['chat-1'][1].content).toBe('Hello back!');

      // Step 7: Mark chat as read
      await act(async () => {
        await result.current.markChatAsRead('chat-1');
      });

      // Verify API call was made
      expect(mockApi.post).toHaveBeenCalledWith('/chat/chat-1/read');

      // Step 8: Cleanup subscription
      const subscription = { chatId: 'chat-1', channel: mockRealtimeChannel };
      act(() => {
        result.current.unsubscribeFromChat(subscription);
      });

      // Verify cleanup
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockRealtimeChannel);
    });

    it('should handle DM creation flow', async () => {
      const { useRealtimeChat } = await import('../../hooks/useRealtimeChat');
      const { renderHook, act, waitFor } = await import('@testing-library/react');

      const mockDMChat = {
        id: 'dm-user-1-user-2',
        name: 'Jane Smith',
        type: 'dm',
        participants: ['user-1', 'user-2'],
      };

      mockApi.post.mockResolvedValue({ data: { data: mockDMChat } });

      const { result } = renderHook(() => useRealtimeChat());

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Create DM chat
      let dmChat;
      await act(async () => {
        dmChat = await result.current.createOrGetDM('user-2');
      });

      // Verify DM was created
      expect(dmChat).toBeTruthy();
      expect(dmChat?.name).toBe('Jane Smith');
      expect(mockApi.post).toHaveBeenCalledWith('/chat/dm', {
        recipientId: 'user-2',
      });

      // Verify chat was added to local state
      expect(result.current.chats).toContainEqual(
        expect.objectContaining({
          id: 'dm-user-1-user-2',
          name: 'Jane Smith',
          type: 'dm',
        })
      );
    });

    it('should handle error recovery scenarios', async () => {
      const { useRealtimeChat } = await import('../../hooks/useRealtimeChat');
      const { renderHook, act, waitFor } = await import('@testing-library/react');

      const { result } = renderHook(() => useRealtimeChat());

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Test API failure and recovery
      mockApi.get.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await result.current.loadChats();
      });

      // Should handle error gracefully
      expect(result.current.error).toBe('Failed to load chats');
      expect(result.current.chats).toEqual([]);

      // Test recovery
      mockApi.get.mockResolvedValueOnce({
        data: { data: [{ id: 'chat-1', name: 'Test Chat' }] },
      });

      await act(async () => {
        await result.current.loadChats();
      });

      // Should recover successfully
      expect(result.current.error).toBe(null);
      expect(result.current.chats).toHaveLength(1);
    });

    it('should handle authentication state changes', async () => {
      const { useRealtimeChat } = await import('../../hooks/useRealtimeChat');
      const { renderHook, act } = await import('@testing-library/react');

      // Start with no session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useRealtimeChat());

      // Should start disconnected
      expect(result.current.connectionStatus).toBe('disconnected');

      // Simulate auth state change
      const authCallback = mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
      
      act(() => {
        authCallback('SIGNED_IN', { user: { id: 'user-1' } });
      });

      // Should update to connected
      expect(result.current.connectionStatus).toBe('connected');

      // Simulate sign out
      act(() => {
        authCallback('SIGNED_OUT', null);
      });

      // Should update to disconnected
      expect(result.current.connectionStatus).toBe('disconnected');
    });

    it('should handle concurrent message sending', async () => {
      const { useRealtimeChat } = await import('../../hooks/useRealtimeChat');
      const { renderHook, act, waitFor } = await import('@testing-library/react');

      const { result } = renderHook(() => useRealtimeChat());

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Mock multiple message responses
      mockApi.post
        .mockResolvedValueOnce({
          data: {
            data: {
              id: 'msg-1',
              chatId: 'chat-1',
              content: 'Message 1',
              timestamp: '2024-01-01T10:00:00Z',
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              id: 'msg-2',
              chatId: 'chat-1',
              content: 'Message 2',
              timestamp: '2024-01-01T10:00:01Z',
            },
          },
        });

      // Send multiple messages concurrently
      await act(async () => {
        const promises = [
          result.current.sendMessage('chat-1', 'Message 1'),
          result.current.sendMessage('chat-1', 'Message 2'),
        ];
        await Promise.all(promises);
      });

      // Both messages should be in the chat
      expect(result.current.messages['chat-1']).toHaveLength(2);
      expect(result.current.messages['chat-1'][0].content).toBe('Message 1');
      expect(result.current.messages['chat-1'][1].content).toBe('Message 2');
    });

    it('should handle message deduplication', async () => {
      const { useRealtimeChat } = await import('../../hooks/useRealtimeChat');
      const { renderHook, act, waitFor } = await import('@testing-library/react');

      const { result } = renderHook(() => useRealtimeChat());

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Subscribe to chat
      act(() => {
        result.current.subscribeToChat('chat-1');
      });

      const realtimeCallback = mockRealtimeChannel.on.mock.calls[0][2];
      const messageData = {
        new: {
          id: 'msg-1',
          chat_id: 'chat-1',
          sender_id: 'user-2',
          message: 'Duplicate test',
          timestamp: '2024-01-01T10:00:00Z',
        },
      };

      // Send same message twice
      act(() => {
        realtimeCallback(messageData);
        realtimeCallback(messageData);
      });

      // Should only have one message
      expect(result.current.messages['chat-1']).toHaveLength(1);
      expect(result.current.messages['chat-1'][0].content).toBe('Duplicate test');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large message lists efficiently', async () => {
      const { useRealtimeChat } = await import('../../hooks/useRealtimeChat');
      const { renderHook, act, waitFor } = await import('@testing-library/react');

      // Create large message list
      const largeMessageList = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        chat_id: 'chat-1',
        sender_id: i % 2 === 0 ? 'user-1' : 'user-2',
        sender_name: i % 2 === 0 ? 'User 1' : 'User 2',
        message: `Message ${i}`,
        created_at: new Date(Date.now() + i * 1000).toISOString(),
      }));

      mockApi.get.mockResolvedValue({ data: { data: largeMessageList } });

      const { result } = renderHook(() => useRealtimeChat());

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Measure performance
      const startTime = performance.now();

      await act(async () => {
        await result.current.loadMessages('chat-1');
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle large lists reasonably quickly (under 100ms)
      expect(duration).toBeLessThan(100);
      expect(result.current.messages['chat-1']).toHaveLength(1000);
    });

    it('should handle rapid realtime updates', async () => {
      const { useRealtimeChat } = await import('../../hooks/useRealtimeChat');
      const { renderHook, act, waitFor } = await import('@testing-library/react');

      const { result } = renderHook(() => useRealtimeChat());

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        result.current.subscribeToChat('chat-1');
      });

      const realtimeCallback = mockRealtimeChannel.on.mock.calls[0][2];

      // Send many rapid updates
      const startTime = performance.now();

      act(() => {
        for (let i = 0; i < 100; i++) {
          realtimeCallback({
            new: {
              id: `rapid-msg-${i}`,
              chat_id: 'chat-1',
              sender_id: 'user-2',
              message: `Rapid message ${i}`,
              timestamp: new Date(Date.now() + i).toISOString(),
            },
          });
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle rapid updates efficiently
      expect(duration).toBeLessThan(50);
      expect(result.current.messages['chat-1']).toHaveLength(100);
    });
  });
});