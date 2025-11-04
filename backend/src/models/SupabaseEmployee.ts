// Supabase-compatible Employee interface (no Mongoose dependencies)
export interface IEmployee {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'employee' | 'hr' | 'superadmin' | 'teamlead';
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  hireDate?: Date;
  profilePicture?: string;
  status: 'active' | 'pending' | 'rejected';
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  profileUpdatedAt?: Date; // Timestamp of when profile was last updated
  performanceScore?: number; // Performance score for the employee
  working_days?: string[]; // Working days configuration
  working_hours?: { start: string; end: string }; // Working hours configuration
  timezone?: string; // Timezone for accurate calculations
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response interfaces
export interface CreateEmployeeRequest {
  email: string;
  fullName: string;
  role: 'admin' | 'employee' | 'hr' | 'superadmin' | 'teamlead';
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  hireDate?: Date;
  profilePicture?: string;
}

export interface UpdateEmployeeRequest {
  fullName?: string;
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  hireDate?: Date;
  profilePicture?: string;
  role?: 'admin' | 'employee' | 'hr' | 'superadmin' | 'teamlead';
  status?: 'active' | 'rejected' | 'pending';
  profileUpdatedAt?: Date;
  performanceScore?: number;
  working_days?: string[];
  working_hours?: { start: string; end: string };
  timezone?: string;
}

export interface EmployeeQuery {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  status?: 'active' | 'rejected' | 'pending';
  role?: 'admin' | 'employee' | 'hr' | 'superadmin' | 'teamlead';
}

// Employee Approval Request
export interface EmployeeApprovalRequest {
  employee_id: string;
  new_role: 'admin' | 'employee' | 'hr' | 'superadmin' | 'teamlead';
  approved_by_id?: string;
  reason?: string;
}
