/**
 * IndicatorWrapper Component
 * 
 * Wrapper component that adds message sender indicators to existing avatars
 */

import React from 'react';
import { IndicatorWrapperProps } from '../../types/indicators';
import { useMessageIndicators } from '../../hooks/useMessageIndicators';
import MessageIndicator from './MessageIndicator';

/**
 * IndicatorWrapper - Wraps avatars with message sender indicators
 */
export function IndicatorWrapper({ 
  userId, 
  children, 
  className = '' 
}: IndicatorWrapperProps) {
  const { hasActiveIndicator } = useMessageIndicators();
  const isActive = hasActiveIndicator(userId);

  return (
    <div className={`relative ${className}`}>
      {children}
      {isActive && (
        <MessageIndicator
          isActive={isActive}
          style="pulse"
          respectReducedMotion={true}
        />
      )}
    </div>
  );
}

/**
 * Specialized wrapper for chat message avatars
 */
export function ChatAvatarWrapper({ 
  userId, 
  children, 
  size = 'default' 
}: {
  userId: string;
  children: React.ReactNode;
  size?: 'small' | 'default' | 'large';
}) {
  const sizeClasses = {
    small: 'w-6 h-6',
    default: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <IndicatorWrapper 
      userId={userId} 
      className={`inline-block ${sizeClasses[size]}`}
    >
      {children}
    </IndicatorWrapper>
  );
}

/**
 * Wrapper for user list items with indicators
 */
export function UserListItemWrapper({ 
  userId, 
  children 
}: {
  userId: string;
  children: React.ReactNode;
}) {
  return (
    <IndicatorWrapper 
      userId={userId} 
      className="flex items-center gap-2"
    >
      {children}
    </IndicatorWrapper>
  );
}

/**
 * Simple avatar component with built-in indicator support
 */
export function IndicatorAvatar({
  userId,
  name,
  size = 'default',
  className = '',
  onClick
}: {
  userId: string;
  name: string;
  size?: 'small' | 'default' | 'large';
  className?: string;
  onClick?: () => void;
}) {
  const sizeClasses = {
    small: 'w-6 h-6 text-xs',
    default: 'w-8 h-8 text-sm',
    large: 'w-12 h-12 text-base'
  };

  const initial = name ? name.charAt(0).toUpperCase() : 'U';

  return (
    <ChatAvatarWrapper userId={userId} size={size}>
      <div 
        className={`
          ${sizeClasses[size]} 
          rounded-full bg-blue-500 hover:bg-blue-600 
          flex items-center justify-center 
          text-white font-medium 
          transition-colors cursor-pointer
          ${className}
        `}
        onClick={onClick}
        title={name}
      >
        {initial}
      </div>
    </ChatAvatarWrapper>
  );
}

export default IndicatorWrapper;