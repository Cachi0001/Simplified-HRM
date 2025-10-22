import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MapPin, Clock, Play, Square, AlertCircle } from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';

interface DraggableLogoProps {
  darkMode?: boolean;
  employeeId: string;
  onStatusChange?: (status: 'checked_in' | 'checked_out') => void;
}

export function DraggableLogo({ darkMode = false, employeeId, onStatusChange }: DraggableLogoProps) {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [workingTime, setWorkingTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [officeLocation, setOfficeLocation] = useState<{ lat: number; lng: number; radius: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const logoRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Office location from environment variables
  const OFFICE_LATITUDE = parseFloat((import.meta as any).env.VITE_OFFICE_LATITUDE || '6.5244');
  const OFFICE_LONGITUDE = parseFloat((import.meta as any).env.VITE_OFFICE_LONGITUDE || '3.3792');
  const OFFICE_RADIUS = parseFloat((import.meta as any).env.VITE_OFFICE_RADIUS || '100');
  const REQUIRE_OFFICE_LOCATION = (import.meta as any).env.VITE_REQUIRE_OFFICE_LOCATION !== 'false';
  const ALLOW_LOCATION_FALLBACK = (import.meta as any).env.VITE_ALLOW_LOCATION_FALLBACK === 'true';

  useEffect(() => {
    // Get office location from env vars
    if (OFFICE_LATITUDE && OFFICE_LONGITUDE && OFFICE_RADIUS) {
      setOfficeLocation({
        lat: OFFICE_LATITUDE,
        lng: OFFICE_LONGITUDE,
        radius: OFFICE_RADIUS
      });
    }

    // Get current location
    getCurrentLocation();

    // Check current status
    checkCurrentStatus();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer for working hours
  useEffect(() => {
    if (isCheckedIn && checkInTime) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - checkInTime.getTime()) / 1000);
        setWorkingTime(elapsed);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setWorkingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isCheckedIn, checkInTime]);

  const getCurrentLocation = () => {
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
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
    }
  };

  const checkCurrentStatus = async () => {
    try {
      const status = await attendanceService.getCurrentStatus();
      setIsCheckedIn(status?.status === 'checked_in');
      if (status?.checkInTime) {
        setCheckInTime(new Date(status.checkInTime));
      }
      onStatusChange?.(status?.status || 'checked_out');
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const verifyLocation = (): boolean => {
    if (!currentLocation || !officeLocation) return !REQUIRE_OFFICE_LOCATION;

    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      officeLocation.lat,
      officeLocation.lng
    );

    return distance <= officeLocation.radius;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const handleCheckIn = async () => {
    if (!currentLocation) {
      setLocationError('Location not available. Please enable location services.');
      return;
    }

    if (REQUIRE_OFFICE_LOCATION && !verifyLocation()) {
      const distance = officeLocation ? calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        officeLocation.lat,
        officeLocation.lng
      ) : 0;

      if (ALLOW_LOCATION_FALLBACK) {
        setLocationError(`You're ${Math.round(distance)}m from office. Check-in allowed but location noted.`);
      } else {
        setLocationError(`You're ${Math.round(distance)}m from office. Please move closer to check in.`);
        return;
      }
    }

    setIsLoading(true);
    try {
      await attendanceService.checkIn({
        location: {
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          accuracy: 10 // meters
        }
      });

      setIsCheckedIn(true);
      setCheckInTime(new Date());
      onStatusChange?.('checked_in');
    } catch (error) {
      console.error('Check-in error:', error);
      setLocationError('Failed to check in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      await attendanceService.checkOut({
        location: currentLocation ? {
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          accuracy: 10
        } : undefined
      });

      setIsCheckedIn(false);
      setCheckInTime(null);
      setWorkingTime(0);
      onStatusChange?.('checked_out');
    } catch (error) {
      console.error('Check-out error:', error);
      setLocationError('Failed to check out. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);

    // Check if dropped in check-in or check-out area
    const rect = e.currentTarget.getBoundingClientRect();
    const dropX = e.clientX;
    const dropY = e.clientY;

    // Simple drop zone detection (could be improved)
    const centerX = rect.left + rect.width / 2;
    const isInCheckInZone = dropX < centerX;

    if (isInCheckInZone && !isCheckedIn) {
      handleCheckIn();
    } else if (!isInCheckInZone && isCheckedIn) {
      handleCheckOut();
    }
  };

  return (
    <Card className={`${darkMode ? 'bg-gray-800' : 'bg-white'} relative overflow-hidden`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Check-in/Out Status
          </h3>
          <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <Clock className="h-4 w-4" />
            <span>{formatTime(workingTime)}</span>
          </div>
        </div>

        {/* Location Info */}
        {currentLocation && officeLocation && (
          <div className={`mb-4 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                Office: {officeLocation.lat.toFixed(4)}, {officeLocation.lng.toFixed(4)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm mt-1">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                You: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
              </span>
              {officeLocation && (
                <span className={`text-xs px-2 py-1 rounded ${
                  verifyLocation()
                    ? (darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')
                    : (darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800')
                }`}>
                  {verifyLocation() ? 'In Range' : `${Math.round(calculateDistance(
                    currentLocation.lat,
                    currentLocation.lng,
                    officeLocation.lat,
                    officeLocation.lng
                  ))}m away`}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Location Error */}
        {locationError && (
          <div className={`mb-4 p-3 rounded-lg ${darkMode ? 'bg-red-900/20 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-2">
              <AlertCircle className={`h-4 w-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
              <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                {locationError}
              </p>
            </div>
          </div>
        )}

        {/* Draggable Logo */}
        <div className="flex justify-center mb-6">
          <div
            ref={logoRef}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`w-20 h-20 rounded-full border-4 border-dashed flex items-center justify-center cursor-move transition-all duration-200 ${
              isDragging ? 'opacity-50 scale-110' : 'opacity-100'
            } ${
              isCheckedIn
                ? (darkMode ? 'border-blue-400 bg-blue-900' : 'border-blue-400 bg-blue-50')
                : (darkMode ? 'border-red-400 bg-red-900' : 'border-red-400 bg-red-50')
            }`}
          >
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                isCheckedIn
                  ? (darkMode ? 'text-blue-300' : 'text-blue-600')
                  : (darkMode ? 'text-red-300' : 'text-red-600')
              }`}>
                {isCheckedIn ? '✓' : '✗'}
              </div>
              <div className={`text-xs font-medium ${
                isCheckedIn
                  ? (darkMode ? 'text-blue-300' : 'text-blue-600')
                  : (darkMode ? 'text-red-300' : 'text-red-600')
              }`}>
                {isCheckedIn ? 'IN' : 'OUT'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleCheckIn}
            disabled={isCheckedIn || isLoading || !currentLocation}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            <Play className="h-4 w-4 mr-2" />
            Check In
          </Button>
          <Button
            onClick={handleCheckOut}
            disabled={!isCheckedIn || isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          >
            <Square className="h-4 w-4 mr-2" />
            Check Out
          </Button>
        </div>

        {/* Instructions */}
        <div className={`mt-4 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <p>💡 Drag the logo to check in/out or use the buttons above</p>
          {REQUIRE_OFFICE_LOCATION && (
            <p className="mt-1">
              📍 Must be within {officeLocation?.radius}m of office to check in
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
