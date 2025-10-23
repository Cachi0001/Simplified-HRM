import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { employeeService } from '../../services/employeeService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Calendar, Clock, MapPin, Users, Filter, Download } from 'lucide-react';

interface AdminAttendanceProps {
  darkMode?: boolean;
}

export function AdminAttendance({ darkMode = false }: AdminAttendanceProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Fetch all employees for filtering
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await employeeService.getAllEmployees();
      // Filter out admin users for display purposes
      const nonAdminEmployees = response.employees.filter((emp: any) => emp.role !== 'admin');
      return nonAdminEmployees;
    },
  });

  // Fetch attendance report
  const { data: report, isLoading: reportLoading, refetch } = useQuery({
    queryKey: ['attendance-report', selectedEmployee, startDate, endDate],
    queryFn: async () => {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      return await attendanceService.getAttendanceReport(selectedEmployee || undefined, start, end);
    },
    enabled: true,
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const calculateHours = (checkIn: string, checkOut?: string) => {
    if (!checkOut) return 0;
    const checkInTime = new Date(checkIn);
    const checkOutTime = new Date(checkOut);
    const hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    return Math.round(hours * 10) / 10;
  };

  const exportReport = () => {
    // Simple CSV export
    if (!report || report.length === 0) return;

    const headers = ['Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'];
    const csvContent = [
      headers.join(','),
      ...report.map(record => [
        record._id.employeeName || 'Unknown',
        formatDate(record._id.date),
        formatTime(record.checkInTime),
        record.checkOutTime ? formatTime(record.checkOutTime) : 'Active',
        record.totalHours ? record.totalHours.toFixed(1) : '0',
        record.status || 'Unknown'
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                    {emp.fullName} ({emp.department || 'No Department'})
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

            <div className="flex items-end">
              <Button onClick={exportReport} className="w-full">
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
              {report.map((record, index) => (
                <div key={`${record._id.employeeId}-${record._id.date}-${index}`} className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                        <Users className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      </div>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {record._id.employeeName || 'Unknown Employee'}
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formatDate(record._id.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {record.status === 'checked_out' ? 'Completed' : 'Active'}
                      </p>
                      <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(record.checkInTime)}</span>
                        {record.checkOutTime ? (
                          <>
                            <span>-</span>
                            <span>{formatTime(record.checkOutTime)}</span>
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'}`}>
                              {record.totalHours ? `${record.totalHours.toFixed(1)}h` : '0h'}
                            </span>
                          </>
                        ) : (
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${darkMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-800'}`}>
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
