import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { useTheme } from '../contexts/ThemeContext';
import { AdminLeaveRequests } from '../components/dashboard/AdminLeaveRequests';
import { AdminTasks } from '../components/dashboard/AdminTasks';
import { AdminAttendance } from '../components/dashboard/AdminAttendance';
import { AdminDepartments } from '../components/dashboard/AdminDepartments';
import { PendingApprovals } from '../components/dashboard/PendingApprovals';
import { OverviewCards } from '../components/dashboard/OverviewCards';
import { DraggableLogo } from '../components/dashboard/DraggableLogo';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { NotificationManager } from '../components/notifications/NotificationManager';
import { ProfileCompletionModal } from '../components/profile/ProfileCompletionModal';
import { useProfileCompletion } from '../hooks/useProfileCompletion';
import { useToast } from '../components/ui/Toast';
import Logo from '../components/ui/Logo';
import { Users, CheckSquare, Building, Calendar, Clock } from 'lucide-react';
import { useTokenValidation } from '../hooks/useTokenValidation';
import api from '../lib/api';

export default function HRDashboard() {
  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useTheme();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { showModal, completionPercentage, closeModal, recheckProfile } = useProfileCompletion();
  const [activeTab, setActiveTab] = useState('tasks');
  const { addToast } = useToast();

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Get current user
  useEffect(() => {
    try {
      const user = authService.getCurrentUserFromStorage();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user is HR, Admin, or Superadmin
      if (!['hr', 'admin', 'superadmin'].includes(user.role)) {
        navigate('/employee-dashboard');
        return;
      }

      setCurrentUser(user);
    } catch (err) {
      console.error('Error getting current user:', err);
      navigate('/auth');
    }
  }, [navigate]);

  // Add token validation
  useTokenValidation({
    checkInterval: 2 * 60 * 1000,
    onTokenExpired: () => {
      console.log('HR Dashboard token expired, redirecting to login');
    }
  });

  // Profile completion check happens automatically in the hook on mount
  // No need to manually trigger it here

  // Fetch employee stats (same as Admin dashboard)
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['employee-stats'],
    queryFn: async () => {
      try {
        const response = await api.get('/employees/stats');
        const statsData = response.data.data || response.data;
        return {
          total: statsData.total || 0,
          active: statsData.active || 0,
          pending: statsData.pending || 0
        };
      } catch (error) {
        console.error('Failed to fetch employee stats:', error);
        return { total: 0, active: 0, pending: 0 };
      }
    },
    enabled: !!currentUser,
    retry: 1,
  });



  // Initialize push notifications
  useEffect(() => {
    if (currentUser) {
      const userId = currentUser._id || currentUser.id;
      console.log('Initializing push notifications for HR dashboard:', userId);
    }
  }, [currentUser]);



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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Logo className="h-8 w-auto" />
            <div>
              <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                HR Dashboard
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Welcome back, {currentUser.fullName || currentUser.full_name}
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
        {/* Check-in/Check-out Section */}
        <section className="mb-6">
          <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Daily Attendance
            </h2>
            <DraggableLogo
              employeeId={currentUser._id || currentUser.id}
              darkMode={darkMode}
              onStatusChange={(status) => {
                console.log('Check-in status changed:', status);
              }}
            />
          </div>
        </section>

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

        {/* Navigation Tabs */}
        <div className={`rounded-lg shadow-md mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
            {[
              // { id: 'overview', label: 'Overview', icon: Users }, // Removed as requested
              // { id: 'employees', label: 'Employee Management', icon: Users }, // Temporarily disabled
              { id: 'tasks', label: 'Task Management', icon: CheckSquare },
              { id: 'departments', label: 'Departments', icon: Building },
              { id: 'attendance', label: 'Attendance', icon: Calendar },
              { id: 'leaves', label: 'Leave Requests', icon: Clock }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? darkMode
                        ? 'border-blue-400 text-blue-400'
                        : 'border-blue-500 text-blue-600'
                      : darkMode
                        ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Check-in/Check-out Section */}
            <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
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
            </div>



            {/* Quick Stats Grid */}
            {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pending Approvals Card - Temporarily Disabled */}
              {/* <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Pending Approvals
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {(stats as any)?.pendingEmployees || 0}
                    </p>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div> */}

              <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Leave Requests
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {(stats as any)?.pendingLeaves || 0}
                    </p>
                  </div>
                  <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </div>

              <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Active Tasks
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      0
                    </p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                    <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Departments
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      0
                    </p>
                  </div>
                  <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
                    <Building className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Pending Staff Approvals */}
            <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Pending Staff Approvals
              </h3>
              <PendingApprovals darkMode={darkMode} />
            </div>
          </div>
        )}

        {/* {activeTab === 'employees' && <AdminEmployeeManagement darkMode={darkMode} />} */}
        {activeTab === 'tasks' && <AdminTasks darkMode={darkMode} />}
        {activeTab === 'departments' && <AdminDepartments darkMode={darkMode} currentUser={currentUser} />}
        {activeTab === 'attendance' && <AdminAttendance darkMode={darkMode} />}
        {activeTab === 'leaves' && <AdminLeaveRequests darkMode={darkMode} />}
      </div>

      {/* Notification Manager */}
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