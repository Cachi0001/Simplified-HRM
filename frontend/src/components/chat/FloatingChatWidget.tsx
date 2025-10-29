import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { MessageCircle, X, Send, Search, Moon, Sun } from 'lucide-react';
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
  const dragRef = useRef(null);

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

  // Load chats when tab changes
  useEffect(() => {
    if (isOpen) {
      loadChats();
    }
  }, [activeTab, isOpen]);

  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
      loadMessages();
    }
  }, [selectedChat]);

  const loadChats = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/chat/list', {
        params: { type: activeTab === 'announcements' ? 'announcement' : activeTab }
      });

      if (response.data?.data?.chats) {
        const formattedChats: Chat[] = response.data.data.chats.map((chat: any) => ({
          id: chat.id,
          name: chat.name,
          lastMessage: chat.lastMessage,
          unreadCount: chat.unreadCount || 0,
          avatar: chat.avatar,
          type: chat.type || 'dm'
        }));
        setChats(formattedChats);
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedChat) return;

    try {
      setIsLoading(true);
      const response = await api.get(`/chat/${selectedChat.id}/history`, {
        params: { limit: 50 }
      });

      if (response.data?.data?.messages) {
        setMessages(response.data.data.messages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;

    try {
      await api.post('/chat/send', {
        chatId: selectedChat.id,
        message: messageText
      });
      setMessageText('');
      loadMessages();
      getAllUnreadCounts();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bgColor = darkMode ? 'bg-gray-900' : 'bg-white';
  const textColor = darkMode ? 'text-white' : 'text-gray-900';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const inputBg = darkMode ? 'bg-gray-800' : 'bg-gray-100';

  // Don't render on auth pages
  if (!currentUser) return null;

  return (
    <Draggable
      defaultPosition={WIDGET_DEFAULT_POS}
      bounds="parent"
      nodeRef={dragRef}
    >
      <div
        ref={dragRef}
        className="fixed z-50 cursor-move"
        style={{ bottom: 'auto', right: 'auto' }}
      >
        {!isOpen ? (
          // Chat Bubble Button
          <button
            onClick={() => setIsOpen(true)}
            className="relative w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
            title="Open Chat"
          >
            <MessageCircle className="w-6 h-6 text-white" />
            {totalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
          </button>
        ) : (
          // Chat Modal
          <div
            className={`${bgColor} ${textColor} rounded-lg shadow-2xl w-80 h-96 flex flex-col border ${borderColor}`}
            style={{ maxHeight: '80vh', minHeight: '300px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} p-4 border-b ${borderColor} flex items-center justify-between rounded-t-lg`}>
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5" />
                <h3 className="font-semibold">Chat</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                  title="Toggle dark mode"
                >
                  {darkMode ? (
                    <Sun className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-gray-700" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setSelectedChat(null);
                  }}
                  className={`p-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
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
                        <button
                          key={chat.id}
                          onClick={() => setSelectedChat(chat)}
                          className={`w-full p-3 border-b ${borderColor} hover:${darkMode ? 'bg-gray-800' : 'bg-gray-50'} transition-colors text-left flex items-center justify-between`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{chat.name}</p>
                            {chat.lastMessage && (
                              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                                {chat.lastMessage}
                              </p>
                            )}
                          </div>
                          {chat.unreadCount > 0 && (
                            <span className="ml-2 bg-purple-600 text-white text-xs font-bold rounded-full px-2 py-1">
                              {chat.unreadCount}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={`flex items-center justify-center h-full ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      <p>No chats found</p>
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
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{selectedChat.name}</p>
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
                        className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                            msg.sender_id === currentUser?.id
                              ? 'bg-purple-600 text-white'
                              : darkMode
                              ? 'bg-gray-800 text-gray-100'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={`flex items-center justify-center h-full ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      <p>No messages yet</p>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className={`border-t ${borderColor} p-3 flex gap-2`}>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className={`flex-1 px-3 py-2 rounded text-sm outline-none ${inputBg} ${textColor} placeholder-gray-500`}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    className="p-2 rounded bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white transition-colors"
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
  );
}