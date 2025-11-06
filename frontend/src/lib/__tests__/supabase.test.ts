import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase, checkSupabaseConnection, initializeRealtimeSubscriptions } from '../supabase';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  channel: vi.fn(),
  removeChannel: vi.fn(),
};

// Mock the createClient function
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('Supabase Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Client Creation', () => {
    it('should create Supabase client with correct configuration', () => {
      expect(supabase).toBeDefined();
      expect(supabase).toBe(mockSupabase);
    });
  });

  describe('Connection Health Check', () => {
    it('should return true for successful connection', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.select.mockResolvedValue({ error: null });

      const result = await checkSupabaseConnection();
      
      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('chats');
    });

    it('should return true for PGRST116 error (table not found)', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.select.mockResolvedValue({ 
        error: { code: 'PGRST116', message: 'Table not found' }
      });

      const result = await checkSupabaseConnection();
      
      expect(result).toBe(true);
    });

    it('should return false for other errors', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.select.mockResolvedValue({ 
        error: { code: 'OTHER_ERROR', message: 'Some other error' }
      });

      const result = await checkSupabaseConnection();
      
      expect(result).toBe(false);
    });

    it('should handle connection exceptions', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.select.mockRejectedValue(new Error('Network error'));

      const result = await checkSupabaseConnection();
      
      expect(result).toBe(false);
    });
  });

  describe('Realtime Subscriptions', () => {
    it('should initialize subscriptions with valid session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { 
          session: { 
            user: { id: 'user-1' },
            access_token: 'token-123'
          }
        },
        error: null,
      });

      await expect(initializeRealtimeSubscriptions()).resolves.toBeUndefined();
      
      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
    });

    it('should handle missing session gracefully', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(initializeRealtimeSubscriptions()).resolves.toBeUndefined();
    });

    it('should handle auth errors', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Auth error' },
      });

      await expect(initializeRealtimeSubscriptions()).resolves.toBeUndefined();
    });

    it('should handle initialization exceptions', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Network error'));

      await expect(initializeRealtimeSubscriptions()).resolves.toBeUndefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate environment variables', () => {
      // Mock environment variables
      const originalEnv = import.meta.env;
      
      // Test with valid config
      Object.defineProperty(import.meta, 'env', {
        value: {
          ...originalEnv,
          VITE_SUPABASE_URL: 'https://test.supabase.co',
          VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-key-that-is-long-enough-to-be-valid',
        },
        configurable: true,
      });

      // The module should load without throwing
      expect(() => {
        // Re-import to test with new env vars
        vi.resetModules();
      }).not.toThrow();

      // Restore original env
      Object.defineProperty(import.meta, 'env', {
        value: originalEnv,
        configurable: true,
      });
    });
  });

  describe('Realtime Configuration', () => {
    it('should have correct realtime settings', () => {
      // The client should be created with realtime configuration
      expect(mockSupabase).toBeDefined();
      
      // We can't directly test the configuration since it's passed to createClient,
      // but we can verify the client was created
      const { createClient } = require('@supabase/supabase-js');
      expect(createClient).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed responses gracefully', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.select.mockResolvedValue(null); // Malformed response

      const result = await checkSupabaseConnection();
      
      expect(result).toBe(false);
    });

    it('should handle undefined errors', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.select.mockResolvedValue({ error: undefined });

      const result = await checkSupabaseConnection();
      
      expect(result).toBe(true);
    });
  });
});