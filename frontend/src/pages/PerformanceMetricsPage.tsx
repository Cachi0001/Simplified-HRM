import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { performanceService } from '../services/performanceService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  ArrowLeft, 
  TrendingUp, 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Award
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/ui/Logo';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import { useTokenValidation } from '../hooks/useTokenValidation';
import { useTheme } from '../contexts/ThemeContext';

export default function PerformanceMetricsPage() {
  const { darkMode, setDarkMode } = useTheme();
  
  // Default to last 30 days
  const getDefaultDates = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    return {
      start: thirtyDaysAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  };
  
  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState<string>(defaultDates.start);
  const [endDate, setEndDate] = useState<string>(defaultDates.end);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = ['admin', 'hr', 'superadmin', 'teamlead'].includes(currentUser.role);

  useTokenValidation({
    checkInterval: 2 * 60 * 1000,
    onTokenExpired: () => {
      console.log('Performance metrics token expired, redirecting to login');
    }
  });

  // Fetch performance metrics
  const { data: metrics, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['performance-metrics', startDate || 'none', endDate || 'none'],
    queryFn: async () => {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      if (isAdmin) {
        return await performanceService.getAllPerformance(start, end);
      } else {
        const myMetrics = await performanceService.getMyPerformance(start, end);
        return [myMetrics];
      }
    },
    enabled: true,
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return darkMode ? 'text-green-400' : 'text-green-600';
    if (score >= 75) return darkMode ? 'text-blue-400' : 'text-blue-600';
    if (score >= 60) return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    return darkMode ? 'text-red-400' : 'text-red-600';
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 90) return darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700';
    if (score >= 75) return darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700';
    if (score >= 60) return darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-700';
    return darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700';
  };

  const getPerformanceLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  const formatLateTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Logo className="h-8 w-auto" />
            <div>
              <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Performance Metrics
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Real-time performance tracking and analytics
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
        {/* Filters */}
        <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'} mb-6`}>
          <div className="p-6">
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Period Selection
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Start Date
                </label>
                <Input
                  id="startDate"
                  label=""
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  End Date
                </label>
                <Input
                  id="endDate"
                  label=""
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button onClick={() => refetch()} className="w-full" isLoading={isFetching}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <p>📊 Metrics calculated based on individual working days (excluding Friday remote work)</p>
              <p className="mt-1">⏰ Default period: Last 30 days</p>
            </div>
          </div>
        </Card>

        {/* Performance Cards */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className={`p-6 h-64 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded animate-pulse`} />
                </Card>
              ))}
            </div>
          ) : metrics && metrics.length > 0 ? (
            [...metrics]
              .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
              .map((metric: any, index: number) => (
              <Card key={metric.employee_id || index} className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="p-6">
                  {/* Employee Header */}
                  {isAdmin && (
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <Users className={`h-6 w-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {metric.full_name || 'Employee'}
                          </h3>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {metric.department_name || 'No Department'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${getScoreColor(metric.overall_score)}`}>
                          {metric.overall_score}%
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getScoreBadgeClass(metric.overall_score)}`}>
                          {getPerformanceLabel(metric.overall_score)}
                        </span>
                      </div>
                    </div>
                  )}

                  {!isAdmin && (
                    <div className="text-center mb-6">
                      <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-3 ${getScoreBadgeClass(metric.overall_score)}`}>
                        <Award className="h-10 w-10" />
                      </div>
                      <div className={`text-4xl font-bold mb-2 ${getScoreColor(metric.overall_score)}`}>
                        {metric.overall_score}%
                      </div>
                      <span className={`text-sm px-3 py-1 rounded-full ${getScoreBadgeClass(metric.overall_score)}`}>
                        {getPerformanceLabel(metric.overall_score)}
                      </span>
                    </div>
                  )}

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Attendance
                        </span>
                        <Calendar className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      </div>
                      <div className={`text-2xl font-bold ${getScoreColor(metric.attendance_score)}`}>
                        {metric.attendance_score}%
                      </div>
                      <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {metric.days_present}/{metric.expected_working_days} days
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Punctuality
                        </span>
                        <Clock className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      </div>
                      <div className={`text-2xl font-bold ${getScoreColor(metric.punctuality_score)}`}>
                        {metric.punctuality_score}%
                      </div>
                      <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {metric.days_late} late · Avg: {formatLateTime(metric.average_late_minutes)}
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Task Completion
                        </span>
                        <CheckCircle className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      </div>
                      <div className={`text-2xl font-bold ${getScoreColor(metric.task_completion_score)}`}>
                        {metric.task_completion_score}%
                      </div>
                      <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {metric.tasks_completed_on_time}/{metric.total_tasks_assigned} on time
                      </div>
                    </div>
                  </div>

                  {/* Detailed Stats */}
                  <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-4`}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Expected Days</span>
                        <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {metric.expected_working_days}
                        </div>
                      </div>
                      <div>
                        <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Days Present</span>
                        <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {metric.days_present}
                        </div>
                      </div>
                      <div>
                        <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tasks Assigned</span>
                        <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {metric.total_tasks_assigned}
                        </div>
                      </div>
                      <div>
                        <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tasks Completed</span>
                        <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {metric.total_tasks_completed}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex flex-col items-center space-y-3">
                  <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
                    <AlertCircle className={`w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                  <p className="font-medium">No performance data available</p>
                  <p className="text-sm">Try adjusting your date range or check back later</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <BottomNavbar darkMode={darkMode} />
    </div>
  );
}
