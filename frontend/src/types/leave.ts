// Leave Request Types - Aligned with Backend API

export interface LeaveRequest {
  id: string;
  employee_id: string;
  type: 'annual' | 'sick' | 'maternity' | 'paternity' | 'emergency' | 'unpaid' | 'personal';
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  reason?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  days_requested?: number;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  // Additional fields from joins
  employee_name?: string;
  employee_email?: string;
  department?: string;
}

export interface CreateLeaveRequestData {
  employee_id: string;
  type: 'annual' | 'sick' | 'maternity' | 'paternity' | 'emergency' | 'unpaid' | 'personal';
  start_date: string; // ISO date string (YYYY-MM-DD)
  end_date: string; // ISO date string (YYYY-MM-DD)
  reason?: string;
  notes?: string;
}

export interface UpdateLeaveRequestData {
  type?: 'annual' | 'sick' | 'maternity' | 'paternity' | 'emergency' | 'unpaid' | 'personal';
  start_date?: string;
  end_date?: string;
  reason?: string;
  notes?: string;
}

export interface ApproveLeaveRequestData {
  approved_by: string;
  approval_comments?: string;
}

export interface RejectLeaveRequestData {
  approved_by: string;
  rejection_reason: string;
}

export interface LeaveRequestStats {
  totalDaysTaken: number;
  byType: Record<string, number>;
  year: number;
}

// API Response Types
export interface LeaveRequestResponse {
  status: 'success' | 'error';
  message?: string;
  data?: {
    leaveRequest?: LeaveRequest;
    leaveRequests?: LeaveRequest[];
    count?: number;
    stats?: LeaveRequestStats;
  };
}

// Form Data Type (for frontend forms)
export interface LeaveRequestFormData {
  type: string;
  startDate: string; // camelCase for form binding
  endDate: string; // camelCase for form binding
  reason: string;
  notes?: string;
}

// Transform functions to convert between frontend and backend formats
export const transformToBackendFormat = (formData: LeaveRequestFormData): CreateLeaveRequestData => ({
  employee_id: '', // Will be set by the service
  type: formData.type as CreateLeaveRequestData['type'],
  start_date: formData.startDate,
  end_date: formData.endDate,
  reason: formData.reason,
  notes: formData.notes
});

export const transformFromBackendFormat = (backendData: LeaveRequest): LeaveRequest => ({
  ...backendData,
  // Ensure consistent field names
  employee_id: backendData.employee_id,
  start_date: backendData.start_date,
  end_date: backendData.end_date,
  created_at: backendData.created_at,
  updated_at: backendData.updated_at
});