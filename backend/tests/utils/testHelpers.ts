import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Express } from 'express';

/**
 * Helper to generate a valid JWT token for testing
 */
export function generateTestToken(userId: string = 'test-user-123', role: string = 'user'): string {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
  return jwt.sign({ id: userId, role }, secret, { expiresIn: '24h' });
}

/**
 * Helper to make authenticated requests
 */
export async function authenticatedRequest(app: Express, method: string, url: string, token?: string) {
  const actualToken = token || generateTestToken();
  
  let req = (request(app) as any)[method.toLowerCase()](url);
  
  if (actualToken) {
    req = req.set('Authorization', `Bearer ${actualToken}`);
  }
  
  return req.set('Content-Type', 'application/json');
}

/**
 * Test data factory - Chat
 */
export const chatTestData = {
  validSendMessage: {
    chatId: 'test-chat-456',
    message: 'Hello, this is a test message',
  },
  invalidSendMessage: {
    chatId: 'test-chat-456',
    // Missing message field
  },
  validMarkAsRead: {
    chatId: 'test-chat-456',
  },
  validGetHistory: {
    chatId: 'test-chat-456',
    limit: 20,
    offset: 0,
  },
};

/**
 * Test data factory - Notifications
 */
export const notificationTestData = {
  validGetNotifications: {
    page: 1,
    limit: 20,
  },
  validMarkAsRead: {
    notificationId: 'notif-123',
  },
  validSavePushToken: {
    token: 'fcm-token-abc123xyz',
    type: 'FCM',
  },
};

/**
 * Test data factory - Typing
 */
export const typingTestData = {
  validStartTyping: {
    chatId: 'test-chat-456',
  },
  validStopTyping: {
    chatId: 'test-chat-456',
  },
};

/**
 * Helper to assert standard error responses
 */
export function assertErrorResponse(response: any, statusCode: number, message: string) {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('status', 'error');
  expect(response.body).toHaveProperty('message');
}

/**
 * Helper to assert standard success responses
 */
export function assertSuccessResponse(response: any, statusCode: number = 200) {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('status', 'success');
  expect(response.body).toHaveProperty('data');
}

/**
 * Wait helper for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock Supabase response
 */
export const mockSupabaseResponse = {
  chat_message: {
    id: 'msg-123',
    chat_id: 'test-chat-456',
    sender_id: 'test-user-123',
    message: 'Test message',
    created_at: new Date().toISOString(),
    read_at: null,
  },
  notification: {
    id: 'notif-123',
    user_id: 'test-user-123',
    type: 'message',
    title: 'New Message',
    message: 'You have a new message',
    read: false,
    created_at: new Date().toISOString(),
  },
};