import { Request, Response } from 'express';
import { TypingService } from '../services/TypingService';
import logger from '../utils/logger';

export class TypingController {
  constructor(private typingService: TypingService) {}

  /**
   * Start typing indicator for a chat
   * POST /api/typing/start
   */
  async startTyping(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.body;
      const userId = req.user?.id;

      if (!chatId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'chatId and userId are required'
        });
        return;
      }

      logger.info('✍️  [TypingController] Start typing', {
        chatId,
        userId
      });

      await this.typingService.setTyping(chatId, userId);

      res.status(200).json({
        status: 'success',
        message: 'Typing indicator started'
      });
    } catch (error) {
      logger.error('❌ [TypingController] Start typing error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Stop typing indicator for a chat
   * POST /api/typing/stop
   */
  async stopTyping(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.body;
      const userId = req.user?.id;

      if (!chatId || !userId) {
        res.status(400).json({
          status: 'error',
          message: 'chatId and userId are required'
        });
        return;
      }

      logger.info('⏹️  [TypingController] Stop typing', {
        chatId,
        userId
      });

      await this.typingService.unsetTyping(chatId, userId);

      res.status(200).json({
        status: 'success',
        message: 'Typing indicator stopped'
      });
    } catch (error) {
      logger.error('❌ [TypingController] Stop typing error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Get users currently typing in a chat
   * GET /api/typing/:chatId
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

      logger.info('👥 [TypingController] Get typing users', { chatId });

      const typingUsers = await this.typingService.getTypingUsers(chatId);

      res.status(200).json({
        status: 'success',
        data: {
          typingUsers,
          count: typingUsers.length
        }
      });
    } catch (error) {
      logger.error('❌ [TypingController] Get typing users error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  /**
   * Check if a specific user is typing in a chat
   * GET /api/typing/:chatId/:userId
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

      logger.info('❓ [TypingController] Check user typing status', {
        chatId,
        userId
      });

      const isTyping = await this.typingService.isUserTyping(chatId, userId);

      res.status(200).json({
        status: 'success',
        data: { isTyping }
      });
    } catch (error) {
      logger.error('❌ [TypingController] Check user typing error', {
        error: (error as Error).message
      });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }
}