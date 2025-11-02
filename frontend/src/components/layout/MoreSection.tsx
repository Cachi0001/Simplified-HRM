import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  ShoppingCart,
  User,
  Settings,
  LogOut,
  Users,
  BarChart3,
  X,
  ChevronRight,
} from 'lucide-react';
import { authService } from '../../services/authService';



interface MoreSectionProps {
  darkMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  icon: React.ComponentType<{ className: string }>;
  label: string;
  path?: string;
  action?: () => void;
  badge?: number;
  description?: string;
  category: 'requests' | 'management' | 'reports' | 'account';
  roles?: string[];
}

export function MoreSection({ darkMode = false, isOpen, onClose }: MoreSectionProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);


  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Get current user on mount
  useEffect(() => {
    try {
      const user = authService.getCurrentUserFromStorage();
      setCurrentUser(user);
    } catch (err) {
      console.error('Error getting current user in MoreSection:', err);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleLogout = () => {
    authService.logout();
    navigate('/auth');
    onClose();
  };

  const handleNavigation = (item: MenuItem) => {
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
    }
    onClose();
  };

  // Define all menu items with role-based access
  const allMenuItems: MenuItem[] = [
    // Requests Section
    {
      icon: Calendar,
      label: 'Leave Requests',
      path: '/leave-requests',
      description: 'Manage your leave applications',
      category: 'requests'
    },
    {
      icon: ShoppingCart,
      label: 'Purchase Requests',
      path: '/purchase-requests',
      description: 'Submit and track purchase requests',
      category: 'requests'
    },


    // Management Section (Admin/HR only)
    {
      icon: Users,
      label: 'Employee Management',
      path: '/employee-management',
      description: 'Manage employee records and approvals',
      category: 'management',
      roles: ['superadmin', 'admin', 'hr']
    },
    // Keep Performance Metrics but remove other reports
    {
      icon: BarChart3,
      label: 'Performance Metrics',
      path: '/performance-metrics',
      description: 'View employee performance analytics',
      category: 'reports',
      roles: ['superadmin', 'admin', 'hr']
    },

    // Account Section
    {
      icon: User,
      label: 'Profile',
      path: '/settings',
      description: 'Manage your profile',
      category: 'account'
    },
    {
      icon: Settings,
      label: 'Settings',
      path: '/settings',
      description: 'App preferences and settings',
      category: 'account'
    },
    {
      icon: LogOut,
      label: 'Logout',
      action: handleLogout,
      description: 'Sign out of your account',
      category: 'account'
    }
  ];

  // Filter menu items based on user role
  const getFilteredMenuItems = () => {
    if (!currentUser) return [];

    return allMenuItems.filter(item => {
      if (!item.roles) return true; // No role restriction
      return item.roles.includes(currentUser.role);
    });
  };

  // Group menu items by category
  const getGroupedMenuItems = () => {
    const filteredItems = getFilteredMenuItems();
    const grouped: Record<string, MenuItem[]> = {};

    filteredItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });

    return grouped;
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'requests':
        return 'Requests & Notifications';
      case 'management':
        return 'Management';
      case 'reports':
        return 'Reports & Analytics';
      case 'account':
        return 'Account';
      default:
        return category;
    }
  };

  const groupedItems = getGroupedMenuItems();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div
        ref={menuRef}
        className={`w-full max-w-md mx-4 mb-20 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border rounded-t-2xl shadow-2xl max-h-[70vh] overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            More Options
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${
              darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            } transition-colors`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto p-2">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="mb-4">
              <h4 className={`text-xs font-semibold uppercase tracking-wide px-3 py-2 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {getCategoryTitle(category)}
              </h4>
              <div className="space-y-1">
                {items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleNavigation(item)}
                    className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                      location.pathname === item.path
                        ? (darkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-50 text-blue-600')
                        : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')
                    }`}
                  >
                    <div className="relative">
                      <item.icon className="h-5 w-5" />
                      {item.badge && item.badge > 0 && (
                        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white bg-red-600 rounded-full">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.label}</span>
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      </div>
                      {item.description && (
                        <p className={`text-xs mt-0.5 ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between text-xs">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
              {currentUser?.full_name || 'User'}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              currentUser?.role === 'superadmin' 
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                : currentUser?.role === 'admin'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                : currentUser?.role === 'hr'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {currentUser?.role || 'Employee'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}