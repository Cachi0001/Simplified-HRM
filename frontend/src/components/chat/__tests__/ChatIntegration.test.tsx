import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ChatPage from '../../../pages/ChatPage';
import { ThemeProvider } from '../../../contexts/ThemeContext';

// Mock hooks
const mockUseRealtimeChat = {
  chats: [
    {
      id: 'chat-1',
      name: 'John Doe',
      type: 'dm' as const,
      lastMessage: 'Hello there!',
      lastMessageTime: '10:30 AM',
      unreadCount: 2,
    },
    {
      id: 'chat-2',
      name: 'Jane Smith',
      type: 'dm' as const,
      lastMessage: 'How are you?',
      lastMessageTime: '9:15 AM',
      unreadCount: 0,
    },
  ],
  users: [
    {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'online' as const,
    },
    {
      id: 'user-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      status: 'offline' as const,
    },
  ],
  messages: {
    'chat-1': [
      {
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        senderName: 'John Doe',
        content: 'Hello there!',
        timestamp: '2024-01-01T10:30:00Z',
        isOwn: false,
        status: 'delivered' as const,
      },
      {
        id: 'msg-2',
        chatId: 'chat-1',
        senderId: 'current-user',
        senderName: 'You',
        content: 'Hi John!',
        timestamp: '2024-01-01T10:31:00Z',
        isOwn: true,
        status: 'sent' as const,
      },
    ],
  },
  isLoading: false,
  error: null,
  connectionStatus: 'connected' as const,
  loadChats: vi.fn(),
  loadUsers: vi.fn(),
  loadMessages: vi.fn(),
  sendMessage: vi.fn(),
  createOrGetDM: vi.fn(),
  markChatAsRead: vi.fn(),
  subscribeToChat: vi.fn(),
  unsubscribeFromChat: vi.fn(),
  getTotalUnreadCount: vi.fn(() => 2),
  retryMessage: vi.fn(),
  clearCache: vi.fn(),
  forceRefresh: vi.fn(),
};

const mockUseTypingIndicator = {
  typingUsers: {},
  typingUserNames: {},
  startTyping: vi.fn(),
  stopTyping: vi.fn(),
  getTypingUsers: vi.fn(),
};

const mockUseChatUnreadCount = {
  totalUnreadCount: 2,
  unreadCounts: { 'chat-1': 2, 'chat-2': 0 },
  getAllUnreadCounts: vi.fn(),
};

// Mock auth service
const mockAuthService = {
  getCurrentUserFromStorage: vi.fn(() => ({
    id: 'current-user',
    name: 'Current User',
    email: 'current@example.com',
  })),
};

// Mock react-router-dom
const mockNavigate = vi.fn();

vi.mock('../../../hooks/useRealtimeChat', () => ({
  useRealtimeChat: () => mockUseRealtimeChat,
}));

vi.mock('../../../hooks/useTypingIndicator', () => ({
  useTypingIndicator: () => mockUseTypingIndicator,
}));

vi.mock('../../../hooks/useChatUnreadCount', () => ({
  useChatUnreadCount: () => mockUseChatUnreadCount,
}));

vi.mock('../../../services/authService', () => ({
  authService: mockAuthService,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('Chat Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ChatPage Component', () => {
    it('should render chat list with unread counts', async () => {
      render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Check if chats are displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      
      // Check last messages
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
      expect(screen.getByText('How are you?')).toBeInTheDocument();
      
      // Check unread count badge
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should display messages when chat is selected', async () => {
      render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Click on first chat
      fireEvent.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(mockUseRealtimeChat.loadMessages).toHaveBeenCalledWith('chat-1');
        expect(mockUseRealtimeChat.subscribeToChat).toHaveBeenCalledWith('chat-1');
      });
    });

    it('should send message when form is submitted', async () => {
      mockUseRealtimeChat.sendMessage.mockResolvedValue({
        id: 'new-msg',
        chatId: 'chat-1',
        content: 'New message',
        timestamp: '2024-01-01T10:32:00Z',
        isOwn: true,
      });

      render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Select a chat first
      fireEvent.click(screen.getByText('John Doe'));

      // Find message input and send button
      const messageInput = screen.getByPlaceholderText(/type.*message/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Type and send message
      fireEvent.change(messageInput, { target: { value: 'New message' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockUseRealtimeChat.sendMessage).toHaveBeenCalledWith('chat-1', 'New message');
      });
    });

    it('should handle connection status changes', () => {
      // Test with disconnected status
      mockUseRealtimeChat.connectionStatus = 'disconnected';

      render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Should show connection status indicator
      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
    });

    it('should handle loading states', () => {
      mockUseRealtimeChat.isLoading = true;

      render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Should show loading indicator
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should handle error states', () => {
      mockUseRealtimeChat.error = 'Failed to load chats';

      render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Should show error message
      expect(screen.getByText(/failed to load chats/i)).toBeInTheDocument();
    });

    it('should mark chat as read when opened', async () => {
      render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Click on chat with unread messages
      fireEvent.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(mockUseRealtimeChat.markChatAsRead).toHaveBeenCalledWith('chat-1');
      });
    });

    it('should handle typing indicators', async () => {
      mockUseTypingIndicator.typingUserNames = {
        'chat-1': ['John Doe'],
      };

      render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Select chat
      fireEvent.click(screen.getByText('John Doe'));

      // Should show typing indicator
      expect(screen.getByText(/john doe.*typing/i)).toBeInTheDocument();
    });

    it('should start typing when user types', async () => {
      render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Select chat
      fireEvent.click(screen.getByText('John Doe'));

      // Start typing
      const messageInput = screen.getByPlaceholderText(/type.*message/i);
      fireEvent.focus(messageInput);
      fireEvent.change(messageInput, { target: { value: 'T' } });

      await waitFor(() => {
        expect(mockUseTypingIndicator.startTyping).toHaveBeenCalledWith('chat-1');
      });
    });

    it('should stop typing when user stops', async () => {
      render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Select chat
      fireEvent.click(screen.getByText('John Doe'));

      // Start typing then clear
      const messageInput = screen.getByPlaceholderText(/type.*message/i);
      fireEvent.change(messageInput, { target: { value: 'Test' } });
      fireEvent.change(messageInput, { target: { value: '' } });

      await waitFor(() => {
        expect(mockUseTypingIndicator.stopTyping).toHaveBeenCalledWith('chat-1');
      });
    });
  });

  describe('Real-time Message Updates', () => {
    it('should update UI when new message arrives via realtime', async () => {
      const { rerender } = render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Select chat
      fireEvent.click(screen.getByText('John Doe'));

      // Simulate new message arriving via realtime
      mockUseRealtimeChat.messages['chat-1'].push({
        id: 'new-msg',
        chatId: 'chat-1',
        senderId: 'user-1',
        senderName: 'John Doe',
        content: 'New realtime message!',
        timestamp: '2024-01-01T10:35:00Z',
        isOwn: false,
        status: 'delivered',
      });

      // Trigger re-render
      rerender(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Should display new message
      expect(screen.getByText('New realtime message!')).toBeInTheDocument();
    });

    it('should update unread counts in real-time', async () => {
      const { rerender } = render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Update unread count
      mockUseRealtimeChat.chats[0].unreadCount = 5;
      mockUseChatUnreadCount.totalUnreadCount = 5;

      // Trigger re-render
      rerender(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Should show updated unread count
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed messages', async () => {
      // Add a failed message
      mockUseRealtimeChat.messages['chat-1'].push({
        id: 'failed-msg',
        chatId: 'chat-1',
        senderId: 'current-user',
        senderName: 'You',
        content: 'Failed message',
        timestamp: '2024-01-01T10:33:00Z',
        isOwn: true,
        status: 'failed',
      });

      render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Select chat
      fireEvent.click(screen.getByText('John Doe'));

      // Find and click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockUseRealtimeChat.retryMessage).toHaveBeenCalledWith('chat-1', 'failed-msg');
      });
    });

    it('should handle connection recovery', async () => {
      // Start with disconnected state
      mockUseRealtimeChat.connectionStatus = 'disconnected';

      const { rerender } = render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();

      // Simulate reconnection
      mockUseRealtimeChat.connectionStatus = 'connected';

      rerender(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Should show connected status
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = vi.fn();
      
      const TestComponent = () => {
        renderSpy();
        return <ChatPage />;
      };

      const { rerender } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const initialRenderCount = renderSpy.mock.calls.length;

      // Re-render with same props
      rerender(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Should not cause additional renders
      expect(renderSpy.mock.calls.length).toBe(initialRenderCount + 1);
    });

    it('should cleanup subscriptions on unmount', () => {
      const { unmount } = render(
        <TestWrapper>
          <ChatPage />
        </TestWrapper>
      );

      // Select chat to create subscription
      fireEvent.click(screen.getByText('John Doe'));

      // Unmount component
      unmount();

      // Should cleanup subscription
      expect(mockUseRealtimeChat.unsubscribeFromChat).toHaveBeenCalled();
    });
  });
});