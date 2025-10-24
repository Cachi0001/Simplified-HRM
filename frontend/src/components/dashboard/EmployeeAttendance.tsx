import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../../services/attendanceService';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { MapPin, Clock, Calendar, Play, Square } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmployeeAttendanceProps {
  employeeId: string;
  darkMode?: boolean;
}

const fetchEmployeeAttendance = async () => {
  try {
    const history = await attendanceService.getAttendanceHistory();
    return history.attendances;
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

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['employee-attendance', employeeId],
    queryFn: () => fetchEmployeeAttendance(employeeId),
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

      return await attendanceService.checkIn({
        location: {
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          accuracy: 10 // meters
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-attendance', employeeId] });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      return await attendanceService.checkOut({
        location: currentLocation ? {
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          accuracy: 10
        } : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-attendance', employeeId] });
    },
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
    return new Date(dateString).toLocaleDateString();
  };

  const calculateHours = (checkIn: string, checkOut?: string) => {
    if (!checkOut) return null;
    const checkInTime = new Date(checkIn);
    const checkOutTime = new Date(checkOut);
    const hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    return Math.round(hours * 10) / 10;
  };

  return (
    <div className="space-y-6">
      {/* Check-in/Check-out Section */}
      <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-6">
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Daily Check-in/Check-out
          </h3>

          {locationError && (
            <div className={`mb-4 p-3 rounded ${darkMode ? 'bg-red-900/20 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                {locationError}
              </p>
              {locationDenied && (
                <Button
                  onClick={requestLocation}
                  className={`mt-2 ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Enable Location Access
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending || !currentLocation}
              className="bg-green-600 hover:bg-green-700 text-white flex-1 min-h-[40px]"
            >
              <Play className="h-4 w-4 mr-2" />
              Check In
            </Button>
            <Button
              onClick={() => checkOutMutation.mutate()}
              disabled={checkOutMutation.isPending || !attendance.some(a => a.status === 'checked_in')}
              className="bg-red-600 hover:bg-red-700 text-white flex-1 min-h-[40px]"
            >
              <Square className="h-4 w-4 mr-2" />
              Check Out
            </Button>
          </div>

          {currentLocation && (
            <div className={`mt-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <MapPin className="h-4 w-4 inline mr-1" />
              Location: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
            </div>
          )}
        </div>
      </Card>

      {/* Attendance History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Recent Attendance
          </h3>
          <Link
            to="/attendance-report"
            className={`text-sm font-medium ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
          >
            View More
          </Link>
        </div>

        {attendance.length === 0 ? (
          <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="flex flex-col items-center space-y-3">
                <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
                  <Clock className={`w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
                <p className="font-medium">No attendance records</p>
                <p className="text-sm">Your check-in/check-out history will appear here</p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {attendance.map((record) => (
              <Card key={record.id} className={`${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatDate(record.date)}
                        </p>
                        <div className={`flex items-center gap-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span>Check-in: {formatTime(record.checkInTime)}</span>
                          {record.checkOutTime && (
                            <span>Check-out: {formatTime(record.checkOutTime)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {record.checkOutTime ? (
                        <div className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                          {calculateHours(record.checkInTime, record.checkOutTime)}h
                        </div>
                      ) : (
                        <div className={`text-sm ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                          Active
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
