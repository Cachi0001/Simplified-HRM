import api from '../lib/api';

export interface CheckInRequest {
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  notes?: string;
}

export interface CheckOutRequest {
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  notes?: string;
}

export interface AttendanceStatus {
  id: string;
  employeeId: string;
  status: 'checked_in' | 'checked_out';
  checkInTime: string;
  checkOutTime?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  date: string;
}

export interface AttendanceHistory {
  attendances: AttendanceStatus[];
  totalHours: number;
  totalDays: number;
}

class AttendanceService {
  async checkIn(data: CheckInRequest): Promise<{ message: string; attendance: AttendanceStatus }> {
    try {
      const response = await api.post('/attendance/checkin', data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Check-in failed');
    }
  }

  async checkOut(data: CheckOutRequest): Promise<{ message: string; attendance: AttendanceStatus }> {
    try {
      const response = await api.post('/attendance/checkout', data);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Check-out failed');
    }
  }

  async getCurrentStatus(): Promise<AttendanceStatus | null> {
    try {
      const response = await api.get('/attendance/status');
      return response.data.data.attendance;
    } catch (error: any) {
      // If no current attendance, return null (checked out)
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(error.response?.data?.message || 'Failed to get attendance status');
    }
  }

  async getAttendanceHistory(
    startDate?: Date,
    endDate?: Date,
    page?: number,
    limit?: number
  ): Promise<AttendanceHistory> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      if (page) params.append('page', page.toString());
      if (limit) params.append('limit', limit.toString());

      const response = await api.get(`/attendance/history?${params.toString()}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get attendance history');
    }
  }

  async getEmployeeAttendance(
    employeeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AttendanceStatus[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await api.get(`/attendance/employee/${employeeId}?${params.toString()}`);
      return response.data.data.attendances;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get employee attendance');
    }
  }

  async getAttendanceReport(
    employeeId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (employeeId) params.append('employeeId', employeeId);
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await api.get(`/attendance/report?${params.toString()}`);
      return response.data.data.report;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get attendance report');
    }
  }
}

export const attendanceService = new AttendanceService();
