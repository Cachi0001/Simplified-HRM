import React from 'react';

interface ChatBadgeProps {
  count: number;
  className?: string;
}

/**
 * ChatBadge Component
 * Displays unread message count on the chat icon
 * - Red circular badge with white text
 * - Only visible when count > 0
 * - Smooth fade-in animation
 * - Compact design for navbar integration
 */
export function ChatBadge({ count, className = '' }: ChatBadgeProps) {
  if (count <= 0) return null;

  return (
    <div
      className={`absolute -top-1.5 -right-1.5 min-w-5 h-5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center shadow-lg animate-fade-in pointer-events-none ${className}`}
    >
      {count > 99 ? '99+' : count}
    </div>
  );
}