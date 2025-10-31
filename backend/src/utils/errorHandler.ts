import logger from './logger';

export type ErrorCategory = 'network' | 'database' | 'realtime' | 'performance' | 'validation' | 'authentication' | 'generic';

export interface ChatError extends Error {
  category: ErrorCategory;
  retryCount: number;
  retryFunction?: () => Promise<any>;
  context?: Record<string, any>;
  userMessage?: string;
  isRecoverable: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
};

export class ErrorHandler {
  private retryConfig: RetryConfig;
  private activeRetries: Map<string, number> = new Map();

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Create a categorized error
   */
  createError(
    message: string,
    category: ErrorCategory,
    context?: Record<string, any>,
    userMessage?: string
  ): ChatError {
    const error = new Error(message) as ChatError;
    error.category = category;
    error.retryCount = 0;
    error.context = context;
    error.userMessage = userMessage || this.getDefaultUserMessage(category);
    error.isRecoverable = this.isRecoverableError(category);

    return error;
  }

  /**
   * Handle different types of errors with appropriate recovery strategies
   */
  async handleError(error: ChatError): Promise<void> {
    logger.error(`❌ Handling ${error.category} error:`, {
      message: error.message,
      category: error.category,
      retryCount: error.retryCount,
      context: error.context
    });

    switch (error.category) {
      case 'network':
        await this.handleNetworkError(error);
        break;
      case 'database':
        await this.handleDatabaseError(error);
        break;
      case 'realtime':
        await this.handleRealtimeError(error);
        break;
      case 'performance':
        await this.handlePerformanceError(error);
        break;
      case 'validation':
        await this.handleValidationError(error);
        break;
      case 'authentication':
        await this.handleAuthenticationError(error);
        break;
      default:
        await this.handleGenericError(error);
    }
  }

  /**
   * Handle network-related errors with exponential backoff
   */
  private async handleNetworkError(error: ChatError): Promise<void> {
    if (!error.isRecoverable || error.retryCount >= this.retryConfig.maxRetries) {
      logger.error('❌ Network error - max retries exceeded', {
        retryCount: error.retryCount,
        maxRetries: this.retryConfig.maxRetries
      });
      throw error;
    }

    const delay = this.calculateBackoffDelay(error.retryCount);
    logger.info(`🔄 Retrying network operation in ${delay}ms (attempt ${error.retryCount + 1})`);

    await this.delay(delay);

    if (error.retryFunction) {
      try {
        error.retryCount++;
        await error.retryFunction();
        logger.info('✅ Network error recovery successful');
      } catch (retryError) {
        error.retryCount++;
        await this.handleNetworkError(error);
      }
    }
  }

  /**
   * Handle database-related errors
   */
  private async handleDatabaseError(error: ChatError): Promise<void> {
    logger.error('❌ Database error occurred', {
      message: error.message,
      context: error.context
    });

    // Check for specific database error types
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      logger.error('🚨 Database schema mismatch detected - column missing');
      throw this.createError(
        'Database schema validation failed',
        'database',
        error.context,
        'System configuration error. Please contact support.'
      );
    }

    if (error.message.includes('connection')) {
      // Treat as network error for retry logic
      error.category = 'network';
      await this.handleNetworkError(error);
      return;
    }

    // For other database errors, don't retry automatically
    throw error;
  }

  /**
   * Handle real-time connection errors
   */
  private async handleRealtimeError(error: ChatError): Promise<void> {
    logger.warn('⚠️ Real-time connection error - attempting recovery', {
      message: error.message,
      retryCount: error.retryCount
    });

    if (error.retryCount < this.retryConfig.maxRetries) {
      const delay = this.calculateBackoffDelay(error.retryCount);
      await this.delay(delay);

      if (error.retryFunction) {
        try {
          error.retryCount++;
          await error.retryFunction();
          logger.info('✅ Real-time connection recovered');
        } catch (retryError) {
          await this.handleRealtimeError(error);
        }
      }
    } else {
      logger.warn('⚠️ Real-time connection failed - falling back to polling');
      // In a real implementation, this would trigger fallback to polling
    }
  }

  /**
   * Handle performance-related errors
   */
  private async handlePerformanceError(error: ChatError): Promise<void> {
    logger.error('🚨 Performance error detected', {
      message: error.message,
      context: error.context
    });

    // Disable problematic features temporarily
    logger.warn('⚠️ Temporarily disabling chat features due to performance issues');
    
    // In a real implementation, this would:
    // 1. Open circuit breakers
    // 2. Reduce feature complexity
    // 3. Clear caches
    // 4. Schedule auto-recovery

    // Auto-recover after delay
    setTimeout(() => {
      logger.info('🔄 Attempting to restore chat features');
    }, 30000);

    throw error;
  }

  /**
   * Handle validation errors
   */
  private async handleValidationError(error: ChatError): Promise<void> {
    logger.warn('⚠️ Validation error', {
      message: error.message,
      context: error.context
    });

    // Validation errors are usually not recoverable and should be fixed by the caller
    throw error;
  }

  /**
   * Handle authentication errors
   */
  private async handleAuthenticationError(error: ChatError): Promise<void> {
    logger.warn('🔐 Authentication error', {
      message: error.message,
      context: error.context
    });

    // Authentication errors require user intervention
    throw error;
  }

  /**
   * Handle generic errors
   */
  private async handleGenericError(error: ChatError): Promise<void> {
    logger.error('❌ Generic error', {
      message: error.message,
      context: error.context
    });

    if (error.isRecoverable && error.retryCount < this.retryConfig.maxRetries) {
      await this.handleNetworkError(error); // Use network error retry logic
    } else {
      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get default user-friendly message for error category
   */
  private getDefaultUserMessage(category: ErrorCategory): string {
    switch (category) {
      case 'network':
        return 'Connection issue. Please check your internet connection and try again.';
      case 'database':
        return 'Data storage issue. Please try again or contact support if the problem persists.';
      case 'realtime':
        return 'Real-time updates temporarily unavailable. Messages will still be delivered.';
      case 'performance':
        return 'System is experiencing high load. Some features may be temporarily limited.';
      case 'validation':
        return 'Invalid input provided. Please check your data and try again.';
      case 'authentication':
        return 'Authentication required. Please log in and try again.';
      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  }

  /**
   * Determine if an error category is recoverable
   */
  private isRecoverableError(category: ErrorCategory): boolean {
    switch (category) {
      case 'network':
      case 'realtime':
      case 'performance':
        return true;
      case 'database':
      case 'validation':
      case 'authentication':
        return false;
      default:
        return true;
    }
  }

  /**
   * Wrap a function with error handling
   */
  async withErrorHandling<T>(
    fn: () => Promise<T>,
    category: ErrorCategory,
    context?: Record<string, any>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const chatError = error instanceof Error 
        ? this.createError(error.message, category, context)
        : this.createError('Unknown error', category, context);

      await this.handleError(chatError);
      throw chatError;
    }
  }

  /**
   * Create a retry function for failed operations
   */
  createRetryFunction<T>(
    fn: () => Promise<T>,
    category: ErrorCategory,
    context?: Record<string, any>
  ): () => Promise<T> {
    return async () => {
      return this.withErrorHandling(fn, category, context);
    };
  }
}

// Singleton instance
let errorHandlerInstance: ErrorHandler | null = null;

export function getErrorHandler(retryConfig?: Partial<RetryConfig>): ErrorHandler {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandler(retryConfig);
  }
  return errorHandlerInstance;
}

/**
 * Decorator for automatic error handling
 */
export function withErrorHandling(category: ErrorCategory) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const errorHandler = getErrorHandler();
      
      return errorHandler.withErrorHandling(
        () => method.apply(this, args),
        category,
        { method: propertyName, args: args.length }
      );
    };

    return descriptor;
  };
}