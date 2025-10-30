import { Request, Response } from 'express';
import { ChatService } from '../services/ChatService';
import { getTypingService } from '../services/TypingService';
import logger from '../utils/logger';

export class ChatController {
  private typingService = getTypingService();
  
  constructor(private chatService: ChatService) {}

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
}
