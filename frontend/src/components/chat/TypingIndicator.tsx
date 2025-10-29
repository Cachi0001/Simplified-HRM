import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';

interface TypingIndicatorProps {
  users: string[];
  className?: string;
}

/**
 * TypingIndicator Component
 * Shows animated typing status with animated dots
 * - Animation: "user is typing..." with animated bouncing dots
 * - Displays user names who are typing
 * - Visual indicator of typing activity
 * - Multiple users support
 */
export function TypingIndicator({ users, className = '' }: TypingIndicatorProps) {
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    if (users.length === 0) return;

    const interval = setInterval(() => {
      setActiveDot(prev => (prev + 1) % 3);
    }, 400);

    return () => clearInterval(interval);
  }, [users.length]);

  if (users.length === 0) return null;

  const userList = users.slice(0, 2).join(' and ');
  const morePeople = users.length > 2 ? ` and ${users.length - 2} other${users.length - 2 > 1 ? 's' : ''}` : '';
  const typingText = `${userList}${morePeople} ${users.length === 1 ? 'is' : 'are'} typing`;

  return (
    <div
      className={`flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ${className}`}
    >
      <Send className="h-4 w-4 animate-pulse" />
      <span className="italic">{typingText}</span>
      <div className="flex gap-1 items-center">
        <span
          className={`w-1.5 h-1.5 rounded-full transition-all ${
            activeDot === 0 ? 'bg-blue-500 scale-125' : 'bg-gray-400'
          }`}
        />
        <span
          className={`w-1.5 h-1.5 rounded-full transition-all ${
            activeDot === 1 ? 'bg-blue-500 scale-125' : 'bg-gray-400'
          }`}
        />
        <span
          className={`w-1.5 h-1.5 rounded-full transition-all ${
            activeDot === 2 ? 'bg-blue-500 scale-125' : 'bg-gray-400'
          }`}
        />
      </div>
    </div>
  );
}