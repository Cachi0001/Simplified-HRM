import { IAuthRepository } from '../repositories/interfaces/IAuthRepository';
import { IUser, CreateUserRequest, LoginRequest, AuthResponse } from '../models/User';
import logger from '../utils/logger';

export class AuthService {
  constructor(private authRepository: IAuthRepository) {}

  async signUp(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      logger.info('🔍 [AuthService] Starting signup process', {
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role || 'employee',
        hasPassword: !!userData.password
      });

      if (!userData.email || !userData.fullName || !userData.password) {
        logger.error('❌ [AuthService] Missing required fields', {
          hasEmail: !!userData.email,
          hasFullName: !!userData.fullName,
          hasPassword: !!userData.password
        });
        throw new Error('Email, full name, and password are required');
      }

      logger.info('🔄 [AuthService] Calling repository signup...');
      const result = await this.authRepository.signUp(userData);

      // Check if email confirmation is required
      if (result.requiresEmailVerification) {
        logger.info('📧 [AuthService] Email verification required - returning confirmation response', {
          userId: result.user.id,
          email: userData.email
        });

        return {
          user: result.user,
          accessToken: '',
          refreshToken: '',
          requiresEmailVerification: true,
          message: result.message || 'Account created! Please check your email to verify your account before logging in.'
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
      logger.info('🔐 [AuthService] Password signin request', { email: credentials.email });

      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }

      const result = await this.authRepository.signIn(credentials);

      logger.info('✅ [AuthService] User signed in successfully', { email: credentials.email });
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

  async getCurrentUser(accessToken: string): Promise<IUser> {
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

      // For MongoDB, email verification is handled via refresh token
      // This method can be used for email verification token confirmation
      if (!accessToken || !refreshToken) {
        throw new Error('Both access token and refresh token are required');
      }

      // Use the repository's refresh token method to verify and get new tokens
      const result = await this.authRepository.refreshToken(refreshToken);

      // Mark email as verified
      if (result.user) {
        result.user.emailVerified = true;
        result.user.emailVerificationToken = undefined;
        await result.user.save();
      }

      logger.info('✅ [AuthService] Email confirmed successfully', {
        userId: result.user._id,
        email: result.user.email
      });

      return {
        ...result,
        message: 'Email verified successfully',
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

  async confirmEmailByToken(token: string): Promise<AuthResponse> {
    try {
      logger.info('🔗 [AuthService] Confirming email by token', { token });

      const result = await this.authRepository.confirmEmailByToken(token);

      logger.info('✅ [AuthService] Email confirmed by token successfully', {
        userId: result.user._id,
        email: result.user.email
      });

      return result;
    } catch (error) {
      logger.error('❌ [AuthService] Confirm email by token failed', { error: (error as Error).message });
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
