import React, { useState } from 'react';
import { CheckCircle2, Check } from 'lucide-react';

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
 * - Hover shows detailed read info with user names and timestamps
 */
export function ReadReceipt({
  status,
  readBy = [],
  timestamp,
  className = ''
}: ReadReceiptProps) {
  const [showDetails, setShowDetails] = useState(false);

  const renderStatusIcon = () => {
    switch (status) {
      case 'sending':
        return (
          <span className="inline-block animate-spin">
            <Check className="h-3 w-3 text-gray-400" />
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex">
            <Check className="h-3 w-3 text-blue-500" />
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex gap-0.5">
            <Check className="h-3 w-3 text-blue-500" />
            <Check className="h-3 w-3 text-blue-500 -ml-1" />
          </span>
        );
      case 'read':
        return (
          <span className="inline-flex gap-0.5">
            <CheckCircle2 className="h-3 w-3 text-blue-500 fill-blue-500" />
            <CheckCircle2 className="h-3 w-3 text-blue-500 fill-blue-500 -ml-1" />
          </span>
        );
      default:
        return (
          <Check className="h-3 w-3 text-gray-500" />
        );
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return `Read by ${readBy.length} ${readBy.length === 1 ? 'person' : 'people'}`;
      default:
        return '';
    }
  };

  return (
    <div
      className={`relative inline-flex items-center gap-1 cursor-help ${className}`}
      onMouseEnter={() => (readBy.length > 0 || status) && setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
      title={getStatusText()}
    >
      {renderStatusIcon()}

      {showDetails && (readBy.length > 0 || status) && (
        <div className="absolute bottom-full right-0 sm:right-0 left-auto sm:left-auto mb-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded px-3 py-2 whitespace-nowrap z-10 shadow-lg border border-gray-700 dark:border-gray-600 max-w-[calc(100vw-2rem)]">
          <div className="font-semibold mb-1">{getStatusText()}</div>
          {readBy.length > 0 && (
            <div className="space-y-1 border-t border-gray-700 pt-1 mt-1">
              {readBy.map((reader, idx) => (
                <div key={idx} className="text-gray-200">
                  <span className="font-medium">{reader.userName}</span>
                  {reader.readAt && (
                    <span className="text-gray-400 text-xs ml-1">
                      {new Date(reader.readAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {timestamp && (
        <span className="text-xs text-gray-400 ml-0.5">
          {new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      )}
    </div>
  );
}