import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '@/services/notificationService';
import { Go3netNotification } from '@/types/notification';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Go3netNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Get dark mode from localStorage
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Listen for dark mode changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('darkMode');
      setDarkMode(saved ? JSON.parse(saved) : false);
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom dark mode toggle event
    window.addEventListener('darkModeToggle', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('darkModeToggle', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      loadNotifications();
      loadUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const playNotificationSound = () => {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications(undefined, 50, 0, false);
      const previousCount = notifications.length;
      setNotifications(data);
      
      // Play sound if new notifications arrived
      if (data.length > previousCount && data.some(n => !n.read)) {
        playNotificationSound();
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleNotificationClick = async (notification: Go3netNotification) => {
    console.log('🔔 Notification clicked:', {
      id: notification.id,
      type: notification.type,
      category: notification.category,
      metadata: notification.metadata,
      full: notification
    });

    // Mark as read
    if (!notification.read) {
      await notificationService.markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate to the appropriate page
    const url = notificationService.getNotificationActionUrl(notification);
    const highlightId = notificationService.getHighlightId(notification);

    console.log('🎯 Navigation details:', {
      url,
      highlightId,
      action_url: notification.metadata?.action_url,
      highlight_id: notification.metadata?.highlight_id
    });

    if (url) {
      // Store highlight ID in session storage for the target page to use
      if (highlightId) {
        sessionStorage.setItem('highlight_id', highlightId);
        sessionStorage.setItem('highlight_type', notification.category);
        console.log('✅ Stored highlight_id:', highlightId, 'for category:', notification.category);
      } else {
        console.warn('⚠️ No highlight_id found in notification metadata:', notification.metadata);
      }
      
      console.log('🚀 Navigating to:', url);
      navigate(url);
    } else {
      console.error('❌ No URL to navigate to!');
    }

    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    setIsLoading(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      loadUnreadCount();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
      case 'approval_success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'task':
        return '📋';
      case 'approval':
        return '👤';
      case 'update':
        return '🔄';
      default:
        return 'ℹ️';
    }
  };

  const getPriorityColor = (priority: string) => {
    if (darkMode) {
      switch (priority) {
        case 'urgent':
          return 'border-l-red-500 bg-red-900/20';
        case 'high':
          return 'border-l-orange-500 bg-orange-900/20';
        case 'normal':
          return 'border-l-blue-500 bg-blue-900/20';
        case 'low':
          return 'border-l-gray-500 bg-gray-800/20';
        default:
          return 'border-l-blue-500 bg-blue-900/20';
      }
    } else {
      switch (priority) {
        case 'urgent':
          return 'border-l-red-600 bg-red-100';
        case 'high':
          return 'border-l-orange-600 bg-orange-100';
        case 'normal':
          return 'border-l-blue-600 bg-blue-100';
        case 'low':
          return 'border-l-gray-600 bg-gray-100';
        default:
          return 'border-l-blue-600 bg-blue-100';
      }
    }
  };

  const formatTimestamp = (timestamp: string | Date | undefined) => {
    if (!timestamp) return '';
    
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-colors ${
          darkMode 
            ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-md rounded-lg shadow-xl border z-50 max-h-[600px] flex flex-col ${
          darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isLoading}
                  className={`text-xs flex items-center gap-1 disabled:opacity-50 px-2 py-1 rounded transition-colors ${
                    darkMode
                      ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/30'
                      : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                  }`}
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className={`transition-colors ${
                darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Bell className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                <p>No notifications</p>
              </div>
            ) : (
              <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-colors border-l-4 ${
                      !notification.read 
                        ? getPriorityColor(notification.priority) 
                        : darkMode 
                          ? 'border-l-transparent bg-gray-800/50 hover:bg-gray-700/50' 
                          : 'border-l-transparent bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm font-medium ${
                            !notification.read 
                              ? darkMode ? 'text-white' : 'text-gray-900'
                              : darkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${
                          !notification.read 
                            ? darkMode ? 'text-gray-300' : 'text-gray-700'
                            : darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {formatTimestamp(notification.created_at || notification.timestamp)}
                          </span>
                          <button
                            onClick={(e) => handleDeleteNotification(notification.id, e)}
                            className={`transition-colors ${
                              darkMode 
                                ? 'text-gray-500 hover:text-red-400' 
                                : 'text-gray-400 hover:text-red-600'
                            }`}
                            title="Delete notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className={`p-3 border-t text-center ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <button
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className={`text-sm font-medium ${
                  darkMode 
                    ? 'text-blue-400 hover:text-blue-300' 
                    : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
