// Shared Employee interface to ensure consistency across components
export interface Employee {
  id: string;
  _id?: string; // For backward compatibility with MongoDB-style IDs
  userId?: string;
  email: string;
  fullName: string;
  role: 'employee' | 'hr' | 'admin' | 'superadmin';
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
  status: 'active' | 'pending' | 'rejected';
  emailVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
  hireDate?: string;
  profilePicture?: string;
}

// Extended Employee interface matching backend model
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
  dateOfBirth?: Date | string;
  hireDate?: Date | string;
  profilePicture?: string;
  status: 'active' | 'pending' | 'rejected';
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date | string;
  passwordResetToken?: string;
  passwordResetExpires?: Date | string;
  profileUpdatedAt?: Date | string;
  performanceScore?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
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
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
}

// For updating employees
export interface UpdateEmployeeRequest {
  fullName?: string;
  role?: string;
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'pending' | 'rejected';
  profilePicture?: string;
}