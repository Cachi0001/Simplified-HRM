import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { CreateUserRequest, LoginRequest } from '../models/User';
import { EmailService } from '../services/EmailService';
import logger from '../utils/logger';

export class AuthController {
  constructor(private authService: AuthService) {}

  async signUp(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserRequest = req.body;

      logger.info('🔍 [AuthController] Signup request received', {
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role || 'employee',
        hasPassword: !!userData.password,
        body: JSON.stringify(req.body, null, 2)
      });

      const result = await this.authService.signUp(userData);

      // Check if email confirmation is required
      if (result.requiresConfirmation) {
        logger.info('📧 [AuthController] Magic link sent - returning confirmation response', {
          userId: result.user.id,
          email: userData.email
        });

        res.status(200).json({
          status: 'success',
          message: result.message || 'Check your inbox – we sent you a magic link to confirm your account',
          data: {
            user: result.user,
            requiresConfirmation: true
          }
        });
        return;
      }

      logger.info('✅ [AuthController] Signup successful', {
        userId: result.user.id,
        email: userData.email,
        role: result.user.role
      });

      res.status(201).json({
        status: 'success',
        message: result.message || 'User registered successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        }
      });
    } catch (error) {
      logger.error('❌ [AuthController] Signup error', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        email: req.body.email,
        body: JSON.stringify(req.body, null, 2)
      });

      // Provide more specific error messages
      let errorMessage = (error as Error).message;
      if (errorMessage.includes('Email already registered')) {
        errorMessage = 'This email is already registered. Please try signing in instead.';
      } else if (errorMessage.includes('Database error')) {
        errorMessage = 'There was an issue creating your account. Please contact support.';
      } else if (errorMessage.includes('Email and full name are required')) {
        errorMessage = 'Email and full name are required.';
      }

      res.status(400).json({
        status: 'error',
        message: errorMessage,
        originalError: (error as Error).message
      });
    }
  }

  async signIn(req: Request, res: Response): Promise<void> {
    try {
      const credentials: LoginRequest = req.body;

      logger.info('🔐 [AuthController] Magic link signin request', { email: credentials.email });

      const result = await this.authService.signIn(credentials);

      // Magic link always sent for passwordless login
      res.status(200).json({
        status: 'success',
        message: result.message || 'Check your inbox – we sent you a magic link to sign in',
        data: {
          user: result.user,
          requiresConfirmation: true
        }
      });
    } catch (error) {
      logger.error('❌ [AuthController] Signin error', { error: (error as Error).message });

      // Handle email confirmation as a special case (not a 401 error)
      let errorMessage = (error as Error).message;
      let statusCode = 401; // Default for auth errors

      if (errorMessage.includes('EMAIL_NOT_CONFIRMED:')) {
        statusCode = 400; // Client error, not auth error
        errorMessage = errorMessage.replace('EMAIL_NOT_CONFIRMED:', '');
      } else if (errorMessage.includes('Invalid login credentials')) {
        statusCode = 401;
        errorMessage = 'Invalid email or password';
      } else if (errorMessage.includes('Employee record not found')) {
        statusCode = 404;
        errorMessage = 'Account not found. Please contact support.';
      } else if (errorMessage.includes('Account pending admin approval')) {
        statusCode = 403;
        errorMessage = 'Your account is pending admin approval. Please wait for approval or contact support.';
      }

      res.status(statusCode).json({
        status: 'error',
        message: errorMessage,
        errorType: errorMessage.includes('EMAIL_NOT_CONFIRMED:') ? 'email_not_confirmed' : 'authentication_error'
      });
    }
  }

  async signInWithGoogle(req: Request, res: Response): Promise<void> {
    try {
      const { provider, idToken } = req.body;

      logger.info('AuthController: Google OAuth request', { provider });

      const result = await this.authService.signInWithGoogle(provider, idToken);

      res.status(200).json({
        status: 'success',
        message: 'Google OAuth successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        }
      });
    } catch (error) {
      logger.error('AuthController: Google OAuth error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const accessToken = req.headers.authorization?.split(' ')[1];

      if (!accessToken) {
        res.status(401).json({
          status: 'error',
          message: 'Access token is required'
        });
        return;
      }

      const user = await this.authService.getCurrentUser(accessToken);

      res.status(200).json({
        status: 'success',
        data: { user }
      });
    } catch (error) {
      logger.error('AuthController: Get current user error', { error: (error as Error).message });
      res.status(401).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async signOut(req: Request, res: Response): Promise<void> {
    try {
      const accessToken = req.headers.authorization?.split(' ')[1];

      if (!accessToken) {
        res.status(401).json({
          status: 'error',
          message: 'Access token is required'
        });
        return;
      }

      await this.authService.signOut(accessToken);

      res.status(200).json({
        status: 'success',
        message: 'User signed out successfully'
      });
    } catch (error) {
      logger.error('AuthController: Signout error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          status: 'error',
          message: 'Refresh token is required'
        });
        return;
      }

      const result = await this.authService.refreshToken(refreshToken);

      res.status(200).json({
        status: 'success',
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        }
      });
    } catch (error) {
      logger.error('AuthController: Token refresh error', { error: (error as Error).message });
      res.status(401).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          status: 'error',
          message: 'Email is required'
        });
        return;
      }

      await this.authService.resetPassword(email);

      res.status(200).json({
        status: 'success',
        message: 'Password reset email sent successfully'
      });
    } catch (error) {
      logger.error('AuthController: Password reset error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async resendConfirmationEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          status: 'error',
          message: 'Email is required'
        });
        return;
      }

      // Use service to resend confirmation email
      const result = await this.authService.resendConfirmationEmail(email);

      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      logger.error('AuthController: Resend confirmation error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async notifyAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { email, fullName } = req.body;

      if (!email || !fullName) {
        res.status(400).json({
          status: 'error',
          message: 'Email and full name are required'
        });
        return;
      }

      // Send admin notification email
      const emailService = new EmailService();
      await emailService.sendApprovalNotification(email, fullName);

      res.status(200).json({
        status: 'success',
        message: 'Admin notification sent successfully'
      });
    } catch (error) {
      logger.error('AuthController: Admin notification error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async confirmEmail(req: Request, res: Response): Promise<void> {
    try {
      const { accessToken, refreshToken } = req.body;

      if (!accessToken || !refreshToken) {
        res.status(400).json({
          status: 'error',
          message: 'Access token and refresh token are required'
        });
        return;
      }

      logger.info('🔗 [AuthController] Email confirmation request', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken
      });

      // Set the session using the tokens
      const result = await this.authService.confirmEmail(accessToken, refreshToken);

      if (!result.user) {
        throw new Error('Failed to confirm email - invalid tokens');
      }

      const user = result.user;
      logger.info('✅ [AuthController] Session confirmed successfully', {
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Check if user exists in employees table and get their status
      const { data: employee, error: empError } = await this.authService.getEmployeeByUserId(user.id);

      if (empError || !employee) {
        logger.warn('⚠️ [AuthController] Employee record not found, creating one...', {
          userId: user.id,
          email: user.email
        });

        // Create employee record for new signup
        const newEmployee = await this.authService.createEmployeeRecord({
          user_id: user.id,
          email: user.email!,
          full_name: user.fullName,
          role: user.role || 'employee',
          status: 'pending'
        });

        logger.info('✅ [AuthController] Employee record created', {
          employeeId: newEmployee.id,
          userId: user.id
        });

        res.status(200).json({
          status: 'success',
          message: 'Email confirmed successfully! Your account is pending admin approval.',
          data: {
            user: {
              ...user,
              status: 'pending'
            },
            redirectTo: '/auth',
            requiresApproval: true
          }
        });
        return;
      }

      // User exists - check their status
      if (employee.status === 'active') {
        // Approved user - redirect to dashboard
        logger.info('✅ [AuthController] User is approved, redirecting to dashboard', {
          employeeId: employee.id,
          role: employee.role
        });

        res.status(200).json({
          status: 'success',
          message: 'Welcome back! Redirecting to dashboard...',
          data: {
            user: {
              ...user,
              status: 'active',
              role: employee.role
            },
            redirectTo: '/dashboard',
            requiresApproval: false
          }
        });
      } else if (employee.status === 'pending') {
        // Still pending approval
        logger.info('⏳ [AuthController] User is still pending approval', {
          employeeId: employee.id,
          email: user.email
        });

        res.status(200).json({
          status: 'success',
          message: 'Email confirmed! Your account is still pending admin approval.',
          data: {
            user: {
              ...user,
              status: 'pending'
            },
            redirectTo: '/auth',
            requiresApproval: true
          }
        });
      } else {
        // Rejected or other status
        logger.warn('❌ [AuthController] User account is not active', {
          employeeId: employee.id,
          status: employee.status
        });

        res.status(403).json({
          status: 'error',
          message: 'Your account is not active. Please contact your administrator.',
          data: {
            redirectTo: '/auth'
          }
        });
      }
    } catch (error) {
      logger.error('❌ [AuthController] Email confirmation failed', {
        error: (error as Error).message,
        stack: (error as Error).stack
      });

      res.status(400).json({
        status: 'error',
        message: 'Email confirmation failed. Please try again or contact support.',
        originalError: (error as Error).message
      });
    }
  }

  async updatePassword(req: Request, res: Response): Promise<void> {
    try {
      const accessToken = req.headers.authorization?.split(' ')[1];
      const { newPassword } = req.body;

      if (!accessToken || !newPassword) {
        res.status(400).json({
          status: 'error',
          message: 'Access token and new password are required'
        });
        return;
      }

      await this.authService.updatePassword(accessToken, newPassword);

      logger.info('AuthController: Password updated successfully');

      res.status(200).json({
        status: 'success',
        message: 'Password updated successfully'
      });
    } catch (error) {
      logger.error('AuthController: Password update error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }
}
