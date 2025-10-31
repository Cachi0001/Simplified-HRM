import { Request, Response } from 'express';
import { ChatService } from '../services/ChatService';
import { getTypingService } from '../services/TypingService';
import { getWebSocketService } from '../services/WebSocketService';
import logger from '../utils/logger';

export class ChatController {
  private typingService = getTypingService();

  constructor(private chatService: ChatService) { }

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { chatId, message } = req.body;
      const userId = req.user?.id;

      if (!chatId || !message || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'chatId, message, and userId are required'
        });
        return;
      }

      logger.info('💬 [ChatController] Send message request', {
        chatId,
        userId,
        messageLength: message.length
      });

      const sentMessage = await this.chatService.sendMessage(chatId, userId, message);

      // Broadcast via WebSocket if service is available
      const webSocketService = getWebSocketService();
      if (webSocketService) {
        try {
          await webSocketService.broadcastMessageFromAPI({
            id: sentMessage.id,
            chatId: sentMessage.chat_id,
            senderId: sentMessage.sender_id,
            senderName: req.user?.full_name || 'Unknown User',
            senderEmail: req.user?.email,
            senderRole: req.user?.role,
            message: sentMessage.message,
            timestamp: sentMessage.timestamp
          });
          logger.info('📢 Message broadcasted via WebSocket:', { messageId: sentMessage.id });
        } catch (wsError) {
          logger.warn('⚠️ WebSocket broadcast failed, message still saved:', wsError);
        }
      }

      res.status(201).json({
        status: 'success',
        message: 'Message sent successfully',
        data: { message: sentMessage }
      });
    } catch (error) {
      logger.error('❌ [ChatController] Send message error', {
        error: (error as Error).message,
        body: req.body
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async markMessageAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const userId = req.user?.id;

      if (!messageId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'messageId and userId are required'
        });
        return;
      }

      logger.info('✅ [ChatController] Mark message as read', {
        messageId,
        userId
      });

      await this.chatService.markMessageAsRead(messageId, userId);

      res.status(200).json({
        status: 'success',
        message: 'Message marked as read'
      });
    } catch (error) {
      logger.error('❌ [ChatController] Mark message as read error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async markChatAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const userId = req.user?.id;

      if (!chatId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'chatId and userId are required'
        });
        return;
      }

      logger.info('✅ [ChatController] Mark chat as read', {
        chatId,
        userId
      });

      await this.chatService.markChatAsRead(chatId, userId);

      // Broadcast read receipt via WebSocket if service is available
      const webSocketService = getWebSocketService();
      if (webSocketService) {
        try {
          await webSocketService.broadcastReadReceiptFromAPI(chatId, userId);
          logger.info('📢 Read receipt broadcasted via WebSocket:', { chatId, userId });
        } catch (wsError) {
          logger.warn('⚠️ WebSocket read receipt broadcast failed:', wsError);
        }
      }

      res.status(200).json({
        status: 'success',
        message: 'Chat marked as read'
      });
    } catch (error) {
      logger.error('❌ [ChatController] Mark chat as read error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get chat message history
   * GET /api/chat/:chatId/history?limit=50&offset=0
   */
  async getChatHistory(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const userId = req.user?.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      if (!chatId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'chatId and userId are required'
        });
        return;
      }

      logger.info('📜 [ChatController] Get chat history', {
        chatId,
        userId,
        limit,
        offset
      });

      const messages = await this.chatService.getChatHistory(chatId, userId, limit, offset);

      res.status(200).json({
        status: 'success',
        data: {
          messages,
          count: messages.length,
          limit,
          offset
        }
      });
    } catch (error) {
      logger.error('❌ [ChatController] Get chat history error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get unread count for a specific chat
   * GET /api/chat/:chatId/unread-count
   */
  async getChatUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const userId = req.user?.id;

      if (!chatId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'chatId and userId are required'
        });
        return;
      }

      logger.info('📊 [ChatController] Get chat unread count', {
        chatId,
        userId
      });

      const unreadCount = await this.chatService.getChatUnreadCount(chatId, userId);

      res.status(200).json({
        status: 'success',
        data: { unreadCount } // maintain naming consistency
      });
    } catch (error) {
      logger.error('❌ [ChatController] Get chat unread count error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get total unread count across all chats
   * GET /api/chat/unread-count/total
   */
  async getTotalUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(400).json({
          status: 'error',
          message: 'userId is required'
        });
        return;
      }

      logger.info('📊 [ChatController] Get total unread count', { userId });

      const totalUnreadCount = await this.chatService.getTotalUnreadCount(userId);

      res.status(200).json({
        status: 'success',
        data: { unreadCount: totalUnreadCount }
      });
    } catch (error) {
      logger.error('❌ [ChatController] Get total unread count error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get unread counts for all chats
   * GET /api/chat/unread-counts
   */
  async getAllUnreadCounts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(400).json({
          status: 'error',
          message: 'userId is required'
        });
        return;
      }

      logger.info('📊 [ChatController] Get all unread counts', { userId });

      const unreadCounts = await this.chatService.getAllUnreadCounts(userId);

      res.status(200).json({
        status: 'success',
        data: { unreadCounts }
      });
    } catch (error) {
      logger.error('❌ [ChatController] Get all unread counts error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get read receipt for a message
   * GET /api/chat/message/:messageId/read-receipt
   */
  async getMessageReadReceipt(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;

      if (!messageId) {
        res.status(400).json({
          status: 'error',
          message: 'messageId is required'
        });
        return;
      }

      logger.info('🧾 [ChatController] Get message read receipt', { messageId });

      const readReceipt = await this.chatService.getMessageReadReceipt(messageId);

      res.status(200).json({
        status: 'success',
        data: { readReceipt }
      });
    } catch (error) {
      logger.error('❌ [ChatController] Get message read receipt error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get chat participants
   * GET /api/chat/:chatId/participants
   */
  async getChatParticipants(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;

      if (!chatId) {
        res.status(400).json({
          status: 'error',
          message: 'chatId is required'
        });
        return;
      }

      logger.info('👥 [ChatController] Get chat participants', { chatId });

      const participants = await this.chatService.getChatParticipants(chatId);

      res.status(200).json({
        status: 'success',
        data: { participants, count: participants.length }
      });
    } catch (error) {
      logger.error('❌ [ChatController] Get chat participants error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Set user as typing in a chat
   * POST /api/chat/:chatId/typing/start
   */
  async startTyping(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const userId = req.user?.id;

      if (!chatId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'chatId and userId are required'
        });
        return;
      }

      logger.info('⌨️ [ChatController] Start typing', { chatId, userId });

      const success = await this.typingService.setTyping(chatId, userId);

      if (!success) {
        res.status(503).json({
          status: 'error',
          message: 'Typing service unavailable'
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'Typing indicator set'
      });
    } catch (error) {
      logger.error('❌ [ChatController] Start typing error', {
        error: (error as Error).message
      });
      res.status(500).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Stop user typing in a chat
   * POST /api/chat/:chatId/typing/stop
   */
  async stopTyping(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const userId = req.user?.id;

      if (!chatId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'chatId and userId are required'
        });
        return;
      }

      logger.info('⌨️ [ChatController] Stop typing', { chatId, userId });

      const success = await this.typingService.unsetTyping(chatId, userId);

      if (!success) {
        res.status(503).json({
          status: 'error',
          message: 'Typing service unavailable'
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'Typing indicator removed'
      });
    } catch (error) {
      logger.error('❌ [ChatController] Stop typing error', {
        error: (error as Error).message
      });
      res.status(500).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get users currently typing in a chat
   * GET /api/chat/:chatId/typing
   */
  async getTypingUsers(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;

      if (!chatId) {
        res.status(400).json({
          status: 'error',
          message: 'chatId is required'
        });
        return;
      }

      logger.info('⌨️ [ChatController] Get typing users', { chatId });

      const typingUserIds = await this.typingService.getTypingUsers(chatId);

      // Get user details for typing users
      const typingUsers = [];
      if (typingUserIds.length > 0) {
        // You might want to fetch user details from the database here
        // For now, just return the user IDs
        for (const userId of typingUserIds) {
          typingUsers.push({ userId, isTyping: true });
        }
      }

      res.status(200).json({
        status: 'success',
        data: {
          typingUsers,
          count: typingUsers.length,
          userIds: typingUserIds
        }
      });
    } catch (error) {
      logger.error('❌ [ChatController] Get typing users error', {
        error: (error as Error).message
      });
      res.status(500).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Check if a specific user is typing
   * GET /api/chat/:chatId/typing/:userId
   */
  async isUserTyping(req: Request, res: Response): Promise<void> {
    try {
      const { chatId, userId } = req.params;

      if (!chatId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'chatId and userId are required'
        });
        return;
      }

      logger.info('⌨️ [ChatController] Check if user is typing', { chatId, userId });

      const isTyping = await this.typingService.isUserTyping(chatId, userId);

      res.status(200).json({
        status: 'success',
        data: { isTyping, userId, chatId }
      });
    } catch (error) {
      logger.error('❌ [ChatController] Check if user is typing error', {
        error: (error as Error).message
      });
      res.status(500).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Clear all typing indicators for a chat
   * DELETE /api/chat/:chatId/typing
   */
  async clearChatTyping(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;

      if (!chatId) {
        res.status(400).json({
          status: 'error',
          message: 'chatId is required'
        });
        return;
      }

      logger.info('⌨️ [ChatController] Clear chat typing indicators', { chatId });

      const clearedCount = await this.typingService.clearChatTypingIndicators(chatId);

      res.status(200).json({
        status: 'success',
        message: 'Chat typing indicators cleared',
        data: { clearedCount }
      });
    } catch (error) {
      logger.error('❌ [ChatController] Clear chat typing error', {
        error: (error as Error).message
      });
      res.status(500).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get typing service stats
   * GET /api/chat/typing/stats
   */
  async getTypingStats(req: Request, res: Response): Promise<void> {
    try {
      logger.info('📊 [ChatController] Get typing stats');

      const stats = await this.typingService.getTypingStats();

      res.status(200).json({
        status: 'success',
        data: { stats }
      });
    } catch (error) {
      logger.error('❌ [ChatController] Get typing stats error', {
        error: (error as Error).message
      });
      res.status(500).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Create or get DM chat between two users
   * POST /api/chat/dm
   */
  async createOrGetDMChat(req: Request, res: Response): Promise<void> {
    try {
      const { recipientId } = req.body;
      const userId = req.user?.id;

      if (!recipientId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'recipientId and userId are required'
        });
        return;
      }

      logger.info('💬 [ChatController] Create or get DM chat', {
        userId,
        recipientId
      });

      const chat = await this.chatService.createOrGetDMChat(userId, recipientId);

      res.status(200).json({
        status: 'success',
        data: { chat }
      });
    } catch (error) {
      logger.error('❌ [ChatController] Create or get DM chat error', {
        error: (error as Error).message
      });
      res.status(500).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Create a group chat
   * POST /api/chat/groups
   */
  async createGroupChat(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, memberIds } = req.body;
      const creatorId = req.user?.id;

      if (!creatorId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      if (!name || !memberIds || !Array.isArray(memberIds)) {
        res.status(400).json({
          status: 'error',
          message: 'Group name and member IDs are required'
        });
        return;
      }

      logger.info('👥 [ChatController] Creating group chat', {
        name,
        creatorId,
        memberCount: memberIds.length
      });

      const group = await this.chatService.createGroupChat(creatorId, name, description, memberIds);

      res.status(201).json({
        status: 'success',
        message: 'Group chat created successfully',
        data: group
      });
    } catch (error) {
      logger.error('❌ [ChatController] Create group chat error', {
        error: (error as Error).message,
        creatorId: req.user?.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to create group chat'
      });
    }
  }

  /**
   * Get user's chats (both DMs and groups)
   * GET /api/chat/chats
   */
  async getUserChats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      logger.info('💬 [ChatController] Getting user chats', { userId });

      const chats = await this.chatService.getUserChats(userId);

      res.status(200).json({
        status: 'success',
        data: chats
      });
    } catch (error) {
      logger.error('❌ [ChatController] Get user chats error', {
        error: (error as Error).message,
        userId: req.user?.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to get user chats'
      });
    }
  }

  /**
   * Group Chat Management
   */
  async getGroups(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      logger.info('👥 [ChatController] Get groups', { userId });
      const groups = await this.chatService.getUserGroups(userId);

      res.status(200).json({
        status: 'success',
        data: groups,
        count: groups.length
      });
    } catch (error) {
      logger.error('❌ [ChatController] Get groups error', {
        error: (error as Error).message,
        userId: req.user?.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to get groups'
      });
    }
  }

  async createGroup(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, is_private } = req.body;
      const userId = req.user?.id;

      if (!name || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'Group name and user ID are required'
        });
        return;
      }

      logger.info('👥 [ChatController] Create group', { name, userId });
      const group = await this.chatService.createGroup(userId, name, description, is_private);

      res.status(201).json({
        status: 'success',
        message: 'Group created successfully',
        data: group
      });
    } catch (error) {
      logger.error('❌ [ChatController] Create group error', {
        error: (error as Error).message,
        body: req.body
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!groupId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'Group ID and user ID are required'
        });
        return;
      }

      logger.info('👥 [ChatController] Get group', { groupId, userId });
      const group = await this.chatService.getGroup(groupId, userId);

      res.status(200).json({
        status: 'success',
        data: group
      });
    } catch (error) {
      logger.error('❌ [ChatController] Get group error', {
        error: (error as Error).message,
        groupId: req.params.groupId
      });
      res.status(404).json({
        status: 'error',
        message: 'Group not found or access denied'
      });
    }
  }

  async updateGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { name, description, is_private } = req.body;
      const userId = req.user?.id;

      if (!groupId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'Group ID and user ID are required'
        });
        return;
      }

      logger.info('👥 [ChatController] Update group', { groupId, userId });
      const group = await this.chatService.updateGroup(groupId, userId, { name, description, is_private });

      res.status(200).json({
        status: 'success',
        message: 'Group updated successfully',
        data: group
      });
    } catch (error) {
      logger.error('❌ [ChatController] Update group error', {
        error: (error as Error).message,
        groupId: req.params.groupId
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async deleteGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!groupId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'Group ID and user ID are required'
        });
        return;
      }

      logger.info('👥 [ChatController] Delete group', { groupId, userId });
      await this.chatService.deleteGroup(groupId, userId);

      res.status(200).json({
        status: 'success',
        message: 'Group deleted successfully'
      });
    } catch (error) {
      logger.error('❌ [ChatController] Delete group error', {
        error: (error as Error).message,
        groupId: req.params.groupId
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async addGroupMember(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const { employeeId, role } = req.body;
      const userId = req.user?.id;

      if (!groupId || !employeeId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'Group ID, employee ID, and user ID are required'
        });
        return;
      }

      logger.info('👥 [ChatController] Add group member', { groupId, employeeId, userId });
      const member = await this.chatService.addGroupMember(groupId, userId, employeeId, role);

      res.status(201).json({
        status: 'success',
        message: 'Member added successfully',
        data: member
      });
    } catch (error) {
      logger.error('❌ [ChatController] Add group member error', {
        error: (error as Error).message,
        groupId: req.params.groupId,
        body: req.body
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async removeGroupMember(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, memberId } = req.params;
      const userId = req.user?.id;

      if (!groupId || !memberId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'Group ID, member ID, and user ID are required'
        });
        return;
      }

      logger.info('👥 [ChatController] Remove group member', { groupId, memberId, userId });
      await this.chatService.removeGroupMember(groupId, userId, memberId);

      res.status(200).json({
        status: 'success',
        message: 'Member removed successfully'
      });
    } catch (error) {
      logger.error('❌ [ChatController] Remove group member error', {
        error: (error as Error).message,
        groupId: req.params.groupId,
        memberId: req.params.memberId
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getGroupMembers(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!groupId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'Group ID and user ID are required'
        });
        return;
      }

      logger.info('👥 [ChatController] Get group members', { groupId, userId });
      const members = await this.chatService.getGroupMembers(groupId, userId);

      res.status(200).json({
        status: 'success',
        data: members
      });
    } catch (error) {
      logger.error('❌ [ChatController] Get group members error', {
        error: (error as Error).message,
        groupId: req.params.groupId
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getChatHistoryForUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      logger.info('📜 [ChatController] Get chat history for user', { userId });
      const history = await this.chatService.getChatHistoryForUser(userId);

      res.status(200).json({
        status: 'success',
        data: history
      });
    } catch (error) {
      logger.error('❌ [ChatController] Get chat history error', {
        error: (error as Error).message,
        userId: req.user?.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to get chat history'
      });
    }
  }
}
