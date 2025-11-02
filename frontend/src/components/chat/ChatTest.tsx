import { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Chat {
  id: string;
  name: string;
  type: string;
}

interface Message {
  id: string;
  message: string;
  sender_id: string;
  timestamp: string;
}

interface ApiResponse<T = any> {
  status: string;
  data?: T;
}

export function ChatTest() {
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
    loadChats();
  }, []);

  const loadCurrentUser = () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiClient.get('/employees') as ApiResponse<{ data: User[] }>;
      if (response.status === 'success') {
        setUsers(response?.data?.data || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadChats = async () => {
    try {
      const response = await apiClient.get('/chat/list') as ApiResponse<Chat[]>;
      if (response.status === 'success') {
        setChats(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const createDM = async (recipientId: string) => {
    try {
      const response = await apiClient.post('/chat/dm', { recipientId }) as ApiResponse<{ chat: Chat }>;
      if (response.status === 'success' && response.data?.chat) {
        setSelectedChat(response.data.chat);
        loadChats(); // Refresh chat list
        loadMessages(response.data.chat.id);
      }
    } catch (error) {
      console.error('Failed to create DM:', error);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const response = await apiClient.get(`/chat/${chatId}/history`) as ApiResponse<{ messages: Message[] }>;
      if (response.status === 'success') {
        setMessages(response.data?.messages || []);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const response = await apiClient.post('/chat/send', {
        chatId: selectedChat.id,
        message: newMessage.trim()
      });

      if (response.status === 'success') {
        setNewMessage('');
        loadMessages(selectedChat.id); // Reload messages
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Chat System Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current User */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-2">Current User</h2>
          {currentUser ? (
            <div className="text-sm">
              <p><strong>Name:</strong> {currentUser.full_name}</p>
              <p><strong>Email:</strong> {currentUser.email}</p>
              <p><strong>Role:</strong> {currentUser.role}</p>
            </div>
          ) : (
            <p className="text-gray-500">Not logged in</p>
          )}
        </div>

        {/* Users List */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-2">Available Users</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                <div className="text-sm">
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-gray-500">{user.role}</p>
                </div>
                <button
                  onClick={() => createDM(user.id)}
                  className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                >
                  Chat
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Existing Chats */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-2">Existing Chats</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {chats.map(chat => (
              <div 
                key={chat.id} 
                className={`p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                  selectedChat?.id === chat.id ? 'bg-blue-50 border-blue-300' : ''
                }`}
                onClick={() => {
                  setSelectedChat(chat);
                  loadMessages(chat.id);
                }}
              >
                <p className="font-medium text-sm">{chat.name}</p>
                <p className="text-xs text-gray-500">{chat.type}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      {selectedChat && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-4">Chat: {selectedChat.name}</h2>
          
          {/* Messages */}
          <div className="border rounded p-4 h-64 overflow-y-auto mb-4 bg-gray-50">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center">No messages yet</p>
            ) : (
              messages.map(message => (
                <div key={message.id} className={`mb-2 ${message.sender_id === currentUser?.id ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block p-2 rounded max-w-xs ${
                    message.sender_id === currentUser?.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white border'
                  }`}>
                    <p className="text-sm">{message.message}</p>
                    <p className="text-xs opacity-75 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Send Message */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}