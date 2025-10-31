import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Users, Search, Plus, Settings,
  ArrowLeft, Bell, History
} from 'lucide-react';
import { ChatBadge } from './ChatBadge';
import { useChat, Chat, User } from '../../hooks/useChat';
import api from '../../lib/api';

interface FloatingChatWidgetProps {
  className?: string;
}

type TabType = 'dms' | 'groups' | 'announcements' | 'history';

// Extended Chat interface to include additional properties we need
interface ExtendedChat extends Chat {
  userData?: User;
  loading?: boolean;
  isUser?: boolean;
}

/**
 * Fixed Modal Chat Widget with Responsive Design
 * Features:
 * - Fixed modal positioning that works at all zoom levels
 * - Responsive design: full-screen mobile, 80% desktop
 * - Proper message bubble design with avatars
 * - Color-coded role badges
 * - Real-time messaging
 */
export function FloatingChatWidget({ className = '' }: FloatingChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dms');
  const [selectedChat, setSelectedChat] = useState<ExtendedChat | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('chatWidgetDarkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use real chat hook
  const {
    chats,
    users,
    messages,
    isLoading,
    error: chatError,
    loadMessages,
    loadUsers,
    sendMessage: sendChatMessage,
    createOrGetDM,
    markChatAsRead,
    getTotalUnreadCount,
  } = useChat();

  // State for typing indicator - only show when actually typing
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Temporarily disable real-time to fix WebSocket errors
  const realtimeMessages: any[] = [];
  const connectionStatus = 'disconnected';
  const clearRealtimeMessages = useCallback(() => { }, []);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('chatWidgetDarkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
      markChatAsRead(selectedChat.id);
    }
  }, [selectedChat?.id]); // Only depend on selectedChat.id to prevent infinite loops

  // Combine regular messages with real-time messages
  const regularMessages = selectedChat?.id ? (messages[selectedChat.id] || []) : [];
  const allMessages = [...regularMessages, ...realtimeMessages];

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current && selectedChat) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages, selectedChat]);

  // Clear typing indicators and real-time messages when switching chats
  useEffect(() => {
    setTypingUsers([]);
    setIsTyping(false);
    clearRealtimeMessages();
  }, [selectedChat?.id, clearRealtimeMessages]); // clearRealtimeMessages is now stable with useCallback

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

  // For DMs, show available users to chat with
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
        lastMessageTime: user.status || 'Online',
        unreadCount: 0,
        isUser: true,
        userData: user
      }));
    } else {
      return chats.filter(chat => {
        if (activeTab === 'groups' && chat.type !== 'group') return false;
        if (activeTab === 'announcements' && chat.type !== 'announcement') return false;
        if (searchQuery && !chat.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      }).map(chat => ({ ...chat }));
    }
  };

  const displayItems = getDisplayItems();

  // Reduced debug logging for performance
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && chatError) {
      console.log('Chat Error:', chatError);
    }
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
          setSelectedChat({
            ...dmChat,
            userData: item.userData,
            loading: false
          });
          // Load messages in background
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
      await sendChatMessage(selectedChat.id, content);
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
      // Debug: Check what's in localStorage
      console.log('🔍 Checking localStorage for user data...');
      console.log('localStorage keys:', Object.keys(localStorage));
      
      // Try multiple possible keys
      const possibleKeys = ['user', 'currentUser', 'authUser', 'userData'];
      
      for (const key of possibleKeys) {
        const storedData = localStorage.getItem(key);
        if (storedData) {
          console.log(`✅ Found data in localStorage['${key}']:`, storedData);
          try {
            const parsed = JSON.parse(storedData);
            if (parsed && (parsed.id || parsed.userId || parsed.user_id)) {
              const userId = parsed.id || parsed.userId || parsed.user_id;
              console.log(`✅ Extracted user ID: ${userId} from key: ${key}`);
              return userId;
            }
          } catch (parseError) {
            console.log(`❌ Failed to parse data from ${key}:`, parseError);
          }
        }
      }
      
      // Also check if there's a token with user info
      const token = localStorage.getItem('accessToken');
      if (token) {
        console.log('🔍 Found accessToken, checking if it contains user info...');
        try {
          // Try to decode JWT token (basic decode, not verification)
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const decoded = JSON.parse(jsonPayload);
          console.log('🔍 Decoded token payload:', decoded);
          
          if (decoded && (decoded.id || decoded.userId || decoded.user_id || decoded.sub)) {
            const userId = decoded.id || decoded.userId || decoded.user_id || decoded.sub;
            console.log(`✅ Extracted user ID from token: ${userId}`);
            return userId;
          }
        } catch (tokenError) {
          console.log('❌ Failed to decode token:', tokenError);
        }
      }
      
      console.log('❌ No user ID found in localStorage');
    } catch (error) {
      console.error('❌ Failed to get current user ID:', error);
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
    ? 'bg-gray-900 text-white border-gray-700'
    : 'bg-white text-gray-900 border-gray-200';

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
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded hover:bg-white/20 transition-colors"
                title="Toggle Dark Mode"
              >
                {darkMode ? '☀️' : '🌙'}
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
                  { key: 'groups', label: 'Groups', icon: Users },
                  { key: 'announcements', label: 'News', icon: Bell },
                  { key: 'history', label: 'History', icon: History }
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
                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Debug Panel</div>

                  <button
                    onClick={() => {
                      console.log('🔄 Manual refresh users clicked');
                      loadUsers();
                    }}
                    className="w-full px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Refresh Users
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        console.log('🔍 Testing server connection...');

                        // Test both direct fetch and API client
                        const directResponse = await fetch('http://localhost:3000/api/health');
                        const directData = await directResponse.json();
                        console.log('✅ Direct fetch health check:', directData);

                        // Test via API client
                        const apiResponse = await api.get('/health');
                        console.log('✅ API client health check:', apiResponse.data);

                        alert(`Server is running!\\nDirect: ${JSON.stringify(directData)}\\nAPI: ${JSON.stringify(apiResponse.data)}`);
                      } catch (error) {
                        console.error('❌ Server health check failed:', error);
                        alert(`Server connection failed: ${error instanceof Error ? error.message : 'Unknown error'}\\n\\nMake sure the backend server is running on port 3000.`);
                      }
                    }}
                    className="w-full px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    Test Server
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        console.log('🔍 Testing employees endpoint...');
                        const response = await api.get('/employees/for-chat');
                        console.log('✅ Employees endpoint response:', response.data);
                        alert(`Employees endpoint works!\\n${JSON.stringify(response.data, null, 2)}`);
                      } catch (error) {
                        console.error('❌ Employees endpoint failed:', error);
                        alert(`Employees endpoint failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      }
                    }}
                    className="w-full px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                  >
                    Test Employees API
                  </button>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Users: {users.length} | Error: {chatError || 'None'}
                  </div>
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
                        Error: {chatError}
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
                        {/* Circular Avatar (40px) */}
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                          {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-sm truncate">{item.name}</h4>
                            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {item.lastMessageTime}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {item.lastMessage}
                              </p>
                              {/* Role Badge for non-employees */}
                              {item.userData?.role && item.userData.role !== 'employee' && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(item.userData.role)}`}>
                                  {item.userData.role}
                                </span>
                              )}
                            </div>

                            {item.unreadCount > 0 && (
                              <div className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-2">
                                {item.unreadCount > 99 ? '99+' : item.unreadCount}
                              </div>
                            )}
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
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
                      {selectedChat.userData?.name?.charAt(0).toUpperCase() || selectedChat.name?.charAt(0).toUpperCase() || 'U'}
                    </div>

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
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Online</span>
                        </div>
                      </div>
                    </div>

                    <button className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {selectedChat?.loading ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p>Loading messages...</p>
                    </div>
                  ) : allMessages.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                      <button className="mt-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    allMessages.map((message: any) => {
                      const currentUserId = getCurrentUserId();

                      // Handle both message formats (useChat vs useRealtimeChat)
                      const senderId = message.senderId || message.sender_id;
                      const messageContent = message.content || message.message;
                      const senderName = message.senderName || message.sender_name || 'Unknown User';
                      const messageId = message.id;
                      const timestamp = message.timestamp || message.created_at;

                      // Handle type mismatches by converting both to strings
                      const isMyMessage = String(senderId) === String(currentUserId) && currentUserId !== '';

                      // 🔍 Debug logging for message positioning
                      console.log('💬 Message Debug:', {
                        messageId: messageId?.substring(0, 8) + '...',
                        senderId,
                        currentUserId,
                        isMyMessage,
                        senderName,
                        content: messageContent?.substring(0, 30) + '...',
                        side: isMyMessage ? '➡️ RIGHT (MY MESSAGE)' : '⬅️ LEFT (RECEIVED)'
                      });

                      return (
                        <div key={messageId} className={`flex items-end gap-3 mb-6 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                          {isMyMessage ? (
                            // 📤 MY MESSAGE - RIGHT SIDE (SENT)
                            <div className="flex items-end gap-3 max-w-[75%]">
                              <div className="flex flex-col items-end">
                                <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md shadow-lg">
                                  <p className="text-sm leading-relaxed break-words">{messageContent}</p>
                                  <div className="flex items-center justify-end gap-1 mt-2 text-blue-100">
                                    <span className="text-xs">
                                      {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-xs">✓✓</span>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 mr-2">You</div>
                              </div>
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-lg border-2 border-white">
                                ME
                              </div>
                            </div>
                          ) : (
                            // 📥 RECEIVED MESSAGE - LEFT SIDE (RECEIVED)
                            <div className="flex items-end gap-3 max-w-[75%]">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-lg border-2 border-white">
                                {senderName?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div className="flex flex-col items-start">
                                <div className="px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl rounded-bl-md shadow-lg border border-gray-200 dark:border-gray-600">
                                  <p className="text-xs font-semibold mb-2 text-blue-600 dark:text-blue-400">
                                    {senderName}
                                  </p>
                                  <p className="text-sm leading-relaxed break-words">{messageContent}</p>
                                  <div className="flex items-center justify-end gap-1 mt-2 text-gray-500 dark:text-gray-400">
                                    <span className="text-xs">
                                      {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 ml-2">{senderName}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />

                  {/* Typing Indicator - Only show when someone is actually typing */}
                  {typingUsers.length > 0 && (
                    <div className="px-4 py-2">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-xs">
                          {typingUsers.length === 1
                            ? `${typingUsers[0]} is typing...`
                            : `${typingUsers.length} people are typing...`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
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