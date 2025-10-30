import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, Filter, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { useToast } from '../components/ui/Toast';

interface Notification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  category: string;
  type: string;
  targetUserId?: string;
  actions?: Array<{ label: string; url: string }>;
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

      // Navigate based on notification type
      let navigateUrl = '/dashboard';

      if (notification.category === 'employee') {
        if (notification.type === 'approval_success' || notification.message.includes('approved') || notification.message.includes('Welcome')) {
          navigateUrl = '/auth';
        } else {
          navigateUrl = `/employee/${notification.targetUserId}`;
        }
      } else if (notification.category === 'approval') {
        navigateUrl = '/dashboard#pending-approvals';
      } else if (notification.category === 'task') {
        navigateUrl = '/tasks';
      } else if (notification.actions && notification.actions.length > 0) {
        const action = notification.actions[0];
        navigateUrl = action.url || '/dashboard';
      }

      navigate(navigateUrl);
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
      // Note: This would need to be implemented in the notification service
      // await notificationService.deleteNotification(notificationId);
      
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Notifications
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-white bg-red-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
              Mark All Read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryType)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
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
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
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
            <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
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
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 transition-all hover:shadow-md ${
                  notification.read 
                    ? 'border-gray-300 dark:border-gray-600' 
                    : 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
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
                      <p className="text-gray-900 dark:text-white">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(notification.category)}`}>
                            {notification.category}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(notification.timestamp).toLocaleDateString()} at{' '}
                            {new Date(notification.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        {!notification.read && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
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