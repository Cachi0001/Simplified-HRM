import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { EmailService } from '../services/EmailService';
import { MongoAuthRepository } from '../repositories/implementations/MongoAuthRepository';
import { authenticateToken } from '../middleware/auth.middleware';
import { User } from '../models/User';
import { Employee } from '../models/Employee';

const router = Router();

const authRepository = new MongoAuthRepository();
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

router.post('/signup', (req, res) => authController.signUp(req, res));
router.post('/login', (req, res) => authController.signIn(req, res));
router.post('/resend-confirmation', (req, res) => authController.resendConfirmationEmail(req, res));
router.get('/confirm/:token', (req, res) => authController.confirmEmailByToken(req, res));
router.post('/confirm', (req, res) => authController.confirmEmail(req, res));
router.get('/me', authenticateToken, (req, res) => authController.getCurrentUser(req, res));
router.post('/refresh', authenticateToken, (req, res) => authController.refreshToken(req, res));
router.post('/signout', (req, res) => authController.signOut(req, res));
router.post('/forgot-password', (req, res) => authController.resetPassword(req, res));
router.post('/reset-password/:token', (req, res) => authController.resetPasswordWithToken(req, res));
router.put('/update-password', (req, res) => authController.updatePassword(req, res));
router.get('/debug/tokens', async (req, res) => {
  try {
    const usersWithTokens = await User.find({ emailVerificationToken: { $exists: true } })
      .select('email emailVerificationToken emailVerificationExpires emailVerified createdAt');
    const employeesWithTokens = await Employee.find({ emailVerificationToken: { $exists: true } })
      .select('email emailVerificationToken emailVerificationExpires emailVerified status');

    res.status(200).json({
      status: 'success',
      data: {
        users: usersWithTokens,
        employees: employeesWithTokens,
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
