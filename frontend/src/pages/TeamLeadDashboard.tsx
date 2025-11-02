import { useState, useEffect } from 'react';
import { TeamLeadTasks } from '../components/dashboard/TeamLeadTasks';
import { TeamLeadEmployees } from '../components/dashboard/TeamLeadEmployees';
import { TeamLeadOverview } from '../components/dashboard/TeamLeadOverview';
import { NotificationManager, triggerNotification, NotificationUtils } from '../components/notifications/NotificationManager';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import Logo from '../components/ui/Logo';
import { authService } from '../services/authService';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import { useToast } from '../components/ui/Toast';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationBell } from '../components/dashboard/NotificationBell';
import { OverviewCards } from '../components/dashboard/OverviewCards';
import api from '../lib/api';
import { useTokenValidation } from '../hooks/useTokenValidation';

export default function TeamLeadDashboard() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const { addToast } = useToast();

  useTokenValidation({
    checkInterval: 2 * 60 * 1000,
    onTokenExpired: () => {
      addToast('warning', 'Your session has expired. Redirecting to login...');
    }
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    try {
      const user = authService.getCurrentUserFromStorage();
      console.log('Current user from localStorage:', user);
      
      if (user) {
        setCurrentUser(user);
        
        // Verify user has team lead role
        if (user.role !== 'teamlead') {
          setError('Access denied. Team Lead role required.');
          addToast('error', 'Access denied. Team Lead role required.');
          return;
        }
      } else {
        setError('No user found. Please log in.');
        addToast('error', 'Please log in to access the dashboard.');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setError('Failed to load user data.');
      addToast('error', 'Failed to load user data.');
    }
  }, [addToast]);

  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(),
    enabled: !!currentUser,
    refetchInterval: 30000,
  });

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/auth';
  };

  const handleNotificationClick = async (notification: any) => {
    try {
      await notificationService.markAsRead(notification.id);
      refetchNotifications();
      
      if (notification.action_url) {
        window.location.href = notification.action_url;
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
      addToast('error', 'Failed to handle notification');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'tasks', label: 'Task Management', icon: '✅' },
    { id: 'team', label: 'My Team', icon: '👥' },
  ];

  if (error) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Error</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.href = '/auth'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Logo />
              <div>
                <h1 className="text-xl font-semibold">Team Lead Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back, {currentUser?.full_name || currentUser?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
              <NotificationBell 
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                darkMode={darkMode}
              />
              <button
                onClick={handleLogout}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  darkMode 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? darkMode
                      ? 'border-blue-400 text-blue-400'
                      : 'border-blue-500 text-blue-600'
                    : darkMode
                      ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <TeamLeadOverview currentUser={currentUser} darkMode={darkMode} />
            <OverviewCards darkMode={darkMode} />
          </div>
        )}
        
        {activeTab === 'tasks' && (
          <TeamLeadTasks currentUser={currentUser} darkMode={darkMode} />
        )}
        
        {activeTab === 'team' && (
          <TeamLeadEmployees currentUser={currentUser} darkMode={darkMode} />
        )}
      </main>

      <BottomNavbar />
      <NotificationManager />
    </div>
  );
}