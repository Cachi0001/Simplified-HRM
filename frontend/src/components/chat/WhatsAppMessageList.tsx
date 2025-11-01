/**
 * WhatsAppMessageList Component
 * 
 * WhatsApp-like message layout with proper grouping and timestamp sorting
 */

import React from 'react';
import { ChatMessage } from '../../hooks/useChat';
import { IndicatorWrapper } from '../indicators/IndicatorWrapper';

interface WhatsAppMessageListProps {
  messages: ChatMessage[];
  currentUserId: string | null;
  onRetryMessage: (messageId: string) => void;
  darkMode?: boolean;
}

interface MessageGroup {
  senderId: string;
  senderName: string;
  isOwn: boolean;
  messages: ChatMessage[];
  timestamp: string;
}

// Group consecutive messages from the same sender
function groupMessages(messages: ChatMessage[], currentUserId: string | null): MessageGroup[] {
  if (!messages.length) return [];

  // Sort messages by timestamp first
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  for (const message of sortedMessages) {
    const isOwn = String(message.senderId) === String(currentUserId) && currentUserId !== '';
    
    // Start new group if sender changes or if more than 5 minutes have passed
    const shouldStartNewGroup = !currentGroup || 
      currentGroup.senderId !== message.senderId ||
      (new Date(message.timestamp).getTime() - new Date(currentGroup.timestamp).getTime()) > 5 * 60 * 1000; // 5 minutes

    if (shouldStartNewGroup) {
      currentGroup = {
        senderId: message.senderId,
        senderName: message.senderName,
        isOwn,
        messages: [message],
        timestamp: message.timestamp
      };
      groups.push(currentGroup);
    } else {
      currentGroup.messages.push(message);
      currentGroup.timestamp = message.timestamp; // Update to latest timestamp
    }
  }

  return groups;
}

// Format time for display
function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return `${date.toLocaleDateString([], { weekday: 'short' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    // Older - show date and time
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
}

// Format date separator
function formatDateSeparator(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  } else {
    return date.toLocaleDateString([], { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}

// Check if we need a date separator
function needsDateSeparator(currentTimestamp: string, previousTimestamp?: string): boolean {
  if (!previousTimestamp) return true;
  
  const current = new Date(currentTimestamp);
  const previous = new Date(previousTimestamp);
  
  return current.toDateString() !== previous.toDateString();
}

// Get message status icon
function getStatusIcon(status?: string): string {
  switch (status) {
    case 'sending': return '⏳';
    case 'sent': return '✓';
    case 'delivered': return '✓✓';
    case 'read': return '✓✓'; // Could be blue in real WhatsApp
    case 'failed': return '❌';
    default: return '';
  }
}

export function WhatsAppMessageList({ 
  messages, 
  currentUserId, 
  onRetryMessage, 
  darkMode = false 
}: WhatsAppMessageListProps) {
  const messageGroups = groupMessages(messages, currentUserId);

  if (messageGroups.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 opacity-50">
            💬
          </div>
          <p className="text-lg font-medium mb-2">No messages yet</p>
          <p className="text-sm">Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1">
      {messageGroups.map((group, groupIndex) => {
        const showDateSeparator = needsDateSeparator(
          group.timestamp,
          groupIndex > 0 ? messageGroups[groupIndex - 1].timestamp : undefined
        );

        return (
          <div key={`group-${group.senderId}-${groupIndex}`}>
            {/* Date Separator */}
            {showDateSeparator && (
              <div className="flex items-center justify-center my-4">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {formatDateSeparator(group.timestamp)}
                </div>
              </div>
            )}

            {/* Message Group */}
            <div className={`flex ${group.isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
              <div className={`flex ${group.isOwn ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[75%]`}>
                
                {/* Avatar - only show for received messages */}
                {!group.isOwn && (
                  <IndicatorWrapper userId={group.senderId}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md">
                      {group.senderName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </IndicatorWrapper>
                )}

                {/* Messages Container */}
                <div className={`flex flex-col ${group.isOwn ? 'items-end' : 'items-start'} gap-1`}>
                  
                  {/* Sender Name - only for received messages in groups */}
                  {!group.isOwn && group.messages.length > 0 && (
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 px-2">
                      {group.senderName}
                    </div>
                  )}

                  {/* Messages */}
                  {group.messages.map((message, messageIndex) => {
                    const isLastInGroup = messageIndex === group.messages.length - 1;
                    const isFirstInGroup = messageIndex === 0;

                    return (
                      <div
                        key={message.id}
                        className={`
                          px-3 py-2 max-w-sm break-words shadow-sm
                          ${group.isOwn 
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                            : darkMode 
                              ? 'bg-gray-700 text-white border border-gray-600' 
                              : 'bg-white text-gray-900 border border-gray-200'
                          }
                          ${group.isOwn 
                            ? isFirstInGroup 
                              ? 'rounded-2xl rounded-br-md' 
                              : isLastInGroup 
                                ? 'rounded-2xl rounded-tr-md' 
                                : 'rounded-l-2xl rounded-r-md'
                            : isFirstInGroup 
                              ? 'rounded-2xl rounded-bl-md' 
                              : isLastInGroup 
                                ? 'rounded-2xl rounded-tl-md' 
                                : 'rounded-r-2xl rounded-l-md'
                          }
                        `}
                      >
                        {/* Message Content */}
                        <div className="text-sm leading-relaxed">
                          {message.content}
                        </div>

                        {/* Message Footer - only show on last message in group */}
                        {isLastInGroup && (
                          <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                            group.isOwn 
                              ? 'text-blue-100' 
                              : darkMode 
                                ? 'text-gray-400' 
                                : 'text-gray-500'
                          }`}>
                            <span>
                              {formatMessageTime(message.timestamp)}
                            </span>
                            
                            {/* Status Icons - only for own messages */}
                            {group.isOwn && (
                              <>
                                {message.status === 'failed' ? (
                                  <button
                                    onClick={() => onRetryMessage(message.id)}
                                    className="text-red-300 hover:text-red-100 transition-colors ml-1"
                                    title="Retry sending message"
                                  >
                                    🔄
                                  </button>
                                ) : (
                                  <span className="ml-1" title={message.status || 'unknown'}>
                                    {getStatusIcon(message.status)}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default WhatsAppMessageList;