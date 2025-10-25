import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { EmailService } from '../services/EmailService';
import { SupabaseAuthRepository } from '../repositories/implementations/SupabaseAuthRepository';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

const authRepository = new SupabaseAuthRepository();
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

router.post('/signup', (req, res) => authController.signUp(req, res));
router.post('/login', (req, res) => authController.signIn(req, res));
router.post('/resend-confirmation', (req, res) => authController.resendConfirmationEmail(req, res));
router.post('/confirm/:token', (req, res) => authController.confirmEmailByToken(req, res));
router.get('/me', authenticateToken, (req, res) => authController.getCurrentUser(req, res));
router.post('/refresh', authenticateToken, (req, res) => authController.refreshToken(req, res));
router.post('/signout', (req, res) => authController.signOut(req, res));
router.post('/forgot-password', (req, res) => authController.resetPassword(req, res));
router.post('/reset-password/:token', (req, res) => authController.resetPasswordWithToken(req, res));
router.put('/update-password', (req, res) => authController.updatePassword(req, res));
router.get('/debug/tokens', async (req, res) => {
  try {
    // Get Supabase client from the auth repository
    const supabase = authRepository.getSupabaseClient();

    const { data: usersWithTokens, error: usersError } = await supabase
      .from('users')
      .select('id, email, email_verified, email_verification_token, email_verification_expires, created_at')
      .not('email_verification_token', 'is', null);

    if (usersError) {
      throw usersError;
    }

    const { data: employeesWithTokens, error: employeesError } = await supabase
      .from('employees')
      .select('id, email, status, email_verified, email_verification_token, email_verification_expires')
      .not('email_verification_token', 'is', null);

    if (employeesError) {
      throw employeesError;
    }

    res.status(200).json({
      status: 'success',
      data: {
        users: usersWithTokens || [],
        employees: employeesWithTokens || [],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Debug query failed',
      error: (error as Error).message
    });
  }
});

export default router;
