/**
 * MessageIndicator Component
 * 
 * Visual indicator component that shows animation when users send messages
 */

import React, { useState, useEffect } from 'react';
import { MessageIndicatorProps, IndicatorStyle } from '../../types/indicators';

// Hook to detect user's motion preferences
function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Get CSS classes for different indicator styles
 */
function getIndicatorClasses(
  style: IndicatorStyle, 
  isActive: boolean, 
  shouldAnimate: boolean,
  isDarkMode: boolean = false
): string {
  const baseClasses = 'absolute inset-0 rounded-full transition-all duration-500 pointer-events-none';
  
  // Color scheme based on theme
  const colors = {
    light: {
      pulse: 'bg-blue-400',
      glow: 'bg-blue-400 shadow-blue-400/50',
      ring: 'border-blue-400',
      badge: 'bg-green-400'
    },
    dark: {
      pulse: 'bg-blue-300',
      glow: 'bg-blue-300 shadow-blue-300/50',
      ring: 'border-blue-300',
      badge: 'bg-green-300'
    }
  };

  const colorScheme = isDarkMode ? colors.dark : colors.light;

  if (!shouldAnimate) {
    // Static indicator for reduced motion
    const opacity = isActive ? 'opacity-30' : 'opacity-0';
    return `${baseClasses} ${opacity} ${colorScheme.pulse}`;
  }

  switch (style) {
    case 'pulse':
      return `${baseClasses} ${
        isActive ? 'animate-message-pulse opacity-40 scale-105' : 'opacity-0 scale-100'
      } ${colorScheme.pulse}`;
      
    case 'glow':
      return `${baseClasses} ${
        isActive ? 'opacity-60 animate-message-glow' : 'opacity-0'
      } ${colorScheme.glow}`;
      
    case 'ring':
      return `${baseClasses} ${
        isActive ? 'animate-message-ring opacity-30' : 'opacity-0'
      } border-2 ${colorScheme.ring} bg-transparent`;
      
    case 'badge':
      return `absolute top-0 right-0 w-3 h-3 rounded-full transition-all duration-500 pointer-events-none ${
        isActive ? 'opacity-80 scale-110 animate-message-pulse' : 'opacity-0 scale-100'
      } ${colorScheme.badge}`;
      
    default:
      return `${baseClasses} ${
        isActive ? 'animate-message-pulse opacity-40' : 'opacity-0'
      } ${colorScheme.pulse}`;
  }
}

/**
 * MessageIndicator Component
 */
export function MessageIndicator({ 
  isActive, 
  style, 
  respectReducedMotion = true,
  className = '' 
}: MessageIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Handle visibility with fade out delay
  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
    } else {
      // Fade out after delay
      const timer = setTimeout(() => setIsVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Don't render if not visible
  if (!isVisible) return null;

  const shouldAnimate = !respectReducedMotion || !prefersReducedMotion;
  const indicatorClasses = getIndicatorClasses(style, isActive, shouldAnimate, isDarkMode);

  return (
    <div 
      className={`${indicatorClasses} ${className}`}
      aria-hidden="true"
      role="presentation"
    />
  );
}

/**
 * Preset indicator components for common use cases
 */
export function PulseIndicator({ isActive, className }: { isActive: boolean; className?: string }) {
  return (
    <MessageIndicator
      isActive={isActive}
      style="pulse"
      className={className}
    />
  );
}

export function GlowIndicator({ isActive, className }: { isActive: boolean; className?: string }) {
  return (
    <MessageIndicator
      isActive={isActive}
      style="glow"
      className={className}
    />
  );
}

export function RingIndicator({ isActive, className }: { isActive: boolean; className?: string }) {
  return (
    <MessageIndicator
      isActive={isActive}
      style="ring"
      className={className}
    />
  );
}

export function BadgeIndicator({ isActive, className }: { isActive: boolean; className?: string }) {
  return (
    <MessageIndicator
      isActive={isActive}
      style="badge"
      className={className}
    />
  );
}

export default MessageIndicator;