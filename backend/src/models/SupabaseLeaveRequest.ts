// Supabase-compatible LeaveRequest interface
export interface ILeaveRequest {
  id: string;
  employee_id: string;
  type: string; // 'annual', 'sick', 'personal', etc.
  start_date: string | Date;
  end_date: string | Date;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at: string | Date;
  updated_at: string | Date;
}

// Request/Response interfaces
export interface CreateLeaveRequestRequest {
  employeeId?: string;
  employee_id?: string;
  type: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  notes?: string;
}

export interface UpdateLeaveRequestRequest {
  status?: 'pending' | 'approved' | 'rejected';
  notes?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
}

export interface LeaveRequestQuery {
  employeeId?: string;
  employee_id?: string;
  status?: 'pending' | 'approved' | 'rejected';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Response interface (camelCase for frontend)
export interface LeaveRequestResponse {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}