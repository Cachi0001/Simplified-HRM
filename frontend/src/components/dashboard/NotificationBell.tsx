import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '../ui/Button';

interface NotificationBellProps {
  darkMode?: boolean;
}

export function NotificationBell({ darkMode = false }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  // In real app, notifications would come from Supabase realtime or API
  const notifications = [
    { id: 1, message: 'New employee signup: john.doe@company.com', time: '2 min ago', type: 'signup' }
  ];

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
      >
        <Bell className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </Button>

      {/* Interactive dropdown - in real app would use popover component */}
      {isOpen && notifications.length > 0 && (
        <div className={`absolute right-0 mt-2 w-80 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg z-50`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Notifications
              </h4>
              <button
                onClick={() => setIsOpen(false)}
                className={`text-sm ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
              >
                ×
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded cursor-pointer hover:opacity-80 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                  onClick={() => {
                    // Handle notification click
                    setIsOpen(false);
                  }}
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
