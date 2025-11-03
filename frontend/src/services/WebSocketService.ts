import { io, Socket } from 'socket.io-client';
import { IndicatorEvent } from '../types/indicators';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface TypingUser {
  userId: string;
  chatId: string;
  isTyping: boolean;
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private messageHandlers: Map<string, (message: ChatMessage) => void> = new Map();
  private typingHandlers: Map<string, (typing: TypingUser) => void> = new Map();
  private connectionHandlers: ((connected: boolean) => void)[] = [];

  constructor() {
    this.connect();
  }

  private connect() {
    // Force localhost in development, use environment URL in production
    const serverUrl = import.meta.env.PROD
      ? (import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://go3nethrm-backend.vercel.app')
      : 'http://localhost:3000';

    // Connecting to WebSocket server (reduced logging)

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      this.isConnected = true;
      this.notifyConnectionHandlers(true);

      // Authenticate if we have a token
      const token = localStorage.getItem('accessToken');
      const userId = this.getCurrentUserId();

      if (token && userId) {
        console.log('🔐 Authenticating WebSocket with user:', userId);
        this.authenticate(userId, token);
      } else {
        console.warn('⚠️ Cannot authenticate WebSocket - missing token or user ID', {
          hasToken: !!token,
          hasUserId: !!userId,
          token: token ? `${token.substring(0, 20)}...` : 'MISSING',
          userId: userId || 'MISSING'
        });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.isConnected = false;
      this.notifyConnectionHandlers(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.isConnected = false;
      this.notifyConnectionHandlers(false);
    });

    this.socket.on('authenticated', (data) => {
      if (data.success) {
        console.log('✅ Chat authenticated');
      } else {
        console.error('❌ Chat auth failed:', data.error);
        // Try to re-authenticate after a delay
        setTimeout(() => {
          const token = localStorage.getItem('accessToken');
          const userId = this.getCurrentUserId();
          if (token && userId) {
            console.log('🔄 Retrying WebSocket authentication...');
            this.authenticate(userId, token);
          }
        }, 2000);
      }
    });

    this.socket.on('new_message', (messageData) => {


      // Handle different message data formats from server
      const currentUserId = this.getCurrentUserId();
      
      const message: ChatMessage = {
        id: messageData.id,
        chatId: messageData.chatId || messageData.chat_id,
        senderId: messageData.senderId || messageData.sender_id,
        senderName: messageData.senderName || messageData.sender_name || 'Unknown User',
        senderAvatar: messageData.senderAvatar || messageData.sender_avatar,
        content: messageData.message || messageData.content,
        timestamp: messageData.timestamp || messageData.created_at,
        isOwn: String(messageData.senderId || messageData.sender_id) === String(currentUserId),
        status: 'delivered'
      };

      // Notify message handlers for this chat
      const handler = this.messageHandlers.get(message.chatId);
      if (handler) {
        handler(message);
      }

      // Also notify handlers that might be listening to the original chatId format
      if (messageData.chatId !== message.chatId) {
        const altHandler = this.messageHandlers.get(messageData.chatId);
        if (altHandler) {
          altHandler(message);
        }
      }

      // Trigger message indicator for the sender
      this.emitIndicatorEvent({
        type: 'message_sent',
        userId: message.senderId,
        chatId: message.chatId,
        timestamp: Date.now(),
        messageId: message.id
      });
    });

    this.socket.on('message_sent', (data) => {

      // Handle message sent confirmation
      // This could be used to update message status in UI
    });

    this.socket.on('message_read', (data) => {
      console.log('👁️ Message read receipt:', data);
      // Handle read receipts
      // This could be used to update message status or show read indicators
    });

    this.socket.on('user_presence', (data) => {
      console.log('👤 User presence update:', data);
      // Handle user presence updates
      // This could be used to show online/offline status
    });

    this.socket.on('typing_update', (data) => {
      console.log('⌨️ Typing update:', data);

      // Notify typing handlers
      this.typingHandlers.forEach((handler) => {
        handler(data);
      });
    });

    this.socket.on('joined_chat', (data) => {
      console.log('🏠 Joined chat:', data.chatId);
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  }

  private getCurrentUserId(): string | null {
    try {
      // Try multiple possible keys for user data
      const possibleKeys = ['user', 'currentUser', 'authUser', 'userData'];

      for (const key of possibleKeys) {
        const storedData = localStorage.getItem(key);
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            if (parsed && (parsed.id || parsed.userId || parsed.user_id)) {
              const userId = parsed.id || parsed.userId || parsed.user_id;
              console.log(`🔍 Found user ID from ${key}:`, userId);
              return userId;
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
            const userId = decoded.id || decoded.userId || decoded.user_id || decoded.sub;
            console.log('🔍 Found user ID from JWT token:', userId);
            return userId;
          }
        } catch (tokenError) {
          console.error('❌ Failed to decode JWT token:', tokenError);
        }
      }

      console.warn('⚠️ No user ID found in localStorage or JWT token');
    } catch (error) {
      console.error('❌ Failed to get current user ID:', error);
    }
    return null;
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach(handler => handler(connected));
  }

  // Public methods
  public authenticate(userId: string, token: string) {
    if (this.socket && this.isConnected) {
      console.log('🔐 Authenticating WebSocket connection...');
      this.socket.emit('authenticate', { userId, token });
    }
  }

  public joinChat(chatId: string) {
    if (this.socket && this.isConnected) {
      console.log('🏠 Joining chat:', chatId);
      this.socket.emit('join_chat', { chatId });
    }
  }

  public leaveChat(chatId: string) {
    if (this.socket && this.isConnected) {
      console.log('🚪 Leaving chat:', chatId);
      this.socket.emit('leave_chat', { chatId });
    }
  }

  public sendMessage(chatId: string, message: string, messageId: string) {
    if (this.socket && this.isConnected) {
      console.log('📤 Sending message:', { chatId, messageId });
      this.socket.emit('send_message', {
        chatId,
        message,
        messageId,
        timestamp: new Date().toISOString()
      });
      return true;
    }
    return false;
  }

  public markAsRead(chatId: string, messageId?: string) {
    if (this.socket && this.isConnected) {
      console.log('✅ Marking as read:', { chatId, messageId });
      this.socket.emit('mark_read', { chatId, messageId });
    }
  }

  public startTyping(chatId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_start', { chatId });
    }
  }

  public stopTyping(chatId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_stop', { chatId });
    }
  }

  public onMessage(chatId: string, handler: (message: ChatMessage) => void) {
    this.messageHandlers.set(chatId, handler);
  }

  public offMessage(chatId: string) {
    this.messageHandlers.delete(chatId);
  }

  public onTyping(handler: (typing: TypingUser) => void) {
    const id = Math.random().toString(36);
    this.typingHandlers.set(id, handler);
    return id;
  }

  public offTyping(id: string) {
    this.typingHandlers.delete(id);
  }

  public onConnection(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
    // Immediately call with current status
    handler(this.isConnected);
  }

  public offConnection(handler: (connected: boolean) => void) {
    const index = this.connectionHandlers.indexOf(handler);
    if (index > -1) {
      this.connectionHandlers.splice(index, 1);
    }
  }

  public getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    // Socket.IO doesn't have a 'connecting' property, use disconnected state
    return 'disconnected';
  }

  public reconnect() {
    console.log('🔄 Reconnecting WebSocket...');
    if (this.socket) {
      this.socket.disconnect();
    }
    this.connect();
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  // Debug method to check authentication status
  public debugAuth() {
    const token = localStorage.getItem('accessToken');
    const userId = this.getCurrentUserId();

    console.log('🔍 WebSocket Authentication Debug:', {
      isConnected: this.isConnected,
      hasSocket: !!this.socket,
      socketConnected: this.socket?.connected,
      hasToken: !!token,
      hasUserId: !!userId,
      token: token ? `${token.substring(0, 20)}...` : 'MISSING',
      userId: userId || 'MISSING',
      localStorage: {
        user: localStorage.getItem('user') ? 'EXISTS' : 'MISSING',
        currentUser: localStorage.getItem('currentUser') ? 'EXISTS' : 'MISSING',
        authUser: localStorage.getItem('authUser') ? 'EXISTS' : 'MISSING',
        userData: localStorage.getItem('userData') ? 'EXISTS' : 'MISSING',
        accessToken: localStorage.getItem('accessToken') ? 'EXISTS' : 'MISSING'
      }
    });

    return {
      isConnected: this.isConnected,
      hasToken: !!token,
      hasUserId: !!userId,
      userId,
      canAuthenticate: !!(token && userId)
    };
  }

  // Emit indicator event for message sender visual feedback
  private emitIndicatorEvent(event: IndicatorEvent) {
    try {
      // Emit to global event system for indicator components
      window.dispatchEvent(new CustomEvent('message-indicator', { detail: event }));
      console.log('✨ Indicator event emitted:', event);
    } catch (error) {
      console.error('❌ Failed to emit indicator event:', error);
    }
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;