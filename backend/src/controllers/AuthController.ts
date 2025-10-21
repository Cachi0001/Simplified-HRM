import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { CreateUserRequest, LoginRequest } from '../models/User';
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

      logger.info('✅ [AuthController] Signup successful', {
        userId: result.user.id,
        email: userData.email,
        role: result.user.role
      });

      res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
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
      } else if (errorMessage.includes('Check your inbox')) {
        errorMessage = 'Please check your email for a confirmation link.';
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

      logger.info('AuthController: Signin request', { email: credentials.email });

      const result = await this.authService.signIn(credentials);

      res.status(200).json({
        status: 'success',
        message: 'User signed in successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        }
      });
    } catch (error) {
      logger.error('AuthController: Signin error', { error: (error as Error).message });
      res.status(401).json({
        status: 'error',
        message: (error as Error).message
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
