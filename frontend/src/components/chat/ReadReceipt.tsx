import React, { useState } from 'react';

interface ReadReceiptProps {
  status: 'sending' | 'sent' | 'delivered' | 'read';
  readBy?: {
    userId: string;
    userName: string;
    readAt: string;
  }[];
  timestamp?: string;
  className?: string;
}

/**
 * ReadReceipt Component
 * Shows message delivery and read status
 * - Single ✓ (sent)
 * - Double ✓✓ (delivered)
 * - Double filled ✓✓ (read)
 * - Hover shows detailed read info
 */
export function ReadReceipt({
  status,
  readBy = [],
  timestamp,
  className = ''
}: ReadReceiptProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getIcon = () => {
    switch (status) {
      case 'sending':
        return '⏳';
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓'; // In a real app, this would be filled
      default:
        return '✓';
    }
  };

  const getColor = () => {
    switch (status) {
      case 'sending':
        return 'text-gray-400';
      case 'sent':
        return 'text-gray-500';
      case 'delivered':
        return 'text-gray-600';
      case 'read':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div
      className={`relative inline-flex items-center gap-1 ${className}`}
      onMouseEnter={() => readBy.length > 0 && setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      <span className={`text-xs ${getColor()}`}>{getIcon()}</span>
      
      {showDetails && readBy.length > 0 && (
        <div className="absolute bottom-full right-0 mb-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded p-2 whitespace-nowrap z-10 shadow-lg">
          {readBy.map((reader, idx) => (
            <div key={idx}>
              <span className="font-medium">{reader.userName}</span>
              {reader.readAt && (
                <span className="text-gray-300">
                  {' '}{new Date(reader.readAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {timestamp && (
        <span className="text-xs text-gray-400">
          {new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      )}
    </div>
  );
}