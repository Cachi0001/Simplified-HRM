/**
 * Chat Models - Exact Database Schema Compliance
 * These interfaces match the exact database schema from migration 018
 * DO NOT modify without updating the database schema first
 */

/**
 * chat_messages table interface - EXACT match to database schema
 * Based on migration 018_chat_no_foreign_keys.sql
 */
export interface ChatMessage {
  id: string;                           // UUID PRIMARY KEY
  chat_id: string;                      // VARCHAR(255) NOT NULL
  sender_id: string;                    // UUID NOT NULL
  message: string;                      // TEXT NOT NULL
  chat_type: string;                    // VARCHAR(50) NOT NULL DEFAULT 'dm'
  message_type?: string | null;         // VARCHAR(50) DEFAULT 'text'
  timestamp: string;                    // TIMESTAMPTZ DEFAULT NOW()
  read_at?: string | null;              // TIMESTAMPTZ DEFAULT NULL
  delivered_at?: string | null;         // TIMESTAMPTZ DEFAULT NULL
  sent_at?: string | null;              // TIMESTAMPTZ DEFAULT NOW()
  edited_at?: string | null;            // TIMESTAMPTZ DEFAULT NULL
  created_at: string;                   // TIMESTAMPTZ DEFAULT NOW()
  updated_at: string;                   // TIMESTAMPTZ DEFAULT NOW()
}

/**
 * chat_unread_count table interface - EXACT match to database schema
 * Based on migration 018_chat_no_foreign_keys.sql
 */
export interface ChatUnreadCount {
  id: string;                           // UUID PRIMARY KEY
  user_id: string;                      // UUID NOT NULL
  chat_id: string;                      // VARCHAR(255) NOT NULL
  unread_count: number;                 // INTEGER NOT NULL DEFAULT 0
  last_read_at?: string | null;         // TIMESTAMPTZ
  updated_at: string;                   // TIMESTAMPTZ DEFAULT NOW()
  created_at: string;                   // TIMESTAMPTZ DEFAULT NOW()
}

/**
 * Input interface for creating new messages
 * Only includes fields that can be set by the client
 */
export interface CreateChatMessageInput {
  chat_id: string;
  sender_id: string;
  message: string;
  chat_type?: string;                   // Optional, defaults to 'dm'
  message_type?: string;                // Optional, defaults to 'text'
}

/**
 * Input interface for updating message status
 */
export interface UpdateMessageStatusInput {
  read_at?: string | null;
  delivered_at?: string | null;
  edited_at?: string | null;
}

/**
 * Input interface for creating/updating unread counts
 */
export interface CreateUnreadCountInput {
  user_id: string;
  chat_id: string;
  unread_count?: number;                // Optional, defaults to 0
  last_read_at?: string | null;
}

/**
 * UI-friendly message interface for frontend consumption
 * Transforms database fields to more user-friendly names
 */
export interface UIMessage {
  id: string;
  chatId: string;                       // Transformed from chat_id
  senderId: string;                     // Transformed from sender_id
  content: string;                      // Transformed from message
  type: string;                         // Transformed from message_type
  timestamp: string;
  status: MessageStatus;                // Computed from read_at, delivered_at, sent_at
  isOwn: boolean;                       // Computed based on current user
  isEdited: boolean;                    // Computed from edited_at
}

/**
 * Message status enum based on database timestamp fields
 */
export enum MessageStatus {
  SENDING = 'sending',                  // Not yet in database
  SENT = 'sent',                        // Has sent_at timestamp
  DELIVERED = 'delivered',              // Has delivered_at timestamp
  READ = 'read'                         // Has read_at timestamp
}

/**
 * Chat type enum based on database chat_type field
 */
export enum ChatType {
  DM = 'dm',                           // Direct message between two users
  GROUP = 'group',                     // Group chat with multiple users
  ANNOUNCEMENT = 'announcement'         // Broadcast messages
}

/**
 * Message type enum based on database message_type field
 */
export enum MessageType {
  TEXT = 'text',                       // Plain text message
  IMAGE = 'image',                     // Image attachment
  FILE = 'file',                       // File attachment
  SYSTEM = 'system'                    // System-generated message
}

/**
 * Database column validation constants
 * Used by SchemaValidator to ensure we only use existing columns
 */
export const CHAT_MESSAGES_COLUMNS: string[] = [
  'id',
  'chat_id',
  'sender_id',
  'message',
  'chat_type',
  'message_type',
  'timestamp',
  'read_at',
  'delivered_at',
  'sent_at',
  'edited_at',
  'created_at',
  'updated_at'
];

export const CHAT_UNREAD_COUNT_COLUMNS: string[] = [
  'id',
  'user_id',
  'chat_id',
  'unread_count',
  'last_read_at',
  'updated_at',
  'created_at'
];

/**
 * Type guards for runtime type checking
 */
export function isChatMessage(obj: any): obj is ChatMessage {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.chat_id === 'string' &&
    typeof obj.sender_id === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.chat_type === 'string' &&
    typeof obj.timestamp === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
}

export function isChatUnreadCount(obj: any): obj is ChatUnreadCount {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.user_id === 'string' &&
    typeof obj.chat_id === 'string' &&
    typeof obj.unread_count === 'number' &&
    typeof obj.updated_at === 'string' &&
    typeof obj.created_at === 'string'
  );
}

/**
 * Utility functions for transforming between database and UI formats
 */
export class ChatModelTransformer {
  /**
   * Transform database ChatMessage to UI-friendly format
   */
  static toUIMessage(dbMessage: ChatMessage, currentUserId: string): UIMessage {
    return {
      id: dbMessage.id,
      chatId: dbMessage.chat_id,
      senderId: dbMessage.sender_id,
      content: dbMessage.message,
      type: dbMessage.message_type || MessageType.TEXT,
      timestamp: dbMessage.timestamp,
      status: this.getMessageStatus(dbMessage),
      isOwn: dbMessage.sender_id === currentUserId,
      isEdited: !!dbMessage.edited_at
    };
  }

  /**
   * Determine message status based on timestamp fields
   */
  static getMessageStatus(dbMessage: ChatMessage): MessageStatus {
    if (dbMessage.read_at) return MessageStatus.READ;
    if (dbMessage.delivered_at) return MessageStatus.DELIVERED;
    if (dbMessage.sent_at) return MessageStatus.SENT;
    return MessageStatus.SENDING;
  }

  /**
   * Transform UI input to database insert format
   */
  static toCreateInput(
    chatId: string,
    senderId: string,
    content: string,
    chatType: ChatType = ChatType.DM,
    messageType: MessageType = MessageType.TEXT
  ): CreateChatMessageInput {
    return {
      chat_id: chatId,
      sender_id: senderId,
      message: content,
      chat_type: chatType,
      message_type: messageType
    };
  }

  /**
   * Create unread count input
   */
  static toUnreadCountInput(
    userId: string,
    chatId: string,
    count: number = 0
  ): CreateUnreadCountInput {
    return {
      user_id: userId,
      chat_id: chatId,
      unread_count: count
    };
  }
}

// All exports are already declared above, no need for additional export block