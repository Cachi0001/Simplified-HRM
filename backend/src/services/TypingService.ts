import logger from '../utils/logger';
import Redis from 'ioredis';

/**
 * TypingService manages typing indicators using Redis with TTL
 * Instead of storing in database, uses in-memory cache with 2-second TTL
 * This prevents database bloat and provides instant broadcast capability
 */
export class TypingService {
  private redis: Redis | null = null;
  private readonly TYPING_TTL = 2; // 2 seconds - auto-expires typing status
  private readonly TYPING_KEY_PREFIX = 'typing:';

  constructor(redisUrl?: string) {
    try {
      if (redisUrl) {
        this.redis = new Redis(redisUrl);
        logger.info('TypingService: Redis connection initialized', { url: redisUrl });
      } else if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL);
        logger.info('TypingService: Redis connection initialized from env');
      } else {
        logger.warn('TypingService: Redis URL not provided, typing indicators disabled');
        this.redis = null;
      }
    } catch (error) {
      logger.error('TypingService: Failed to initialize Redis', { error: (error as Error).message });
      this.redis = null;
    }
  }

  /**
   * Set user as typing in a chat
   */
  async setTyping(chatId: string, userId: string): Promise<boolean> {
    if (!this.redis) {
      logger.warn('TypingService: Redis not available');
      return false;
    }

    try {
      const key = `${this.TYPING_KEY_PREFIX}${chatId}:${userId}`;
      await this.redis.setex(key, this.TYPING_TTL, 'true');
      logger.info('TypingService: User set as typing', { chatId, userId });
      return true;
    } catch (error) {
      logger.error('TypingService: Failed to set typing status', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Remove user from typing list
   */
  async unsetTyping(chatId: string, userId: string): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    try {
      const key = `${this.TYPING_KEY_PREFIX}${chatId}:${userId}`;
      await this.redis.del(key);
      logger.info('TypingService: User removed from typing list', { chatId, userId });
      return true;
    } catch (error) {
      logger.error('TypingService: Failed to unset typing status', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get all users currently typing in a chat
   */
  async getTypingUsers(chatId: string): Promise<string[]> {
    if (!this.redis) {
      return [];
    }

    try {
      const pattern = `${this.TYPING_KEY_PREFIX}${chatId}:*`;
      const keys = await this.redis.keys(pattern);

      const userIds = keys.map(key => {
        // Extract userId from key format: "typing:chatId:userId"
        const parts = key.split(':');
        return parts[parts.length - 1];
      });

      logger.info('TypingService: Retrieved typing users', { chatId, count: userIds.length });
      return userIds;
    } catch (error) {
      logger.error('TypingService: Failed to get typing users', { error: (error as Error).message });
      return [];
    }
  }

  /**
   * Check if a specific user is typing in a chat
   */
  async isUserTyping(chatId: string, userId: string): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    try {
      const key = `${this.TYPING_KEY_PREFIX}${chatId}:${userId}`;
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('TypingService: Failed to check if user is typing', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Clear all typing indicators for a chat
   */
  async clearChatTypingIndicators(chatId: string): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    try {
      const pattern = `${this.TYPING_KEY_PREFIX}${chatId}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.redis.del(...keys);
      logger.info('TypingService: Cleared chat typing indicators', { chatId, count: deleted });
      return deleted;
    } catch (error) {
      logger.error('TypingService: Failed to clear chat typing indicators', { error: (error as Error).message });
      return 0;
    }
  }

  /**
   * Clear all typing indicators for a user across all chats
   */
  async clearUserTypingIndicators(userId: string): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    try {
      const pattern = `${this.TYPING_KEY_PREFIX}*:${userId}`;
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.redis.del(...keys);
      logger.info('TypingService: Cleared user typing indicators', { userId, count: deleted });
      return deleted;
    } catch (error) {
      logger.error('TypingService: Failed to clear user typing indicators', { error: (error as Error).message });
      return 0;
    }
  }

  /**
   * Get typing indicator stats for monitoring
   */
  async getTypingStats(): Promise<{ totalKeys: number; isConnected: boolean }> {
    if (!this.redis) {
      return { totalKeys: 0, isConnected: false };
    }

    try {
      const pattern = `${this.TYPING_KEY_PREFIX}*`;
      const keys = await this.redis.keys(pattern);
      return { totalKeys: keys.length, isConnected: true };
    } catch (error) {
      logger.error('TypingService: Failed to get typing stats', { error: (error as Error).message });
      return { totalKeys: 0, isConnected: false };
    }
  }

  /**
   * Connect to Redis (if not already connected)
   */
  async connect(): Promise<boolean> {
    if (this.redis) {
      try {
        await this.redis.ping();
        logger.info('TypingService: Redis connection verified');
        return true;
      } catch (error) {
        logger.error('TypingService: Redis connection failed', { error: (error as Error).message });
        return false;
      }
    }
    return false;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
        logger.info('TypingService: Redis disconnected');
        this.redis = null;
      } catch (error) {
        logger.error('TypingService: Error disconnecting from Redis', { error: (error as Error).message });
      }
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.redis !== null;
  }
}

// Create singleton instance
let typingServiceInstance: TypingService | null = null;

export function getTypingService(): TypingService {
  if (!typingServiceInstance) {
    typingServiceInstance = new TypingService(process.env.REDIS_URL);
  }
  return typingServiceInstance;
}

export default getTypingService();