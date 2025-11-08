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
import { MoreSection } from './MoreSection';

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
  const [isMoreSectionOpen, setIsMoreSectionOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [localDarkMode, setLocalDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const { totalUnreadCount, refreshUnreadCounts } = useChatUnreadCount();
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

  const dashboardPath =
    currentUser?.role === 'employee'
      ? '/employee-dashboard'
      : currentUser?.role === 'hr'
      ? '/hr-dashboard'
      : currentUser?.role === 'teamlead'
      ? '/teamlead-dashboard'
      : currentUser?.role === 'superadmin'
      ? '/super-admin-dashboard'
      : '/dashboard';

  // Main navbar items (5 max)
  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: dashboardPath },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { icon: Calendar, label: 'Purchase', path: '/purchase-requests' },
    { icon: Clock, label: 'Attendance', path: '/attendance-report' },
  ];

  const handleNavigation = (item: NavItem) => {
    navigate(item.path);
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

          {/* More Button - Opens comprehensive more section */}
          <button
            onClick={() => setIsMoreSectionOpen(true)}
            className={`relative flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
              isMoreSectionOpen
                ? (localDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600')
                : (localDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
            }`}
            title="More options"
          >
            <Menu className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-16"></div>

      {/* More Section Modal */}
      <MoreSection
        darkMode={localDarkMode}
        isOpen={isMoreSectionOpen}
        onClose={() => setIsMoreSectionOpen(false)}
      />
    </>
  );
}
