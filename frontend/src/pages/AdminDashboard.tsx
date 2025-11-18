import { useState, useEffect } from 'react';
import { AdminAttendance } from '../components/dashboard/AdminAttendance';
import { AdminTasks } from '../components/dashboard/AdminTasks';
import { AdminDepartments } from '../components/dashboard/AdminDepartments';
// import { AdminEmployeeManagement } from '../components/dashboard/AdminEmployeeManagement'; // Temporarily disabled
import { AdminLeaveRequests } from '../components/dashboard/AdminLeaveRequests';
import { NotificationManager } from '../components/notifications/NotificationManager';
import { DraggableLogo } from '../components/dashboard/DraggableLogo';
import { BulkLeaveReset } from '../components/leave/BulkLeaveReset';
import { CreateTaskModal, TaskFormData } from '../components/tasks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import { employeeService } from '../services/employeeService';
import { taskService } from '../services/taskService';
import Logo from '../components/ui/Logo';
import { authService } from '../services/authService';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import { useToast } from '../components/ui/Toast';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { OverviewCards } from '../components/dashboard/OverviewCards';
import { PendingApprovals } from '../components/dashboard/PendingApprovals';
import { useTheme } from '../contexts/ThemeContext';
import api from '../lib/api';
import { useTokenValidation } from '../hooks/useTokenValidation';

export default function AdminDashboard() {
  const { darkMode, setDarkMode } = useTheme();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Add token validation to automatically logout on token expiry
  useTokenValidation({
    checkInterval: 2 * 60 * 1000, // Check every 2 minutes
    onTokenExpired: () => {
      addToast('warning', 'Your session has expired. Redirecting to login...');
    }
  });

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

  // Fetch all employees for filtering
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees');
      const allEmployees = response.data.data.employees || [];

      // Filter out admin users for display purposes
      const nonAdminEmployees = allEmployees.filter((emp: any) => emp.role !== 'admin');

      return nonAdminEmployees;
    },
  });

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['employee-stats'],
    queryFn: async () => {
      try {
        console.log('Fetching employee stats...');
        const response = await api.get('/employees/stats');
        console.log('Employee stats response:', response.data);

        // Backend returns { success: true, data: { total, active, pending, ... } }
        const statsData = response.data.data || response.data;
        return {
          total: statsData.total || 0,
          active: statsData.active || 0,
          pending: statsData.pending || 0
        };
      } catch (error) {
        console.error('Failed to fetch employee stats:', error);
        // Return fallback data for demo purposes
        return { total: 0, active: 0, pending: 0 };
      }
    },
    enabled: !!currentUser, // Only run query if user is authenticated
    retry: 1,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: TaskFormData) => {
      return await taskService.createTask({
        ...taskData,
        dueDate: new Date(taskData.dueDate).toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      addToast('success', 'Task created successfully');
      setShowCreateTaskModal(false);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to create task';
      addToast('error', errorMessage);
    },
  });

  const handleCreateTask = (taskData: TaskFormData) => {
    createTaskMutation.mutate(taskData);
  };

  // Initialize push notifications on mount
  useEffect(() => {
    if (currentUser) {
      console.log('Initializing push notifications for user:', currentUser.id);
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
            <NotificationBell />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
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

        {/* Pending Approvals */}
        <section className="mb-8">
          <h2 className={`text-2xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Pending Staff Approvals
          </h2>
          <PendingApprovals darkMode={darkMode} />
        </section>

        {/* Leave Management */}
        <section className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <AdminLeaveRequests darkMode={darkMode} />
            </div>
            <div>
              <BulkLeaveReset darkMode={darkMode} />
            </div>
          </div>
        </section>

        {/* Employee Role Management - Temporarily Disabled */}
        {/* <section className="mb-8">
          <AdminEmployeeManagement darkMode={darkMode} />
        </section> */}

        {/* Attendance Management */}
        <section className="mb-8">
          <AdminAttendance darkMode={darkMode} />
        </section>

        {/* Task Management */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Task Management
            </h2>
            <button
              onClick={() => setShowCreateTaskModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              Create Task
            </button>
          </div>
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

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        onSubmit={handleCreateTask}
        employees={employees}
        currentUser={currentUser}
        darkMode={darkMode}
        isSubmitting={createTaskMutation.isPending}
      />
    </div>
  );
}
