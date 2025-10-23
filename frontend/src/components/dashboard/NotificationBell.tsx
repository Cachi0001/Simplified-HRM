import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '../ui/Button';
import { notificationService } from '../../services/notificationService';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

interface NotificationBellProps {
  darkMode?: boolean;
}

export function NotificationBell({ darkMode = false }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localDarkMode, setLocalDarkMode] = useState(() => {
    // Load dark mode preference from localStorage
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const navigate = useNavigate();

  // Update local dark mode when prop changes
  useEffect(() => {
    setLocalDarkMode(darkMode);
  }, [darkMode]);

  // Fetch real notifications from the service
  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      return await notificationService.getNotifications();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleNotificationClick = async (notification: any) => {
    // Mark as read using the service
    await notificationService.markNotificationAsRead(notification.id);

    // Update local state
    notification.read = true;
    refetch();

    // Navigate based on notification category and type
    let navigateUrl = '/dashboard'; // Default

    if (notification.category === 'employee') {
      // For employee approval notifications, navigate to login
      if (notification.type === 'approval_success' || notification.message.includes('approved') || notification.message.includes('Welcome')) {
        navigateUrl = '/auth';
      } else {
        navigateUrl = `/employee/${notification.targetUserId}`;
      }
    } else if (notification.category === 'approval') {
      navigateUrl = '/dashboard#pending-approvals';
    } else if (notification.category === 'task') {
      navigateUrl = '/employee-dashboard#tasks';
    } else if (notification.actions && notification.actions.length > 0) {
      // Use the action URL if available
      const action = notification.actions[0];
      navigateUrl = action.url || '/dashboard';
    }

    // Navigate to the determined URL
    navigate(navigateUrl);
    setIsOpen(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative ${localDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
      >
        <Bell className={`h-5 w-5 ${localDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Interactive dropdown - in real app would use popover component */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-80 ${localDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg z-50`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className={`font-semibold ${localDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Notifications
              </h4>
              <button
                onClick={() => setIsOpen(false)}
                className={`text-sm ${localDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
              >
                ×
              </button>
            </div>

            {notifications.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded cursor-pointer transition-colors ${
                      notification.read
                        ? (localDarkMode ? 'bg-gray-700/50' : 'bg-gray-50')
                        : (localDarkMode ? 'bg-blue-900/30' : 'bg-blue-50')
                    } ${localDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        notification.read ? 'bg-gray-400' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <p className={`text-sm ${localDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className={`text-xs ${localDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(notification.timestamp).toLocaleDateString()} at {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {!notification.read && (
                            <span className="text-xs text-blue-600 font-medium">New</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-8 ${localDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className={`w-12 h-12 mx-auto mb-3 rounded-full ${localDarkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
                  <Bell className={`w-6 h-6 ${localDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-1">You'll see notifications here when there are updates</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
