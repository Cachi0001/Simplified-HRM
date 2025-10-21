export interface Employee {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'employee';

  // Optional fields - can be set later in profile settings
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  hireDate?: Date;
  profilePicture?: string;

  status: 'active' | 'rejected' | 'pending';
  emailVerificationToken?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeeRequest {
  email: string;
  fullName: string;
  role: 'admin' | 'employee';

  // Optional fields for initial creation
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
  status?: 'active' | 'rejected' | 'pending';
}

export interface EmployeeQuery {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  status?: 'active' | 'rejected' | 'pending';
  role?: 'admin' | 'employee';
}
