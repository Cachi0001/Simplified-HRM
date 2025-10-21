import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { SupabaseAuthRepository } from '../repositories/implementations/SupabaseAuthRepository';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

const authRepository = new SupabaseAuthRepository();
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

router.post('/signup', (req, res) => authController.signUp(req, res));
router.post('/login', (req, res) => authController.signIn(req, res));
router.get('/me', authenticateToken, (req, res) => authController.getCurrentUser(req, res));
router.post('/refresh', authenticateToken, (req, res) => authController.refreshToken(req, res));
router.post('/signout', (req, res) => authController.signOut(req, res));
router.post('/forgot-password', (req, res) => authController.resetPassword(req, res));
router.post('/google', (req, res) => authController.signInWithGoogle(req, res));
router.post('/logout', authenticateToken, (req, res) => authController.signOut(req, res));
router.post('/update-password', authenticateToken, (req, res) => authController.updatePassword(req, res));

export default router;
