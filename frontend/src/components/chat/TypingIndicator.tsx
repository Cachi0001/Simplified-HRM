import React, { useState, useEffect } from 'react';

interface TypingIndicatorProps {
  users: string[];
  className?: string;
}

/**
 * TypingIndicator Component
 * Shows animated typing status with animated dots
 * - Animation: "typing..." → "typing.." → "typing." → repeat
 * - Displays user names who are typing
 * - Auto-hides after 3 seconds of inactivity
 */
export function TypingIndicator({ users, className = '' }: TypingIndicatorProps) {
  const [dots, setDots] = useState('...');

  useEffect(() => {
    if (users.length === 0) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '..';
        if (prev === '..') return '.';
        return '...';
      });
    }, 400);

    return () => clearInterval(interval);
  }, [users.length]);

  if (users.length === 0) return null;

  const typingText = users.length === 1
    ? `${users[0]} is typing${dots}`
    : users.length === 2
    ? `${users[0]} and ${users[1]} are typing${dots}`
    : `${users[0]} and ${users.length - 1} others are typing${dots}`;

  return (
    <div
      className={`text-sm text-gray-500 dark:text-gray-400 italic animate-pulse ${className}`}
    >
      ✍️ {typingText}
    </div>
  );
}