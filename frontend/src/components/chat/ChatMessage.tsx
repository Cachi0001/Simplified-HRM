import React from 'react';
import { ReadReceipt } from './ReadReceipt';

interface ChatMessageProps {
  id: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  readAt?: string | null;
  readBy?: { userId: string; userName: string; readAt: string }[];
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  className?: string;
}

/**
 * ChatMessage Component
 * Displays individual chat messages with:
 * - User avatar and name
 * - Message content with word wrapping
 * - Timestamp
 * - Read receipt (for own messages) with hover details
 * - Different styling for own vs. other messages
 * - Smooth fade-in animation
 */
export function ChatMessage({
  id,
  senderName,
  senderAvatar,
  content,
  timestamp,
  isOwn,
  readAt,
  readBy = [],
  status = 'read',
  className = ''
}: ChatMessageProps) {
  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  // Generate avatar fallback from name
  const getAvatarInitial = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in ${className}`}
      id={`message-${id}`}
    >
      <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} gap-2 max-w-xs lg:max-w-md xl:max-w-lg`}>
        {/* Avatar (only for other users) */}
        {!isOwn && (
          <div className="flex-shrink-0">
            {senderAvatar ? (
              <img
                src={senderAvatar}
                alt={senderName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-gray-700"
                onError={(e) => {
                  // Fallback to avatar initial on error
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-gray-700">
                {getAvatarInitial(senderName)}
              </div>
            )}
          </div>
        )}

        {/* Message Container */}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender name (only for others) */}
          {!isOwn && (
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-0.5 px-1">
              {senderName}
            </span>
          )}

          {/* Message Bubble */}
          <div
            className={`px-3 py-2 rounded-lg break-words shadow-sm ${
              isOwn
                ? 'bg-blue-600 dark:bg-blue-700 text-white rounded-br-none'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
            }`}
          >
            <p className="text-sm leading-snug">{content}</p>
          </div>

          {/* Timestamp and Read Receipt */}
          <div className="flex items-center gap-1.5 mt-1 px-1">
            {isOwn && (
              <ReadReceipt
                status={readAt ? 'read' : status}
                readBy={readBy}
                timestamp={timestamp}
              />
            )}
            {!isOwn && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(timestamp)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}