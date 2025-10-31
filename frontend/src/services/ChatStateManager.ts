import { ChatMessage } from '../types/chat';

export interface UIMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string;
}

export interface ChatState {
  messages: Map<string, UIMessage[]>; // Keyed by chatId
  unreadCounts: Map<string, number>; // Keyed by chatId
  activeChat: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  isLoading: boolean;
  error: string | null;
  typingUsers: Map<string, Set<string>>; // chatId -> Set of userIds
}

type StateListener = (state: ChatState) => void;

export class ChatStateManager {
  private state: ChatState;
  private listeners: Set<StateListener> = new Set();
  private debounceTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.state = {
      messages: new Map(),
      unreadCounts: new Map(),
      activeChat: null,
      connectionStatus: 'disconnected',
      isLoading: false,
      error: null,
      typingUsers: new Map(),
    };
  }

  // Stable methods that don't change reference (using arrow functions)
  public readonly addMessage = (chatId: string, message: UIMessage): void => {
    const currentMessages = this.state.messages.get(chatId) || [];
    
    // Check for duplicates
    const existingIndex = currentMessages.findIndex(m => m.id === message.id);
    
    if (existingIndex >= 0) {
      // Update existing message
      currentMessages[existingIndex] = message;
    } else {
      // Add new message in chronological order
      const insertIndex = currentMessages.findIndex(m => 
        new Date(m.timestamp) > new Date(message.timestamp)
      );
      
      if (insertIndex >= 0) {
        currentMessages.splice(insertIndex, 0, message);
      } else {
        currentMessages.push(message);
      }
    }

    this.state.messages.set(chatId, currentMessages);
    this.debouncedStateUpdate();
  };

  public readonly updateMessageStatus = (messageId: string, status: UIMessage['status']): void => {
    let updated = false;
    
    this.state.messages.forEach((messages, chatId) => {
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex >= 0) {
        messages[messageIndex] = { ...messages[messageIndex], status };
        this.state.messages.set(chatId, messages);
        updated = true;
      }
    });

    if (updated) {
      this.debouncedStateUpdate();
    }
  };

  public readonly updateUnreadCount = (chatId: string, count: number): void => {
    this.state.unreadCounts.set(chatId, Math.max(0, count));
    this.debouncedStateUpdate();
  };

  public readonly incrementUnreadCount = (chatId: string): void => {
    const current = this.state.unreadCounts.get(chatId) || 0;
    this.updateUnreadCount(chatId, current + 1);
  };

  public readonly decrementUnreadCount = (chatId: string): void => {
    const current = this.state.unreadCounts.get(chatId) || 0;
    this.updateUnreadCount(chatId, Math.max(0, current - 1));
  };

  public readonly setActiveChat = (chatId: string | null): void => {
    if (this.state.activeChat !== chatId) {
      this.state.activeChat = chatId;
      
      // Mark active chat as read
      if (chatId) {
        this.updateUnreadCount(chatId, 0);
      }
      
      this.debouncedStateUpdate();
    }
  };

  public readonly setConnectionStatus = (status: ChatState['connectionStatus']): void => {
    if (this.state.connectionStatus !== status) {
      this.state.connectionStatus = status;
      this.debouncedStateUpdate();
    }
  };

  public readonly setLoading = (isLoading: boolean): void => {
    if (this.state.isLoading !== isLoading) {
      this.state.isLoading = isLoading;
      this.debouncedStateUpdate();
    }
  };

  public readonly setError = (error: string | null): void => {
    if (this.state.error !== error) {
      this.state.error = error;
      this.debouncedStateUpdate();
    }
  };

  public readonly addTypingUser = (chatId: string, userId: string): void => {
    const typingUsers = this.state.typingUsers.get(chatId) || new Set();
    typingUsers.add(userId);
    this.state.typingUsers.set(chatId, typingUsers);
    this.debouncedStateUpdate();
  };

  public readonly removeTypingUser = (chatId: string, userId: string): void => {
    const typingUsers = this.state.typingUsers.get(chatId);
    if (typingUsers) {
      typingUsers.delete(userId);
      if (typingUsers.size === 0) {
        this.state.typingUsers.delete(chatId);
      }
      this.debouncedStateUpdate();
    }
  };

  public readonly clearMessages = (chatId: string): void => {
    this.state.messages.delete(chatId);
    this.debouncedStateUpdate();
  };

  public readonly loadMessages = (chatId: string, messages: ChatMessage[]): void => {
    const uiMessages: UIMessage[] = messages.map(msg => this.transformToUIMessage(msg));
    
    // Sort by timestamp
    uiMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    this.state.messages.set(chatId, uiMessages);
    this.debouncedStateUpdate();
  };

  // Getters for accessing state
  public getState(): Readonly<ChatState> {
    return { ...this.state };
  }

  public getMessages(chatId: string): UIMessage[] {
    return this.state.messages.get(chatId) || [];
  }

  public getUnreadCount(chatId: string): number {
    return this.state.unreadCounts.get(chatId) || 0;
  }

  public getTotalUnreadCount(): number {
    let total = 0;
    this.state.unreadCounts.forEach((count) => {
      total += count;
    });
    return total;
  }

  public getTypingUsers(chatId: string): string[] {
    const typingUsers = this.state.typingUsers.get(chatId);
    return typingUsers ? Array.from(typingUsers) : [];
  }

  // Subscription management
  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Private methods
  private transformToUIMessage(message: ChatMessage): UIMessage {
    const currentUserId = this.getCurrentUserId(); // This would come from auth context
    
    return {
      id: message.id,
      chatId: message.chat_id,
      senderId: message.sender_id,
      content: message.message,
      timestamp: message.timestamp,
      status: this.getMessageStatus(message),
      isOwn: message.sender_id === currentUserId,
      senderName: message.senderName,
      senderAvatar: message.senderAvatar,
    };
  }

  private getMessageStatus(message: ChatMessage): UIMessage['status'] {
    if (message.read_at) return 'read';
    if (message.delivered_at) return 'delivered';
    if (message.sent_at) return 'sent';
    return 'sending';
  }

  private getCurrentUserId(): string {
    // Try to get user from localStorage first
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return user.id;
      }
    } catch (error) {
      console.error('Failed to get current user ID:', error);
    }
    
    // Fallback to a demo user ID
    return 'demo-user-123';
  }

  // Prevent infinite loops with debouncing
  private debouncedStateUpdate = (): void => {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => {
      this.notifyListeners();
      this.debounceTimeout = null;
    }, 100); // 100ms debounce
  };

  private notifyListeners(): void {
    const currentState = this.getState();
    
    // Notify all listeners
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  // Cleanup method
  public destroy(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    
    this.listeners.clear();
    this.state.messages.clear();
    this.state.unreadCounts.clear();
    this.state.typingUsers.clear();
  }
}

// Singleton instance
let chatStateManagerInstance: ChatStateManager | null = null;

export function getChatStateManager(): ChatStateManager {
  if (!chatStateManagerInstance) {
    chatStateManagerInstance = new ChatStateManager();
  }
  return chatStateManagerInstance;
}