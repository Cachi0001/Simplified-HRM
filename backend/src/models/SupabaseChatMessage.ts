export interface IChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string;
  timestamp: string | Date;
  created_at: string | Date;
  sent_at?: string | Date | null;
  delivered_at?: string | Date | null;
  read_at?: string | Date | null;
  edited_at?: string | Date | null;
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

export interface ChatMessageResponse {
  id: string;
  chatId: string;
  senderId: string;
  message: string;
  timestamp: string;
  createdAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  editedAt?: string | null;
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