export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string;
  timestamp: string;
  read_at?: string | null;
  created_at: string;
  delivered_at?: string | null;
  sent_at?: string | null;
  edited_at?: string | null;
  senderName?: string;
  senderAvatar?: string;
  updated_at?: string | null;
}

export interface GroupChat {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  unread_count?: number;
  participant_count?: number;
}

export interface ChatParticipant {
  user_id: string;
  chat_id: string;
  joined_at: string;
  userName?: string;
  userAvatar?: string;
}

export interface UnreadCount {
  chat_id: string;
  unread_count: number;
}

export interface TypingUser {
  userId: string;
  userName: string;
  chatId: string;
  startedAt: string;
}

export interface ReadReceipt {
  messageId: string;
  userId: string;
  userName: string;
  readAt: string;
}

export interface ChatApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  error?: string;
}

export type ChatMessageStatus = 'sending' | 'sent' | 'delivered' | 'read';