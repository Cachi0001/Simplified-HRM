import api from '../lib/api';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string;
  clock_out?: string;
  clock_in_lat?: number;
  clock_in_lng?: number;
  clock_in_address?: string;
  clock_out_lat?: number;
  clock_out_lng?: number;
  clock_out_address?: string;
  hours_worked?: number;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
  late_minutes?: number;
  is_late: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  averageHours: number;
  attendanceRate: number;
}

class AttendanceService {
  private readonly OFFICE_LOCATION = {
    latitude: 6.5244, // Default Lagos coordinates - should be configured
    longitude: 3.3792,
    radius: 100 // 100 meters radius
  };

  /**
   * Get current location with high accuracy
   */
  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          // Try to get address from coordinates
          try {
            const address = await this.getAddressFromCoordinates(
              location.latitude,
              location.longitude
            );
            location.address = address;
          } catch (error) {
            console.warn('Failed to get address:', error);
          }

          resolve(location);
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        options
      );
    });
  }

  /**
   * Get address from coordinates using reverse geocoding
   */
  private async getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
    try {
      // Using a free geocoding service - you might want to use Google Maps API or similar
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.display_name || data.locality || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    } catch (error) {
      console.warn('Geocoding failed:', error);
    }
    
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Check if location is within office radius
   */
  private isWithinOfficeRadius(location: LocationData): boolean {
    const distance = this.calculateDistance(
      location.latitude,
      location.longitude,
      this.OFFICE_LOCATION.latitude,
      this.OFFICE_LOCATION.longitude
    );

    return distance <= this.OFFICE_LOCATION.radius;
  }

  /**
   * Check if today is a working day (Monday to Saturday)
   */
  private isWorkingDay(date: Date = new Date()): boolean {
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    return day >= 1 && day <= 6; // Monday to Saturday
  }

  /**
   * Check in with location validation
   */
  async checkIn(locationData?: { location: LocationData }): Promise<AttendanceRecord> {
    try {
      // Check if it's a working day
      if (!this.isWorkingDay()) {
        throw new Error('Check-in is only allowed on working days (Monday to Saturday)');
      }

      // Get current location if not provided
      const location = locationData?.location || await this.getCurrentLocation();

      // Send check-in request with backend-expected field names
      const response = await api.post('/attendance/clock-in', {
        lat: location.latitude,
        lng: location.longitude,
        address: location.address
      });

      return response.data.data || response.data;
    } catch (error) {
      console.error('Check-in failed:', error);
      throw error;
    }
  }

  /**
   * Check out with location validation
   */
  async checkOut(locationData?: { location?: LocationData }): Promise<AttendanceRecord> {
    try {
      // Check if it's a working day
      if (!this.isWorkingDay()) {
        throw new Error('Check-out is only allowed on working days (Monday to Saturday)');
      }

      // Get current location if not provided
      const location = locationData?.location || await this.getCurrentLocation();

      // Send check-out request with backend-expected field names
      const response = await api.post('/attendance/clock-out', {
        lat: location.latitude,
        lng: location.longitude,
        address: location.address
      });

      return response.data.data || response.data;
    } catch (error) {
      console.error('Check-out failed:', error);
      throw error;
    }
  }

  /**
   * Get current attendance status
   */
  async getCurrentStatus(): Promise<{ status: 'checked_in' | 'checked_out'; checkInTime?: string } | null> {
    try {
      const response = await api.get('/attendance/today');
      const data = response.data.data || response.data;
      
      if (!data) return { status: 'checked_out' };
      
      return {
        status: data.clock_in && !data.clock_out ? 'checked_in' : 'checked_out',
        checkInTime: data.clock_in
      };
    } catch (error) {
      console.error('Failed to get attendance status:', error);
      return { status: 'checked_out' };
    }
  }

  /**
   * Get attendance history
   */
  async getAttendanceHistory(startDate?: string, endDate?: string): Promise<AttendanceRecord[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await api.get(`/attendance/my-records?${params.toString()}`);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Failed to get attendance history:', error);
      throw error;
    }
  }

  /**
   * Get attendance statistics
   */
  async getAttendanceStats(month?: number, year?: number): Promise<AttendanceStats> {
    try {
      const params = new URLSearchParams();
      if (month) params.append('month', month.toString());
      if (year) params.append('year', year.toString());

      const response = await api.get(`/attendance/stats?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get attendance stats:', error);
      throw error;
    }
  }

  /**
   * Request location permission
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported');
      }

      // Test location access
      await this.getCurrentLocation();
      return true;
    } catch (error) {
      console.error('Location permission denied:', error);
      return false;
    }
  }

  /**
   * Check if user can check in/out (location and time validation)
   */
  async canPerformAttendanceAction(): Promise<{
    canCheckIn: boolean;
    canCheckOut: boolean;
    reason?: string;
    location?: LocationData;
  }> {
    try {
      // Check working day
      if (!this.isWorkingDay()) {
        return {
          canCheckIn: false,
          canCheckOut: false,
          reason: 'Attendance actions are only allowed on working days (Monday to Saturday)'
        };
      }

      // Get location
      const location = await this.getCurrentLocation();
      const isWithinRadius = this.isWithinOfficeRadius(location);

      if (!isWithinRadius) {
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          this.OFFICE_LOCATION.latitude,
          this.OFFICE_LOCATION.longitude
        );

        return {
          canCheckIn: false,
          canCheckOut: false,
          reason: `You must be within ${this.OFFICE_LOCATION.radius}m of the office. You are ${Math.round(distance)}m away.`,
          location
        };
      }

      // Get current status to determine what actions are available
      const currentStatus = await this.getCurrentStatus();
      
      return {
        canCheckIn: !currentStatus || currentStatus.status === 'checked_out',
        canCheckOut: currentStatus && currentStatus.status === 'checked_in',
        location
      };
    } catch (error) {
      return {
        canCheckIn: false,
        canCheckOut: false,
        reason: error instanceof Error ? error.message : 'Failed to validate location'
      };
    }
  }
}

export const attendanceService = new AttendanceService();
export default attendanceService;