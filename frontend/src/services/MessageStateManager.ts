import { ChatMessage } from '../hooks/useChat';

interface OptimisticMessage extends Omit<ChatMessage, 'id'> {
  tempId: string;
  status: 'sending' | 'failed';
  retryCount: number;
}

interface MessageState {
  messages: ChatMessage[];
  optimisticMessages: OptimisticMessage[];
  lastSync: Date | null;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

class MessageStateManager {
  private chatStates = new Map<string, MessageState>();
  private stateUpdateHandlers: ((chatId: string, state: MessageState) => void)[] = [];

  // Initialize chat state
  private initializeChatState(chatId: string): MessageState {
    if (!this.chatStates.has(chatId)) {
      this.chatStates.set(chatId, {
        messages: [],
        optimisticMessages: [],
        lastSync: null,
        syncStatus: 'synced'
      });
    }
    return this.chatStates.get(chatId)!;
  }

  // Add a confirmed message
  addMessage(chatId: string, message: ChatMessage): void {
    const state = this.initializeChatState(chatId);
    
    // Check for duplicates
    const exists = state.messages.some(m => 
      m.id === message.id || 
      this.isDuplicateMessage(m, message)
    );
    
    if (!exists) {
      state.messages.push(message);
      state.messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Remove any matching optimistic messages
      state.optimisticMessages = state.optimisticMessages.filter(opt => 
        !this.isOptimisticMatch(opt, message)
      );
      
      this.notifyStateUpdate(chatId, state);
    }
  }

  // Add optimistic message (for immediate UI feedback)
  addOptimisticMessage(chatId: string, message: Omit<ChatMessage, 'id'>): string {
    const state = this.initializeChatState(chatId);
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const optimisticMessage: OptimisticMessage = {
      ...message,
      tempId,
      status: 'sending',
      retryCount: 0
    };
    
    state.optimisticMessages.push(optimisticMessage);
    this.notifyStateUpdate(chatId, state);
    
    return tempId;
  }

  // Confirm optimistic message with real message
  confirmOptimisticMessage(tempId: string, realMessage: ChatMessage): void {
    for (const [chatId, state] of this.chatStates.entries()) {
      const optIndex = state.optimisticMessages.findIndex(opt => opt.tempId === tempId);
      if (optIndex !== -1) {
        // Remove optimistic message
        state.optimisticMessages.splice(optIndex, 1);
        
        // Add real message
        this.addMessage(chatId, realMessage);
        break;
      }
    }
  }

  // Mark optimistic message as failed
  failOptimisticMessage(tempId: string, error: Error): void {
    for (const [chatId, state] of this.chatStates.entries()) {
      const optMessage = state.optimisticMessages.find(opt => opt.tempId === tempId);
      if (optMessage) {
        optMessage.status = 'failed';
        optMessage.retryCount++;
        this.notifyStateUpdate(chatId, state);
        break;
      }
    }
  }

  // Retry failed message
  retryOptimisticMessage(tempId: string): OptimisticMessage | null {
    for (const [chatId, state] of this.chatStates.entries()) {
      const optMessage = state.optimisticMessages.find(opt => opt.tempId === tempId);
      if (optMessage && optMessage.status === 'failed') {
        optMessage.status = 'sending';
        this.notifyStateUpdate(chatId, state);
        return optMessage;
      }
    }
    return null;
  }

  // Remove message
  removeMessage(chatId: string, messageId: string): void {
    const state = this.chatStates.get(chatId);
    if (state) {
      state.messages = state.messages.filter(m => m.id !== messageId);
      this.notifyStateUpdate(chatId, state);
    }
  }

  // Update message
  updateMessage(chatId: string, messageId: string, updates: Partial<ChatMessage>): void {
    const state = this.chatStates.get(chatId);
    if (state) {
      const messageIndex = state.messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1) {
        state.messages[messageIndex] = { ...state.messages[messageIndex], ...updates };
        this.notifyStateUpdate(chatId, state);
      }
    }
  }

  // Get all messages for a chat (combined regular + optimistic)
  getMessages(chatId: string): ChatMessage[] {
    const state = this.chatStates.get(chatId);
    if (!state) return [];
    
    // Convert optimistic messages to ChatMessage format
    const optimisticAsMessages: ChatMessage[] = state.optimisticMessages.map(opt => ({
      id: opt.tempId,
      chatId: opt.chatId,
      senderId: opt.senderId,
      senderName: opt.senderName,
      senderAvatar: opt.senderAvatar,
      content: opt.content,
      timestamp: opt.timestamp,
      isOwn: opt.isOwn,
      status: opt.status
    }));
    
    // Combine and sort by timestamp
    const allMessages = [...state.messages, ...optimisticAsMessages];
    return allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Deduplicate messages in a chat
  deduplicateMessages(chatId: string): void {
    const state = this.chatStates.get(chatId);
    if (!state) return;
    
    const uniqueMessages: ChatMessage[] = [];
    const seenIds = new Set<string>();
    
    for (const message of state.messages) {
      if (!seenIds.has(message.id) && !uniqueMessages.some(m => this.isDuplicateMessage(m, message))) {
        uniqueMessages.push(message);
        seenIds.add(message.id);
      }
    }
    
    state.messages = uniqueMessages;
    this.notifyStateUpdate(chatId, state);
  }

  // Set messages for a chat (replaces existing)
  setMessages(chatId: string, messages: ChatMessage[]): void {
    const state = this.initializeChatState(chatId);
    state.messages = [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    state.lastSync = new Date();
    state.syncStatus = 'synced';
    this.notifyStateUpdate(chatId, state);
  }

  // Clear messages for a chat
  clearMessages(chatId: string): void {
    const state = this.chatStates.get(chatId);
    if (state) {
      state.messages = [];
      state.optimisticMessages = [];
      this.notifyStateUpdate(chatId, state);
    }
  }

  // Subscribe to state updates
  onStateUpdate(handler: (chatId: string, state: MessageState) => void): void {
    this.stateUpdateHandlers.push(handler);
  }

  // Unsubscribe from state updates
  offStateUpdate(handler: (chatId: string, state: MessageState) => void): void {
    const index = this.stateUpdateHandlers.indexOf(handler);
    if (index > -1) {
      this.stateUpdateHandlers.splice(index, 1);
    }
  }

  // Get chat state
  getChatState(chatId: string): MessageState {
    return this.initializeChatState(chatId);
  }

  // Private helper methods
  private isDuplicateMessage(msg1: ChatMessage, msg2: ChatMessage): boolean {
    // Same content, sender, and timestamp within 5 seconds
    return msg1.content === msg2.content &&
           msg1.senderId === msg2.senderId &&
           Math.abs(new Date(msg1.timestamp).getTime() - new Date(msg2.timestamp).getTime()) < 5000;
  }

  private isOptimisticMatch(optimistic: OptimisticMessage, real: ChatMessage): boolean {
    return optimistic.content === real.content &&
           optimistic.senderId === real.senderId &&
           Math.abs(new Date(optimistic.timestamp).getTime() - new Date(real.timestamp).getTime()) < 10000;
  }

  private notifyStateUpdate(chatId: string, state: MessageState): void {
    this.stateUpdateHandlers.forEach(handler => {
      try {
        handler(chatId, state);
      } catch (error) {
        console.error('Error in message state update handler:', error);
      }
    });
  }
}

// Export singleton instance
export const messageStateManager = new MessageStateManager();
export default messageStateManager;