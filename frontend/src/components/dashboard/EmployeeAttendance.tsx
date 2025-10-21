import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { MapPin, Clock, Calendar, Play, Square } from 'lucide-react';

interface EmployeeAttendanceProps {
  employeeId: string;
  darkMode?: boolean;
}

const fetchEmployeeAttendance = async (employeeId: string) => {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Employee attendance query error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch employee attendance:', error);
    return [];
  }
};

export function EmployeeAttendance({ employeeId, darkMode = false }: EmployeeAttendanceProps) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['employee-attendance', employeeId],
    queryFn: () => fetchEmployeeAttendance(employeeId),
    refetchInterval: 30000,
  });

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          console.error('Location error:', error);
          setLocationError('Unable to get location. Please enable location services.');
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
    }
  }, []);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!currentLocation) {
        throw new Error('Location not available');
      }

      const { error } = await supabase
        .from('attendance')
        .insert({
          employee_id: employeeId,
          check_in: new Date().toISOString(),
          location_lat: currentLocation.lat,
          location_lng: currentLocation.lng,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-attendance', employeeId] });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (attendanceId: string) => {
      const { error } = await supabase
        .from('attendance')
        .update({ check_out: new Date().toISOString() })
        .eq('id', attendanceId);
      if (error) throw error;
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
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending || !currentLocation}
              className="bg-green-600 hover:bg-green-700 text-white flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Check In
            </Button>
            <Button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                const todayAttendance = attendance.find(a =>
                  a.created_at.startsWith(today) && !a.check_out
                );
                if (todayAttendance) {
                  checkOutMutation.mutate(todayAttendance.id);
                }
              }}
              disabled={checkOutMutation.isPending || !attendance.some(a => !a.check_out)}
              className="bg-red-600 hover:bg-red-700 text-white flex-1"
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
        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Recent Attendance
        </h3>

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
                          {formatDate(record.created_at)}
                        </p>
                        <div className={`flex items-center gap-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span>Check-in: {formatTime(record.check_in)}</span>
                          {record.check_out && (
                            <span>Check-out: {formatTime(record.check_out)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {record.check_out ? (
                        <div className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                          {calculateHours(record.check_in, record.check_out)}h
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
