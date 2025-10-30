import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Clock,
  Calendar,
  ShoppingCart,
  Menu,
  Settings,
  LogOut,
  User,
  MessageCircle,
  X
} from 'lucide-react';
import { authService } from '../../services/authService';
import { useChatUnreadCount } from '../../hooks/useChatUnreadCount';

interface BottomNavbarProps {
  darkMode?: boolean;
}

interface NavItem {
  icon: React.ComponentType<{ className: string }>;
  label: string;
  path: string;
  showBadge?: boolean;
  action?: () => void;
}

export function BottomNavbar({ darkMode = false }: BottomNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [localDarkMode, setLocalDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const { totalUnreadCount, refreshUnreadCounts } = useChatUnreadCount();
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Update local dark mode when prop changes
  useEffect(() => {
    setLocalDarkMode(darkMode);
  }, [darkMode]);

  // Get current user on mount
  useEffect(() => {
    try {
      const user = authService.getCurrentUserFromStorage();
      setCurrentUser(user);
      refreshUnreadCounts();
    } catch (err) {
      console.error('Error getting current user in BottomNavbar:', err);
    }
  }, [refreshUnreadCounts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const dashboardPath =
    currentUser?.role === 'employee'
      ? '/employee-dashboard'
      : currentUser?.role === 'hr'
      ? '/hr-dashboard'
      : '/dashboard';

  // Main navbar items (5 max)
  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: dashboardPath },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { icon: Clock, label: 'Attendance', path: '/attendance-report' },
    { icon: Calendar, label: 'Leave', path: '/leave-requests' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/auth');
  };

  // Hidden menu items (shown in hamburger dropdown)
  const menuItems: NavItem[] = [
    { icon: ShoppingCart, label: 'Purchases', path: '/purchase-requests' },
    { icon: User, label: 'Profile', path: '/settings' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: LogOut, label: 'Logout', path: '/auth', action: handleLogout },
  ];

  const handleNavigation = (item: NavItem) => {
    if (item.action) {
      item.action();
    } else {
      navigate(item.path);
    }
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className={`${localDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t fixed bottom-0 left-0 right-0 z-40`}>
        <div className="flex justify-around items-center py-2 px-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item)}
                className={`relative flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                  isActive
                    ? (localDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600')
                    : (localDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
                }`}
              >
                <item.icon className="h-5 w-5 mb-1" />
                <span className="sr-only">{item.label}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}

          {/* Hamburger Menu - Shows hidden navigation items */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`relative flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                isMenuOpen
                  ? (localDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600')
                  : (localDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
              }`}
              title="More options"
            >
              <Menu className="h-5 w-5 mb-1" />
              {totalUnreadCount > 0 && (
                <span className="absolute -top-1.5 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white bg-red-600 rounded-full animate-pulse">
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </span>
              )}
              <span className="text-xs font-medium">More</span>
            </button>

            {/* Hamburger Menu Dropdown */}
            {isMenuOpen && (
              <div className={`absolute bottom-full right-0 mb-2 w-48 ${localDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg z-50`}>
                <div className="p-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleNavigation(item)}
                      className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                        location.pathname === item.path
                          ? (localDarkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-50 text-blue-600')
                          : (localDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <div className="flex-1 flex items-center justify-between">
                        <span>{item.label}</span>
                        {item.showBadge && totalUnreadCount > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold text-white bg-red-600 rounded-full">
                            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-16"></div>
    </>
  );
}
