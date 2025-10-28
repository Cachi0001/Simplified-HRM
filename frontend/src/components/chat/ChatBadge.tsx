import React from 'react';
import { Badge } from '@/components/ui/Badge';

interface ChatBadgeProps {
  count: number;
  className?: string;
}

/**
 * ChatBadge Component
 * Displays unread message count on the chat icon
 * - Red circular badge with count
 * - Only visible when count > 0
 * - Smooth fade animation
 */
export function ChatBadge({ count, className = '' }: ChatBadgeProps) {
  if (count <= 0) return null;

  return (
    <div className={`absolute -top-2 -right-2 animate-fade-in ${className}`}>
      <Badge
        variant="destructive"
        size="sm"
        className="min-w-6 h-6 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold"
      >
        {count > 99 ? '99+' : count}
      </Badge>
    </div>
  );
}