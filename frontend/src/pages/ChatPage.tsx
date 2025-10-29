import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Send, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { useChat } from '@/hooks/useChat';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useChatUnreadCount } from '@/hooks/useChatUnreadCount';
import { authService } from '@/services/authService';
import type { ChatMessage as ChatMessageType, GroupChat } from '@/types/chat';
import api from '@/lib/api';

/**
 * ChatPage Component
 * Full-featured chat page with:
 * - Chat list with unread badge
 * - Message display with typing indicators
 * - Read receipts
 * - Message sending
 * - Real-time updates
 */
export default function ChatPage() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [chats, setChats] = useState<GroupChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLocallyTyping, setIsLocallyTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Hooks
  const {
    messages,
    isLoading: isMessagesLoading,
    error: messagesError,
    sendMessage,
    markChatAsRead,
    getChatHistory
  } = useChat();

  const {
    typingUsers,
    startTyping,
    stopTyping,
    getTypingUsers
  } = useTypingIndicator();

  const {
    totalUnreadCount,
    unreadCounts,
    getAllUnreadCounts
  } = useChatUnreadCount();

  // Get current user on mount
  useEffect(() => {
    try {
      const user = authService.getCurrentUserFromStorage();
      setCurrentUser(user);
    } catch (err) {
      console.error('Error getting current user:', err);
      navigate('/auth');
    }
  }, [navigate]);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, []);

  // Load chat history when chat is selected
  useEffect(() => {
    if (selectedChatId) {
      loadChatHistory();
      markChatAsRead(selectedChatId).catch(err =>
        console.error('Failed to mark chat as read:', err)
      );
    }
  }, [selectedChatId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for typing users
  useEffect(() => {
    if (!selectedChatId) return;

    const interval = setInterval(() => {
      getTypingUsers(selectedChatId).catch(err =>
        console.error('Failed to get typing users:', err)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedChatId, getTypingUsers]);

  const loadChats = async () => {
    try {
      setIsLoadingChats(true);
      const response = await api.get('/chat/list');

      if (response.data?.data?.chats) {
        setChats(response.data.data.chats);

        // Select first chat if available
        if (response.data.data.chats.length > 0 && !selectedChatId) {
          setSelectedChatId(response.data.data.chats[0].id);
        }
      }

      // Refresh unread counts
      await getAllUnreadCounts();
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const loadChatHistory = async () => {
    if (!selectedChatId) return;

    try {
      setIsLoadingMessages(true);
      await getChatHistory(selectedChatId, 1, 100);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim() || !selectedChatId || !currentUser) return;

    try {
      // Stop typing indicator
      await stopTyping(selectedChatId).catch(err =>
        console.error('Failed to stop typing indicator:', err)
      );

      // Send message
      const message = messageText.trim();
      setMessageText('');
      setIsLocallyTyping(false);

      await sendMessage(selectedChatId, message);

      // Mark as read
      await markChatAsRead(selectedChatId).catch(err =>
        console.error('Failed to mark chat as read:', err)
      );

      // Refresh unread counts
      await getAllUnreadCounts().catch(err =>
        console.error('Failed to refresh unread counts:', err)
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      // Restore message text on error
      setMessageText(messageText);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageText(value);

    if (!selectedChatId || !currentUser) return;

    // Start typing indicator
    if (value.length > 0 && !isLocallyTyping) {
      setIsLocallyTyping(true);
      startTyping(selectedChatId).catch(err =>
        console.error('Failed to start typing indicator:', err)
      );
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsLocallyTyping(false);
        stopTyping(selectedChatId).catch(err =>
          console.error('Failed to stop typing indicator:', err)
        );
      }, 2000);
    }
  };

  const getUnreadCountForChat = (chatId: string): number => {
    const count = unreadCounts.find(uc => uc.chat_id === chatId);
    return count?.unread_count || 0;
  };

  const getTypingUserNames = (): string[] => {
    return typingUsers.filter(userId => userId !== currentUser?.id);
  };

  // Filter out current user from messages to determine if "own" message
  const getMessageProps = (msg: ChatMessageType) => ({
    id: msg.id,
    senderName: msg.senderName || 'Unknown',
    senderAvatar: msg.senderAvatar,
    content: msg.message,
    timestamp: msg.timestamp,
    isOwn: msg.sender_id === currentUser?.id,
    readAt: msg.read_at,
    status: msg.read_at ? 'read' : msg.delivered_at ? 'delivered' : msg.sent_at ? 'sent' : 'sending'
  });

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 flex overflow-hidden" style={{ top: 0, bottom: '64px' }}>
      {/* Chats List - Fixed width sidebar */}
      <div className="w-full sm:w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-hidden h-full">
        {/* Header - Fixed height */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 flex-shrink-0 h-20">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 truncate">
            Chats
            {totalUnreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-white bg-red-600 rounded-full flex-shrink-0">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
          </h1>
        </div>

        {/* Chat List - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {isLoadingChats ? (
            <div className="flex items-center justify-center h-full">
              <Loader className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : chats.length === 0 ? (
            <div className="flex items-center justify-center h-full p-4 text-center">
              <p className="text-gray-500 dark:text-gray-400">No chats yet. Start a conversation!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {chats.map((chat) => {
                const unreadCount = getUnreadCountForChat(chat.id);
                return (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`w-full text-left p-4 transition-colors ${
                      selectedChatId === chat.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {chat.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {chat.participant_count || 0} participants
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 min-w-fit text-xs font-semibold text-white bg-red-600 rounded-full flex-shrink-0">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Messages Area - Flexible width and height */}
      <div className="hidden sm:flex flex-1 flex-col bg-white dark:bg-gray-800 overflow-hidden h-full">
        {selectedChatId ? (
          <>
            {/* Messages Container - Scrollable */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      {...getMessageProps(msg)}
                    />
                  ))}
                </>
              )}

              {/* Typing Indicator */}
              {getTypingUserNames().length > 0 && (
                <TypingIndicator users={getTypingUserNames()} />
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input - Fixed at bottom */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0"
            >
              <div className="flex items-center gap-2">
                <input
                  ref={messageInputRef}
                  type="text"
                  value={messageText}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex-shrink-0"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              {messagesError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{messagesError}</p>
              )}
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}