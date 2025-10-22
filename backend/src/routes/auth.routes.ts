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
router.post('/confirm', (req, res) => authController.confirmEmail(req, res));
router.get('/me', authenticateToken, (req, res) => authController.getCurrentUser(req, res));
router.post('/refresh', authenticateToken, (req, res) => authController.refreshToken(req, res));
router.post('/signout', (req, res) => authController.signOut(req, res));
router.post('/forgot-password', (req, res) => authController.resetPassword(req, res));
router.post('/google', (req, res) => authController.signInWithGoogle(req, res));
router.post('/logout', authenticateToken, (req, res) => authController.signOut(req, res));
router.get('/test-email', async (req, res) => {
  try {
    const emailService = new EmailService();
    await emailService.sendConfirmationEmail(
      'test@example.com',
      'Test User',
      'http://localhost:5173/confirm?token=test'
    );
    res.status(200).json({ status: 'success', message: 'Test email sent successfully' });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Email test failed',
      error: (error as Error).message
    });
  }
});

export default router;
