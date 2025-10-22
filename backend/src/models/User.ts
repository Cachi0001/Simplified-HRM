export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'employee';
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password?: string; // Optional for passwordless magic link signup
  fullName: string;
  role?: 'admin' | 'employee';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
  requiresConfirmation?: boolean;
  message?: string;
}
