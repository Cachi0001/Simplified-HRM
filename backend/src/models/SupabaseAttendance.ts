// Supabase-compatible Attendance interface (no Mongoose dependencies)
export interface IAttendance {
  id: string;
  employee_id: string;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  check_in_location?: any;
  check_out_location?: any;
  status: 'checked_in' | 'checked_out' | 'absent' | 'late' | 'half_day';
  total_hours?: number;
  minutes_late?: number; // Minutes late for early morning check-in (8:35 AM threshold)
  created_at: string;
  updated_at: string;
}

// Request/Response interfaces
export interface CreateAttendanceRequest {
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  check_in_location?: any;
  check_out_location?: any;
  status?: 'checked_in' | 'checked_out' | 'absent' | 'late' | 'half_day';
  minutes_late?: number;
}

export interface AttendanceQuery {
  employee_id?: string;
  start_date?: string;
  end_date?: string;
  status?: 'checked_in' | 'checked_out' | 'absent' | 'late' | 'half_day';
  page?: number;
  limit?: number;
}
