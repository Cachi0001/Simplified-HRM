import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { MessageCircle, X, Send, Search, Moon, Sun, Maximize2, Minimize2 } from 'lucide-react';
import { useChatUnreadCount } from '@/hooks/useChatUnreadCount';
import { authService } from '@/services/authService';
import api from '@/lib/api';

interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
  unreadCount: number;
  avatar?: string;
  type: 'dm' | 'group' | 'announcement';
  fullName?: string;
  email?: string;
  role?: string;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  senderName: string;
  message: string;
  timestamp: string;
  read_at?: string;
}

type TabType = 'dms' | 'groups' | 'announcements' | 'history';

const WIDGET_DEFAULT_POS = { x: 20, y: 20 };

export function FloatingChatWidget() {
  const { totalUnreadCount, getAllUnreadCounts } = useChatUnreadCount();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('chatWidgetDarkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [activeTab, setActiveTab] = useState<TabType>('dms');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const fullscreenRef = useRef(null);

  // Load current user
  useEffect(() => {
    try {
      const user = authService.getCurrentUserFromStorage();
      setCurrentUser(user);
    } catch (err) {
      console.error('Error loading user:', err);
    }
  }, []);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('chatWidgetDarkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Load chats when tab changes or user role changes
  useEffect(() => {
    if (isOpen) {
      loadChats();
    }
  }, [activeTab, isOpen, currentUser?.role]);

  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
      loadMessages();
    }
  }, [selectedChat]);

  // Handle ESC key for fullscreen exit
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [isFullscreen]);

  // Typing indicator logic
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;
    if (isTyping && selectedChat) {
      api.post(`/chat/${selectedChat.id}/typing`);
      typingTimeout = setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    }
    return () => clearTimeout(typingTimeout);
  }, [messageText, selectedChat]);

  // Listen for typing events
  useEffect(() => {
    if (selectedChat) {
      // Replace with your actual real-time subscription logic (e.g., Supabase)
      const channel = `typing-${selectedChat.id}`;
      const handleTyping = (user: string) => {
        setTypingUsers(prev => [...prev, user]);
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u !== user));
        }, 3000);
      };
      // Example: document.addEventListener(channel, (e) => handleTyping(e.detail.user));
      // return () => document.removeEventListener(channel, (e) => handleTyping(e.detail.user));
    }
  }, [selectedChat]);

  // Role-based chat filtering for history
  const shouldShowChatInHistory = (chat: Chat, userRole: string): boolean => {
    switch (userRole) {
      case 'super-admin':
        // Super-admin sees all conversations
        return true;
      
      case 'admin':
        // Admin sees all except super-admin personal conversations
        return !chat.name?.includes('super-admin') && chat.role !== 'super-admin';
      
      case 'hr':
        // HR sees all except admin and super-admin conversations
        return !['admin', 'super-admin'].includes(chat.role || '');
      
      case 'employee':
        // Employees only see their own conversations
        return chat.id.includes(currentUser?.id) || chat.name === currentUser?.full_name;
      
      default:
        return false;
    }
  };

  const loadChats = async () => {
    try {
      setIsLoading(true);
      
      if (activeTab === 'dms') {
        // Load all users for DMs
        console.log('Loading users for DMs...');
        const response = await api.get('/employees');
        console.log('API Response:', response.data);
        
        if (response.data?.data) {
          const users = response.data.data.filter((user: any) => user.id !== currentUser?.id);
          console.log('Filtered users:', users);
          
          const formattedChats: Chat[] = users.map((user: any) => ({
            id: user.id, // Use actual user ID for DM chat
            name: user.full_name || user.email,
            lastMessage: '',
            unreadCount: 0,
            avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.email)}&background=random`,
            type: 'dm' as const,
            fullName: user.full_name,
            email: user.email,
            role: user.role
          }));
          console.log('Formatted chats:', formattedChats);
          setChats(formattedChats);
        } else {
          console.log('No data in response');
          setChats([]);
        }
      } else if (activeTab === 'announcements') {
        // Load announcements
        try {
          const response = await api.get('/announcements');
          if (response.data?.data) {
            const formattedAnnouncements: Chat[] = response.data.data.map((announcement: any) => ({
              id: announcement.id,
              name: announcement.title,
              lastMessage: announcement.content?.substring(0, 100) + '...',
              unreadCount: 0,
              avatar: `https://ui-avatars.com/api/?name=📢&background=4f46e5&color=fff`,
              type: 'announcement' as const,
              fullName: announcement.title,
              email: `By: ${announcement.author_name}`,
              role: 'announcement'
            }));
            setChats(formattedAnnouncements);
          } else {
            setChats([]);
          }
        } catch (err) {
          console.log('No announcements endpoint yet');
          setChats([]);
        }
      } else {
        // For other tabs, show empty for now
        setChats([]);
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
      setChats([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedChat) return;

    try {
      setIsLoading(true);
      // Create a chat ID for DM between current user and selected user
      const chatId = `dm_${Math.min(currentUser.id, selectedChat.id)}_${Math.max(currentUser.id, selectedChat.id)}`;
      
      const response = await api.get(`/chat/${chatId}/history`, {
        params: { limit: 50 }
      });

      if (response.data?.data?.messages) {
        setMessages(response.data.data.messages);
      } else {
        // No messages yet, start with empty array
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      // Start with empty messages if chat doesn't exist yet
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;

    try {
      // Create a chat ID for DM between current user and selected user
      const chatId = `dm_${Math.min(currentUser.id, selectedChat.id)}_${Math.max(currentUser.id, selectedChat.id)}`;
      
      await api.post('/chat/send', {
        chatId: chatId,
        message: messageText
      });
      setMessageText('');
      loadMessages();
      getAllUnreadCounts();
    } catch (err) {
      console.error('Failed to send message:', err);
      // Add user feedback for errors
      alert('Failed to send message. Please try again.');
    }
  };

  const createAnnouncement = async (title: string, content: string) => {
    try {
      await api.post('/announcements', {
        title,
        content,
        priority: 'normal'
      });
      alert('Announcement created successfully! All users will be notified.');
      // Reload announcements if we're on that tab
      if (activeTab === 'announcements') {
        loadChats();
      }
    } catch (err) {
      console.error('Failed to create announcement:', err);
      alert('Failed to create announcement. Please try again.');
    }
  };

  const filteredChats = chats.filter(chat =>
    (chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.fullName && chat.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (chat.email && chat.email.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const bgColor = darkMode ? 'bg-gray-900' : 'bg-white';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const inputBg = darkMode ? 'bg-gray-800' : 'bg-gray-100';

  // Don't render if user is not authenticated or on auth pages
  if (!currentUser || !authService.isAuthenticated()) return null;
  
  // Don't render on auth pages
  const isAuthPage = window.location.pathname.includes('/auth') || 
                     window.location.pathname.includes('/confirm') || 
                     window.location.pathname.includes('/reset-password');
  if (isAuthPage) return null;

  // Calculate draggable bounds to keep bubble visible
  const calculateBounds = () => {
    if (typeof window === 'undefined') return 'parent';
    return {
      left: 0,
      top: 0,
      right: window.innerWidth - 56, // 56px = button width
      bottom: window.innerHeight - 56 // 56px = button height
    };
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'super-admin':
        return 'bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-semibold';
      case 'admin':
        return 'bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold';
      case 'hr':
        return 'bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold';
      case 'employee':
        return 'bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold';
      default:
        return 'bg-gray-500 text-white text-xs px-2 py-1 rounded-full font-semibold';
    }
  };

  const onDragStart = () => {
    setIsDragging(false);
  };

  const onDrag = () => {
    setIsDragging(true);
  };

  const onDragStop = () => {
    // Small delay to allow click events to process
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  };

  const handleChatButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsOpen(true);
    }
  };

  return (
    <>
      {/* Background overlay when chat is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => {
            setIsOpen(false);
            setSelectedChat(null);
            setIsFullscreen(false);
          }}
        />
      )}
      {isFullscreen && (
        // Fullscreen backdrop
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsFullscreen(false)}
        />
      )}
      <Draggable
        defaultPosition={WIDGET_DEFAULT_POS}
        bounds={isFullscreen ? false : calculateBounds()}
        nodeRef={dragRef}
        disabled={isFullscreen || isOpen}
        onStart={onDragStart}
        onDrag={onDrag}
        onStop={onDragStop}
      >
        <div
          ref={dragRef}
          className={`fixed z-50 ${isFullscreen ? 'inset-0 flex items-center justify-center cursor-default' : 'cursor-move'}`}
        >
        {!isOpen ? (
          // Chat Bubble Button
          <div
            className="relative w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
            title="Open Chat"
            onClick={handleChatButtonClick}
          >
            <MessageCircle className="w-6 h-6 text-white" />
            {totalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
          </div>
        ) : (
          // Chat Modal
          <div
            ref={fullscreenRef}
            className={`${bgColor} ${textColor} ${isFullscreen ? 'w-[90vw] max-w-4xl h-[90vh] rounded-lg' : 'w-96 h-[600px] rounded-lg'} shadow-2xl flex flex-col border ${borderColor}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} p-4 border-b ${borderColor} flex items-center justify-between ${isFullscreen ? '' : 'rounded-t-lg'}`}>
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5" />
                <h3 className="font-semibold">{isFullscreen ? 'Chat - Full Screen' : 'Chat'}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  title="Toggle dark mode"
                >
                  {darkMode ? (
                    <Sun className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-gray-700" />
                  )}
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className={`p-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  title={isFullscreen ? 'Exit fullscreen (ESC)' : 'Enter fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setSelectedChat(null);
                    setIsFullscreen(false);
                  }}
                  className={`p-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  title="Close chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!selectedChat ? (
              <>
                {/* Tabs */}
                <div className={`flex border-b ${borderColor} overflow-x-auto`}>
                  {(['dms', 'groups', 'announcements', 'history'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        setSearchQuery('');
                      }}
                      className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                        activeTab === tab
                          ? darkMode
                            ? 'border-b-2 border-purple-500 text-purple-400'
                            : 'border-b-2 border-purple-600 text-purple-600'
                          : darkMode
                          ? 'text-gray-400'
                          : 'text-gray-600'
                      }`}
                    >
                      {tab.replace('announcements', 'news')}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className={`p-3 border-b ${borderColor}`}>
                  <div className={`flex items-center space-x-2 ${inputBg} rounded-lg px-3 py-2`}>
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`flex-1 outline-none text-sm ${inputBg} ${textColor} placeholder-gray-500`}
                    />
                  </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                    </div>
                  ) : filteredChats.length > 0 ? (
                    <div>
                      {filteredChats.map(chat => (
                        <div
                          key={chat.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isDragging) {
                              setSelectedChat(chat);
                            }
                          }}
                          className={`w-full p-3 border-b ${borderColor} hover:${darkMode ? 'bg-gray-800' : 'bg-gray-50'} transition-colors text-left flex items-center space-x-3 cursor-pointer`}
                        >
                          <div className="relative">
                            <img 
                              src={chat.avatar} 
                              alt={chat.fullName || chat.name} 
                              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600" 
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.fullName || chat.name)}&background=random&color=fff`;
                              }}
                            />
                            {/* Online status indicator */}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{chat.fullName || chat.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {chat.role && (
                                    <span className={getRoleBadgeClass(chat.role)}>
                                      {chat.role.toUpperCase()}
                                    </span>
                                  )}
                                  {activeTab === 'dms' && (
                                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                                      {chat.email}
                                    </p>
                                  )}
                                </div>
                                {chat.lastMessage && (
                                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} truncate mt-1`}>
                                    {chat.lastMessage}
                                  </p>
                                )}
                              </div>
                              {chat.unreadCount > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1 min-w-[20px] text-center">
                                  {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`flex flex-col items-center justify-center h-full ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      <p className="text-center px-4">
                        {activeTab === 'dms' ? 'Select a user to start chatting' :
                         activeTab === 'groups' ? 'No groups yet. Create one to get started.' :
                         activeTab === 'announcements' ? 'No announcements available.' :
                         'No chat history available.'}
                      </p>
                      {activeTab === 'groups' && (
                        <button 
                          onClick={() => {
                            alert('Group creation feature coming soon!');
                          }}
                          className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <span className="text-lg">+</span>
                          Create Group
                        </button>
                      )}
                      {activeTab === 'announcements' && ['super-admin', 'admin', 'hr'].includes(currentUser?.role) && (
                        <button 
                          onClick={() => {
                            const title = prompt('Announcement Title:');
                            if (title) {
                              const content = prompt('Announcement Content:');
                              if (content) {
                                createAnnouncement(title, content);
                              }
                            }
                          }}
                          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <span className="text-lg">📢</span>
                          Create Announcement
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Back Button & Chat Header */}
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} p-3 border-b ${borderColor} flex items-center`}>
                  <button
                    onClick={() => setSelectedChat(null)}
                    className={`mr-3 p-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    ←
                  </button>
                  <img src={selectedChat.avatar || '/default-avatar.png'} alt={selectedChat.fullName || selectedChat.name} className="w-8 h-8 rounded-full mr-2" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{selectedChat.fullName || selectedChat.name}</p>
                    {selectedChat.role && selectedChat.role.toLowerCase() !== 'employee' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeClass(selectedChat.role)}`}>{selectedChat.role}</span>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                    </div>
                  ) : messages.length > 0 ? (
                    messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender_id === currentUser?.id ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                            msg.sender_id === currentUser?.id
                              ? 'bg-green-500 text-white rounded-br-none'
                              : `${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-bl-none`
                          }`}
                        >
                          {msg.message}
                        </div>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{new Date(msg.timestamp).toLocaleTimeString()}</p>
                      </div>
                    ))
                  ) : (
                    <div className={`flex flex-col items-center justify-center h-full ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                       <p>No messages yet. Start a conversation.</p>
                    </div>
                  )}
                  {typingUsers.length > 0 && (
                    <div className="text-xs text-gray-500">
                      {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className={`border-t ${borderColor} p-3 flex gap-2`}>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      setIsTyping(true);
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className={`flex-1 px-3 py-2 rounded-full text-sm outline-none ${inputBg} ${textColor} placeholder-gray-500`}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        </div>
      </Draggable>
    </>
  );
}