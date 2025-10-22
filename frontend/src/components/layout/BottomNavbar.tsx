import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Clock,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  User
} from 'lucide-react';
import { Button } from '../ui/Button';
import { authService } from '../../services/authService';

interface BottomNavbarProps {
  darkMode?: boolean;
}

export function BottomNavbar({ darkMode = false }: BottomNavbarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [localDarkMode, setLocalDarkMode] = useState(() => {
    // Load dark mode preference from localStorage
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const profileRef = useRef<HTMLDivElement>(null);
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
    } catch (err) {
      console.error('Error getting current user in BottomNavbar:', err);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: currentUser?.role === 'employee' ? '/employee-dashboard' : '/dashboard', active: location.pathname === (currentUser?.role === 'employee' ? '/employee-dashboard' : '/dashboard') },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks', active: location.pathname === '/tasks' },
    { icon: Clock, label: 'Attendance', path: '/attendance', active: location.pathname === '/attendance' },
    { icon: Calendar, label: 'Leave', path: '/leave', active: location.pathname === '/leave' },
    { icon: BarChart3, label: 'Reports', path: '/reports', active: location.pathname === '/reports' },
  ];

  const handleNavigation = (path: string) => {
    // Handle placeholder functionality for unimplemented features
    switch (path) {
      case '/tasks':
        alert('Tasks page is coming soon! Check the dashboard for task management.');
        return;
      case '/attendance':
        alert('Attendance page is coming soon! Use the check-in/out feature in the dashboard.');
        return;
      case '/leave':
        alert('Leave management is coming soon! Contact your HR department for leave requests.');
        return;
      case '/reports':
        alert('Reports feature is coming soon! Check the admin dashboard for attendance reports.');
        return;
      default:
        navigate(path);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/auth');
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className={`${localDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t fixed bottom-0 left-0 right-0 z-40`}>
        <div className="flex justify-around items-center py-2 px-4">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                item.active
                  ? (localDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600')
                  : (localDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50')
              }`}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}

          {/* Profile Button */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                localDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <User className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Profile</span>
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className={`absolute bottom-full right-0 mb-2 w-48 ${localDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg z-50`}>
                <div className="p-2">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      // Handle settings - for now just close dropdown
                    }}
                    className={`w-full text-left px-3 py-2 rounded ${localDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'} flex items-center`}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      handleLogout();
                    }}
                    className={`w-full text-left px-3 py-2 rounded ${localDarkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-100'} flex items-center`}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
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
