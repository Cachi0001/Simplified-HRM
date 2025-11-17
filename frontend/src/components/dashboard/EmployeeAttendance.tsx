import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService, AttendanceRecord } from '../../services/attendanceService';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { MapPin, Clock, Calendar, Play, Square, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../ui/Toast';
import { formatLateTime } from '../../utils/timeUtils';

interface EmployeeAttendanceProps {
  employeeId: string;
  darkMode?: boolean;
}

const fetchEmployeeAttendance = async (): Promise<AttendanceRecord[]> => {
  try {
    const history = await attendanceService.getAttendanceHistory();
    return history;
  } catch (error) {
    console.error('Failed to fetch employee attendance:', error);
    return [];
  }
};

export function EmployeeAttendance({ employeeId, darkMode = false }: EmployeeAttendanceProps) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['employee-attendance', employeeId],
    queryFn: () => fetchEmployeeAttendance(),
    refetchInterval: 30000,
  });

  // Get current location
  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
          setLocationDenied(false);
        },
        (error) => {
          console.error('Location error:', error);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationDenied(true);
            setLocationError('Location access denied. Please allow location access to check in.');
          } else {
            setLocationError('Unable to get location. Please enable location services.');
          }
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
    }
  };

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!currentLocation) {
        throw new Error('You must allow location access to check in.');
      }
      return await attendanceService.checkIn();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee-attendance', employeeId] });
      // Use the message from backend which includes on-time/late status
      const message = data?.message || 'Successfully checked in!';
      addToast('success', message);
    },
    onError: (error: any) => {
      // Handle specific error messages from backend
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error?.message || 
                          error.message || 
                          'Check-in failed';
      addToast('error', errorMessage);
    }
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      return await attendanceService.checkOut();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-attendance', employeeId] });
      addToast('success', 'Successfully checked out!');
    },
    onError: (error: Error) => {
      addToast('error', error.message || 'Check-out failed');
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`p-4 h-20 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded animate-pulse`} />
          </Card>
        ))}
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateHours = (checkIn: string, checkOut?: string) => {
    if (!checkOut) return null;
    const checkInTime = new Date(checkIn);
    const checkOutTime = new Date(checkOut);
    const hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    return Math.round(hours * 10) / 10;
  };

  const todayRecord = attendance.find((a: AttendanceRecord) => {
    const recordDate = new Date(a.date).toDateString();
    const today = new Date().toDateString();
    return recordDate === today;
  });

  const isCheckedIn = todayRecord && todayRecord.clock_in && !todayRecord.clock_out;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Check-in/Check-out Section */}
      <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Today's Attendance
            </h3>
            {isCheckedIn && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Active
              </span>
            )}
          </div>

          {locationError && (
            <div className={`mb-4 p-3 sm:p-4 rounded-lg ${darkMode ? 'bg-red-900/20 border border-red-700/50' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start gap-2">
                <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                <div className="flex-1">
                  <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                    {locationError}
                  </p>
                  {locationDenied && (
                    <Button
                      onClick={requestLocation}
                      className={`mt-2 text-sm ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      Enable Location Access
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending || !currentLocation || isCheckedIn}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2 py-3 sm:py-2.5 text-sm sm:text-base font-medium rounded-lg transition-colors"
            >
              <Play className="h-4 w-4 sm:h-5 sm:w-5" />
              {checkInMutation.isPending ? 'Checking In...' : 'Check In'}
            </Button>
            <Button
              onClick={() => checkOutMutation.mutate()}
              disabled={checkOutMutation.isPending || !isCheckedIn}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2 py-3 sm:py-2.5 text-sm sm:text-base font-medium rounded-lg transition-colors"
            >
              <Square className="h-4 w-4 sm:h-5 sm:w-5" />
              {checkOutMutation.isPending ? 'Checking Out...' : 'Check Out'}
            </Button>
          </div>

          {currentLocation && (
            <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={`flex items-center gap-2 text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  Location: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Attendance History */}
      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Recent Attendance
          </h3>
          <Link
            to="/attendance-report"
            className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} transition-colors`}
          >
            View All →
          </Link>
        </div>

        {attendance.length === 0 ? (
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
            <div className={`p-8 sm:p-12 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="flex flex-col items-center space-y-3">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
                  <Clock className={`w-7 h-7 sm:w-8 sm:h-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
                <p className="font-medium text-sm sm:text-base">No attendance records yet</p>
                <p className="text-xs sm:text-sm max-w-xs">Your check-in and check-out history will appear here</p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {attendance.slice(0, 5).map((record: AttendanceRecord) => (
              <Card key={record.id} className={`${darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'} shadow-sm transition-colors`}>
                <div className="p-3 sm:p-4">
                  <div className="flex items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <Calendar className={`h-4 w-4 sm:h-5 sm:w-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-medium text-sm sm:text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatDate(record.date)}
                          </p>
                          {record.clock_in && (
                            (record.is_late || record.isLate) ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'}`}>
                                You are {formatLateTime(record.late_minutes || record.lateMinutes || 0)}
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                                On-time
                              </span>
                            )
                          )}
                        </div>
                        <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>In: {record.clock_in ? formatTime(record.clock_in) : 'N/A'}</span>
                          </div>
                          {record.clock_out && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Out: {formatTime(record.clock_out)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {record.clock_out ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className={`flex items-center gap-1 text-sm sm:text-base font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                            <CheckCircle className="h-4 w-4" />
                            <span>{record.hours_worked || calculateHours(record.clock_in, record.clock_out)}h</span>
                          </div>
                          <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Completed
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <div className={`flex items-center gap-1 text-sm font-medium ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                            <span>Active</span>
                          </div>
                          <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            In progress
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
