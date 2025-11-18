import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, Filter, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { useToast } from '../components/ui/Toast';
import { useTheme } from '../contexts/ThemeContext';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import Logo from '../components/ui/Logo';

interface Notification {
  id: string;
  message: string;
  timestamp?: string | Date;
  created_at?: string;
  read: boolean;
  category: string;
  type: string;
  targetUserId?: string;
  metadata?: any;
  actions?: Array<{ label: string; url?: string; action?: string }>;
}

type FilterType = 'all' | 'unread' | 'read';
type CategoryType = 'all' | 'employee' | 'approval' | 'task' | 'system';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [category, setCategory] = useState<CategoryType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  const navigate = useNavigate();
  const { addToast } = useToast();
  const { darkMode, setDarkMode } = useTheme();

  useEffect(() => {
    const user = authService.getCurrentUserFromStorage();
    if (!user) {
      navigate('/auth');
      return;
    }
    setCurrentUser(user);
    fetchNotifications();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [notifications, filter, category, searchQuery]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      addToast('error', 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    // Apply read/unread filter
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filter === 'read') {
      filtered = filtered.filter(n => n.read);
    }

    // Apply category filter
    if (category !== 'all') {
      filtered = filtered.filter(n => n.category === category);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.message.toLowerCase().includes(query) ||
        n.category.toLowerCase().includes(query) ||
        n.type.toLowerCase().includes(query)
      );
    }

    setFilteredNotifications(filtered);
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read if not already read
      if (!notification.read) {
        await notificationService.markNotificationAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
      }

      // Use the notification service to get the proper URL
      const navigateUrl = notificationService.getNotificationActionUrl(notification as any);

      // Navigate to the URL
      if (navigateUrl) {
        navigate(navigateUrl);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
      addToast('error', 'Failed to process notification');
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      addToast('success', 'Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      addToast('error', 'Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      for (const notification of unreadNotifications) {
        await notificationService.markNotificationAsRead(notification.id);
      }

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      
      addToast('success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      addToast('error', 'Failed to mark all notifications as read');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      // Call API to delete notification
      await notificationService.deleteNotification(notificationId);
      
      // Update local state after successful deletion
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      addToast('success', 'Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      addToast('error', 'Failed to delete notification');
    }
  };

  const handleBulkAction = async (action: 'read' | 'delete') => {
    if (selectedNotifications.size === 0) {
      addToast('error', 'No notifications selected');
      return;
    }

    try {
      if (action === 'read') {
        for (const id of selectedNotifications) {
          await notificationService.markNotificationAsRead(id);
        }
        setNotifications(prev =>
          prev.map(n => selectedNotifications.has(n.id) ? { ...n, read: true } : n)
        );
        addToast('success', `${selectedNotifications.size} notifications marked as read`);
      } else if (action === 'delete') {
        if (!window.confirm(`Are you sure you want to delete ${selectedNotifications.size} notifications?`)) {
          return;
        }
        
        // Call API to delete each notification
        for (const id of selectedNotifications) {
          await notificationService.deleteNotification(id);
        }
        
        // Update local state after successful deletion
        setNotifications(prev => prev.filter(n => !selectedNotifications.has(n.id)));
        addToast('success', `${selectedNotifications.size} notifications deleted`);
      }

      setSelectedNotifications(new Set());
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      addToast('error', `Failed to ${action} notifications`);
    }
  };

  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getNotificationIcon = (category: string, type: string) => {
    // Return appropriate icon based on category/type
    return <Bell className="h-5 w-5" />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'employee':
        return 'bg-blue-100 text-blue-800';
      case 'approval':
        return 'bg-green-100 text-green-800';
      case 'task':
        return 'bg-yellow-100 text-yellow-800';
      case 'system':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Enhanced Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left section */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              
              <Logo className="h-8 w-8" />
              
              <div className="flex items-center gap-2">
                <Bell className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-white bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center space-x-4">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Mark All Read</span>
                </button>
              )}
              
              <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">

        {/* Filters */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-4 mb-6`}>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    darkMode 
                      ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryType)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700 text-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                }`}
              >
                <option value="all">All Categories</option>
                <option value="employee">Employee</option>
                <option value="approval">Approval</option>
                <option value="task">Task</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>

          {/* Bulk actions */}
          {selectedNotifications.size > 0 && (
            <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {selectedNotifications.size} notification(s) selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('read')}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Mark Read
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className={`text-center py-12 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg`}>
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {searchQuery || filter !== 'all' || category !== 'all' 
                ? 'No notifications match your filters' 
                : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg shadow-sm border-l-4 transition-all hover:shadow-md ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                } ${
                  notification.read 
                    ? darkMode ? 'border-gray-600' : 'border-gray-300'
                    : darkMode ? 'border-blue-500 bg-blue-900/10' : 'border-blue-500 bg-blue-50/50'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Selection checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedNotifications.has(notification.id)}
                      onChange={() => toggleNotificationSelection(notification.id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />

                    {/* Notification icon */}
                    <div className={`p-2 rounded-full ${getCategoryColor(notification.category)}`}>
                      {getNotificationIcon(notification.category, notification.type)}
                    </div>

                    {/* Notification content */}
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <p className={darkMode ? 'text-white' : 'text-gray-900'}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(notification.category)}`}>
                            {notification.category}
                          </span>
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(notification.timestamp || notification.created_at || '').toLocaleDateString()} at{' '}
                            {new Date(notification.timestamp || notification.created_at || '').toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        {!notification.read && (
                          <span className={`text-xs font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            New
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}