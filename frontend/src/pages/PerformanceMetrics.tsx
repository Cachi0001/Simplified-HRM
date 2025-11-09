import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { NotificationManager } from '../components/notifications/NotificationManager';
import Logo from '../components/ui/Logo';
import { TrendingUp, Users, Clock, Target, BarChart3, Calendar } from 'lucide-react';
import { useTokenValidation } from '../hooks/useTokenValidation';

interface PerformanceMetric {
  id: string;
  user_id: string;
  metric_type: string;
  score: number;
  calculation_date: string;
  details: any;
  created_at: string;
  employee_name?: string;
  department?: string;
}

export default function PerformanceMetrics() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMetricType, setSelectedMetricType] = useState('all');

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

      // Check if user has access to performance metrics
      if (!['superadmin', 'admin', 'hr'].includes(user.role)) {
        navigate('/employee-dashboard');
        return;
      }

      setCurrentUser(user);
    } catch (err) {
      console.error('Error getting current user:', err);
      navigate('/auth');
    }
  }, [navigate]);

  // Load performance metrics when filters change
  useEffect(() => {
    if (currentUser) {
      loadPerformanceMetrics();
    }
  }, [currentUser, selectedPeriod, selectedMetricType]);

  // Add token validation
  useTokenValidation({
    checkInterval: 2 * 60 * 1000,
    onTokenExpired: () => {
      console.log('Performance metrics token expired, redirecting to login');
    }
  });

  const loadPerformanceMetrics = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch('/api/performance-metrics', {
      //   headers: { Authorization: `Bearer ${authService.getToken()}` }
      // });
      // const data = await response.json();
      
      // Mock data based on actual performance calculation system
      const mockData: PerformanceMetric[] = [
        {
          id: '1',
          user_id: 'user1',
          metric_type: 'overall',
          score: 87.5,
          calculation_date: '2025-11-01',
          details: { 
            attendance: 95.5, 
            taskCompletion: 88.2, 
            punctuality: 92.0, 
            productivity: 75.0,
            totalWorkDays: 23,
            presentDays: 22,
            completedTasks: 15,
            totalTasks: 17
          },
          created_at: '2025-11-01T00:00:00Z',
          employee_name: 'John Doe',
          department: 'Engineering'
        },
        {
          id: '2',
          user_id: 'user2',
          metric_type: 'overall',
          score: 82.3,
          calculation_date: '2025-11-01',
          details: { 
            attendance: 89.1, 
            taskCompletion: 85.5, 
            punctuality: 78.0, 
            productivity: 76.5,
            totalWorkDays: 23,
            presentDays: 20,
            completedTasks: 12,
            totalTasks: 14
          },
          created_at: '2025-11-01T00:00:00Z',
          employee_name: 'Jane Smith',
          department: 'Marketing'
        },
        {
          id: '3',
          user_id: 'user3',
          metric_type: 'attendance',
          score: 95.5,
          calculation_date: '2025-11-01',
          details: { days_present: 22, total_days: 23, attendanceRate: 95.5 },
          created_at: '2025-11-01T00:00:00Z',
          employee_name: 'John Doe',
          department: 'Engineering'
        },
        {
          id: '4',
          user_id: 'user2',
          metric_type: 'task_completion',
          score: 85.5,
          calculation_date: '2025-11-01',
          details: { completed_tasks: 12, total_tasks: 14, completionRate: 85.5 },
          created_at: '2025-11-01T00:00:00Z',
          employee_name: 'Jane Smith',
          department: 'Marketing'
        },
        {
          id: '5',
          user_id: 'user1',
          metric_type: 'punctuality',
          score: 92.0,
          calculation_date: '2025-11-01',
          details: { onTimeDays: 21, totalDays: 23, punctualityRate: 92.0 },
          created_at: '2025-11-01T00:00:00Z',
          employee_name: 'John Doe',
          department: 'Engineering'
        },
        {
          id: '6',
          user_id: 'user2',
          metric_type: 'productivity',
          score: 76.5,
          calculation_date: '2025-11-01',
          details: { productivityScore: 76.5, averageTaskTime: 4.2 },
          created_at: '2025-11-01T00:00:00Z',
          employee_name: 'Jane Smith',
          department: 'Marketing'
        }
      ];
      
      setMetrics(mockData);
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize push notifications
  useEffect(() => {
    if (currentUser) {
      const userId = currentUser._id || currentUser.id;
      console.log('Initializing push notifications for performance metrics:', userId);
    }
  }, [currentUser]);

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'overall':
        return <BarChart3 className="w-5 h-5" />;
      case 'attendance':
        return <Clock className="w-5 h-5" />;
      case 'task_completion':
        return <Target className="w-5 h-5" />;
      case 'punctuality':
        return <Calendar className="w-5 h-5" />;
      case 'productivity':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <BarChart3 className="w-5 h-5" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 dark:bg-green-900';
    if (score >= 75) return 'bg-yellow-100 dark:bg-yellow-900';
    return 'bg-red-100 dark:bg-red-900';
  };

  const filteredMetrics = metrics.filter(metric => 
    selectedMetricType === 'all' || metric.metric_type === selectedMetricType
  );

  const averageScore = filteredMetrics.length > 0 
    ? filteredMetrics.reduce((sum, metric) => sum + metric.score, 0) / filteredMetrics.length 
    : 0;

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
                Performance Metrics
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
        {/* Filters */}
        <div className={`rounded-lg shadow-md p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Time Period
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className={`px-3 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Metric Type
              </label>
              <select
                value={selectedMetricType}
                onChange={(e) => setSelectedMetricType(e.target.value)}
                className={`px-3 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">All Metrics</option>
                <option value="overall">Overall Performance</option>
                <option value="attendance">Attendance</option>
                <option value="task_completion">Task Completion</option>
                <option value="punctuality">Punctuality</option>
                <option value="productivity">Productivity</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Average Score
                </p>
                <p className={`text-3xl font-bold mt-2 ${getScoreColor(averageScore)}`}>
                  {averageScore.toFixed(1)}%
                </p>
              </div>
              <div className={`p-3 rounded-lg ${getScoreBgColor(averageScore)}`}>
                <TrendingUp className={`w-6 h-6 ${getScoreColor(averageScore)}`} />
              </div>
            </div>
          </div>

          <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Employees
                </p>
                <p className={`text-3xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {filteredMetrics.length}
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
                  High Performers
                </p>
                <p className={`text-3xl font-bold mt-2 text-green-600 dark:text-green-400`}>
                  {filteredMetrics.filter(m => m.score >= 90).length}
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className={`rounded-lg shadow-md p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Last Updated
                </p>
                <p className={`text-sm font-bold mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {new Date().toLocaleDateString()}
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics Table */}
        <div className={`rounded-lg shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Employee Performance Metrics
            </h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 border-4 border-t-blue-500 border-gray-300 rounded-full animate-spin" />
              <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading metrics...</p>
            </div>
          ) : filteredMetrics.length === 0 ? (
            <div className="p-8 text-center">
              <BarChart3 className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No performance metrics found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Employee
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Department
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Metric Type
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Score
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Date
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredMetrics.map((metric) => (
                    <tr key={metric.id} className={`hover:${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {metric.employee_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {metric.department}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getMetricIcon(metric.metric_type)}
                          <span className={`text-sm capitalize ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {metric.metric_type.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${getScoreColor(metric.score)}`}>
                          {metric.score.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {new Date(metric.calculation_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {JSON.stringify(metric.details)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
    </div>
  );
}