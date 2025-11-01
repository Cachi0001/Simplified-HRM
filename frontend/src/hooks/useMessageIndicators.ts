/**
 * useMessageIndicators Hook
 * 
 * React hook for managing message sender indicators
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MessageIndicatorState, 
  IndicatorConfig, 
  IndicatorEvent,
  INDICATOR_EVENTS 
} from '../types/indicators';
import { getIndicatorService } from '../services/IndicatorService';

interface UseMessageIndicatorsReturn {
  indicators: Map<string, MessageIndicatorState>;
  handleMessageSent: (userId: string, chatId?: string, messageId?: string) => void;
  getIndicatorState: (userId: string) => MessageIndicatorState | null;
  hasActiveIndicator: (userId: string) => boolean;
  activateIndicator: (userId: string) => void;
  deactivateIndicator: (userId: string) => void;
  cleanup: () => void;
}

/**
 * Hook for managing message sender indicators
 */
export function useMessageIndicators(config?: Partial<IndicatorConfig>): UseMessageIndicatorsReturn {
  const [indicators, setIndicators] = useState<Map<string, MessageIndicatorState>>(new Map());
  const serviceRef = useRef(getIndicatorService(config));
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize service and subscribe to changes
  useEffect(() => {
    try {
      const service = serviceRef.current;

      // Subscribe to indicator changes
      const unsubscribe = service.subscribe((newIndicators) => {
        try {
          setIndicators(new Map(newIndicators));
        } catch (error) {
          console.error('❌ Error updating indicators state:', error);
        }
      });

      unsubscribeRef.current = unsubscribe;

      // Listen for global indicator events
      const handleIndicatorEvent = (event: CustomEvent<IndicatorEvent>) => {
        try {
          const { userId } = event.detail;
          if (userId) {
            service.activateIndicator(userId);
          }
        } catch (error) {
          console.error('❌ Error handling indicator event:', error);
        }
      };

      window.addEventListener('message-indicator', handleIndicatorEvent as EventListener);

      return () => {
        try {
          unsubscribe();
          window.removeEventListener('message-indicator', handleIndicatorEvent as EventListener);
        } catch (error) {
          console.error('❌ Error during indicator cleanup:', error);
        }
      };
    } catch (error) {
      console.error('❌ Error initializing message indicators:', error);
    }
  }, []);

  // Handle message sent events
  const handleMessageSent = useCallback((userId: string, chatId?: string, messageId?: string) => {
    try {
      const service = serviceRef.current;
      service.activateIndicator(userId);

      // Emit global event for other components
      const event: IndicatorEvent = {
        type: 'message_sent',
        userId,
        chatId: chatId || '',
        timestamp: Date.now(),
        messageId: messageId || ''
      };

      window.dispatchEvent(new CustomEvent('message-indicator', { detail: event }));
      
      console.log('📤 Message indicator triggered for user:', userId);
    } catch (error) {
      console.error('❌ Failed to handle message sent event:', error);
    }
  }, []);

  // Get indicator state for specific user
  const getIndicatorState = useCallback((userId: string) => {
    return serviceRef.current.getIndicatorState(userId);
  }, []);

  // Check if user has active indicator
  const hasActiveIndicator = useCallback((userId: string) => {
    return serviceRef.current.hasActiveIndicator(userId);
  }, []);

  // Manually activate indicator
  const activateIndicator = useCallback((userId: string) => {
    serviceRef.current.activateIndicator(userId);
  }, []);

  // Manually deactivate indicator
  const deactivateIndicator = useCallback((userId: string) => {
    serviceRef.current.deactivateIndicator(userId);
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    serviceRef.current.cleanup();
  }, []);

  return {
    indicators,
    handleMessageSent,
    getIndicatorState,
    hasActiveIndicator,
    activateIndicator,
    deactivateIndicator,
    cleanup
  };
}

/**
 * Hook for listening to indicator events only (lightweight version)
 */
export function useIndicatorListener(userId: string): {
  isActive: boolean;
  indicatorState: MessageIndicatorState | null;
} {
  const [isActive, setIsActive] = useState(false);
  const [indicatorState, setIndicatorState] = useState<MessageIndicatorState | null>(null);

  useEffect(() => {
    const service = getIndicatorService();

    const unsubscribe = service.subscribe((indicators) => {
      const userIndicator = indicators.get(userId);
      setIsActive(!!userIndicator?.isActive);
      setIndicatorState(userIndicator || null);
    });

    return unsubscribe;
  }, [userId]);

  return { isActive, indicatorState };
}

export default useMessageIndicators;