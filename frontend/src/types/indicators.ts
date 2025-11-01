/**
 * Message Sender Indicator Types
 * 
 * TypeScript definitions for the message sender visual indicator system
 */

export interface MessageIndicatorState {
  userId: string;
  isActive: boolean;
  startTime: number;
  duration: number;
  style: IndicatorStyle;
}

export interface IndicatorConfig {
  duration: number;           // Default: 3000ms
  fadeOutDuration: number;    // Default: 500ms
  style: IndicatorStyle;      // Default: 'pulse'
  respectReducedMotion: boolean; // Default: true
}

export type IndicatorStyle = 'pulse' | 'glow' | 'badge' | 'ring';

export interface IndicatorEvent {
  type: 'message_sent';
  userId: string;
  chatId: string;
  timestamp: number;
  messageId: string;
}

export interface IndicatorServiceInterface {
  activateIndicator(userId: string): void;
  deactivateIndicator(userId: string): void;
  getIndicatorState(userId: string): MessageIndicatorState | null;
  subscribe(callback: (indicators: Map<string, MessageIndicatorState>) => void): () => void;
  cleanup(): void;
}

export interface MessageIndicatorProps {
  isActive: boolean;
  style: IndicatorStyle;
  respectReducedMotion?: boolean;
  className?: string;
}

export interface IndicatorWrapperProps {
  userId: string;
  children: React.ReactNode;
  className?: string;
}

// Default configuration constants
export const DEFAULT_INDICATOR_CONFIG: IndicatorConfig = {
  duration: 3000,           // 3 seconds
  fadeOutDuration: 500,     // 0.5 seconds
  style: 'pulse',           // Pulse animation
  respectReducedMotion: true // Honor accessibility preferences
};

// Event type constants
export const INDICATOR_EVENTS = {
  MESSAGE_SENT: 'message_sent',
  INDICATOR_ACTIVATED: 'message-indicator-activated',
  INDICATOR_DEACTIVATED: 'message-indicator-deactivated'
} as const;