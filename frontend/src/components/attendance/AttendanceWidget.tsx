import React, { useState, useEffect } from 'react';
import { Clock, MapPin, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

interface AttendanceStatus {
  id?: string;
  status: 'checked_in' | 'checked_out' | null;
  checkInTime?: string;
  checkOutTime?: string;
  date?: string;
  minutesLate?: number;
  isLate?: boolean;
}

interface AttendanceWidgetProps {
  darkMode?: boolean;
  userRole?: string;
  className?: string;
}

export function AttendanceWidget({ darkMode = false, userRole = 'employee', className = '' }: AttendanceWidgetProps) {
  const [status, setStatus] = useState<AttendanceStatus>({ status: null });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Don't show for superadmin
  if (userRole === 'superadmin' || userRole === 'super-admin') {
    return null;
  }

  useEffect(() => {
    fetchCurrentStatus();
    getCurrentLocation();
  }, []);

  const fetchCurrentStatus = async () => {
    try {
      const response = await api.get('/attendance/status');
      if (response.data?.status === 'success') {
        setStatus(response.data.data?.attendance || { status: null });
      }
    } catch (error) {
      console.error('Failed to fetch attendance status:', error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Location access denied:', error);
          // Continue without location
        }
      );
    }
  };

  const handleCheckIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const checkInData: any = {};
      
      if (location) {
        checkInData.location = location;
      }

      const response = await api.post('/attendance/checkin', checkInData);
      
      if (response.data?.status === 'success') {
        await fetchCurrentStatus();
        
        // Show success message with late info if applicable
        const attendance = response.data.data?.attendance;
        if (attendance?.isLate && attendance?.minutesLate > 0) {
          setError(`Checked in successfully! You are ${attendance.minutesLate} minutes late.`);
        }
      }
    } catch (error: any) {
      setError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to check in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const checkOutData: any = {};
      
      if (location) {
        checkOutData.location = location;
      }

      const response = await api.post('/attendance/checkout', checkOutData);
      
      if (response.data?.status === 'success') {
        await fetchCurrentStatus();
      }
    } catch (error: any) {
      setError(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to check out');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = () => {
    if (status.status === 'checked_in') {
      return darkMode ? 'text-green-400' : 'text-green-600';
    } else if (status.status === 'checked_out') {
      return darkMode ? 'text-blue-400' : 'text-blue-600';
    }
    return darkMode ? 'text-gray-400' : 'text-gray-600';
  };

  const getStatusIcon = () => {
    if (status.status === 'checked_in') {
      return <CheckCircle className="w-5 h-5" />;
    } else if (status.status === 'checked_out') {
      return <XCircle className="w-5 h-5" />;
    }
    return <Clock className="w-5 h-5" />;
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={getStatusColor()}>
            {getStatusIcon()}
          </div>
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Attendance
          </h3>
        </div>
        {!location && (
          <div className={`text-xs ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} title="Location access denied">
            <MapPin className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className="mb-4">
        {status.status === 'checked_in' && status.checkInTime && (
          <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <p>Checked in at {formatTime(status.checkInTime)}</p>
            {status.isLate && status.minutesLate && status.minutesLate > 0 && (
              <p className={`text-xs mt-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                <AlertCircle className="w-3 h-3 inline mr-1" />
                {status.minutesLate >= 60 
                  ? `${Math.floor(status.minutesLate / 60)}h ${status.minutesLate % 60}m late`
                  : `${status.minutesLate}m late`
                }
              </p>
            )}
          </div>
        )}
        
        {status.status === 'checked_out' && status.checkInTime && status.checkOutTime && (
          <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <p>Checked in: {formatTime(status.checkInTime)}</p>
            <p>Checked out: {formatTime(status.checkOutTime)}</p>
          </div>
        )}
        
        {!status.status && (
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Not checked in today
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {!status.status && (
          <button
            onClick={handleCheckIn}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {isLoading ? 'Checking in...' : 'Check In'}
          </button>
        )}
        
        {status.status === 'checked_in' && (
          <button
            onClick={handleCheckOut}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            {isLoading ? 'Checking out...' : 'Check Out'}
          </button>
        )}
        
        {status.status === 'checked_out' && (
          <div className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            You have completed your day
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className={`mt-3 p-2 rounded text-sm ${
          error.includes('successfully') 
            ? darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-700'
            : darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-700'
        }`}>
          {error}
        </div>
      )}
    </div>
  );
}

export default AttendanceWidget;