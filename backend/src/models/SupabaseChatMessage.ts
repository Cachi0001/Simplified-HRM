// Supabase-compatible ChatMessage interface
export interface IChatMessage {
  id: string;
  chat_id: string; 
  sender_id: string; 
  message: string;
  timestamp: string | Date;
  read_at?: string | Date | null; // When the message was read
}

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
  readAt?: string | null;
}

// Unread count interface
export interface IChatUnreadCount {
  id: string;
  user_id: string;
  chat_id: string;
  unread_count: number;
  last_read_at?: string | null;
  updated_at: string;
}