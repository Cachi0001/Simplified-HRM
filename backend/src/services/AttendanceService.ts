import { IAttendanceRepository } from '../repositories/interfaces/IAttendanceRepository';
import { IAttendance, CreateAttendanceRequest } from '../models/Attendance';
import logger from '../utils/logger';

export class AttendanceService {
  constructor(private attendanceRepository: IAttendanceRepository) {}

  async checkIn(userId: string, attendanceData: CreateAttendanceRequest): Promise<IAttendance> {
    try {
      logger.info('AttendanceService: Check-in request', { userId });

      // Validate location data if provided
      if (attendanceData.location) {
        const { latitude, longitude, accuracy } = attendanceData.location;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          throw new Error('Invalid location data');
        }
        if (accuracy && typeof accuracy !== 'number') {
          throw new Error('Invalid location accuracy');
        }

        // Verify office location if required
        if (process.env.REQUIRE_OFFICE_LOCATION === 'true') {
          const isValidLocation = this.verifyOfficeLocation(latitude, longitude);
          if (!isValidLocation) {
            const distance = this.calculateDistanceFromOffice(latitude, longitude);
            const allowFallback = process.env.ALLOW_LOCATION_FALLBACK === 'true';

            if (!allowFallback) {
              throw new Error(`You are ${Math.round(distance)}m from the office. Please move closer to check in.`);
            } else {
              logger.warn('AttendanceService: Check-in from outside office radius, but fallback allowed', {
                userId,
                distance: Math.round(distance)
              });
            }
          }
        }
      }

      // Get employee ID from user ID
      const employeeId = await this.getEmployeeIdFromUserId(userId);

      const attendance = await this.attendanceRepository.checkIn(employeeId, attendanceData);

      logger.info('AttendanceService: Check-in successful', { attendanceId: attendance.id });
      return attendance;
    } catch (error) {
      logger.error('AttendanceService: Check-in failed', { error: (error as Error).message });
      throw error;
    }
  }

  async checkOut(userId: string, attendanceData: CreateAttendanceRequest): Promise<IAttendance> {
    try {
      logger.info('AttendanceService: Check-out request', { userId });

      // Validate location data if provided
      if (attendanceData.location) {
        const { latitude, longitude, accuracy } = attendanceData.location;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          throw new Error('Invalid location data');
        }
        if (accuracy && typeof accuracy !== 'number') {
          throw new Error('Invalid location accuracy');
        }
      }

      // Get employee ID from user ID
      const employeeId = await this.getEmployeeIdFromUserId(userId);

      const attendance = await this.attendanceRepository.checkOut(employeeId, attendanceData);

      logger.info('AttendanceService: Check-out successful', { attendanceId: attendance.id });
      return attendance;
    } catch (error) {
      logger.error('AttendanceService: Check-out failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getCurrentStatus(userId: string): Promise<IAttendance | null> {
    try {
      const employeeId = await this.getEmployeeIdFromUserId(userId);
      return await this.attendanceRepository.getCurrentStatus(employeeId);
    } catch (error) {
      logger.error('AttendanceService: Get current status failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getAttendanceHistory(employeeId: string, startDate?: Date, endDate?: Date, page?: number, limit?: number): Promise<{ attendances: IAttendance[]; total: number; page: number; limit: number }> {
    try {
      const query = {
        employeeId,
        startDate,
        endDate,
        page,
        limit
      };

      return await this.attendanceRepository.getAttendanceHistory(query);
    } catch (error) {
      logger.error('AttendanceService: Get attendance history failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getMyAttendanceHistory(userId: string, startDate?: Date, endDate?: Date, page?: number, limit?: number): Promise<{ attendances: IAttendance[]; total: number; page: number; limit: number }> {
    try {
      const employeeId = await this.getEmployeeIdFromUserId(userId);
      return await this.getAttendanceHistory(employeeId, startDate, endDate, page, limit);
    } catch (error) {
      logger.error('AttendanceService: Get my attendance history failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getEmployeeAttendance(employeeId: string, startDate?: Date, endDate?: Date): Promise<IAttendance[]> {
    try {
      return await this.attendanceRepository.getEmployeeAttendance(employeeId, startDate, endDate);
    } catch (error) {
      logger.error('AttendanceService: Get employee attendance failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getAttendanceById(id: string): Promise<IAttendance | null> {
    try {
      return await this.attendanceRepository.getAttendanceById(id);
    } catch (error) {
      logger.error('AttendanceService: Get attendance by ID failed', { error: (error as Error).message });
      throw error;
    }
  }

  async updateAttendance(id: string, attendanceData: Partial<IAttendance>): Promise<IAttendance> {
    try {
      return await this.attendanceRepository.updateAttendance(id, attendanceData);
    } catch (error) {
      logger.error('AttendanceService: Update attendance failed', { error: (error as Error).message });
      throw error;
    }
  }

  async deleteAttendance(id: string): Promise<void> {
    try {
      await this.attendanceRepository.deleteAttendance(id);
    } catch (error) {
      logger.error('AttendanceService: Delete attendance failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getAttendanceReport(employeeId?: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      return await this.attendanceRepository.getAttendanceReport(employeeId, startDate, endDate);
    } catch (error) {
      logger.error('AttendanceService: Get attendance report failed', { error: (error as Error).message });
      throw error;
    }
  }

  private verifyOfficeLocation(latitude: number, longitude: number): boolean {
    const officeLatitude = parseFloat(process.env.OFFICE_LATITUDE || '0');
    const officeLongitude = parseFloat(process.env.OFFICE_LONGITUDE || '0');
    const officeRadius = parseFloat(process.env.OFFICE_RADIUS || '100');

    if (officeLatitude === 0 || officeLongitude === 0) {
      // If office location not configured, allow all locations
      return true;
    }

    const distance = this.calculateDistanceFromOffice(latitude, longitude);
    return distance <= officeRadius;
  }

  private calculateDistanceFromOffice(latitude: number, longitude: number): number {
    const officeLatitude = parseFloat(process.env.OFFICE_LATITUDE || '0');
    const officeLongitude = parseFloat(process.env.OFFICE_LONGITUDE || '0');

    const R = 6371e3; // Earth's radius in meters
    const φ1 = latitude * Math.PI / 180;
    const φ2 = officeLatitude * Math.PI / 180;
    const Δφ = (officeLatitude - latitude) * Math.PI / 180;
    const Δλ = (officeLongitude - longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  private async getEmployeeIdFromUserId(userId: string): Promise<string> {
    try {
      return await this.attendanceRepository.getEmployeeIdFromUserId(userId);
    } catch (error) {
      logger.error('AttendanceService: Get employee ID failed', { error: (error as Error).message });
      throw error;
    }
  }
}
