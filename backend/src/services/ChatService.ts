import supabaseConfig from '../config/supabase';
import logger from '../utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';
import { 
  ChatMessage, 
  ChatUnreadCount, 
  CreateChatMessageInput,
  UpdateMessageStatusInput,
  ChatModelTransformer
} from '../models/ChatModels';
import { getSchemaValidator, validateSchema } from '../utils/schemaValidator';
import { monitorPerformance, getPerformanceMonitor } from '../utils/performanceMonitor';

export class ChatService {
  private supabase: SupabaseClient;
  private schemaValidator: any;
  private performanceMonitor: any;

  constructor() {
    this.supabase = supabaseConfig.getClient();
    this.schemaValidator = getSchemaValidator(this.supabase);
    this.performanceMonitor = getPerformanceMonitor();
    
    // Validate schemas on initialization
    this.validateSchemas();
  }

  /**
   * Lightweight schema validation - just log that service is ready
   */
  private async validateSchemas(): Promise<void> {
    try {
      // Quick validation without heavy queries
      const validation = await this.schemaValidator.validateAllChatSchemas();
      
      if (validation.overallValid) {
        logger.info('✅ Chat service ready - tables accessible');
      } else {
        logger.warn('⚠️ Chat tables may not be ready, but service will continue');
      }
    } catch (error) {
      logger.warn('Schema validation skipped:', (error as Error).message);
      // Don't throw - let service start anyway
    }
  }

  /**
   * Send a message in a chat - Performance monitored
   */
  @monitorPerformance('ChatService', 'sendMessage')
  async sendMessage(
    chatId: string,
    senderId: string,
    message: string
  ): Promise<ChatMessage> {
    try {
      logger.info('ChatService: Sending message', { chatId, senderId, messageLength: message.length });

      const { data, error } = await this.supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          sender_id: senderId,
          message: message,
          chat_type: 'dm'
        })
        .select()
        .single();

      if (error) {
        logger.error('ChatService: Failed to send message', { error: error.message });
        throw error;
      }

      // Extract recipient ID from DM chat ID format: dm_userId1_userId2
      if (chatId.startsWith('dm_')) {
        const userIds = chatId.replace('dm_', '').split('_');
        const recipientId = userIds.find(id => id !== senderId);
        
        if (recipientId) {
          try {
            // Increment unread count for recipient
            await this.incrementUnreadCount(recipientId, chatId);
            logger.info('ChatService: Incremented unread count for recipient', { recipientId, chatId });
          } catch (unreadError) {
            logger.error('ChatService: Failed to increment unread count', { 
              error: (unreadError as Error).message,
              recipientId,
              chatId 
            });
            // Don't fail the message send if unread count fails
          }
        }
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
  async getOrCreateUnreadCount(userId: string, chatId: string): Promise<ChatUnreadCount> {
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
   * Get chat history with sender information - Simplified and optimized
   */
  async getChatHistory(
    chatId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatMessage[]> {
    try {
      logger.info('ChatService: Getting chat history', { chatId, userId, limit, offset });

      // Check access (DM only)
      if (chatId.startsWith('dm_')) {
        const userIds = chatId.replace('dm_', '').split('_');
        if (!userIds.includes(userId)) {
          logger.warn('ChatService: Access denied', { chatId, userId, participants: userIds });
          throw new Error('Access denied: You are not a participant in this chat');
        }
      }

      // Simple query - no complex filters, just chat_id and order by timestamp
      const { data: messages, error } = await this.supabase
        .from('chat_messages')
        .select(`
          *,
          sender:users(
            id,
            full_name,
            email,
            role
          )
        `)
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: true }) // Oldest first for chat flow
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('ChatService: Failed to get chat messages', { error: error.message });
        throw error;
      }

      if (!messages || messages.length === 0) {
        logger.info('ChatService: No messages found for chat', { chatId });
        return [];
      }

      // Transform with sender info
      const messagesWithSender = messages.map(msg => ({
        id: msg.id,
        chat_id: msg.chat_id,
        sender_id: msg.sender_id,
        message: msg.message,
        timestamp: msg.timestamp,
        chat_type: msg.chat_type,
        message_type: msg.message_type,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        read_at: msg.read_at,
        delivered_at: msg.delivered_at,
        sent_at: msg.sent_at,
        edited_at: msg.edited_at,
        // Sender information
        senderName: msg.sender?.full_name || msg.sender?.email || 'Unknown User',
        sender_name: msg.sender?.full_name || msg.sender?.email || 'Unknown User',
        sender_email: msg.sender?.email || null,
        senderRole: msg.sender?.role || null,
        // Message ownership
        isOwn: msg.sender_id === userId,
        // Message status
        status: msg.read_at ? 'read' : msg.delivered_at ? 'delivered' : msg.sent_at ? 'sent' : 'sending'
      }));

      logger.info('ChatService: Chat history retrieved successfully', { 
        count: messagesWithSender.length,
        chatId,
        sampleMessage: messagesWithSender[0] ? {
          id: messagesWithSender[0].id,
          sender: messagesWithSender[0].senderName,
          content: messagesWithSender[0].message?.substring(0, 50) + '...'
        } : null
      });
      
      return messagesWithSender;
    } catch (error) {
      logger.error('ChatService: Get chat history failed', { error: (error as Error).message, chatId, userId });
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
    message: ChatMessage
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
        // Return empty array instead of throwing to prevent breaking the UI
        return [];
      }

      const unreadCounts = data?.map(entry => ({
        chat_id: entry.chat_id,
        unread_count: entry.unread_count,
      })) || [];

      logger.info('ChatService: All unread counts retrieved', { chatCount: unreadCounts.length });
      return unreadCounts;
    } catch (error) {
      logger.error('ChatService: Get all unread counts failed', { error: (error as Error).message });
      // Return empty array instead of throwing to prevent breaking the UI
      return [];
    }
  }

  /**
   * Create or get a DM chat between two users
   * Uses simple chat_id format: dm_userId1_userId2
   */
  async createOrGetDMChat(userId: string, recipientId: string): Promise<any> {
    try {
      logger.info('ChatService: Creating or getting DM chat', { userId, recipientId });

      // Generate consistent chat ID (smaller ID first for consistency)
      const sortedIds = [userId, recipientId].sort();
      const chatId = `dm_${sortedIds[0]}_${sortedIds[1]}`;

      // Check if messages already exist for this chat
      const { data: existingMessages, error: searchError } = await this.supabase
        .from('chat_messages')
        .select('chat_id')
        .eq('chat_id', chatId)
        .limit(1);

      if (searchError) {
        logger.error('ChatService: Failed to search for existing DM', { error: searchError.message });
        throw searchError;
      }

      // Get recipient info for chat name
      const { data: recipientData, error: recipientError } = await this.supabase
        .from('users')
        .select('full_name, email')
        .eq('id', recipientId)
        .single();

      const recipientName = recipientData?.full_name || recipientData?.email || 'Unknown User';

      const chatInfo = {
        id: chatId,
        name: recipientName,
        type: 'dm',
        created_by: userId,
        created_at: new Date().toISOString(),
        otherParticipantId: recipientId,
        participants: [userId, recipientId]
      };

      if (existingMessages && existingMessages.length > 0) {
        logger.info('ChatService: Found existing DM chat', { chatId });
        return chatInfo;
      }

      // Create unread count entries for both users if they don't exist
      await this.getOrCreateUnreadCount(userId, chatId);
      await this.getOrCreateUnreadCount(recipientId, chatId);

      logger.info('ChatService: DM chat ready', { chatId });
      return chatInfo;
    } catch (error) {
      logger.error('ChatService: Create or get DM chat failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Create a group chat
   */
  async createGroupChat(creatorId: string, name: string, description?: string, memberIds?: string[]): Promise<any> {
    try {
      logger.info('ChatService: Creating group chat', { creatorId, name, memberCount: memberIds?.length || 0 });

      // Create the group chat
      const { data: newGroup, error: createError } = await this.supabase
        .from('chats')
        .insert({
          type: 'group',
          name,
          description,
          created_by: creatorId
        })
        .select()
        .single();

      if (createError) {
        logger.error('ChatService: Failed to create group chat', { error: createError.message });
        throw createError;
      }

      // Add creator as admin
      const participants = [
        { chat_id: newGroup.id, employee_id: creatorId, role: 'admin' }
      ];

      // Add other members
      if (memberIds && memberIds.length > 0) {
        const memberParticipants = memberIds
          .filter(id => id !== creatorId) // Don't add creator twice
          .map(id => ({ chat_id: newGroup.id, employee_id: id, role: 'member' }));
        participants.push(...memberParticipants);
      }

      const { error: participantsError } = await this.supabase
        .from('chat_participants')
        .insert(participants);

      if (participantsError) {
        logger.error('ChatService: Failed to add group participants', { error: participantsError.message });
        throw participantsError;
      }

      logger.info('ChatService: Created group chat successfully', { groupId: newGroup.id });
      return newGroup;
    } catch (error) {
      logger.error('ChatService: Create group chat failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get user's chats (both DMs and groups) - Enhanced version with proper participant lookup
   */
  async getUserChats(userId: string): Promise<any[]> {
    try {
      logger.info('ChatService: Getting user chats', { userId });

      // Method 1: Try using chat_participants table if it exists
      let userChatIds: string[] = [];
      
      try {
        const { data: participantData, error: participantError } = await this.supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', userId);

        if (!participantError && participantData) {
          userChatIds = participantData.map(p => p.chat_id);
          logger.info('ChatService: Found chats via participants table', { chatCount: userChatIds.length });
        }
      } catch (participantTableError) {
        logger.info('ChatService: chat_participants table not available, using fallback method');
      }

      // Method 2: Fallback - Parse DM chat IDs to find user participation
      if (userChatIds.length === 0) {
        const { data: allDMMessages, error: dmError } = await this.supabase
          .from('chat_messages')
          .select('chat_id')
          .like('chat_id', 'dm_%');

        if (!dmError && allDMMessages) {
          // Filter DM chats where this user is a participant
          const uniqueChatIds = [...new Set(allDMMessages.map((m: any) => m.chat_id))];
          userChatIds = uniqueChatIds.filter(chatId => {
            const userIds = chatId.replace('dm_', '').split('_');
            return userIds.includes(userId);
          });
          
          logger.info('ChatService: Found chats via DM parsing', { chatCount: userChatIds.length });
        }
      }

      if (userChatIds.length === 0) {
        logger.info('ChatService: No chats found for user', { userId });
        return [];
      }

      // Get latest message for each chat the user participates in
      const { data: userMessages, error: messagesError } = await this.supabase
        .from('chat_messages')
        .select('chat_id, message, timestamp, sender_id')
        .in('chat_id', userChatIds)
        .order('timestamp', { ascending: false });

      if (messagesError) {
        logger.error('ChatService: Failed to get user messages', { error: messagesError.message });
        throw messagesError;
      }

      // Group messages by chat_id and get the latest message for each chat
      const chatMap = new Map();
      
      userMessages?.forEach(message => {
        const chatId = message.chat_id;
        
        if (!chatMap.has(chatId) || new Date(message.timestamp) > new Date(chatMap.get(chatId).timestamp)) {
          chatMap.set(chatId, message);
        }
      });

      // Convert to chat objects with additional info
      const chats = [];
      
      for (const [chatId, lastMessage] of chatMap.entries()) {
        // Extract other participant ID from DM chat ID
        const userIds = chatId.replace('dm_', '').split('_');
        const otherUserId = userIds.find((id: string) => id !== userId);
        
        if (otherUserId) {
          // Get other user's info
          const { data: otherUser } = await this.supabase
            .from('users')
            .select('full_name, email')
            .eq('id', otherUserId)
            .single();

          // Get unread count
          const unreadCount = await this.getChatUnreadCount(userId, chatId);

          chats.push({
            id: chatId,
            name: otherUser?.full_name || otherUser?.email || 'Unknown User',
            type: 'dm',
            lastMessage: lastMessage.message,
            lastMessageAt: lastMessage.timestamp,
            unreadCount: unreadCount,
            otherParticipantId: otherUserId,
            participants: [userId, otherUserId]
          });
        }
      }

      // Sort by last message time
      chats.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

      logger.info('ChatService: User chats retrieved', { chatCount: chats.length });
      return chats;
    } catch (error) {
      logger.error('ChatService: Get user chats failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Group Chat Management
   */
  async getUserGroups(userId: string): Promise<any[]> {
    try {
      logger.info('ChatService: Getting user groups', { userId });
      
      const { data: groups, error } = await supabaseConfig.getClient()
        .from('group_chats')
        .select(`
          *,
          group_chat_members!inner(role)
        `)
        .eq('group_chat_members.employee_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get user groups: ${error.message}`);
      }

      // Get member counts for each group
      const processedGroups = await Promise.all(groups?.map(async (group) => {
        const { count } = await supabaseConfig.getClient()
          .from('group_chat_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          is_private: group.is_private,
          created_by: group.created_by,
          member_count: count || 0,
          user_role: group.group_chat_members?.[0]?.role || 'member',
          created_at: group.created_at,
          updated_at: group.updated_at
        };
      }) || []);

      logger.info('ChatService: User groups retrieved', { groupCount: processedGroups.length });
      return processedGroups;
    } catch (error) {
      logger.error('ChatService: Get user groups failed', { error: (error as Error).message });
      throw error;
    }
  }

  async createGroup(createdBy: string, name: string, description?: string, isPrivate: boolean = false): Promise<any> {
    try {
      logger.info('ChatService: Creating group', { name, createdBy });
      
      const { data: group, error: groupError } = await supabaseConfig.getClient()
        .from('group_chats')
        .insert({
          name,
          description: description || '',
          created_by: createdBy,
          is_private: isPrivate
        })
        .select()
        .single();

      if (groupError) {
        throw new Error(`Failed to create group: ${groupError.message}`);
      }

      // Add creator as admin member
      const { error: memberError } = await supabaseConfig.getClient()
        .from('group_chat_members')
        .insert({
          group_id: group.id,
          employee_id: createdBy,
          role: 'admin'
        });

      if (memberError) {
        // Clean up the group if member addition fails
        await supabaseConfig.getClient()
          .from('group_chats')
          .delete()
          .eq('id', group.id);
        throw new Error(`Failed to add creator as member: ${memberError.message}`);
      }

      logger.info('ChatService: Group created successfully', { groupId: group.id });
      return group;
    } catch (error) {
      logger.error('ChatService: Create group failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getGroup(groupId: string, userId: string): Promise<any> {
    try {
      logger.info('ChatService: Getting group', { groupId, userId });
      
      // Check if user is a member of the group
      const { data: membership, error: memberError } = await supabaseConfig.getClient()
        .from('group_chat_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('employee_id', userId)
        .single();

      if (memberError || !membership) {
        throw new Error('Group not found or access denied');
      }

      const { data: group, error } = await supabaseConfig.getClient()
        .from('group_chats')
        .select(`
          *,
          group_chat_members(count)
        `)
        .eq('id', groupId)
        .single();

      if (error) {
        throw new Error(`Failed to get group: ${error.message}`);
      }

      const processedGroup = {
        ...group,
        member_count: group.group_chat_members?.length || 0,
        user_role: membership.role
      };

      logger.info('ChatService: Group retrieved', { groupId });
      return processedGroup;
    } catch (error) {
      logger.error('ChatService: Get group failed', { error: (error as Error).message });
      throw error;
    }
  }

  async updateGroup(groupId: string, userId: string, updates: { name?: string; description?: string; is_private?: boolean }): Promise<any> {
    try {
      logger.info('ChatService: Updating group', { groupId, userId });
      
      // Check if user is admin or creator
      const { data: membership, error: memberError } = await supabaseConfig.getClient()
        .from('group_chat_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('employee_id', userId)
        .single();

      if (memberError || !membership || membership.role !== 'admin') {
        const { data: group } = await supabaseConfig.getClient()
          .from('group_chats')
          .select('created_by')
          .eq('id', groupId)
          .single();
        
        if (!group || group.created_by !== userId) {
          throw new Error('Only group admins can update the group');
        }
      }

      const { data: updatedGroup, error } = await supabaseConfig.getClient()
        .from('group_chats')
        .update(updates)
        .eq('id', groupId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update group: ${error.message}`);
      }

      logger.info('ChatService: Group updated successfully', { groupId });
      return updatedGroup;
    } catch (error) {
      logger.error('ChatService: Update group failed', { error: (error as Error).message });
      throw error;
    }
  }

  async deleteGroup(groupId: string, userId: string): Promise<void> {
    try {
      logger.info('ChatService: Deleting group', { groupId, userId });
      
      // Check if user is the creator
      const { data: group, error: groupError } = await supabaseConfig.getClient()
        .from('group_chats')
        .select('created_by')
        .eq('id', groupId)
        .single();

      if (groupError || !group || group.created_by !== userId) {
        throw new Error('Only the group creator can delete the group');
      }

      const { error } = await supabaseConfig.getClient()
        .from('group_chats')
        .delete()
        .eq('id', groupId);

      if (error) {
        throw new Error(`Failed to delete group: ${error.message}`);
      }

      logger.info('ChatService: Group deleted successfully', { groupId });
    } catch (error) {
      logger.error('ChatService: Delete group failed', { error: (error as Error).message });
      throw error;
    }
  }

  async addGroupMember(groupId: string, userId: string, employeeId: string, role: string = 'member'): Promise<any> {
    try {
      logger.info('ChatService: Adding group member', { groupId, userId, employeeId });
      
      // Check if user is admin or creator
      const { data: membership, error: memberError } = await supabaseConfig.getClient()
        .from('group_chat_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('employee_id', userId)
        .single();

      if (memberError || !membership || membership.role !== 'admin') {
        const { data: group } = await supabaseConfig.getClient()
          .from('group_chats')
          .select('created_by')
          .eq('id', groupId)
          .single();
        
        if (!group || group.created_by !== userId) {
          throw new Error('Only group admins can add members');
        }
      }

      const { data: newMember, error } = await supabaseConfig.getClient()
        .from('group_chat_members')
        .insert({
          group_id: groupId,
          employee_id: employeeId,
          role: role
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add member: ${error.message}`);
      }

      logger.info('ChatService: Member added successfully', { groupId, employeeId });
      return newMember;
    } catch (error) {
      logger.error('ChatService: Add group member failed', { error: (error as Error).message });
      throw error;
    }
  }

  async removeGroupMember(groupId: string, userId: string, memberId: string): Promise<void> {
    try {
      logger.info('ChatService: Removing group member', { groupId, userId, memberId });
      
      // Check if user is admin or creator, or removing themselves
      if (userId !== memberId) {
        const { data: membership, error: memberError } = await supabaseConfig.getClient()
          .from('group_chat_members')
          .select('role')
          .eq('group_id', groupId)
          .eq('employee_id', userId)
          .single();

        if (memberError || !membership || membership.role !== 'admin') {
          const { data: group } = await supabaseConfig.getClient()
            .from('group_chats')
            .select('created_by')
            .eq('id', groupId)
            .single();
          
          if (!group || group.created_by !== userId) {
            throw new Error('Only group admins can remove members');
          }
        }
      }

      const { error } = await supabaseConfig.getClient()
        .from('group_chat_members')
        .delete()
        .eq('group_id', groupId)
        .eq('employee_id', memberId);

      if (error) {
        throw new Error(`Failed to remove member: ${error.message}`);
      }

      logger.info('ChatService: Member removed successfully', { groupId, memberId });
    } catch (error) {
      logger.error('ChatService: Remove group member failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getGroupMembers(groupId: string, userId: string): Promise<any[]> {
    try {
      logger.info('ChatService: Getting group members', { groupId, userId });
      
      // Check if user is a member of the group
      const { data: membership, error: memberError } = await supabaseConfig.getClient()
        .from('group_chat_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('employee_id', userId)
        .single();

      if (memberError || !membership) {
        throw new Error('Group not found or access denied');
      }

      const { data: members, error } = await supabaseConfig.getClient()
        .from('group_chat_members')
        .select(`
          *,
          employees(id, full_name, email, avatar, role)
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to get group members: ${error.message}`);
      }

      const processedMembers = members?.map(member => ({
        id: member.id,
        employee_id: member.employee_id,
        role: member.role,
        joined_at: member.joined_at,
        employee: member.employees
      })) || [];

      logger.info('ChatService: Group members retrieved', { memberCount: processedMembers.length });
      return processedMembers;
    } catch (error) {
      logger.error('ChatService: Get group members failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getChatHistoryForUser(userId: string): Promise<any[]> {
    try {
      logger.info('ChatService: Getting chat history for user', { userId });
      
      // Get DM chats
      const { data: dmChats, error: dmError } = await supabaseConfig.getClient()
        .from('chat_participants')
        .select(`
          chat_id,
          chat_messages(
            message,
            created_at,
            sender_id,
            employees(full_name)
          )
        `)
        .eq('employee_id', userId)
        .order('created_at', { ascending: false });

      // Get group chats
      const { data: groupChats, error: groupError } = await supabaseConfig.getClient()
        .from('group_chat_members')
        .select(`
          group_chats(
            id,
            name,
            description,
            avatar
          ),
          chat_messages(
            message,
            created_at,
            sender_id,
            employees(full_name)
          )
        `)
        .eq('employee_id', userId);

      if (dmError && groupError) {
        throw new Error('Failed to get chat history');
      }

      const allChats: any[] = [];

      // Process DM chats
      if (dmChats) {
        dmChats.forEach(dm => {
          if (dm.chat_messages && dm.chat_messages.length > 0) {
            const lastMessage = dm.chat_messages[0];
            const employee = Array.isArray(lastMessage.employees) ? lastMessage.employees[0] : lastMessage.employees;
            allChats.push({
              id: dm.chat_id,
              name: `DM with ${employee?.full_name || 'Unknown'}`,
              type: 'dm',
              last_message: lastMessage.message,
              last_message_at: lastMessage.created_at,
              participants: employee?.full_name || 'Unknown'
            });
          }
        });
      }

      // Process group chats
      if (groupChats) {
        groupChats.forEach(group => {
          if (group.group_chats && group.chat_messages && group.chat_messages.length > 0) {
            const lastMessage = group.chat_messages[0];
            const groupChat = Array.isArray(group.group_chats) ? group.group_chats[0] : group.group_chats;
            allChats.push({
              id: groupChat?.id,
              name: groupChat?.name,
              type: 'group',
              last_message: lastMessage.message,
              last_message_at: lastMessage.created_at,
              participants: `Group: ${groupChat?.name}`,
              avatar: groupChat?.avatar
            });
          }
        });
      }

      // Sort by last message time
      allChats.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

      logger.info('ChatService: Chat history retrieved', { chatCount: allChats.length });
      return allChats;
    } catch (error) {
      logger.error('ChatService: Get chat history failed', { error: (error as Error).message });
      throw error;
    }
  }
}

export default new ChatService();
