import supabaseConfig from '../config/supabase';
import logger from '../utils/logger';
import { IChatMessage, IChatUnreadCount } from '../models/SupabaseChatMessage';
import { SupabaseClient } from '@supabase/supabase-js';

export class ChatService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = supabaseConfig.getClient();
  }

  /**
   * Send a message in a chat
   */
  async sendMessage(
    chatId: string,
    senderId: string,
    message: string
  ): Promise<IChatMessage> {
    try {
      logger.info('ChatService: Sending message', { chatId, senderId, messageLength: message.length });

      const now = new Date().toISOString();

      const { data, error } = await this.supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          sender_id: senderId,
          message,
          timestamp: now,
          created_at: now,
          sent_at: now,
          read_at: null,
          delivered_at: null,
          edited_at: null
        })
        .select()
        .single();

      if (error) {
        logger.error('ChatService: Failed to send message', { error: error.message });
        throw error;
      }

      logger.info('ChatService: Message sent successfully', { messageId: data.id });
      return data;
    } catch (error) {
      logger.error('ChatService: Send message failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Mark a single message as read
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    try {
      logger.info('ChatService: Marking message as read', { messageId, userId });

      const now = new Date().toISOString();

      const { error } = await this.supabase
        .from('chat_messages')
        .update({ read_at: now, delivered_at: now })
        .eq('id', messageId)
        .select()
        .single();

      if (error) {
        logger.error('ChatService: Failed to mark message as read', { error: error.message });
        throw error;
      }

      logger.info('ChatService: Message marked as read');
    } catch (error) {
      logger.error('ChatService: Mark message as read failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Mark all messages in a chat as read for a user
   */
  async markChatAsRead(chatId: string, userId: string): Promise<void> {
    try {
      logger.info('ChatService: Marking chat as read', { chatId, userId });

      const now = new Date().toISOString();

      const { error: updateError } = await this.supabase
        .from('chat_messages')
        .update({ read_at: now, delivered_at: now })
        .eq('chat_id', chatId)
        .is('read_at', null);

      if (updateError) {
        logger.error('ChatService: Failed to mark chat as read', { error: updateError.message });
        throw updateError;
      }

      // Reset unread count for this user in this chat
      await this.resetUnreadCount(userId, chatId);

      logger.info('ChatService: Chat marked as read');
    } catch (error) {
      logger.error('ChatService: Mark chat as read failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get or create unread count entry
   */
  async getOrCreateUnreadCount(userId: string, chatId: string): Promise<IChatUnreadCount> {
    try {
      const { data, error } = await this.supabase
        .from('chat_unread_count')
        .select()
        .eq('user_id', userId)
        .eq('chat_id', chatId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }

      if (data) {
        return data;
      }

      // Create new unread count entry
      const { data: newEntry, error: insertError } = await this.supabase
        .from('chat_unread_count')
        .insert({
          user_id: userId,
          chat_id: chatId,
          unread_count: 0,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return newEntry;
    } catch (error) {
      logger.error('ChatService: Get or create unread count failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Increment unread count for a user in a chat
   */
  async incrementUnreadCount(userId: string, chatId: string): Promise<number> {
    try {
      logger.info('ChatService: Incrementing unread count', { userId, chatId });

      const unreadEntry = await this.getOrCreateUnreadCount(userId, chatId);

      const { data, error } = await this.supabase
        .from('chat_unread_count')
        .update({
          unread_count: unreadEntry.unread_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('chat_id', chatId)
        .select()
        .single();

      if (error) {
        logger.error('ChatService: Failed to increment unread count', { error: error.message });
        throw error;
      }

      logger.info('ChatService: Unread count incremented', { newCount: data.unread_count });
      return data.unread_count;
    } catch (error) {
      logger.error('ChatService: Increment unread count failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Decrement unread count for a user in a chat
   */
  async decrementUnreadCount(userId: string, chatId: string): Promise<number> {
    try {
      logger.info('ChatService: Decrementing unread count', { userId, chatId });

      const unreadEntry = await this.getOrCreateUnreadCount(userId, chatId);
      const newCount = Math.max(0, unreadEntry.unread_count - 1);

      const { data, error } = await this.supabase
        .from('chat_unread_count')
        .update({
          unread_count: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('chat_id', chatId)
        .select()
        .single();

      if (error) {
        logger.error('ChatService: Failed to decrement unread count', { error: error.message });
        throw error;
      }

      logger.info('ChatService: Unread count decremented', { newCount: data.unread_count });
      return data.unread_count;
    } catch (error) {
      logger.error('ChatService: Decrement unread count failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Reset unread count to 0 for a user in a chat
   */
  async resetUnreadCount(userId: string, chatId: string): Promise<void> {
    try {
      logger.info('ChatService: Resetting unread count', { userId, chatId });

      const { error } = await this.supabase
        .from('chat_unread_count')
        .update({
          unread_count: 0,
          last_read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('chat_id', chatId);

      if (error) {
        logger.error('ChatService: Failed to reset unread count', { error: error.message });
        throw error;
      }

      logger.info('ChatService: Unread count reset');
    } catch (error) {
      logger.error('ChatService: Reset unread count failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get total unread message count for a user across all chats
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    try {
      logger.info('ChatService: Getting total unread count', { userId });

      const { data, error } = await this.supabase
        .from('chat_unread_count')
        .select('unread_count')
        .eq('user_id', userId)
        .gt('unread_count', 0);

      if (error) {
        logger.error('ChatService: Failed to get total unread count', { error: error.message });
        throw error;
      }

      const totalUnread = data.reduce((sum, entry) => sum + entry.unread_count, 0);
      logger.info('ChatService: Total unread count retrieved', { totalUnread });
      return totalUnread;
    } catch (error) {
      logger.error('ChatService: Get total unread count failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get unread count for a specific chat
   */
  async getChatUnreadCount(userId: string, chatId: string): Promise<number> {
    try {
      const unreadEntry = await this.getOrCreateUnreadCount(userId, chatId);
      return unreadEntry.unread_count;
    } catch (error) {
      logger.error('ChatService: Get chat unread count failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get chat history
   */
  async getChatHistory(
    chatId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<IChatMessage[]> {
    try {
      logger.info('ChatService: Getting chat history', { chatId, limit, offset });

      const { data, error } = await this.supabase
        .from('chat_messages')
        .select()
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('ChatService: Failed to get chat history', { error: error.message });
        throw error;
      }

      logger.info('ChatService: Chat history retrieved', { count: data?.length || 0 });
      return data || [];
    } catch (error) {
      logger.error('ChatService: Get chat history failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get read receipt info for a message
   */
  async getMessageReadReceipt(messageId: string): Promise<{ isRead: boolean; readAt: string | null }> {
    try {
      const { data, error } = await this.supabase
        .from('chat_messages')
        .select('read_at')
        .eq('id', messageId)
        .single();

      if (error) {
        logger.error('ChatService: Failed to get read receipt', { error: error.message });
        throw error;
      }

      return {
        isRead: data.read_at !== null,
        readAt: data.read_at
      };
    } catch (error) {
      logger.error('ChatService: Get message read receipt failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get all chat participants
   */
  async getChatParticipants(chatId: string): Promise<string[]> {
    try {
      logger.info('ChatService: Getting chat participants', { chatId });

      const { data, error } = await this.supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId);

      if (error) {
        logger.error('ChatService: Failed to get chat participants', { error: error.message });
        throw error;
      }

      const participantIds = data?.map(p => p.user_id) || [];
      logger.info('ChatService: Chat participants retrieved', { count: participantIds.length });
      return participantIds;
    } catch (error) {
      logger.error('ChatService: Get chat participants failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Broadcast message to all participants
   */
  async broadcastMessage(
    chatId: string,
    senderId: string,
    message: IChatMessage
  ): Promise<void> {
    try {
      logger.info('ChatService: Broadcasting message', { chatId, messageId: message.id });

      // Get all participants except sender
      const participants = await this.getChatParticipants(chatId);
      const recipientIds = participants.filter(id => id !== senderId);

      // In a real implementation, this would broadcast via WebSocket or Supabase Realtime
      // The database trigger handles unread count incrementing automatically
      logger.info('ChatService: Message broadcast prepared', { recipientCount: recipientIds.length });
    } catch (error) {
      logger.error('ChatService: Broadcast message failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get unread counts for all chats of a user
   */
  async getAllUnreadCounts(userId: string): Promise<Array<{ chat_id: string; unread_count: number }>> {
    try {
      logger.info('ChatService: Getting all unread counts', { userId });

      const { data, error } = await this.supabase
        .from('chat_unread_count')
        .select('chat_id, unread_count')
        .eq('user_id', userId)
        .gt('unread_count', 0);

      if (error) {
        logger.error('ChatService: Failed to get all unread counts', { error: error.message });
        throw error;
      }

      const unreadCounts = data?.map(entry => ({
        chat_id: entry.chat_id,
        unread_count: entry.unread_count,
      })) || [];

      logger.info('ChatService: All unread counts retrieved', { chatCount: unreadCounts.length });
      return unreadCounts;
    } catch (error) {
      logger.error('ChatService: Get all unread counts failed', { error: (error as Error).message });
      throw error;
    }
  }
}

export default new ChatService();
