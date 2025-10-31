import { VERIFIED_CHAT_MESSAGES_COLUMNS, VERIFIED_CHAT_UNREAD_COUNT_COLUMNS } from '../src/utils/schemaValidator';

describe('Schema Validator Constants', () => {
  it('should have all required chat_messages columns defined', () => {
    expect(VERIFIED_CHAT_MESSAGES_COLUMNS).toContain('id');
    expect(VERIFIED_CHAT_MESSAGES_COLUMNS).toContain('chat_id');
    expect(VERIFIED_CHAT_MESSAGES_COLUMNS).toContain('sender_id');
    expect(VERIFIED_CHAT_MESSAGES_COLUMNS).toContain('message');
    expect(VERIFIED_CHAT_MESSAGES_COLUMNS).toContain('chat_type');
    expect(VERIFIED_CHAT_MESSAGES_COLUMNS).toContain('timestamp');
    expect(VERIFIED_CHAT_MESSAGES_COLUMNS).toContain('created_at');
    expect(VERIFIED_CHAT_MESSAGES_COLUMNS).toContain('updated_at');
  });

  it('should have all required chat_unread_count columns defined', () => {
    expect(VERIFIED_CHAT_UNREAD_COUNT_COLUMNS).toContain('id');
    expect(VERIFIED_CHAT_UNREAD_COUNT_COLUMNS).toContain('user_id');
    expect(VERIFIED_CHAT_UNREAD_COUNT_COLUMNS).toContain('chat_id');
    expect(VERIFIED_CHAT_UNREAD_COUNT_COLUMNS).toContain('unread_count');
    expect(VERIFIED_CHAT_UNREAD_COUNT_COLUMNS).toContain('created_at');
    expect(VERIFIED_CHAT_UNREAD_COUNT_COLUMNS).toContain('updated_at');
  });

  it('should not have duplicate columns in chat_messages', () => {
    const uniqueColumns = new Set(VERIFIED_CHAT_MESSAGES_COLUMNS);
    expect(uniqueColumns.size).toBe(VERIFIED_CHAT_MESSAGES_COLUMNS.length);
  });

  it('should not have duplicate columns in chat_unread_count', () => {
    const uniqueColumns = new Set(VERIFIED_CHAT_UNREAD_COUNT_COLUMNS);
    expect(uniqueColumns.size).toBe(VERIFIED_CHAT_UNREAD_COUNT_COLUMNS.length);
  });

  it('should have expected number of columns', () => {
    // Based on migration 018
    expect(VERIFIED_CHAT_MESSAGES_COLUMNS.length).toBe(13);
    expect(VERIFIED_CHAT_UNREAD_COUNT_COLUMNS.length).toBe(7);
  });
});