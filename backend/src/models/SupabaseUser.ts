// Supabase-compatible User interface (no Mongoose dependencies)
export interface IUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'employee' | 'hr' | 'superadmin';
  emailVerified: boolean;
  passwordHash: string;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshTokens?: string[];
  createdAt: Date;
  updatedAt: Date;

  // For compatibility with existing code (these methods won't be used with Supabase)
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateEmailVerificationToken(): string;
  generatePasswordResetToken(): string;
  isValidPasswordResetToken(token: string): boolean;
  isValidEmailVerificationToken(token: string): boolean;
  addRefreshToken(token: string): void;
  removeRefreshToken(token: string): void;
}

// Request/Response interfaces (unchanged)
export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role?: 'admin' | 'employee' | 'hr' | 'superadmin';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: IUser;
  accessToken: string;
  refreshToken?: string;
  requiresEmailVerification?: boolean;
  requiresConfirmation?: boolean;
  message?: string;
}
