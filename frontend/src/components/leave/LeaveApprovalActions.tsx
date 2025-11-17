import React from 'react';
import { Check, X } from 'lucide-react';

interface LeaveApprovalActionsProps {
  requestId: string;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  approving: boolean;
  rejecting: boolean;
  darkMode: boolean;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
}

export const LeaveApprovalActions: React.FC<LeaveApprovalActionsProps> = ({
  requestId,
  onApprove,
  onReject,
  approving,
  rejecting,
  darkMode,
  size = 'md',
  layout = 'horizontal'
}) => {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const containerClass = layout === 'horizontal' ? 'flex space-x-2' : 'flex flex-col space-y-2';

  return (
    <div className={containerClass}>
      {/* Approve Button */}
      <button
        onClick={() => onApprove(requestId)}
        disabled={approving || rejecting}
        className={`${sizeClasses[size]} rounded-lg transition-all duration-200 ${
          darkMode 
            ? 'bg-green-900 text-green-400 hover:bg-green-800 disabled:bg-gray-700 disabled:text-gray-500' 
            : 'bg-green-100 text-green-600 hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400'
        } disabled:cursor-not-allowed`}
        title="Approve request"
      >
        {approving ? (
          <div className={`animate-spin rounded-full border-b-2 border-current ${iconSizes[size]}`}></div>
        ) : (
          <Check className={iconSizes[size]} />
        )}
      </button>

      {/* Reject Button */}
      <button
        onClick={() => onReject(requestId)}
        disabled={approving || rejecting}
        className={`${sizeClasses[size]} rounded-lg transition-all duration-200 ${
          darkMode 
            ? 'bg-red-900 text-red-400 hover:bg-red-800 disabled:bg-gray-700 disabled:text-gray-500' 
            : 'bg-red-100 text-red-600 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400'
        } disabled:cursor-not-allowed`}
        title="Reject request"
      >
        {rejecting ? (
          <div className={`animate-spin rounded-full border-b-2 border-current ${iconSizes[size]}`}></div>
        ) : (
          <X className={iconSizes[size]} />
        )}
      </button>
    </div>
  );
};
