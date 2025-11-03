import api from '../lib/api';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  status: 'checked_in' | 'checked_out';
  check_in_time: string;
  check_out_time?: string;
  location_latitude?: number;
  location_longitude?: number;
  check_in_location?: string;
  check_out_location?: string;
  total_hours?: number;
  minutes_late?: number;
  is_late: boolean;
  distance_from_office?: number;
  date: string;
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
  async checkIn(): Promise<AttendanceRecord> {
    try {
      // Check if it's a working day
      if (!this.isWorkingDay()) {
        throw new Error('Check-in is only allowed on working days (Monday to Saturday)');
      }

      // Get current location
      const location = await this.getCurrentLocation();

      // Validate location is within office radius
      if (!this.isWithinOfficeRadius(location)) {
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          this.OFFICE_LOCATION.latitude,
          this.OFFICE_LOCATION.longitude
        );
        
        throw new Error(
          `You must be within ${this.OFFICE_LOCATION.radius}m of the office to check in. ` +
          `You are currently ${Math.round(distance)}m away.`
        );
      }

      // Send check-in request
      const response = await api.post('/attendance/check-in', {
        location_latitude: location.latitude,
        location_longitude: location.longitude,
        check_in_location: location.address,
        distance_from_office: this.calculateDistance(
          location.latitude,
          location.longitude,
          this.OFFICE_LOCATION.latitude,
          this.OFFICE_LOCATION.longitude
        )
      });

      return response.data.data;
    } catch (error) {
      console.error('Check-in failed:', error);
      throw error;
    }
  }

  /**
   * Check out with location validation
   */
  async checkOut(): Promise<AttendanceRecord> {
    try {
      // Check if it's a working day
      if (!this.isWorkingDay()) {
        throw new Error('Check-out is only allowed on working days (Monday to Saturday)');
      }

      // Get current location
      const location = await this.getCurrentLocation();

      // Validate location is within office radius
      if (!this.isWithinOfficeRadius(location)) {
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          this.OFFICE_LOCATION.latitude,
          this.OFFICE_LOCATION.longitude
        );
        
        throw new Error(
          `You must be within ${this.OFFICE_LOCATION.radius}m of the office to check out. ` +
          `You are currently ${Math.round(distance)}m away.`
        );
      }

      // Send check-out request
      const response = await api.post('/attendance/check-out', {
        location_latitude: location.latitude,
        location_longitude: location.longitude,
        check_out_location: location.address,
        distance_from_office: this.calculateDistance(
          location.latitude,
          location.longitude,
          this.OFFICE_LOCATION.latitude,
          this.OFFICE_LOCATION.longitude
        )
      });

      return response.data.data;
    } catch (error) {
      console.error('Check-out failed:', error);
      throw error;
    }
  }

  /**
   * Get current attendance status
   */
  async getCurrentStatus(): Promise<AttendanceRecord | null> {
    try {
      const response = await api.get('/attendance/current-status');
      return response.data.data;
    } catch (error) {
      console.error('Failed to get attendance status:', error);
      return null;
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

      const response = await api.get(`/attendance/history?${params.toString()}`);
      return response.data.data || [];
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
        canCheckOut: currentStatus?.status === 'checked_in',
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