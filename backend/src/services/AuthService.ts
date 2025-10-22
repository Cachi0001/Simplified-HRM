import { IAuthRepository } from '../repositories/interfaces/IAuthRepository';
import { User, CreateUserRequest, LoginRequest, AuthResponse } from '../models/User';
import logger from '../utils/logger';

export class AuthService {
  constructor(private authRepository: IAuthRepository) {}

  async signUp(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      logger.info('🔍 [AuthService] Starting passwordless signup process', {
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role || 'employee'
      });

      if (!userData.email || !userData.fullName) {
        logger.error('❌ [AuthService] Missing required fields', {
          hasEmail: !!userData.email,
          hasFullName: !!userData.fullName
        });
        throw new Error('Email and full name are required');
      }

      logger.info('🔄 [AuthService] Calling repository signup...');
      const result = await this.authRepository.signUp(userData);

      // Check if email confirmation is required
      if (result.requiresConfirmation) {
        logger.info('📧 [AuthService] Email confirmation required - returning confirmation response', {
          userId: result.user.id,
          email: userData.email
        });

        return {
          user: result.user,
          accessToken: '',
          refreshToken: '',
          requiresConfirmation: true,
          message: result.message || 'Check your email to confirm your account'
        };
      }

      logger.info('✅ [AuthService] User signed up successfully', {
        userId: result.user.id,
        email: userData.email,
        role: result.user.role
      });

      return result;
    } catch (error) {
      logger.error('❌ [AuthService] Signup failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        email: userData.email
      });
      throw error;
    }
  }

  async signIn(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      logger.info('🔐 [AuthService] Passwordless signin request', { email: credentials.email });

      if (!credentials.email) {
        throw new Error('Email is required');
      }

      const result = await this.authRepository.signIn(credentials);

      logger.info('✅ [AuthService] Magic link sent successfully', { email: credentials.email });
      return result;
    } catch (error) {
      logger.error('❌ [AuthService] Signin failed', { error: (error as Error).message });
      throw error;
    }
  }

  async signInWithGoogle(provider: string, idToken?: string): Promise<AuthResponse> {
    try {
      logger.info('AuthService: Google OAuth signin', { provider });

      const result = await this.authRepository.signInWithOAuth(provider, idToken);

      logger.info('AuthService: Google OAuth successful');
      return result;
    } catch (error) {
      logger.error('AuthService: Google OAuth failed', { error: (error as Error).message });
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      if (!refreshToken) {
        throw new Error('Refresh token is required');
      }

      return await this.authRepository.refreshToken(refreshToken);
    } catch (error) {
      logger.error('AuthService: Token refresh failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getCurrentUser(accessToken: string): Promise<User> {
    try {
      if (!accessToken) {
        throw new Error('Access token is required');
      }

      const user = await this.authRepository.getCurrentUser(accessToken);

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('AuthService: Get current user failed', { error: (error as Error).message });
      throw error;
    }
  }

  async signOut(accessToken: string): Promise<void> {
    try {
      if (!accessToken) {
        throw new Error('Access token is required');
      }

      await this.authRepository.signOut(accessToken);
      logger.info('AuthService: User signed out');
    } catch (error) {
      logger.error('AuthService: Signout failed', { error: (error as Error).message });
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      if (!email) {
        throw new Error('Email is required');
      }

      await this.authRepository.resetPassword(email);
      logger.info('AuthService: Password reset email sent', { email });
    } catch (error) {
      logger.error('AuthService: Password reset failed', { error: (error as Error).message });
      throw error;
    }
  }

  async resendConfirmationEmail(email: string): Promise<{ message: string }> {
    try {
      if (!email) {
        throw new Error('Email is required');
      }

      const result = await this.authRepository.resendConfirmationEmail(email);
      logger.info('AuthService: Confirmation email resent', { email });

      return result; // Return the repository response directly
    } catch (error) {
      logger.error('AuthService: Resend confirmation failed', { error: (error as Error).message });
      throw error;
    }
  }

  async confirmEmail(accessToken: string, refreshToken: string): Promise<AuthResponse> {
    try {
      logger.info('🔗 [AuthService] Confirming email with tokens');

      // Set the session using the tokens from the magic link
      const { data, error } = await this.authRepository.setSession(accessToken, refreshToken);

      if (error) {
        logger.error('❌ [AuthService] Session confirmation failed', { error: error.message });
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        throw new Error('Invalid tokens provided');
      }

      logger.info('✅ [AuthService] Email confirmed successfully', {
        userId: data.user.id,
        email: data.user.email
      });

      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          fullName: data.user.user_metadata?.full_name || data.user.email!,
          role: data.user.user_metadata?.role || 'employee',
          emailVerified: !!data.user.email_confirmed_at,
          createdAt: new Date(data.user.created_at!),
          updatedAt: new Date(data.user.updated_at || data.user.created_at!),
        },
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error) {
      logger.error('❌ [AuthService] Confirm email failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getEmployeeByUserId(userId: string): Promise<any> {
    try {
      return await this.authRepository.getEmployeeByUserId(userId);
    } catch (error) {
      logger.error('AuthService: Get employee by user ID failed', { error: (error as Error).message });
      throw error;
    }
  }

  async createEmployeeRecord(employeeData: any): Promise<any> {
    try {
      return await this.authRepository.createEmployeeRecord(employeeData);
    } catch (error) {
      logger.error('AuthService: Create employee record failed', { error: (error as Error).message });
      throw error;
    }
  }

  async updatePassword(accessToken: string, newPassword: string): Promise<void> {
    try {
      if (!accessToken || !newPassword) {
        throw new Error('Access token and new password are required');
      }

      await this.authRepository.updatePassword(accessToken, newPassword);
      logger.info('AuthService: Password updated');
    } catch (error) {
      logger.error('AuthService: Password update failed', { error: (error as Error).message });
      throw error;
    }
  }
}
