export interface Attendance {
  id: string;
  employeeId: string;
  checkInTime: Date;
  checkOutTime?: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  status: 'checked_in' | 'checked_out';
  date: Date;
  totalHours?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAttendanceRequest {
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  notes?: string;
}

export interface CheckInRequest extends CreateAttendanceRequest {
  type: 'checkin';
}

export interface CheckOutRequest extends CreateAttendanceRequest {
  type: 'checkout';
}

export interface AttendanceQuery {
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'checked_in' | 'checked_out';
  page?: number;
  limit?: number;
}
