import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Calendar, Users, Download, RefreshCw } from 'lucide-react';
import { AttendanceCard } from '../attendance/AttendanceCard';

interface AdminAttendanceProps {
  darkMode?: boolean;
}

export function AdminAttendance({ darkMode = false }: AdminAttendanceProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Fetch all employees for filtering - Team Leads only see their team
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-for-attendance'],
    queryFn: async () => {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const allEmployees = await employeeService.getAllEmployees();
      
      // If Team Lead, only show their team members
      if (currentUser.role === 'teamlead') {
        return allEmployees.filter((emp) => 
          (emp.manager_id === currentUser.id) &&
          emp.role === 'employee'
        );
      }
      
      // For HR/Admin/SuperAdmin, filter out admin users
      return allEmployees.filter((emp) => emp.role !== 'admin' && emp.role !== 'superadmin');
    },
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

      console.log('AdminAttendance: Fetching attendance report', {
        selectedEmployee,
        startDate: start?.toISOString(),
        endDate: end?.toISOString(),
        start,
        end
      });

      const result = await attendanceService.getAttendanceReport(selectedEmployee || undefined, start, end);
      console.log('AdminAttendance: Received attendance data', result);
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

  const getEmployeeName = (record: any) => record._id?.employeeName ?? record.employeeName ?? record.employee?.fullName ?? 'Unknown Employee';

  const getLocationMeta = (record: any) => {
    const status = record.locationStatus ?? 'unknown';
    const distance = typeof record.distanceFromOffice === 'number' ? Math.round(record.distanceFromOffice) : null;
    return { status, distance };
  };

  const exportReport = () => {
    // Simple CSV export
    if (!report || report.length === 0) return;

    const headers = ['Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'];
    const csvContent = [
      headers.join(','),
      ...report.map(record => [
        record._id?.employeeName ?? record.employeeName ?? 'Unknown',
        formatDate(record._id?.date ?? record.date),
        formatTime(record.checkInTime),
        record.checkOutTime ? formatTime(record.checkOutTime) : 'Active',
        record.totalHours ? record.totalHours.toFixed(1) : '0',
        record.status === 'checked_out' ? 'Completed' : 'Active'
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
    <div className={`space-y-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Filters */}
      <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-6">
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Attendance Management
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.department || 'No Department'})
                  </option>
                ))}
              </select>
            </div>

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
        </div>
      </Card>

      {/* Attendance Report */}
      <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Attendance Report
            </h3>
            <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <Users className="h-4 w-4" />
              <span>{report?.length || 0} records</span>
            </div>
          </div>

          {reportLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-16 rounded animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
              ))}
            </div>
          ) : report && report.length > 0 ? (
            <div className="space-y-3">
              {report.map((record, index) => {
                const uniqueKey = `${record._id?.employeeId ?? record.employeeId ?? index}-${record._id?.date ?? record.date ?? index}-${index}`;
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
            <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Calendar className={`h-12 w-12 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className="font-medium">No attendance records found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
