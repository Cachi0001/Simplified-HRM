import { User, CreateUserRequest, LoginRequest, AuthResponse } from '../../models/User';

export interface IAuthRepository {
  signUp(userData: CreateUserRequest): Promise<AuthResponse>;
  signIn(credentials: LoginRequest): Promise<AuthResponse>;
  signInWithOAuth(provider: string, idToken?: string): Promise<AuthResponse>;
  refreshToken(refreshToken: string): Promise<AuthResponse>;
  getCurrentUser(accessToken: string): Promise<User>;
  signOut(accessToken: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  updatePassword(accessToken: string, newPassword: string): Promise<void>;
  resendConfirmationEmail(email: string): Promise<{ message: string }>;
}
