// Test setup and configuration
import dotenv from 'dotenv';

// Declare global test utilities
declare global {
  var testUserId: string;
  var testChatId: string;
  var testToken: string;
}

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';

// Mock logger to reduce noise in test output
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Set test timeout
jest.setTimeout(30000);

// Global test utilities
global.testUserId = 'test-user-123';
global.testChatId = 'test-chat-456';
global.testToken = 'test-jwt-token';