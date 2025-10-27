import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Go3netNotification, NotificationType } from '@/types/notification';
import { notificationService } from '@/services/notificationService';

interface ToastNotificationProps {
  notification: Go3netNotification;
  onClose: (id: string) => void;
  darkMode?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function ToastNotification({
  notification,
  onClose,
  darkMode = false,
  position = 'top-right'
}: ToastNotificationProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    // Mark as read
    notificationService.markNotificationAsRead(notification.id);

    // Navigate to appropriate page
    const url = getNotificationUrl(notification);
    if (url) {
      navigate(url);
    }

    // Close the toast
    onClose(notification.id);
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'view':
        handleClick();
        break;
      case 'dismiss':
        onClose(notification.id);
        break;
      default:
        handleClick();
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    const iconClass = `w-5 h-5 ${darkMode ? 'text-white' : 'text-gray-600'}`;

    switch (type) {
      case 'success':
        return <CheckIcon className={iconClass} />;
      case 'warning':
        return <AlertIcon className={iconClass} />;
      case 'error':
        return <XIcon className={iconClass} />;
      case 'signup':
        return <UserIcon className={iconClass} />;
      case 'approval':
        return <CheckCircleIcon className={iconClass} />;
      case 'update':
        return <RefreshIcon className={iconClass} />;
      default:
        return <InfoIcon className={iconClass} />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return darkMode ? 'bg-green-900 border-green-700' : 'bg-green-50 border-green-200';
      case 'warning':
        return darkMode ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-50 border-yellow-200';
      case 'error':
        return darkMode ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200';
      case 'signup':
        return darkMode ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200';
      case 'approval':
        return darkMode ? 'bg-purple-900 border-purple-700' : 'bg-purple-50 border-purple-200';
      case 'update':
        return darkMode ? 'bg-indigo-900 border-indigo-700' : 'bg-indigo-50 border-indigo-200';
      default:
        return darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';
    }
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 max-w-sm w-full animate-slide-in`}
      onClick={handleClick}
    >
      <div
        className={`
          ${getNotificationColor(notification.type)}
          border rounded-lg shadow-lg cursor-pointer
          hover:shadow-xl transition-all duration-200
          transform hover:scale-105
        `}
      >
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {notification.title}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(notification.id);
                  }}
                  className={`ml-2 flex-shrink-0 ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {notification.message}
              </p>
              <div className="flex items-center justify-between mt-3">
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formatTimeAgo(notification.timestamp)}
                </p>
                {notification.actions && notification.actions.length > 0 && (
                  <div className="flex space-x-2">
                    {notification.actions.slice(0, 2).map((action, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(action.action);
                        }}
                        className={`
                          text-xs px-2 py-1 rounded
                          ${darkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }
                          transition-colors
                        `}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

// Icon components (simplified SVG icons)
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Helper function to get notification URL
function getNotificationUrl(notification: Go3netNotification): string {
  switch (notification.category) {
    case 'dashboard':
      return '/dashboard';
    case 'employee':
      return `/employee/${notification.targetUserId}`;
    case 'approval':
      return '/dashboard#pending-approvals';
    case 'task':
      return '/tasks';
    case 'system':
      return '/dashboard';
    default:
      return '/dashboard';
  }
}
