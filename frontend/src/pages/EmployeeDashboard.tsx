import React, { useState, useEffect } from 'react';
import { EmployeeOverviewCards } from '../components/dashboard/EmployeeOverviewCards';
import { EmployeeTasks } from '../components/dashboard/EmployeeTasks';
import { DraggableLogo } from '../components/dashboard/DraggableLogo';
import { NotificationBell } from '../components/dashboard/NotificationBell';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationManager, triggerNotification, NotificationUtils } from '../components/notifications/NotificationManager';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import Logo from '../components/ui/Logo';
import { authService } from '../services/authService';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import api from '../lib/api';

export default function EmployeeDashboard() {
  const [darkMode, setDarkMode] = useState(() => {
    // Load dark mode preference from localStorage
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Save dark mode preference whenever it changes
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Get current user from localStorage since we're using custom auth
  useEffect(() => {
    try {
      const user = authService.getCurrentUserFromStorage();
      console.log('Current employee user from localStorage:', user);
      if (user && user.role === 'employee') {
        setCurrentUser(user);
      } else if (user && user.role === 'admin') {
        // Redirect admin to admin dashboard
        window.location.href = '/dashboard';
      } else {
        // No valid user, redirect to login
        console.log('No valid employee user found, redirecting to login');
        window.location.href = '/auth';
      }
    } catch (err) {
      console.error('Error getting current user:', err);
      setError('Failed to load user data');
    }
  }, []);

  const { data: employeeStats, isLoading: statsLoading } = useQuery({
    queryKey: ['employee-stats', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) {
        console.log('No user, using fallback data');
        return {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          attendanceDays: 0,
          totalHours: 0
        };
      }

      try {
        console.log('Fetching employee stats for user:', currentUser.id);

        // Get tasks assigned to this employee
        const [tasksResponse, attendanceResponse] = await Promise.all([
          api.get(`/tasks?assigneeId=${currentUser.id}`),
          api.get(`/attendance/employee/${currentUser.id}`)
        ]);

        const tasks = tasksResponse.data.tasks || [];
        const attendance = attendanceResponse.data.attendances || [];

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
        const pendingTasks = tasks.filter((t: any) => t.status === 'pending').length;

        const attendanceDays = attendance.length;
        const totalHours = attendance.reduce((acc: number, record: any) => {
          if (record.checkInTime && record.checkOutTime) {
            const checkIn = new Date(record.checkInTime);
            const checkOut = new Date(record.checkOutTime);
            const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
            return acc + hours;
          }
          return acc;
        }, 0);

        return {
          totalTasks,
          completedTasks,
          pendingTasks,
          attendanceDays,
          totalHours: Math.round(totalHours * 10) / 10
        };
      } catch (error) {
        console.error('Failed to fetch employee stats:', error);
        return {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          attendanceDays: 0,
          totalHours: 0
        };
      }
    },
    enabled: !!currentUser && !!currentUser.id,
    retry: 1,
  });

  // Initialize push notifications on mount
  useEffect(() => {
    if (currentUser) {
      console.log('Initializing push notifications for employee:', currentUser.id);
      notificationService.initializePushNotifications().catch(err => {
        console.error('Failed to initialize push notifications:', err);
      });
    }
  }, [currentUser]);

  // Listen for task assignments (simulate real-time updates)
  useEffect(() => {
    if (!currentUser) return;

    console.log('Setting up task notifications for employee:', currentUser.id);

    // Simulate receiving task assignment notification
    const taskNotification = NotificationUtils.taskAssigned('Complete monthly report', currentUser.id);

    // Show task notification after a delay
    const timer = setTimeout(() => {
      console.log('Triggering task notification:', taskNotification);
      triggerNotification(taskNotification);
    }, 3000);

    return () => clearTimeout(timer);
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
          <EmployeeTasks employeeId={currentUser.id} darkMode={darkMode} />
        </section>

        {/* Check-in/Check-out with Draggable Logo */}
        <section>
          <h2 className={`text-2xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Daily Check-in/Out
          </h2>
          <DraggableLogo
            employeeId={currentUser.id}
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
