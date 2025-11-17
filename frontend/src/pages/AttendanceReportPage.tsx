import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../services/attendanceService';
import { employeeService } from '../services/employeeService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { RefreshCw, Calendar, Users, Download, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/ui/Logo';
import { DarkModeToggle } from '../components/ui/DarkModeToggle';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { BottomNavbar } from '../components/layout/BottomNavbar';
import { useTokenValidation } from '../hooks/useTokenValidation';
import { useTheme } from '../contexts/ThemeContext';
import { AttendanceCard } from '../components/attendance/AttendanceCard';

export default function AttendanceReportPage() {
  const { darkMode, setDarkMode } = useTheme();

  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Get current user
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Add token validation to automatically logout on token expiry
  useTokenValidation({
    checkInterval: 2 * 60 * 1000, // Check every 2 minutes
    onTokenExpired: () => {
      console.log('Attendance report token expired, redirecting to login');
    }
  });

  // Fetch all employees for filtering (if admin)
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const allEmployees = await employeeService.getAllEmployees();
      return allEmployees.filter((emp) => emp.role !== 'admin');
    },
    enabled: currentUser.role === 'admin',
  });

  // Fetch attendance report
  const { data: report, isLoading: reportLoading, isFetching: reportFetching, refetch } = useQuery({
    queryKey: ['attendance-report', selectedEmployee || 'all', startDate || 'none', endDate || 'none'],
    queryFn: async () => {
      // Set default date range to last 5 days if no dates are selected
      let start = startDate ? new Date(startDate) : undefined;
      let end = endDate ? new Date(endDate) : undefined;

      if (!startDate && !endDate) {
        end = new Date();
        start = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      }

      console.log('AttendanceReportPage: Fetching attendance report', {
        selectedEmployee,
        startDate: start?.toISOString(),
        endDate: end?.toISOString(),
        start,
        end
      });

      const result = await attendanceService.getAttendanceReport(selectedEmployee || undefined, start, end);
      console.log('AttendanceReportPage: Received attendance data', result);
      return result;
    },
    enabled: true,
  });

  const formatTime = (dateString?: string) => {
    if (!dateString) {
      return '—';
    }

    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
      return '—';
    }

    return parsed.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return '—';
    }

    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
      return '—';
    }

    return parsed.toLocaleDateString();
  };

  const getEmployeeName = (record: any) => record?._id?.employeeName ?? record?.employeeName ?? record?.employee?.fullName ?? 'Unknown Employee';

  const getLocationMeta = (record: any) => {
    const status = record?.locationStatus ?? 'unknown';
    const distance = typeof record?.distanceFromOffice === 'number' ? Math.round(record.distanceFromOffice) : null;
    return { status, distance };
  };

  const exportReport = () => {
    if (!report || report.length === 0) return;

    const headers = ['Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'];
    const csvContent = [
      headers.join(','),
      ...report.map((record: any) => [
        record?._id?.employeeName ?? record?.employeeName ?? record?.employee?.fullName ?? 'Unknown',
        formatDate(record?._id?.date ?? record?.date),
        formatTime(record?.checkInTime),
        record?.checkOutTime ? formatTime(record.checkOutTime) : 'Active',
        record?.totalHours ? record.totalHours.toFixed(1) : '0',
        record?.status === 'checked_out' ? 'Completed' : 'Active'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
                Attendance Report
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Detailed attendance history and analytics
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
              Report Filters
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {currentUser.role === 'admin' && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Employee
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option value="">All Employees</option>
                    {employees.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.department || 'No Department'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <Button onClick={() => refetch()} className="flex-1 min-h-[40px]" isLoading={reportFetching}>
                <RefreshCw className={`h-4 w-4 mr-2 ${reportFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={exportReport} className="flex-1 min-h-[40px]">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </Card>

        {/* Attendance Report */}
        <div className="space-y-4">
          {reportLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Card key={i} className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className={`p-4 h-20 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded animate-pulse`} />
                </Card>
              ))}
            </div>
          ) : report && report.length > 0 ? (
            <div className="space-y-4">
              {report.map((record: any, index: number) => {
                const uniqueKey = `${record?.employeeId || record?._id?.employeeId || 'unknown'}-${record?.date || record?._id?.date || index}`;
                return (
                  <AttendanceCard
                    key={uniqueKey}
                    record={record}
                    darkMode={darkMode}
                    getEmployeeName={getEmployeeName}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    getLocationMeta={getLocationMeta}
                  />
                );
            })}
            </div>
          ) : (
            <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex flex-col items-center space-y-3">
                  <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
                    <Clock className={`w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                  <p className="font-medium">No attendance records found</p>
                  <p className="text-sm">Try adjusting your filters or check back later</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavbar darkMode={darkMode} />
    </div>
  );
}
