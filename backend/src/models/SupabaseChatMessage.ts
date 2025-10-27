// Supabase-compatible ChatMessage interface
export interface IChatMessage {
  id: string;
  chat_id: string; // UUID of the group chat
  sender_id: string; // UUID of the sender
  message: string;
  timestamp: string | Date;
}

// Request/Response interfaces
export interface CreateChatMessageRequest {
  chatId?: string;
  chat_id?: string;
  senderId?: string;
  sender_id?: string;
  message: string;
}

export interface ChatMessageQuery {
  chatId?: string;
  chat_id?: string;
  senderId?: string;
  sender_id?: string;
  limit?: number;
  offset?: number;
}

// Response interface (camelCase for frontend)
export interface ChatMessageResponse {
  id: string;
  chatId: string;
  senderId: string;
  message: string;
  timestamp: string;
}