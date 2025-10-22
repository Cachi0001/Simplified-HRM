import React, { useState, useEffect } from 'react';
import { AdminAttendance } from '../components/dashboard/AdminAttendance';
import { AdminTasks } from '../components/dashboard/AdminTasks';
import { AdminDepartments } from '../components/dashboard/AdminDepartments';
import { NotificationManager, triggerNotification, NotificationUtils } from '../components/notifications/NotificationManager';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { notificationService } from '../services/notificationService';
import Logo from '../components/ui/Logo';
import { authService } from '../services/authService';
import { BottomNavbar } from '../components/layout/BottomNavbar';

export default function AdminDashboard() {
  const [darkMode, setDarkMode] = useState(() => {
    // Load dark mode preference from localStorage
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const { addToast } = useToast();

  // Save dark mode preference whenever it changes
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Get current user from localStorage since we're using custom auth
  useEffect(() => {
    try {
      const user = authService.getCurrentUserFromStorage();
      console.log('Current user from localStorage:', user);
      if (user) {
        setCurrentUser(user);
      } else {
        // This shouldn't happen since ProtectedRoute handles auth
        console.log('No user found, this should not happen with ProtectedRoute');
        setError('Authentication error');
      }
    } catch (err) {
      console.error('Error getting current user:', err);
      setError('Failed to load user data');
    }
  }, []);

  // Check if Supabase is properly configured
  useEffect(() => {
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

    const isConfigured = supabaseUrl &&
                        supabaseKey &&
                        !supabaseUrl.includes('your-project') &&
                        !supabaseKey.includes('your_supabase');

    console.log('Supabase configured:', isConfigured, {
      url: supabaseUrl ? 'configured' : 'missing',
      key: supabaseKey ? 'configured' : 'missing'
    });

    setSupabaseConfigured(isConfigured);
  }, []);

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['employee-stats'],
    queryFn: async () => {
      if (!supabaseConfigured) {
        console.log('Supabase not configured, using fallback data');
        return { total: 0, active: 0, pending: 0 };
      }

      try {
        console.log('Fetching employee stats...');
        const { data, error } = await supabase.from('employees').select('status');
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        console.log('Employee stats data:', data);
        const total = data?.length || 0;
        const active = data?.filter(e => e.status === 'active').length || 0;
        const pending = data?.filter(e => e.status === 'pending').length || 0;
        return { total, active, pending };
      } catch (error) {
        console.error('Failed to fetch employee stats:', error);
        // Return fallback data for demo purposes
        return { total: 0, active: 0, pending: 0 };
      }
    },
    enabled: !!currentUser, // Only run query if user is authenticated
    retry: 1,
  });

  // Initialize push notifications on mount
  useEffect(() => {
    if (currentUser) {
      console.log('Initializing push notifications for user:', currentUser.id);
      notificationService.initializePushNotifications().catch(err => {
        console.error('Failed to initialize push notifications:', err);
      });
    }
  }, [currentUser]);

  // Listen for employee signup events (simulate real-time updates)
  useEffect(() => {
    if (!currentUser) return;

    console.log('Dashboard ready for real notifications from Supabase');

    // In real app, notifications would come from Supabase realtime subscriptions
    // For now, no demo notifications as requested

    return () => {};
  }, [currentUser]);

  // If there's an error, show error message
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/auth'}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // If no user is authenticated, don't render the dashboard
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  console.log('Rendering AdminDashboard for user:', currentUser.fullName);
  console.log('Stats loading:', statsLoading, 'Stats error:', statsError, 'Stats data:', stats);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Logo className="h-8 w-auto" />
            <div>
              <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Go3net Admin Dashboard
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Welcome back, {currentUser.fullName}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
            <NotificationBell darkMode={darkMode} />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Supabase Configuration Notice */}
        {!supabaseConfigured && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <div className="text-yellow-600 text-2xl mr-3">⚠️</div>
              <div className="flex-1">
                <h3 className="text-yellow-800 font-semibold">Supabase Not Configured</h3>
                <p className="text-yellow-700 text-sm">
                  Database features are disabled. Please configure your Supabase credentials in the .env file to enable full functionality.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Overview Cards */}
        <section className="mb-8">
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-24 rounded-lg animate-pulse ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
              ))}
            </div>
          ) : (
            <OverviewCards
              total={stats?.total || 0}
              active={stats?.active || 0}
              pending={stats?.pending || 0}
              darkMode={darkMode}
            />
          )}
        </section>

        {/* Pending Approvals */}
        <section className="mb-8">
          <h2 className={`text-2xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Pending Approvals
          </h2>
          <PendingApprovals darkMode={darkMode} />
        </section>

        {/* Attendance Management */}
        <section className="mb-8">
          <AdminAttendance darkMode={darkMode} />
        </section>

        {/* Task Management */}
        <section className="mb-8">
          <AdminTasks darkMode={darkMode} />
        </section>

        {/* Department Management */}
        <section>
          <AdminDepartments darkMode={darkMode} />
        </section>
      </div>

      {/* Notification Manager - handles toast notifications */}
      <NotificationManager
        userId={currentUser?.id}
        darkMode={darkMode}
        position="top-right"
        maxToasts={5}
      />

      {/* Bottom Navigation */}
      <BottomNavbar darkMode={darkMode} />
    </div>
  );
}
