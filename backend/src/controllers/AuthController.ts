import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { RegisterData, LoginData, PasswordResetRequest, PasswordResetConfirm } from '../types/auth.types';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: RegisterData = req.body;
      const result = await this.authService.register(data);
      res.status(201).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };
  

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: LoginData = req.body;
      const result = await this.authService.login(data);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      const result = await this.authService.verifyEmail(token);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };

  resendConfirmationEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      const result = await this.authService.resendConfirmationEmail(email);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };

  requestPasswordReset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: PasswordResetRequest = req.body;
      const result = await this.authService.requestPasswordReset(data);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: PasswordResetConfirm = req.body;
      const result = await this.authService.resetPassword(data);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };

  getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      const userData = await this.authService.getUserById(user.userId);
      res.json({
        success: true,
        data: userData
      });
    } catch (error) {
      next(error);
    }
  };
}
