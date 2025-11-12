// Shared Employee interface to ensure consistency across components
export interface Employee {
  id: string;
  _id?: string; // For backward compatibility with MongoDB-style IDs
  userId?: string;
  user_id?: string;
  employee_id?: string;
  email: string;
  fullName?: string;
  full_name?: string;
  role: 'employee' | 'hr' | 'admin' | 'superadmin' | 'teamlead';
  department?: string;
  departmentId?: string;
  department_id?: string;
  position?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  status: 'active' | 'pending' | 'rejected' | 'inactive';
  emailVerified?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  hireDate?: string;
  hire_date?: string;
  profilePicture?: string;
  profile_picture?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  profile_completed?: boolean;
  manager_id?: string;
  team_lead_id?: string;
  lead_department_id?: string; // Department this employee leads (for team leads)
  salary?: number;
  work_days?: string[];
  working_days?: any;
}

// For API responses
export interface EmployeeResponse {
  employees: Employee[];
  total: number;
  page?: number;
  limit?: number;
}

// For creating new employees
export interface CreateEmployeeRequest {
  email: string;
  fullName: string;
  role?: string;
  departmentId?: string;
  position?: string;
  phone?: string;
  address?: string;
}

// For updating employees
export interface UpdateEmployeeRequest {
  fullName?: string;
  role?: string;
  departmentId?: string;
  position?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'pending' | 'rejected';
  profilePicture?: string;
}