import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock performance.now for consistent timing in tests
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
  },
});

// Mock crypto for UUID generation
Object.defineProperty(window, 'crypto', {
  writable: true,
  value: {
    randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  },
});

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    VITE_API_URL: 'http://localhost:3001/api',
    PROD: false,
  },
}));

// Global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'employee',
    ...overrides,
  }),
  
  createMockChat: (overrides = {}) => ({
    id: 'test-chat-id',
    name: 'Test Chat',
    type: 'dm',
    lastMessage: 'Hello',
    lastMessageTime: '10:00 AM',
    unreadCount: 0,
    ...overrides,
  }),
  
  createMockMessage: (overrides = {}) => ({
    id: 'test-message-id',
    chatId: 'test-chat-id',
    senderId: 'test-user-id',
    senderName: 'Test User',
    content: 'Test message',
    timestamp: new Date().toISOString(),
    isOwn: false,
    status: 'delivered',
    ...overrides,
  }),
  
  waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  flushPromises: () => new Promise(resolve => setImmediate(resolve)),
};

// Declare global types for TypeScript
declare global {
  var testUtils: {
    createMockUser: (overrides?: any) => any;
    createMockChat: (overrides?: any) => any;
    createMockMessage: (overrides?: any) => any;
    waitForNextTick: () => Promise<void>;
    flushPromises: () => Promise<void>;
  };
}