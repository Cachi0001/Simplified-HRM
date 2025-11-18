import React from 'react';

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
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base'
  };

  const containerClass = layout === 'horizontal' ? 'flex gap-2' : 'flex flex-col gap-2';

  return (
    <div className={containerClass}>
      {/* Approve Button */}
      <button
        onClick={() => onApprove(requestId)}
        disabled={approving || rejecting}
        className={`${sizeClasses[size]} bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
      >
        {approving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Approving...</span>
          </>
        ) : (
          'Approve'
        )}
      </button>

      {/* Reject Button */}
      <button
        onClick={() => onReject(requestId)}
        disabled={approving || rejecting}
        className={`${sizeClasses[size]} bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
      >
        {rejecting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Rejecting...</span>
          </>
        ) : (
          'Reject'
        )}
      </button>
    </div>
  );
};
