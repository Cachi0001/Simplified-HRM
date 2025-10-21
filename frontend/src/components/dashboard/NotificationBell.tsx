import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '../ui/Button';

interface NotificationBellProps {
  darkMode?: boolean;
}

export function NotificationBell({ darkMode = false }: NotificationBellProps) {
  // Mock notifications - in real app, this would come from Supabase realtime
  const notifications = [
    { id: 1, message: 'New employee signup: john.doe@company.com', time: '2 min ago', type: 'signup' },
    { id: 2, message: 'Profile updated by admin', time: '1 hour ago', type: 'update' },
    { id: 3, message: 'New leave request submitted', time: '3 hours ago', type: 'leave' },
  ];

  return (
    <div className="relative">
      <Button
        className={`relative ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
      >
        <Bell className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </Button>

      {/* Simple dropdown - in real app would use popover */}
      {notifications.length > 0 && (
        <div className={`absolute right-0 mt-2 w-80 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg z-50`}>
          <div className="p-4">
            <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Notifications
            </h4>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                >
                  <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    {notification.message}
                  </p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {notification.time}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
