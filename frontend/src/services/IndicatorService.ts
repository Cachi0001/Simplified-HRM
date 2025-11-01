/**
 * IndicatorService - Centralized state management for message sender indicators
 * 
 * Manages the lifecycle of visual indicators that appear when users send messages
 */

import { 
  MessageIndicatorState, 
  IndicatorConfig, 
  IndicatorServiceInterface,
  DEFAULT_INDICATOR_CONFIG 
} from '../types/indicators';

export class IndicatorService implements IndicatorServiceInterface {
  private indicators = new Map<string, MessageIndicatorState>();
  private config: IndicatorConfig;
  private listeners = new Set<(indicators: Map<string, MessageIndicatorState>) => void>();
  private timers = new Map<string, NodeJS.Timeout>();

  constructor(config: Partial<IndicatorConfig> = {}) {
    this.config = { ...DEFAULT_INDICATOR_CONFIG, ...config };
  }

  /**
   * Activate indicator for a user
   * If user already has an active indicator, reset the timer
   */
  activateIndicator(userId: string): void {
    try {
      // Clear existing timer if any
      this.clearTimer(userId);
      
      // Set new indicator state
      const indicator: MessageIndicatorState = {
        userId,
        isActive: true,
        startTime: Date.now(),
        duration: this.config.duration,
        style: this.config.style
      };
      
      this.indicators.set(userId, indicator);
      this.notifyListeners();
      
      // Set timer to deactivate
      const timer = setTimeout(() => {
        this.deactivateIndicator(userId);
      }, this.config.duration);
      
      this.timers.set(userId, timer);
      
      console.log('✨ Indicator activated for user:', userId);
    } catch (error) {
      console.error('❌ Failed to activate indicator for user:', userId, error);
    }
  }

  /**
   * Deactivate indicator for a user
   */
  deactivateIndicator(userId: string): void {
    try {
      this.clearTimer(userId);
      
      const wasActive = this.indicators.has(userId);
      this.indicators.delete(userId);
      
      if (wasActive) {
        this.notifyListeners();
        console.log('💫 Indicator deactivated for user:', userId);
      }
    } catch (error) {
      console.error('❌ Failed to deactivate indicator for user:', userId, error);
    }
  }

  /**
   * Get current indicator state for a user
   */
  getIndicatorState(userId: string): MessageIndicatorState | null {
    return this.indicators.get(userId) || null;
  }

  /**
   * Get all active indicators
   */
  getAllActiveIndicators(): Map<string, MessageIndicatorState> {
    return new Map(this.indicators);
  }

  /**
   * Check if user has active indicator
   */
  hasActiveIndicator(userId: string): boolean {
    return this.indicators.has(userId);
  }

  /**
   * Subscribe to indicator state changes
   * Returns unsubscribe function
   */
  subscribe(callback: (indicators: Map<string, MessageIndicatorState>) => void): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current state
    callback(new Map(this.indicators));
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<IndicatorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Indicator config updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): IndicatorConfig {
    return { ...this.config };
  }

  /**
   * Clear timer for specific user
   */
  private clearTimer(userId: string): void {
    const timer = this.timers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(userId);
    }
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    const currentState = new Map(this.indicators);
    this.listeners.forEach(callback => {
      try {
        callback(currentState);
      } catch (error) {
        console.error('❌ Error in indicator listener:', error);
      }
    });
  }

  /**
   * Cleanup all indicators, timers, and listeners
   */
  cleanup(): void {
    try {
      // Clear all timers
      this.timers.forEach(timer => clearTimeout(timer));
      this.timers.clear();
      
      // Clear indicators
      this.indicators.clear();
      
      // Clear listeners
      this.listeners.clear();
      
      console.log('🧹 IndicatorService cleaned up');
    } catch (error) {
      console.error('❌ Error during IndicatorService cleanup:', error);
    }
  }

  /**
   * Get service statistics for debugging
   */
  getStats(): {
    activeIndicators: number;
    activeTimers: number;
    listeners: number;
  } {
    return {
      activeIndicators: this.indicators.size,
      activeTimers: this.timers.size,
      listeners: this.listeners.size
    };
  }
}

// Singleton instance for global use
let indicatorServiceInstance: IndicatorService | null = null;

/**
 * Get or create the global IndicatorService instance
 */
export function getIndicatorService(config?: Partial<IndicatorConfig>): IndicatorService {
  if (!indicatorServiceInstance) {
    indicatorServiceInstance = new IndicatorService(config);
  }
  return indicatorServiceInstance;
}

/**
 * Reset the global IndicatorService instance (useful for testing)
 */
export function resetIndicatorService(): void {
  if (indicatorServiceInstance) {
    indicatorServiceInstance.cleanup();
    indicatorServiceInstance = null;
  }
}

export default IndicatorService;