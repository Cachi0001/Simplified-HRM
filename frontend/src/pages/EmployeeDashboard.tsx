import React, { useState, useEffect } from 'react';
import { EmployeeOverviewCards } from '../components/dashboard/EmployeeOverviewCards';
import { EmployeeTasks } from '../components/dashboard/EmployeeTasks';
import { DraggableLogo } from '../components/dashboard/DraggableLogo';
import { NotificationBell } from '../components/dashboard/NotificationBell';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationManager } from '../components/notifications/NotificationManager';
import { ProfileCompletionModal } from '../components/profile/ProfileCompletionModal';
import { useProfileCompletion } from '../hooks/useProfileCompletion';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import Logo from '../components/ui/Logo';
import { authService } from '../services/authService';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import api from '../lib/api';
import { taskService } from '../services/taskService';
import { useTokenValidation } from '../hooks/useTokenValidation';

export default function EmployeeDashboard() {
  const [darkMode, setDarkMode] = useState(() => {
    // Load dark mode preference from localStorage
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { showModal, completionPercentage, closeModal } = useProfileCompletion();

  // Save dark mode preference whenever it changes
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Get current user - fetch from backend to ensure fresh approval status
  useEffect(() => {
    const fetchAndValidateUser = async () => {
      try {
        // First check if there's a token
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.log('❌ No access token found, redirecting to login');
          window.location.href = '/auth';
          return;
        }

        // Get stored user from localStorage - but don't trust it for approval status
        const storedUser = authService.getCurrentUserFromStorage();
        
        if (!storedUser) {
          console.log('❌ No stored user found');
          window.location.href = '/auth';
          return;
        }

        // If admin, redirect immediately to admin dashboard
        if (storedUser.role === 'admin') {
          console.log('🔀 Admin user detected, redirecting to admin dashboard');
          window.location.href = '/dashboard';
          return;
        }

        if (storedUser.role !== 'employee') {
          console.log('❌ Invalid user role:', storedUser.role);
          window.location.href = '/auth';
          return;
        }

        // Fetch fresh user data from backend to check current approval status
        console.log('📡 Fetching fresh user data from backend to verify approval status...');
        try {
          const freshUser = await authService.getCurrentUser();
          
          if (!freshUser) {
            throw new Error('No user data received from backend');
          }
          
          console.log('✅ Fresh user data received:', { status: freshUser.status, role: freshUser.role });

          // Update localStorage with fresh data
          localStorage.setItem('user', JSON.stringify(freshUser));

          // Check if user is approved using FRESH data from backend
          if (freshUser.status === 'active') {
            // User is approved ✅
            console.log('✅ User approved, setting as current user');
            setCurrentUser(freshUser);
          } else {
            // User is NOT approved ❌
            console.log('⏳ User status is not active:', freshUser.status);
            setError('Your account is pending approval by an administrator. Please check your email for updates.');
            setTimeout(() => {
              authService.logout();
              window.location.href = '/auth?status=pending';
            }, 3000);
          }
        } catch (backendErr) {
          // Backend call failed - but we have valid token and stored user
          console.error('⚠️ Backend fetch failed:', backendErr);
          
          // If stored user appears to be approved, allow access (last known good state)
          if (storedUser?.status === 'active') {
            console.log('⚠️ Using stored user (backend unavailable but user appears approved)');
            setCurrentUser(storedUser);
          } else {
            // Don't allow unapproved users to proceed without fresh verification
            console.log('❌ Cannot verify approval status - backend unavailable and user not marked approved');
            setError('Unable to verify your approval status. Please check your connection and try again.');
            setTimeout(() => {
              window.location.href = '/auth';
            }, 3000);
          }
        }
      } catch (err) {
        console.error('❌ Error in user validation:', err);
        setError('An error occurred while loading your dashboard. Please try again.');
      }
    };

    fetchAndValidateUser();
  }, []);

  // Add token validation to automatically logout on token expiry
  useTokenValidation({
    checkInterval: 2 * 60 * 1000, // Check every 2 minutes
    onTokenExpired: () => {
      console.log('Employee token expired, redirecting to login');
    }
  });

  const { data: employeeStats, isLoading: statsLoading } = useQuery({
    queryKey: ['employee-stats', currentUser?._id || currentUser?.id],
    queryFn: async () => {
      const userId = currentUser?._id || currentUser?.id;
      if (!userId) {
        console.log('[EmployeeDashboard] No user ID available, using fallback data');
        return {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          attendanceDays: 0,
          totalHours: 0
        };
      }

      try {
        console.log('[EmployeeDashboard] Fetching employee stats for user:', userId);

        const [tasks, attendanceResponse] = await Promise.all([
          taskService.getMyTasks(),
          api.get('/attendance/my-records')
        ]);

        console.log('[EmployeeDashboard] Tasks received:', tasks);
        console.log('[EmployeeDashboard] Attendance response:', attendanceResponse.data);

        const attendances = attendanceResponse.data?.data || attendanceResponse.data || [];

        const totalTasks = Array.isArray(tasks) ? tasks.length : 0;
        const completedTasks = Array.isArray(tasks) ? tasks.filter((t) => t.status === 'completed').length : 0;
        const pendingTasks = Array.isArray(tasks) ? tasks.filter((t) => t.status === 'pending').length : 0;

        const attendanceDays = Array.isArray(attendances) ? attendances.length : 0;
        const totalHours = Array.isArray(attendances) ? attendances.reduce((acc: number, record: any) => {
          if (record.clock_in && record.clock_out) {
            const checkIn = new Date(record.clock_in);
            const checkOut = new Date(record.clock_out);
            const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
            return acc + hours;
          }
          return acc;
        }, 0) : 0;

        const stats = {
          totalTasks,
          completedTasks,
          pendingTasks,
          attendanceDays,
          totalHours: Math.round(totalHours * 10) / 10
        };
        
        console.log('[EmployeeDashboard] Calculated stats:', stats);
        return stats;
      } catch (error) {
        console.error('[EmployeeDashboard] Failed to fetch employee stats:', error);
        return {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          attendanceDays: 0,
          totalHours: 0
        };
      }
    },
    enabled: !!currentUser && !!(currentUser._id || currentUser.id),
    retry: 1,
  });

  // Initialize push notifications on mount
  useEffect(() => {
    if (currentUser) {
      const userId = currentUser._id || currentUser.id;
      console.log('Initializing push notifications for employee:', userId);
      notificationService.initializePushNotifications().catch(err => {
        console.error('Failed to initialize push notifications:', err);
      });
    }
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

  console.log('Rendering EmployeeDashboard for user:', currentUser.fullName);
  console.log('Employee stats:', employeeStats);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Logo className="h-8 w-auto" />
            <div>
              <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Employee Dashboard
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
        {/* Employee Overview Cards */}
        <section className="mb-8">
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-24 rounded-lg animate-pulse ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
              ))}
            </div>
          ) : (
            <EmployeeOverviewCards
              totalTasks={employeeStats?.totalTasks || 0}
              completedTasks={employeeStats?.completedTasks || 0}
              pendingTasks={employeeStats?.pendingTasks || 0}
              attendanceDays={employeeStats?.attendanceDays || 0}
              totalHours={employeeStats?.totalHours || 0}
              darkMode={darkMode}
            />
          )}
        </section>

        {/* Employee Tasks */}
        <section className="mb-8">
          <h2 className={`text-2xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            My Tasks
          </h2>
          <EmployeeTasks employeeId={currentUser._id || currentUser.id} darkMode={darkMode} />
        </section>

        {/* Check-in/Check-out with Draggable Logo */}
        <section>
          <h2 className={`text-2xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Daily Check-in/Out
          </h2>
          <DraggableLogo
            employeeId={currentUser._id || currentUser.id}
            darkMode={darkMode}
            onStatusChange={(status) => {
              // Handle status change if needed
              console.log('Check-in status changed:', status);
            }}
          />
        </section>
      </div>

      {/* Notification Manager - handles toast notifications */}
      <NotificationManager
        userId={currentUser?._id || currentUser?.id}
        darkMode={darkMode}
        position="top-right"
        maxToasts={5}
      />

      {/* Bottom Navigation */}
      <BottomNavbar darkMode={darkMode} />

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        isOpen={showModal}
        onClose={closeModal}
        completionPercentage={completionPercentage}
        userName={currentUser?.fullName || currentUser?.full_name || 'User'}
      />
    </div>
  );
}
