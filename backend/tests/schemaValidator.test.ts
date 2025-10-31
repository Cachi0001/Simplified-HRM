import { SchemaValidator, VERIFIED_CHAT_MESSAGES_COLUMNS, VERIFIED_CHAT_UNREAD_COUNT_COLUMNS } from '../src/utils/schemaValidator';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock logger before importing
jest.mock('../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    cors: {
      request: jest.fn(),
      config: jest.fn(),
    },
  },
}));

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn()
} as unknown as SupabaseClient;

describe('SchemaValidator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator(mockSupabaseClient);
    jest.clearAllMocks();
  });

  describe('validateTableSchema', () => {
    it('should validate table schema successfully when all columns exist', async () => {
      const mockData = VERIFIED_CHAT_MESSAGES_COLUMNS.map(col => ({
        column_name: col,
        data_type: 'text',
        is_nullable: 'NO',
        column_default: null
      }));

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockData,
              error: null
            })
          })
        })
      });

      const result = await validator.validateTableSchema('chat_messages', VERIFIED_CHAT_MESSAGES_COLUMNS);

      expect(result.isValid).toBe(true);
      expect(result.missingColumns).toHaveLength(0);
      expect(result.tableName).toBe('chat_messages');
    });

    it('should detect missing columns', async () => {
      const mockData = [
        { column_name: 'id', data_type: 'uuid', is_nullable: 'NO', column_default: null },
        { column_name: 'chat_id', data_type: 'text', is_nullable: 'NO', column_default: null }
        // Missing other required columns
      ];

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockData,
              error: null
            })
          })
        })
      });

      const result = await validator.validateTableSchema('chat_messages', VERIFIED_CHAT_MESSAGES_COLUMNS);

      expect(result.isValid).toBe(false);
      expect(result.missingColumns.length).toBeGreaterThan(0);
      expect(result.missingColumns).toContain('sender_id');
      expect(result.missingColumns).toContain('message');
    });

    it('should handle database query errors', async () => {
      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' }
            })
          })
        })
      });

      const result = await validator.validateTableSchema('chat_messages', VERIFIED_CHAT_MESSAGES_COLUMNS);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(result.missingColumns).toEqual([...VERIFIED_CHAT_MESSAGES_COLUMNS]);
    });
  });

  describe('validateAllChatSchemas', () => {
    it('should validate all chat schemas successfully', async () => {
      const mockChatMessagesData = VERIFIED_CHAT_MESSAGES_COLUMNS.map(col => ({
        column_name: col,
        data_type: 'text',
        is_nullable: 'NO',
        column_default: null
      }));

      const mockUnreadCountData = VERIFIED_CHAT_UNREAD_COUNT_COLUMNS.map(col => ({
        column_name: col,
        data_type: 'text',
        is_nullable: 'NO',
        column_default: null
      }));

      (mockSupabaseClient.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockChatMessagesData,
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockUnreadCountData,
                error: null
              })
            })
          })
        });

      const result = await validator.validateAllChatSchemas();

      expect(result.overallValid).toBe(true);
      expect(result.chatMessagesValid).toBe(true);
      expect(result.chatUnreadCountValid).toBe(true);
    });

    it('should fail overall validation if any table fails', async () => {
      (mockSupabaseClient.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: VERIFIED_CHAT_UNREAD_COUNT_COLUMNS.map(col => ({
                  column_name: col,
                  data_type: 'text',
                  is_nullable: 'NO',
                  column_default: null
                })),
                error: null
              })
            })
          })
        });

      const result = await validator.validateAllChatSchemas();

      expect(result.overallValid).toBe(false);
      expect(result.chatMessagesValid).toBe(false);
      expect(result.chatUnreadCountValid).toBe(true);
    });
  });

  describe('verifyColumnsExist', () => {
    it('should return true for valid columns', async () => {
      const validColumns = ['id', 'chat_id', 'sender_id', 'message'];
      const result = await validator.verifyColumnsExist('chat_messages', validColumns);
      expect(result).toBe(true);
    });

    it('should return false for invalid columns', async () => {
      const invalidColumns = ['id', 'invalid_column', 'another_invalid'];
      const result = await validator.verifyColumnsExist('chat_messages', invalidColumns);
      expect(result).toBe(false);
    });
  });

  describe('getSafeColumns', () => {
    it('should return safe columns for chat_messages', () => {
      const columns = validator.getSafeColumns('chat_messages');
      expect(columns).toEqual([...VERIFIED_CHAT_MESSAGES_COLUMNS]);
    });

    it('should return safe columns for chat_unread_count', () => {
      const columns = validator.getSafeColumns('chat_unread_count');
      expect(columns).toEqual([...VERIFIED_CHAT_UNREAD_COUNT_COLUMNS]);
    });

    it('should return empty array for unknown table', () => {
      const columns = validator.getSafeColumns('unknown_table');
      expect(columns).toEqual([]);
    });
  });

  describe('validateInsertData', () => {
    it('should validate chat_messages insert data successfully', () => {
      const validData = {
        chat_id: 'dm_user1_user2',
        sender_id: 'user1',
        message: 'Hello world',
        chat_type: 'dm'
      };

      const result = validator.validateInsertData('chat_messages', validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields for chat_messages', () => {
      const invalidData = {
        chat_id: 'dm_user1_user2'
        // Missing sender_id and message
      };

      const result = validator.validateInsertData('chat_messages', invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('sender_id is required');
      expect(result.errors).toContain('message is required');
    });

    it('should detect invalid columns', () => {
      const invalidData = {
        chat_id: 'dm_user1_user2',
        sender_id: 'user1',
        message: 'Hello',
        invalid_column: 'should not exist'
      };

      const result = validator.validateInsertData('chat_messages', invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid columns: invalid_column');
    });

    it('should validate chat_unread_count insert data successfully', () => {
      const validData = {
        user_id: 'user1',
        chat_id: 'dm_user1_user2',
        unread_count: 5
      };

      const result = validator.validateInsertData('chat_unread_count', validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate unread_count is a number', () => {
      const invalidData = {
        user_id: 'user1',
        chat_id: 'dm_user1_user2',
        unread_count: 'not a number'
      };

      const result = validator.validateInsertData('chat_unread_count', invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('unread_count must be a number');
    });
  });
});

// Integration test with actual database schema validation
describe('SchemaValidator Integration', () => {
  it('should have all required columns defined', () => {
    // Verify that our verified columns match what we expect
    expect(VERIFIED_CHAT_MESSAGES_COLUMNS).toContain('id');
    expect(VERIFIED_CHAT_MESSAGES_COLUMNS).toContain('chat_id');
    expect(VERIFIED_CHAT_MESSAGES_COLUMNS).toContain('sender_id');
    expect(VERIFIED_CHAT_MESSAGES_COLUMNS).toContain('message');
    expect(VERIFIED_CHAT_MESSAGES_COLUMNS).toContain('timestamp');

    expect(VERIFIED_CHAT_UNREAD_COUNT_COLUMNS).toContain('id');
    expect(VERIFIED_CHAT_UNREAD_COUNT_COLUMNS).toContain('user_id');
    expect(VERIFIED_CHAT_UNREAD_COUNT_COLUMNS).toContain('chat_id');
    expect(VERIFIED_CHAT_UNREAD_COUNT_COLUMNS).toContain('unread_count');
  });

  it('should not have duplicate columns', () => {
    const chatMessagesSet = new Set(VERIFIED_CHAT_MESSAGES_COLUMNS);
    const unreadCountSet = new Set(VERIFIED_CHAT_UNREAD_COUNT_COLUMNS);

    expect(chatMessagesSet.size).toBe(VERIFIED_CHAT_MESSAGES_COLUMNS.length);
    expect(unreadCountSet.size).toBe(VERIFIED_CHAT_UNREAD_COUNT_COLUMNS.length);
  });
});