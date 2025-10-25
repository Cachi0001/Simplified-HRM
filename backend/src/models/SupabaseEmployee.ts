// Supabase-compatible Employee interface (no Mongoose dependencies)
export interface IEmployee {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'employee';
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
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response interfaces
export interface CreateEmployeeRequest {
  email: string;
  fullName: string;
  role: 'admin' | 'employee';
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
