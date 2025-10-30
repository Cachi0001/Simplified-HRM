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
   */
  async createOrGetDMChat(userId: string, recipientId: string): Promise<any> {
    try {
      logger.info('ChatService: Creating or getting DM chat', { userId, recipientId });

      // Check if DM chat already exists between these users
      const { data: existingChat, error: searchError } = await this.supabase
        .from('chats')
        .select(`
          *,
          chat_participants!inner(employee_id)
        `)
        .eq('type', 'dm')
        .eq('chat_participants.employee_id', userId);

      if (searchError) {
        logger.error('ChatService: Failed to search for existing DM', { error: searchError.message });
        throw searchError;
      }

      // Find chat where both users are participants
      const dmChat = existingChat?.find(chat => {
        const participantIds = chat.chat_participants.map((p: any) => p.employee_id);
        return participantIds.includes(recipientId) && participantIds.length === 2;
      });

      if (dmChat) {
        logger.info('ChatService: Found existing DM chat', { chatId: dmChat.id });
        return dmChat;
      }

      // Create new DM chat
      const { data: newChat, error: createError } = await this.supabase
        .from('chats')
        .insert({
          type: 'dm',
          created_by: userId,
          name: null, // DMs don't have names
          description: null
        })
        .select()
        .single();

      if (createError) {
        logger.error('ChatService: Failed to create DM chat', { error: createError.message });
        throw createError;
      }

      // Add both users as participants
      const { error: participantsError } = await this.supabase
        .from('chat_participants')
        .insert([
          { chat_id: newChat.id, employee_id: userId, role: 'member' },
          { chat_id: newChat.id, employee_id: recipientId, role: 'member' }
        ]);

      if (participantsError) {
        logger.error('ChatService: Failed to add DM participants', { error: participantsError.message });
        throw participantsError;
      }

      logger.info('ChatService: Created new DM chat', { chatId: newChat.id });
      return newChat;
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
   * Get user's chats (both DMs and groups)
   */
  async getUserChats(userId: string): Promise<any[]> {
    try {
      logger.info('ChatService: Getting user chats', { userId });

      const { data: chats, error } = await this.supabase
        .from('chats')
        .select(`
          *,
          chat_participants!inner(employee_id, role, joined_at),
          chat_messages(message, created_at, sender_id)
        `)
        .eq('chat_participants.employee_id', userId)
        .is('chat_participants.left_at', null)
        .order('last_message_at', { ascending: false });

      if (error) {
        logger.error('ChatService: Failed to get user chats', { error: error.message });
        throw error;
      }

      // Process chats to add additional info
      const processedChats = chats?.map(chat => {
        // Get last message
        const lastMessage = chat.chat_messages?.[0];
        
        // For DMs, get the other participant's info
        if (chat.type === 'dm') {
          const otherParticipant = chat.chat_participants.find((p: any) => p.employee_id !== userId);
          return {
            ...chat,
            lastMessage: lastMessage?.message || '',
            lastMessageAt: lastMessage?.created_at || chat.created_at,
            otherParticipantId: otherParticipant?.employee_id
          };
        }

        return {
          ...chat,
          lastMessage: lastMessage?.message || '',
          lastMessageAt: lastMessage?.created_at || chat.created_at
        };
      }) || [];

      logger.info('ChatService: User chats retrieved', { chatCount: processedChats.length });
      return processedChats;
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
