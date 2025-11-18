import { useState, useEffect } from 'react';
import { AdminAttendance } from '../components/dashboard/AdminAttendance';
import { AdminTasks } from '../components/dashboard/AdminTasks';
import { NotificationManager } from '../components/notifications/NotificationManager';
import { ProfileCompletionModal } from '../components/profile/ProfileCompletionModal';
import { EmployeeOverviewCards } from '../components/dashboard/EmployeeOverviewCards';
import { useProfileCompletion } from '../hooks/useProfileCompletion';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import { taskService } from '../services/taskService';
import Logo from '../components/ui/Logo';
import { authService } from '../services/authService';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import { useToast } from '../components/ui/Toast';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { DraggableLogo } from '../components/dashboard/DraggableLogo';
import { useTheme } from '../contexts/ThemeContext';
import api from '../lib/api';
import { useTokenValidation } from '../hooks/useTokenValidation';

export default function TeamLeadDashboard() {
  const { darkMode, setDarkMode } = useTheme();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { showModal, completionPercentage, closeModal, recheckProfile } = useProfileCompletion();

  const { addToast } = useToast();

  useTokenValidation({
    checkInterval: 2 * 60 * 1000,
    onTokenExpired: () => {
      addToast('warning', 'Your session has expired. Redirecting to login...');
    }
  });

  useEffect(() => {
    try {
      const user = authService.getCurrentUserFromStorage();
      console.log('Current user from localStorage:', user);
      if (user) {
        setCurrentUser(user);
      } else {
        console.log('No user found, this should not happen with ProtectedRoute');
        setError('Authentication error');
      }
    } catch (err) {
      console.error('Error getting current user:', err);
      setError('Failed to load user data');
    }
  }, []);

  // Fetch employee stats (same as Employee dashboard)
  const { data: employeeStats, isLoading: statsLoading } = useQuery({
    queryKey: ['employee-stats', currentUser?._id || currentUser?.id],
    queryFn: async () => {
      const userId = currentUser?._id || currentUser?.id;
      if (!userId) {
        console.log('[TeamLeadDashboard] No user ID available, using fallback data');
        return {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          attendanceDays: 0,
          totalHours: 0
        };
      }

      try {
        console.log('[TeamLeadDashboard] Fetching employee stats for user:', userId);

        const [tasks, attendanceResponse] = await Promise.all([
          taskService.getMyTasks(),
          api.get('/attendance/my-records')
        ]);

        console.log('[TeamLeadDashboard] Tasks received:', tasks);
        console.log('[TeamLeadDashboard] Attendance response:', attendanceResponse.data);

        const attendances = attendanceResponse.data?.data || attendanceResponse.data || [];

        const totalTasks = Array.isArray(tasks) ? tasks.length : 0;
        const completedTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t.status === 'completed').length : 0;
        const pendingTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t.status === 'pending' || t.status === 'in_progress').length : 0;
        const attendanceDays = Array.isArray(attendances) ? attendances.filter((a: any) => a.clock_in).length : 0;
        
        // Calculate total hours from attendance records
        const totalHours = Array.isArray(attendances) 
          ? attendances.reduce((sum: number, record: any) => {
              return sum + (parseFloat(record.hours_worked) || 0);
            }, 0)
          : 0;

        return {
          totalTasks,
          completedTasks,
          pendingTasks,
          attendanceDays,
          totalHours: Math.round(totalHours * 10) / 10 // Round to 1 decimal
        };
      } catch (error) {
        console.error('[TeamLeadDashboard] Failed to fetch employee stats:', error);
        return {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          attendanceDays: 0,
          totalHours: 0
        };
      }
    },
    enabled: !!currentUser,
    retry: 1,
  });

  useEffect(() => {
    if (currentUser) {
      console.log('Initializing push notifications for user:', currentUser.id);
      notificationService.initializePushNotifications().catch(err => {
        console.error('Failed to initialize push notifications:', err);
      });
    }
  }, [currentUser]);

  // Recheck profile completion when user is loaded
  useEffect(() => {
    if (currentUser) {
      console.log('[TeamLeadDashboard] User loaded, rechecking profile completion');
      recheckProfile();
    }
  }, [currentUser, recheckProfile]);

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

  console.log('Rendering TeamLeadDashboard for user:', currentUser.fullName);
  console.log('Stats loading:', statsLoading, 'Stats data:', employeeStats);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Logo className="h-8 w-auto" />
            <div>
              <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Team Lead Dashboard
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Welcome back, {currentUser.fullName}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
            <NotificationBell />
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

        {/* Check-in/Check-out Section */}
        <section className="mb-8">
          <h2 className={`text-2xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Daily Check-in/Out
          </h2>
          <DraggableLogo
            employeeId={currentUser._id || currentUser.id}
            darkMode={darkMode}
            onStatusChange={(status) => {
              console.log('Check-in status changed:', status);
            }}
          />
        </section>

        {/* Team Attendance Management */}
        <section className="mb-8">
          <AdminAttendance darkMode={darkMode} />
        </section>

        {/* Team Task Management */}
        <section>
          <AdminTasks darkMode={darkMode} />
        </section>
      </div>

      {/* Notification Manager */}
      <NotificationManager
        userId={currentUser?.id}
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
