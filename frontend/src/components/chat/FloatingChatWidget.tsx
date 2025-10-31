import { useState, useRef, useEffect } from 'react';
import {
  MessageCircle, X, Send, Users, Search, Plus, Settings,
  ArrowLeft, Bell, History
} from 'lucide-react';
import { ChatBadge } from './ChatBadge';
import { useChat, Chat, User } from '../../hooks/useChat';

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
  }, [selectedChat, loadMessages, markChatAsRead]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current && selectedChat) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedChat]);

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

  // Debug logging
  useEffect(() => {
    console.log('Chat Debug - Users:', users.length, users);
    console.log('Chat Debug - Display Items:', displayItems.length, displayItems);
    console.log('Chat Debug - Active Tab:', activeTab);
    console.log('Chat Debug - Is Loading:', isLoading);
    console.log('Chat Debug - Error:', chatError);
  }, [users, displayItems, activeTab, isLoading, chatError]);

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

  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!content || !selectedChat) return;

    try {
      setMessageInput('');
      await sendChatMessage(selectedChat.id, content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
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

                {/* Debug: Refresh Users Button */}
                <button
                  onClick={() => {
                    console.log('🔄 Manual refresh users clicked');
                    loadUsers();
                  }}
                  className="w-full px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Refresh Users (Debug)
                </button>
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
                        <span className="text-sm text-gray-500 dark:text-gray-400">Online</span>
                      </div>
                    </div>
                  </div>

                  <button className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {selectedChat?.loading ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p>Loading messages...</p>
                    </div>
                  ) : !selectedChat || !messages[selectedChat.id] || messages[selectedChat.id].length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                      <button className="mt-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    messages[selectedChat.id]?.map((message) => {
                      const isMyMessage = message.senderId === getCurrentUserId();
                      return (
                        <div key={message.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-4`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isMyMessage
                            ? 'bg-blue-500 text-white rounded-br-sm'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                            }`}>
                            {!isMyMessage && (
                              <p className="text-xs font-medium mb-1 opacity-70">
                                {message.senderName || 'Unknown User'}
                              </p>
                            )}
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs mt-1 opacity-70">
                              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className={`flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
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

// Helper function to get current user ID
function getCurrentUserId(): string {
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.id || '';
    }
  } catch (error) {
    console.error('Failed to get current user ID:', error);
  }
  return '';
}