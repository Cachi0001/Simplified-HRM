import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceService, AttendanceRecord } from '../../services/attendanceService';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Clock, MapPin, LogIn, LogOut, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AttendanceWidgetProps {
  darkMode?: boolean;
}

export function AttendanceWidget({ darkMode = false }: AttendanceWidgetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [locationStatus, setLocationStatus] = useState<'checking' | 'allowed' | 'denied' | 'error'>('checking');
  const [locationMessage, setLocationMessage] = useState<string>('');

  // Get current attendance status
  const { data: currentStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['attendance-current-status'],
    queryFn: () => attendanceService.getCurrentStatus(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Check location permissions on mount
  useEffect(() => {
    checkLocationPermissions();
  }, []);

  const checkLocationPermissions = async () => {
    try {
      setLocationStatus('checking');
      const result = await attendanceService.canPerformAttendanceAction();
      
      if (result.canCheckIn || result.canCheckOut) {
        setLocationStatus('allowed');
        setLocationMessage('Location verified. You can perform attendance actions.');
      } else {
        setLocationStatus('denied');
        setLocationMessage(result.reason || 'Location validation failed');
      }
    } catch (error) {
      setLocationStatus('error');
      setLocationMessage(error instanceof Error ? error.message : 'Failed to check location');
    }
  };

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: () => attendanceService.enhancedCheckIn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-current-status'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: () => attendanceService.checkOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-current-status'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
    },
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

  const getWorkingHours = (checkInTime: string) => {
    const now = new Date();
    const checkIn = new Date(checkInTime);
    const hours = (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    return hours.toFixed(1);
  };

  const isLateCheckIn = (checkInTime: string) => {
    const checkIn = new Date(checkInTime);
    const cutoff = new Date(checkIn);
    cutoff.setHours(8, 35, 0, 0);
    return checkIn > cutoff;
  };

  const getLocationRestrictionMessage = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    if (dayOfWeek === 5) { // Friday
      return 'Friday: You can check in/out from anywhere';
    } else if (dayOfWeek >= 1 && dayOfWeek <= 4) { // Monday to Thursday
      return 'Monday-Thursday: Must be within 15km of office';
    } else if (dayOfWeek === 6) { // Saturday
      return 'Saturday: Must be at office (within 100m)';
    } else {
      return 'Sunday: No attendance required';
    }
  };

  if (statusLoading) {
    return (
      <Card className={`p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-center">
          <Loader className="h-6 w-6 animate-spin mr-2" />
          <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
            Loading attendance status...
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Attendance
          </h3>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {formatDate(new Date().toISOString())}
          </div>
        </div>

        {/* Location Status */}
        <div className={`p-3 rounded-lg border-l-4 ${
          locationStatus === 'allowed' 
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
            : locationStatus === 'denied'
            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
            : locationStatus === 'error'
            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
            : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
        }`}>
          <div className="flex items-center">
            {locationStatus === 'checking' && <Loader className="h-4 w-4 animate-spin mr-2" />}
            {locationStatus === 'allowed' && <CheckCircle className="h-4 w-4 text-green-600 mr-2" />}
            {locationStatus === 'denied' && <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />}
            {locationStatus === 'error' && <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />}
            <MapPin className="h-4 w-4 mr-2" />
            <span className={`text-sm font-medium ${
              locationStatus === 'allowed' ? 'text-green-800 dark:text-green-200' :
              locationStatus === 'denied' ? 'text-red-800 dark:text-red-200' :
              locationStatus === 'error' ? 'text-yellow-800 dark:text-yellow-200' :
              'text-blue-800 dark:text-blue-200'
            }`}>
              {getLocationRestrictionMessage()}
            </span>
          </div>
          {locationMessage && (
            <p className={`text-xs mt-1 ${
              locationStatus === 'allowed' ? 'text-green-700 dark:text-green-300' :
              locationStatus === 'denied' ? 'text-red-700 dark:text-red-300' :
              locationStatus === 'error' ? 'text-yellow-700 dark:text-yellow-300' :
              'text-blue-700 dark:text-blue-300'
            }`}>
              {locationMessage}
            </p>
          )}
        </div>

        {/* Current Status */}
        {currentStatus ? (
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Clock className={`h-5 w-5 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {currentStatus.status === 'checked_in' ? 'Checked In' : 'Checked Out'}
                </span>
              </div>
              <div className={`px-2 py-1 rounded text-xs ${
                currentStatus.status === 'checked_in' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
              }`}>
                {currentStatus.status === 'checked_in' ? 'Active' : 'Completed'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Check-in:
                </span>
                <div className="text-right">
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatTime(currentStatus.check_in_time)}
                  </span>
                  {isLateCheckIn(currentStatus.check_in_time) && (
                    <span className="ml-2 px-1 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded">
                      Late
                    </span>
                  )}
                </div>
              </div>

              {currentStatus.check_out_time && (
                <div className="flex justify-between">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Check-out:
                  </span>
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatTime(currentStatus.check_out_time)}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Working hours:
                </span>
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {currentStatus.total_hours 
                    ? `${currentStatus.total_hours.toFixed(1)}h` 
                    : `${getWorkingHours(currentStatus.check_in_time)}h`
                  }
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className={`p-4 rounded-lg border-2 border-dashed ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'}`}>
            <div className="text-center">
              <Clock className={`h-8 w-8 mx-auto mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No attendance record for today
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {(!currentStatus || currentStatus.status === 'checked_out') && (
            <Button
              onClick={() => checkInMutation.mutate()}
              isLoading={checkInMutation.isPending}
              disabled={locationStatus !== 'allowed'}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Check In
            </Button>
          )}

          {currentStatus?.status === 'checked_in' && (
            <Button
              onClick={() => checkOutMutation.mutate()}
              isLoading={checkOutMutation.isPending}
              disabled={locationStatus !== 'allowed'}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Check Out
            </Button>
          )}

          <Button
            onClick={checkLocationPermissions}
            variant="outline"
            className="px-4"
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </div>

        {/* Error Messages */}
        {(checkInMutation.error || checkOutMutation.error) && (
          <div className={`p-3 rounded-lg border-l-4 border-red-500 ${darkMode ? 'bg-red-900/20 text-red-200' : 'bg-red-50 text-red-800'}`}>
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                {(checkInMutation.error || checkOutMutation.error)?.message || 'An error occurred'}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}