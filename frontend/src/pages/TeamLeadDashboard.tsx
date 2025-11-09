import { useState, useEffect } from 'react';
import { AdminAttendance } from '../components/dashboard/AdminAttendance';
import { AdminTasks } from '../components/dashboard/AdminTasks';
import { NotificationManager } from '../components/notifications/NotificationManager';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import Logo from '../components/ui/Logo';
import { authService } from '../services/authService';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import { useToast } from '../components/ui/Toast';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { DraggableLogo } from '../components/dashboard/DraggableLogo';
import { useTheme } from '../contexts/ThemeContext';
import { Users, CheckSquare } from 'lucide-react';
import api from '../lib/api';
import { useTokenValidation } from '../hooks/useTokenValidation';

export default function TeamLeadDashboard() {
  const { darkMode, setDarkMode } = useTheme();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['teamlead-stats', currentUser?.id],
    queryFn: async () => {
      try {
        console.log('Fetching team lead stats...');
        
        // Fetch team members (employees under this team lead)
        const employeesRes = await api.get('/employees');
        const allEmployees = employeesRes.data.data?.employees || employeesRes.data.data || [];
        const teamMembers = allEmployees.filter((emp: any) => 
          emp.team_lead_id === currentUser?.id || emp.manager_id === currentUser?.id
        );

        // Fetch tasks assigned to team members
        const tasksRes = await api.get('/tasks/all');
        const tasksData = tasksRes.data.data || tasksRes.data || {};
        const allTasks = Array.isArray(tasksData) ? tasksData : (tasksData.tasks || []);
        const teamTasks = allTasks.filter((task: any) => 
          teamMembers.some((member: any) => member.id === task.assigned_to || member.id === task.assignee_id)
        );
        const activeTasks = teamTasks.filter((task: any) => 
          task.status !== 'completed' && task.status !== 'cancelled'
        );
        const completedTasks = teamTasks.filter((task: any) => task.status === 'completed');
        const completionRate = teamTasks.length > 0 
          ? Math.round((completedTasks.length / teamTasks.length) * 100) 
          : 0;

        // Fetch attendance for team members
        const today = new Date().toISOString().split('T')[0];
        const attendanceRes = await api.get('/attendance/my-records');
        const attendance = attendanceRes.data.data || [];
        const presentToday = attendance.filter((record: any) => 
          record.date === today && record.clock_in
        ).length;

        return {
          teamMembers: teamMembers.length,
          activeTasks: activeTasks.length,
          completionRate,
          presentToday
        };
      } catch (error) {
        console.error('Failed to fetch team lead stats:', error);
        return { teamMembers: 0, activeTasks: 0, completionRate: 0, presentToday: 0 };
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
  console.log('Stats loading:', statsLoading, 'Stats data:', stats);

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
        {/* Team Overview Cards */}
        <section className="mb-8">
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-24 rounded-lg animate-pulse ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team Members Card */}
              <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Team Members
                    </p>
                    <p className={`text-3xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {stats?.teamMembers || 0}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900' : 'bg-blue-100'}`}>
                    <Users className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                </div>
              </div>

              {/* Active Tasks Card */}
              <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Active Tasks
                    </p>
                    <p className={`text-3xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {stats?.activeTasks || 0}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-green-900' : 'bg-green-100'}`}>
                    <CheckSquare className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                </div>
              </div>
            </div>
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
    </div>
  );
}
