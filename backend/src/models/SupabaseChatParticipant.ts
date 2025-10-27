// Supabase-compatible ChatParticipant interface
export interface IChatParticipant {
  chat_id: string; // UUID of the group chat
  user_id: string; // UUID of the user
  joined_at: string | Date;
}

// Request/Response interfaces
export interface CreateChatParticipantRequest {
  chatId?: string;
  chat_id?: string;
  userId?: string;
  user_id?: string;
}

export interface ChatParticipantQuery {
  chatId?: string;
  chat_id?: string;
  userId?: string;
  user_id?: string;
}

// Response interface (camelCase for frontend)
export interface ChatParticipantResponse {
  chatId: string;
  userId: string;
  joinedAt: string;
}