/**
 * IndicatorService Tests
 * 
 * Unit tests for the message sender indicator system
 */

import { IndicatorService } from '../../../services/IndicatorService';
import { IndicatorConfig, DEFAULT_INDICATOR_CONFIG } from '../../../types/indicators';

// Mock timers for testing
jest.useFakeTimers();

describe('IndicatorService', () => {
  let service: IndicatorService;

  beforeEach(() => {
    service = new IndicatorService();
  });

  afterEach(() => {
    service.cleanup();
    jest.clearAllTimers();
  });

  describe('activateIndicator', () => {
    it('should activate indicator for a user', () => {
      const userId = 'user123';
      
      service.activateIndicator(userId);
      
      const state = service.getIndicatorState(userId);
      expect(state).toBeTruthy();
      expect(state?.isActive).toBe(true);
      expect(state?.userId).toBe(userId);
    });

    it('should reset timer when activating existing indicator', () => {
      const userId = 'user123';
      
      // Activate first time
      service.activateIndicator(userId);
      const firstState = service.getIndicatorState(userId);
      
      // Wait a bit
      jest.advanceTimersByTime(1000);
      
      // Activate again
      service.activateIndicator(userId);
      const secondState = service.getIndicatorState(userId);
      
      expect(secondState?.startTime).toBeGreaterThan(firstState?.startTime || 0);
    });

    it('should automatically deactivate after duration', () => {
      const userId = 'user123';
      
      service.activateIndicator(userId);
      expect(service.hasActiveIndicator(userId)).toBe(true);
      
      // Fast forward past the duration
      jest.advanceTimersByTime(DEFAULT_INDICATOR_CONFIG.duration + 100);
      
      expect(service.hasActiveIndicator(userId)).toBe(false);
    });
  });

  describe('deactivateIndicator', () => {
    it('should deactivate active indicator', () => {
      const userId = 'user123';
      
      service.activateIndicator(userId);
      expect(service.hasActiveIndicator(userId)).toBe(true);
      
      service.deactivateIndicator(userId);
      expect(service.hasActiveIndicator(userId)).toBe(false);
    });

    it('should handle deactivating non-existent indicator gracefully', () => {
      const userId = 'nonexistent';
      
      expect(() => {
        service.deactivateIndicator(userId);
      }).not.toThrow();
    });
  });

  describe('subscription system', () => {
    it('should notify subscribers when indicators change', () => {
      const mockCallback = jest.fn();
      const userId = 'user123';
      
      const unsubscribe = service.subscribe(mockCallback);
      
      // Should be called immediately with empty state
      expect(mockCallback).toHaveBeenCalledWith(new Map());
      
      // Activate indicator
      service.activateIndicator(userId);
      
      // Should be called again with new state
      expect(mockCallback).toHaveBeenCalledTimes(2);
      const lastCall = mockCallback.mock.calls[1][0];
      expect(lastCall.has(userId)).toBe(true);
      
      unsubscribe();
    });

    it('should allow multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const userId = 'user123';
      
      service.subscribe(callback1);
      service.subscribe(callback2);
      
      service.activateIndicator(userId);
      
      expect(callback1).toHaveBeenCalledTimes(2); // Initial + update
      expect(callback2).toHaveBeenCalledTimes(2); // Initial + update
    });

    it('should stop notifying after unsubscribe', () => {
      const mockCallback = jest.fn();
      const userId = 'user123';
      
      const unsubscribe = service.subscribe(mockCallback);
      unsubscribe();
      
      mockCallback.mockClear();
      
      service.activateIndicator(userId);
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customConfig: Partial<IndicatorConfig> = {
        duration: 5000,
        style: 'glow'
      };
      
      const customService = new IndicatorService(customConfig);
      const config = customService.getConfig();
      
      expect(config.duration).toBe(5000);
      expect(config.style).toBe('glow');
      
      customService.cleanup();
    });

    it('should update configuration', () => {
      const newConfig: Partial<IndicatorConfig> = {
        duration: 2000,
        style: 'ring'
      };
      
      service.updateConfig(newConfig);
      const config = service.getConfig();
      
      expect(config.duration).toBe(2000);
      expect(config.style).toBe('ring');
    });
  });

  describe('cleanup', () => {
    it('should clear all indicators and timers on cleanup', () => {
      const userId1 = 'user1';
      const userId2 = 'user2';
      
      service.activateIndicator(userId1);
      service.activateIndicator(userId2);
      
      expect(service.hasActiveIndicator(userId1)).toBe(true);
      expect(service.hasActiveIndicator(userId2)).toBe(true);
      
      service.cleanup();
      
      expect(service.hasActiveIndicator(userId1)).toBe(false);
      expect(service.hasActiveIndicator(userId2)).toBe(false);
    });

    it('should clear all subscribers on cleanup', () => {
      const mockCallback = jest.fn();
      
      service.subscribe(mockCallback);
      service.cleanup();
      
      mockCallback.mockClear();
      service.activateIndicator('user123');
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('statistics', () => {
    it('should provide accurate statistics', () => {
      const userId1 = 'user1';
      const userId2 = 'user2';
      const callback = jest.fn();
      
      service.subscribe(callback);
      service.activateIndicator(userId1);
      service.activateIndicator(userId2);
      
      const stats = service.getStats();
      
      expect(stats.activeIndicators).toBe(2);
      expect(stats.activeTimers).toBe(2);
      expect(stats.listeners).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle errors in subscriber callbacks gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();
      
      service.subscribe(errorCallback);
      service.subscribe(normalCallback);
      
      // Should not throw despite error in callback
      expect(() => {
        service.activateIndicator('user123');
      }).not.toThrow();
      
      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalled();
    });
  });
});