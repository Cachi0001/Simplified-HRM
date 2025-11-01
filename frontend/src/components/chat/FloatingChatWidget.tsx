import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Users, Search, Plus, Settings,
  ArrowLeft, Bell, History, Moon, Sun
} from 'lucide-react';
import { ChatBadge } from './ChatBadge';
import { useChat, Chat, User } from '../../hooks/useChat';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../lib/api';
import webSocketService from '../../services/WebSocketService';
import userStatusService from '../../services/UserStatusService';
import { IndicatorWrapper } from '../indicators/IndicatorWrapper';
import { IndicatorTest } from '../indicators/IndicatorTest';
import WhatsAppMessageList from './WhatsAppMessageList';
import { useMessageIndicators } from '../../hooks/useMessageIndicators';

interface FloatingChatWidgetProps {
  className?: string;
}

type TabType = 'dms' | 'announcements';

interface ExtendedChat extends Chat {
  userData?: User;
  loading?: boolean;
  isUser?: boolean;
}

export function FloatingChatWidget({ className = '' }: FloatingChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dms');
  const [selectedChat, setSelectedChat] = useState<ExtendedChat | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Use global theme instead of local state
  const { darkMode, toggleDarkMode } = useTheme();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use real chat hook
  const {
    chats,
    users,
    messages,
    isLoading,
    error: chatError,
    connectionStatus,
    loadMessages,
    loadUsers,
    sendMessage: sendChatMessage,
    retryMessage,
    createOrGetDM,
    markChatAsRead,
    getTotalUnreadCount,
    subscribeToChat,
    unsubscribeFromChat,
    startTyping,
    stopTyping,
    typingUsers: chatTypingUsers,
  } = useChat();

  // Initialize message indicators
  const { handleMessageSent, handleMessageReceived, hasActiveIndicator } = useMessageIndicators();

  // State for typing indicator - only show when actually typing
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Use typing users from useChat hook
  const currentChatTypingUsers = selectedChat ? (chatTypingUsers[selectedChat.id] || []) : [];

  // Initialize user status service
  useEffect(() => {
    userStatusService.initialize();
  }, []);

  // Remove conflicting real-time message state - messages are handled by useChat hook

  // Dark mode is now managed globally - no need for local storage

  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChat?.id) {
      console.log('🔍 useEffect: Loading messages for selected chat:', {
        chatId: selectedChat.id,
        chatName: selectedChat.name,
        isUser: selectedChat.isUser,
        userData: selectedChat.userData
      });

      // Load messages with a small delay to ensure chat is properly selected
      const loadTimer = setTimeout(() => {
        loadMessages(selectedChat.id);
        markChatAsRead(selectedChat.id);
      }, 100);

      return () => clearTimeout(loadTimer);
    }
  }, [selectedChat?.id, loadMessages, markChatAsRead]); // Include dependencies

  // Get messages for the selected chat
  const chatMessages = selectedChat?.id ? (messages[selectedChat.id] || []) : [];

  // Detailed logging for message display
  useEffect(() => {
    if (selectedChat?.id) {
      console.log('🔍 DETAILED: Message display update:', {
        chatId: selectedChat.id,
        messageCount: chatMessages.length,
        messagesState: messages,
        chatMessages: chatMessages.map(m => ({
          id: m.id,
          sender: m.senderId,
          isOwn: m.isOwn,
          content: m.content?.substring(0, 30) + '...'
        }))
      });
    }
  }, [selectedChat?.id, chatMessages.length, messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current && selectedChat) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, selectedChat]);

  // Clear typing indicators when switching chats
  useEffect(() => {
    setIsTyping(false);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
  }, [selectedChat?.id]);

  // Handle typing indicator
  const handleTypingChange = useCallback((value: string) => {
    if (!selectedChat) return;

    if (value.trim() && !isTyping) {
      // Start typing
      setIsTyping(true);
      startTyping(selectedChat.id);
    }

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    const newTimeout = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        stopTyping(selectedChat.id);
      }
    }, 2000);

    setTypingTimeout(newTimeout);
  }, [selectedChat, isTyping, typingTimeout, startTyping, stopTyping]);

  // Real-time message subscription (replaces polling)
  useEffect(() => {
    if (!selectedChat?.id) {
      console.log('🔍 No selected chat, skipping realtime setup');
      return;
    }

    console.log('🔄 Setting up realtime subscription for chat:', {
      chatId: selectedChat.id,
      chatName: selectedChat.name,
      chatType: selectedChat.type,
      connectionStatus
    });

    // Initial load of messages
    loadMessages(selectedChat.id);

    // Set up realtime subscription with retry logic
    let currentChannel: any = null;
    let retryCount = 0;
    const maxRetries = 3;
    let retryTimeout: NodeJS.Timeout | null = null;

    const setupSubscription = () => {
      console.log(`🔄 Setting up subscription attempt ${retryCount + 1}/${maxRetries + 1} for chat:`, selectedChat.id);

      try {
        currentChannel = subscribeToChat(selectedChat.id);

        // Monitor for connection failures and retry
        const connectionMonitor = setInterval(() => {
          if (connectionStatus === 'disconnected' && retryCount < maxRetries) {
            console.log(`🔄 Connection failed, scheduling retry ${retryCount + 1}/${maxRetries} for chat:`, selectedChat.id);
            retryCount++;

            // Clean up current channel
            if (currentChannel) {
              unsubscribeFromChat(currentChannel);
              currentChannel = null;
            }

            // Retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
            retryTimeout = setTimeout(() => {
              setupSubscription();
            }, delay);

            clearInterval(connectionMonitor);
          } else if (connectionStatus === 'connected') {
            // Reset retry count on successful connection
            retryCount = 0;
          }
        }, 3000);

        // Store monitor for cleanup
        if (currentChannel) {
          (currentChannel as any)._connectionMonitor = connectionMonitor;
        }

      } catch (error) {

        if (retryCount < maxRetries) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
          console.log(`🔄 Retrying subscription setup in ${delay}ms...`);

          retryTimeout = setTimeout(() => {
            setupSubscription();
          }, delay);
        }
      }
    };

    setupSubscription();

    return () => {

      // Clear retry timeout
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }

      // Clean up current channel
      if (currentChannel) {
        // Clear connection monitor
        if ((currentChannel as any)._connectionMonitor) {
          clearInterval((currentChannel as any)._connectionMonitor);
        }

        unsubscribeFromChat(currentChannel);
      }
    };
  }, [selectedChat?.id, loadMessages, subscribeToChat, unsubscribeFromChat, connectionStatus]);

  const totalUnreadCount = getTotalUnreadCount();

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'hr': return 'bg-blue-500 text-white';
      case 'super-admin': return 'bg-purple-500 text-white';
      case 'admin': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // WhatsApp-style time formatting for chat list
  const formatWhatsAppTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
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
    } catch (error) {
      return '';
    }
  };

  // For DMs, show available users to chat with. For chats, sort by latest message (WhatsApp style)
  const getDisplayItems = (): ExtendedChat[] => {
    if (activeTab === 'dms') {
      return users.filter(user => {
        if (searchQuery && !user.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      }).map(user => ({
        id: user.id,
        name: user.name || user.email || 'Unknown User',
        type: 'dm' as const,
        lastMessage: `${user.role || 'Member'} • Click to start chat`,
        lastMessageTime: userStatusService.getStatusText(user.id),
        unreadCount: 0,
        isUser: true,
        userData: user
      }));
    } else {
      // Sort chats by latest message timestamp (WhatsApp style)
      const filteredChats = chats.filter(chat => {
        // Groups removed - skip group filtering
        if (activeTab === 'announcements' && chat.type !== 'announcement') return false;
        if (searchQuery && !chat.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      });

      // Sort by latest message timestamp, with unread chats prioritized
      return filteredChats
        .map(chat => {
          // Get latest message for this chat
          const chatMessages = messages[chat.id] || [];
          const latestMessage = chatMessages.length > 0 
            ? chatMessages[chatMessages.length - 1] 
            : null;

          return {
            ...chat,
            lastMessage: latestMessage?.content || chat.lastMessage || 'No messages yet',
            lastMessageTime: latestMessage?.timestamp 
              ? formatWhatsAppTime(latestMessage.timestamp)
              : chat.lastMessageTime || '',
            // Add sort priority: unread messages first, then by timestamp
            sortTimestamp: latestMessage?.timestamp || chat.createdAt || '1970-01-01T00:00:00Z',
            hasUnread: chat.unreadCount > 0
          };
        })
        .sort((a, b) => {
          // First sort by unread status (unread chats first)
          if (a.hasUnread && !b.hasUnread) return -1;
          if (!a.hasUnread && b.hasUnread) return 1;
          
          // Then sort by latest message timestamp (newest first)
          return new Date(b.sortTimestamp).getTime() - new Date(a.sortTimestamp).getTime();
        });
    }
  };

  const displayItems = getDisplayItems();

  // Handle chat errors silently
  useEffect(() => {
    // Errors are handled by the useChat hook
  }, [chatError]);

  const handleChatSelect = async (item: ExtendedChat) => {
    try {
      // Show loading state immediately
      setSelectedChat({
        ...item,
        loading: true
      });

      if (item.isUser) {
        // Create or get DM with this user
        const dmChat = await createOrGetDM(item.userData.id);
        if (dmChat) {
          console.log('🔍 DM Chat created/retrieved:', {
            dmChatId: dmChat.id,
            recipientId: item.userData.id,
            recipientName: item.userData.name
          });

          setSelectedChat({
            ...dmChat,
            userData: item.userData,
            loading: false
          });

          // Load messages with the correct DM chat ID
          console.log('📜 Loading messages for DM chat:', dmChat.id);
          loadMessages(dmChat.id);
        }
      } else {
        // Regular chat selection
        setSelectedChat({
          ...item,
          loading: false
        });
        // Load messages in background
        loadMessages(item.id);
      }
    } catch (error) {
      console.error('Failed to select chat:', error);
      setSelectedChat(null);
    }
  };

  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!content || !selectedChat || isSending) return;

    try {
      setIsSending(true);
      setMessageInput('');
      
      // Stop typing indicator when sending message
      if (isTyping) {
        setIsTyping(false);
        stopTyping(selectedChat.id);
        if (typingTimeout) {
          clearTimeout(typingTimeout);
          setTypingTimeout(null);
        }
      }

      console.log('📤 Sending message to chat:', {
        chatId: selectedChat.id,
        content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        chatName: selectedChat.name
      });

      await sendChatMessage(selectedChat.id, content);
      
      // Trigger message indicator for current user
      const currentUserId = getCurrentUserId();
      if (currentUserId) {
        handleMessageSent(currentUserId, selectedChat.id);
        console.log('✨ Message indicator triggered for user:', currentUserId);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message input on error
      setMessageInput(content);
    } finally {
      setIsSending(false);
    }
  };

  // Helper function to get current user ID
  const getCurrentUserId = () => {
    try {
      // Try multiple possible keys for user data
      const possibleKeys = ['user', 'currentUser', 'authUser', 'userData'];

      for (const key of possibleKeys) {
        const storedData = localStorage.getItem(key);
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            if (parsed && (parsed.id || parsed.userId || parsed.user_id)) {
              return parsed.id || parsed.userId || parsed.user_id;
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
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));

          const decoded = JSON.parse(jsonPayload);
          if (decoded && (decoded.id || decoded.userId || decoded.user_id || decoded.sub)) {
            return decoded.id || decoded.userId || decoded.user_id || decoded.sub;
          }
        } catch (tokenError) {
          // Silent fail
        }
      }
    } catch (error) {
      console.error('Failed to get current user ID:', error);
    }
    return null;
  };

  // Authentication guard
  const isAuthenticated = !!localStorage.getItem('accessToken');
  const isLanding = typeof window !== 'undefined' && window.location.pathname === '/';
  if (!isAuthenticated || isLanding) {
    return null;
  }

  const themeClasses = darkMode
    ? 'bg-gray-900 text-white border-gray-700 transition-colors duration-300'
    : 'bg-white text-gray-900 border-gray-200 transition-colors duration-300';

  // Chat button when closed
  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <div className="relative">
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-300"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            }}
            title="Open Chat"
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </button>
          <ChatBadge count={totalUnreadCount} />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal Container - Fixed positioning that works at all zoom levels */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div
          className={`${themeClasses} rounded-xl shadow-2xl border transition-all duration-300 w-full h-full sm:w-[85vw] sm:h-[85vh] sm:max-w-5xl sm:max-h-[700px] sm:min-h-[500px] overflow-hidden flex flex-col`}
          style={{
            maxHeight: 'calc(100vh - 2rem)', // Ensure modal never exceeds viewport minus padding
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5" />
              <h3 className="font-semibold text-lg">Go3net Chat</h3>
              {totalUnreadCount > 0 && (
                <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </div>
              )}
            </div>



            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded hover:bg-white/20 transition-all duration-200"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded hover:bg-white/20 transition-colors"
                title="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar - DMs List */}
            <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
              {/* Tab Navigation */}
              <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
                {[
                  { key: 'dms', label: 'DMs', icon: MessageCircle },
                  { key: 'announcements', label: 'News', icon: Bell }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as TabType)}
                    className={`flex-1 p-3 text-xs font-medium transition-colors flex flex-col items-center gap-1 ${activeTab === key
                      ? darkMode ? 'bg-gray-800 text-blue-400' : 'bg-blue-50 text-blue-600'
                      : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="p-4 flex-shrink-0">
                <div className="relative mb-2">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                  />
                </div>

                {/* Debug Panel */}
                <div className="space-y-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  <button
                    onClick={() => {
                      loadUsers();
                    }}
                    className="w-full px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Refresh Users
                  </button>
                  {selectedChat && (
                    <button
                      onClick={() => {
                        console.log('🔍 Debug: Current message state:', {
                          selectedChatId: selectedChat.id,
                          messageCount: chatMessages.length,
                          messages: chatMessages,
                          allMessagesState: messages
                        });
                        loadMessages(selectedChat.id);
                      }}
                      className="w-full px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      Debug Messages
                    </button>
                  )}
                  <button
                    onClick={() => {
                      // Test indicator for current user
                      const currentUserId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}').id : 'test-user';
                      window.dispatchEvent(new CustomEvent('message-indicator', {
                        detail: {
                          type: 'message_sent',
                          userId: currentUserId,
                          chatId: selectedChat?.id || 'test-chat',
                          timestamp: Date.now(),
                          messageId: `test-${Date.now()}`
                        }
                      }));
                      console.log('✨ Test indicator triggered for user:', currentUserId);
                    }}
                    className="w-full px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                  >
                    Test Indicator
                  </button>
                </div>
              </div>

              {/* User/Chat List */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className={`p-6 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm">Loading users...</p>
                  </div>
                ) : displayItems.length === 0 ? (
                  <div className={`p-6 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {activeTab === 'dms' ? 'No users available' : 'No chats found'}
                    </p>
                    {chatError && (
                      <p className="text-xs mt-2 text-red-500">
                        Error please click the refresh button
                      </p>
                    )}
                  </div>
                ) : (
                  displayItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleChatSelect(item)}
                      className={`p-4 border-b cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedChat?.id === item.id
                        ? darkMode ? 'bg-gray-800' : 'bg-blue-50'
                        : darkMode ? 'border-gray-700' : 'border-gray-100'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Circular Avatar (40px) with status indicator */}
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <IndicatorWrapper userId={item.id}>
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
                              {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          </IndicatorWrapper>
                          {/* Status indicator */}
                          {item.isUser && (
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${userStatusService.getStatusColor(item.userData?.id || '')}`}></div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-sm truncate">{item.name}</h4>
                            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {item.lastMessageTime}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {/* Show message preview with sender info for groups */}
                              <div className="flex-1 min-w-0">
                                {!item.isUser && item.lastMessage && item.lastMessage !== 'No messages yet' ? (
                                  <div className="flex items-center gap-1">
                                    {/* Show "You:" for own messages in groups */}
                                    {(() => {
                                      const chatMessages = messages[item.id] || [];
                                      const latestMessage = chatMessages[chatMessages.length - 1];
                                      const currentUserId = getCurrentUserId();
                                      const isOwnMessage = latestMessage && String(latestMessage.senderId) === String(currentUserId);
                                      
                                      return isOwnMessage ? (
                                        <span className={`text-xs font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                          You:
                                        </span>
                                      ) : null;
                                    })()}
                                    <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {item.lastMessage}
                                    </p>
                                  </div>
                                ) : (
                                  <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {item.lastMessage}
                                  </p>
                                )}
                              </div>
                              
                              {/* Role Badge for non-employees */}
                              {item.userData?.role && item.userData.role !== 'employee' && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(item.userData.role)}`}>
                                  {item.userData.role}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 ml-2">
                              {/* Message status for own messages */}
                              {(() => {
                                const chatMessages = messages[item.id] || [];
                                const latestMessage = chatMessages[chatMessages.length - 1];
                                const currentUserId = getCurrentUserId();
                                const isOwnMessage = latestMessage && String(latestMessage.senderId) === String(currentUserId);
                                
                                if (isOwnMessage && latestMessage?.status) {
                                  return (
                                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {latestMessage.status === 'sending' && '⏳'}
                                      {latestMessage.status === 'sent' && '✓'}
                                      {latestMessage.status === 'delivered' && '✓✓'}
                                      {latestMessage.status === 'read' && '✓✓'}
                                      {latestMessage.status === 'failed' && '❌'}
                                    </span>
                                  );
                                }
                                return null;
                              })()}

                              {/* Unread count badge */}
                              {item.unreadCount > 0 && (
                                <div className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Messages Area */}
            {selectedChat && (
              <div className="flex-1 flex flex-col">
                {/* Chat Header */}
                <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedChat(null)}
                      className={`p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors md:hidden`}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    {/* Avatar */}
                    <IndicatorWrapper userId={selectedChat.userData?.id || selectedChat.id}>
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
                        {selectedChat.userData?.name?.charAt(0).toUpperCase() || selectedChat.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </IndicatorWrapper>

                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {selectedChat.userData?.name || selectedChat.name || 'Chat'}
                      </h3>
                      <div className="flex items-center gap-2">
                        {selectedChat.userData?.role && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(selectedChat.userData.role)}`}>
                            {selectedChat.userData.role}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
                            connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {connectionStatus === 'connected' ? 'Real-time' :
                              connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Connection Status Banner */}
                {connectionStatus === 'disconnected' && (
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-center text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <span>⚠️ Real-time connection failed. Messages may not update automatically.</span>
                      <button
                        onClick={() => {
                          if (selectedChat) {
                            console.log('🔄 Refreshing messages...');
                            loadMessages(selectedChat.id);
                          }
                        }}
                        className="ml-2 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
                      >
                        Refresh Messages
                      </button>
                      <button
                        onClick={() => {
                          if (selectedChat) {
                            console.log('🔄 Refreshing messages...');
                            loadMessages(selectedChat.id);
                          }
                        }}
                        className="ml-2 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
                      >
                        Refresh Messages
                      </button>
                      <button
                        onClick={() => {
                          if (selectedChat) {
                            console.log('🔄 Retrying real-time connection...');
                            const channel = subscribeToChat(selectedChat.id);
                            // Store channel for cleanup
                            (selectedChat as any)._realtimeChannel = channel;
                          }
                        }}
                        className="ml-2 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
                      >
                        Retry Connection
                      </button>
                    </div>
                  </div>
                )}

                {/* Messages - WhatsApp Style */}
                {selectedChat?.loading ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p>Loading messages...</p>
                    </div>
                  </div>
                ) : (
                  <WhatsAppMessageList
                    messages={chatMessages}
                    currentUserId={getCurrentUserId()}
                    onRetryMessage={retryMessage}
                    darkMode={darkMode}
                  />
                )}
                
                <div ref={messagesEndRef} />

                {/* Typing Indicator - Only show when someone is actually typing */}
                {currentChatTypingUsers.length > 0 && (
                  <div className="px-4 py-2">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-xs">
                        {currentChatTypingUsers.length === 1
                          ? `${currentChatTypingUsers[0]} is typing...`
                          : `${currentChatTypingUsers.length} people are typing...`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Message Input */}
                <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value);
                        handleTypingChange(e.target.value);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      disabled={isSending}
                      className={`flex-1 px-4 py-2 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                        } ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || isSending}
                      className={`p-2 rounded-full transition-colors ${messageInput.trim() && !isSending
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                      {isSending ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}