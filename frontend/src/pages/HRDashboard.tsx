import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementService } from '../services/announcementService';
import { authService } from '../services/authService';
import { AdminLeaveRequests } from '../components/dashboard/AdminLeaveRequests';
import { AdminEmployeeManagement } from '../components/dashboard/AdminEmployeeManagement';
import { AdminTasks } from '../components/dashboard/AdminTasks';
import { AdminAttendance } from '../components/dashboard/AdminAttendance';
import { AdminDepartments } from '../components/dashboard/AdminDepartments';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationBell } from '../components/dashboard/NotificationBell';
import { NotificationManager } from '../components/notifications/NotificationManager';
import Logo from '../components/ui/Logo';
import { Clock, Users, FileText, CheckSquare, Building, Calendar, AlertCircle, TrendingUp, MessageSquare, Plus } from 'lucide-react';
import { useTokenValidation } from '../hooks/useTokenValidation';
import AnnouncementList from '../components/announcements/AnnouncementList';
import { AnnouncementManager } from '../components/announcements/AnnouncementManager';
import api from '../lib/api';

export default function HRDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState('30');
  const [showAnnouncementManager, setShowAnnouncementManager] = useState(false);

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

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats', selectedTimeRange],
    queryFn: async () => {
      const response = await api.get(`/dashboard/stats?timeRange=${selectedTimeRange}`);
      return response.data.data;
    },
    enabled: !!currentUser,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch announcements
  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ['dashboard-announcements'],
    queryFn: async () => {
      const response = await api.get('/announcements?limit=5');
      return response.data.data?.announcements || [];
    },
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    cacheTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: 2,
  });

  // Initialize push notifications
  useEffect(() => {
    if (currentUser) {
      const userId = currentUser._id || currentUser.id;
      console.log('Initializing push notifications for HR dashboard:', userId);
    }
  }, [currentUser]);

  const handleCreateAnnouncement = () => {
    setShowAnnouncementManager(true);
  };

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
            <NotificationBell darkMode={darkMode} />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Time Range Selector */}
        <div className="mb-6">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className={`px-3 py-2 rounded-md border ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        {/* Loading State */}
        {statsLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading dashboard data...</span>
          </div>
        )}

        {/* Error State */}
        {statsError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Failed to load dashboard</h3>
                <p className="text-sm text-red-700 mt-1">Please try refreshing the page</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total Employees
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stats.totalEmployees || 0}
                  </p>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stats.activeEmployees || 0} active
                  </p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Leave Requests
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stats.pendingLeaves || 0}
                  </p>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stats.totalLeaves || 0} total
                  </p>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>

            <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Purchase Requests
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stats.pendingPurchases || 0}
                  </p>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stats.totalPurchases || 0} total
                  </p>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
                  <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Departments
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stats.totalDepartments || 0}
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                  <Building className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className={`rounded-lg shadow-md mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
            {[
              { id: 'overview', label: 'Overview', icon: Users },
              { id: 'employees', label: 'Employee Management', icon: Users },
              { id: 'tasks', label: 'Task Management', icon: CheckSquare },
              { id: 'departments', label: 'Departments', icon: Building },
              { id: 'attendance', label: 'Attendance', icon: Calendar },
              { id: 'leaves', label: 'Leave Requests', icon: Clock },
              { id: 'announcements', label: 'Announcements', icon: FileText }
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
            {/* Welcome Section with Announcements */}
            <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Welcome to HR Dashboard
                  </h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Check out the latest announcements and manage your HR tasks
                  </p>
                </div>
              </div>
              
              {/* Recent Announcements */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Recent Announcements
                    </h3>
                    <button
                      onClick={handleCreateAnnouncement}
                      className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create
                    </button>
                  </div>
                  {announcementsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : announcements && announcements.length > 0 ? (
                    <div className="space-y-3">
                      {announcements.slice(0, 3).map((announcement: any) => (
                        <div key={announcement.id} className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                          <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {announcement.title}
                          </h4>
                          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            By {announcement.author_name} • {new Date(announcement.created_at).toLocaleDateString()}
                          </p>
                          <p className={`text-sm mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {announcement.content.substring(0, 100)}...
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No announcements yet</p>
                    </div>
                  )}
                </div>

                {/* Recent Activities */}
                <div>
                  <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Recent Activities
                  </h3>
                  {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                    <div className="space-y-3">
                      {stats.recentActivities.slice(0, 5).map((activity: any) => (
                        <div key={activity.id} className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {activity.title}
                              </h4>
                              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {activity.description}
                              </p>
                              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                {new Date(activity.timestamp).toLocaleString()}
                              </p>
                            </div>
                            {activity.status && (
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                activity.status === 'approved' ? 'bg-green-100 text-green-800' :
                                activity.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {activity.status}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No recent activities</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Pending Approvals
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {stats.pendingEmployees || 0}
                    </p>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Leave Requests
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {stats.pendingLeaves || 0}
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
          </div>
        )}

        {activeTab === 'employees' && <AdminEmployeeManagement darkMode={darkMode} />}
        {activeTab === 'tasks' && <AdminTasks darkMode={darkMode} />}
        {activeTab === 'departments' && <AdminDepartments darkMode={darkMode} currentUser={currentUser} />}
        {activeTab === 'attendance' && <AdminAttendance darkMode={darkMode} />}
        {activeTab === 'leaves' && <AdminLeaveRequests darkMode={darkMode} />}
        {activeTab === 'announcements' && (
          <div className={`rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <AnnouncementList
              announcements={announcements || []}
              loading={announcementsLoading}
              darkMode={darkMode}
              canCreate={true}
              onCreateNew={() => setShowAnnouncementManager(true)}
              onReaction={async (announcementId, reactionType) => {
                try {
                  await announcementService.addReaction(announcementId, reactionType);
                  // Refresh announcements
                  queryClient.invalidateQueries({ queryKey: ['dashboard-announcements'] });
                } catch (error) {
                  console.error('Failed to add reaction:', error);
                }
              }}
              onMarkAsRead={async (announcementId) => {
                try {
                  await announcementService.markAsRead(announcementId);
                  // Refresh announcements
                  queryClient.invalidateQueries({ queryKey: ['dashboard-announcements'] });
                } catch (error) {
                  console.error('Failed to mark as read:', error);
                }
              }}
              onRefresh={() => {
                queryClient.invalidateQueries({ queryKey: ['dashboard-announcements'] });
              }}
            />
          </div>
        )}
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

      {/* Announcement Manager Modal */}
      {showAnnouncementManager && (
        <AnnouncementManager
          onClose={() => setShowAnnouncementManager(false)}
        />
      )}
    </div>
  );
}