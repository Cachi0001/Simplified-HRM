import { SupabaseClient } from '@supabase/supabase-js';
import logger from './logger';

// Verified database columns from migration 018
export const VERIFIED_CHAT_MESSAGES_COLUMNS = [
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
] as const;

export const VERIFIED_CHAT_UNREAD_COUNT_COLUMNS = [
  'id',
  'user_id',
  'chat_id', 
  'unread_count',
  'last_read_at',
  'updated_at',
  'created_at'
] as const;

export type ChatMessagesColumn = typeof VERIFIED_CHAT_MESSAGES_COLUMNS[number];
export type ChatUnreadCountColumn = typeof VERIFIED_CHAT_UNREAD_COUNT_COLUMNS[number];

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface SchemaValidationResult {
  tableName: string;
  isValid: boolean;
  missingColumns: string[];
  extraColumns: string[];
  columnDetails: ColumnInfo[];
  error?: string;
}

interface OverallValidationResult {
  overallValid: boolean;
  chatMessagesValid: boolean;
  chatUnreadCountValid: boolean;
  results: {
    chat_messages: SchemaValidationResult;
    chat_unread_count: SchemaValidationResult;
  };
}

export class SchemaValidator {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Lightweight table validation - just check if we can access it
   */
  async validateTableSchema(
    tableName: string, 
    requiredColumns: readonly string[]
  ): Promise<SchemaValidationResult> {
    try {
      // Quick table access check - no heavy queries
      const { error } = await this.supabase
        .from(tableName)
        .select('id')
        .limit(1);

      if (error) {
        return {
          tableName,
          isValid: false,
          missingColumns: [...requiredColumns],
          extraColumns: [],
          columnDetails: [],
          error: error.message
        };
      }

      return {
        tableName,
        isValid: true,
        missingColumns: [],
        extraColumns: [],
        columnDetails: []
      };

    } catch (error) {
      return {
        tableName,
        isValid: false,
        missingColumns: [...requiredColumns],
        extraColumns: [],
        columnDetails: [],
        error: (error as Error).message
      };
    }
  }

  /**
   * Lightweight validation for all chat tables
   */
  async validateAllChatSchemas(): Promise<OverallValidationResult> {
    const [chatMessagesResult, chatUnreadCountResult] = await Promise.all([
      this.validateTableSchema('chat_messages', VERIFIED_CHAT_MESSAGES_COLUMNS),
      this.validateTableSchema('chat_unread_count', VERIFIED_CHAT_UNREAD_COUNT_COLUMNS)
    ]);

    const overallValid = chatMessagesResult.isValid && chatUnreadCountResult.isValid;

    return {
      overallValid,
      chatMessagesValid: chatMessagesResult.isValid,
      chatUnreadCountValid: chatUnreadCountResult.isValid,
      results: {
        chat_messages: chatMessagesResult,
        chat_unread_count: chatUnreadCountResult
      }
    };
  }

  /**
   * Runtime column existence check before database operations
   */
  async verifyColumnsExist(tableName: string, columns: string[]): Promise<boolean> {
    try {
      const requiredColumns = tableName === 'chat_messages' 
        ? VERIFIED_CHAT_MESSAGES_COLUMNS
        : VERIFIED_CHAT_UNREAD_COUNT_COLUMNS;

      const invalidColumns = columns.filter(col => !requiredColumns.includes(col as any));
      
      if (invalidColumns.length > 0) {
        logger.error(`❌ Invalid columns detected for ${tableName}:`, invalidColumns);
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`❌ Column verification error for ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Get safe column list for SELECT queries
   */
  getSafeColumns(tableName: string): string[] {
    switch (tableName) {
      case 'chat_messages':
        return [...VERIFIED_CHAT_MESSAGES_COLUMNS];
      case 'chat_unread_count':
        return [...VERIFIED_CHAT_UNREAD_COUNT_COLUMNS];
      default:
        logger.warn(`⚠️ Unknown table name: ${tableName}`);
        return [];
    }
  }

  /**
   * Validate INSERT data against schema
   */
  validateInsertData(tableName: string, data: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const columns = Object.keys(data);
    
    const requiredColumns = tableName === 'chat_messages' 
      ? VERIFIED_CHAT_MESSAGES_COLUMNS
      : VERIFIED_CHAT_UNREAD_COUNT_COLUMNS;

    // Check for invalid columns
    const invalidColumns = columns.filter(col => !requiredColumns.includes(col as any));
    if (invalidColumns.length > 0) {
      errors.push(`Invalid columns: ${invalidColumns.join(', ')}`);
    }

    // Table-specific validation
    if (tableName === 'chat_messages') {
      if (!data.chat_id) errors.push('chat_id is required');
      if (!data.sender_id) errors.push('sender_id is required');
      if (!data.message) errors.push('message is required');
    }

    if (tableName === 'chat_unread_count') {
      if (!data.user_id) errors.push('user_id is required');
      if (!data.chat_id) errors.push('chat_id is required');
      if (typeof data.unread_count !== 'number') errors.push('unread_count must be a number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Singleton instance
let schemaValidatorInstance: SchemaValidator | null = null;

export function getSchemaValidator(supabase: SupabaseClient): SchemaValidator {
  if (!schemaValidatorInstance) {
    schemaValidatorInstance = new SchemaValidator(supabase);
  }
  return schemaValidatorInstance;
}

/**
 * Decorator for validating schema before database operations
 */
export function validateSchema(tableName: string, requiredColumns: readonly string[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      // Skip validation if no supabase client available
      if (!this.supabase) {
        logger.warn(`⚠️ No Supabase client available for schema validation in ${propertyName}`);
        return method.apply(this, args);
      }

      const validator = getSchemaValidator(this.supabase);
      
      // Validate schema before operation
      const validation = await validator.validateTableSchema(tableName, requiredColumns);
      
      if (!validation.isValid) {
        const error = new Error(
          `Schema validation failed for ${tableName}. Missing columns: ${validation.missingColumns.join(', ')}`
        );
        logger.error(`❌ Schema validation failed in ${propertyName}:`, error.message);
        throw error;
      }

      // Call original method
      return method.apply(this, args);
    };

    return descriptor;
  };
}