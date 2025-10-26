import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { EmailService } from '../services/EmailService';
import { SupabaseAuthRepository } from '../repositories/implementations/SupabaseAuthRepository';
import { authenticateToken } from '../middleware/auth.middleware';
import logger from '../utils/logger';

const router = Router();

const authRepository = new SupabaseAuthRepository();
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

router.post('/signup', (req, res) => authController.signUp(req, res));
router.post('/login', (req, res) => authController.signIn(req, res));
router.post('/resend-confirmation', (req, res) => authController.resendConfirmationEmail(req, res));
router.post('/confirm/:token', (req, res) => authController.confirmEmailByToken(req, res));
router.get('/confirm/:token', (req, res) => authController.confirmEmailByToken(req, res));
router.get('/me', authenticateToken, (req, res) => authController.getCurrentUser(req, res));
router.post('/refresh', authenticateToken, (req, res) => authController.refreshToken(req, res));
router.post('/signout', (req, res) => authController.signOut(req, res));
router.post('/forgot-password', (req, res) => authController.resetPassword(req, res));
router.post('/reset-password/:token', (req, res) => authController.resetPasswordWithToken(req, res));

// Handle OPTIONS requests for password reset routes
router.options('/forgot-password', (req, res) => {
  console.log('🔑 Password reset forgot-password OPTIONS request');
  res.status(200).end();
});

router.options('/reset-password/:token', (req, res) => {
  console.log('🔑 Password reset with token OPTIONS request', {
    token: req.params.token ? 'PRESENT' : 'MISSING'
  });
  res.status(200).end();
});
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

// Debug endpoint to fix email verification mismatch between users and employees tables
router.post('/debug/fix-email-verification/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    logger.info('🔧 [DEBUG] Fixing email verification mismatch', { userId });

    const supabase = authRepository.getSupabaseClient();

    // Get current employee status
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, email, status, email_verified')
      .eq('user_id', userId)
      .single();

    if (empError || !employee) {
      throw new Error(`Employee not found: ${empError?.message}`);
    }

    // Update users table to match employee table
    const { error: userError } = await supabase
      .from('users')
      .update({
        email_verified: employee.email_verified,
        email_verification_token: employee.email_verified ? null : undefined,
        email_verification_expires: employee.email_verified ? null : undefined,
      })
      .eq('id', userId);

    if (userError) {
      throw new Error(`Failed to update user: ${userError.message}`);
    }

    // Update employees table to match (in case it's not verified)
    if (!employee.email_verified) {
      const { error: empUpdateError } = await supabase
        .from('employees')
        .update({
          email_verified: true,
          email_verification_token: null,
          email_verification_expires: null,
        })
        .eq('user_id', userId);

      if (empUpdateError) {
        logger.warn('⚠️ [DEBUG] Failed to update employee verification:', empUpdateError);
      }
    }

    // Get final state
    const { data: finalUser, error: finalUserError } = await supabase
      .from('users')
      .select('id, email, email_verified')
      .eq('id', userId)
      .single();

    const { data: finalEmployee, error: finalEmpError } = await supabase
      .from('employees')
      .select('id, email, status, email_verified')
      .eq('user_id', userId)
      .single();

    res.status(200).json({
      status: 'success',
      message: 'Email verification mismatch fixed',
      data: {
        user: finalUser,
        employee: finalEmployee,
        timestamp: new Date().toISOString()
      }
    });

    logger.info('✅ [DEBUG] Email verification mismatch fixed successfully', {
      userId,
      userEmailVerified: finalUser?.email_verified,
      employeeEmailVerified: finalEmployee?.email_verified,
      employeeStatus: finalEmployee?.status
    });

  } catch (error) {
    logger.error('❌ [DEBUG] Fix email verification mismatch failed', { error: (error as Error).message });
    res.status(500).json({
      status: 'error',
      message: 'Failed to fix email verification mismatch',
      error: (error as Error).message
    });
  }
});

// Debug endpoint to manually update email verification
router.post('/debug/verify-email/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    logger.info('🔧 [DEBUG] Manual email verification update', { userId });

    // Use the service instead of direct repository call
    const supabase = authRepository.getSupabaseClient();

    // Update users table
    const { error: userError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        email_verification_token: null,
        email_verification_expires: null,
      })
      .eq('id', userId);

    if (userError) {
      throw new Error(`Failed to update user: ${userError.message}`);
    }

    // Update employees table
    const { error: empError } = await supabase
      .from('employees')
      .update({
        email_verified: true,
        email_verification_token: null,
        email_verification_expires: null,
      })
      .eq('user_id', userId);

    if (empError) {
      logger.warn('⚠️ [DEBUG] Failed to update employee record:', empError);
    }

    // Get updated data
    const { data: updatedUser, error: userQueryError } = await supabase
      .from('users')
      .select('id, email, email_verified')
      .eq('id', userId)
      .single();

    if (userQueryError) {
      throw userQueryError;
    }

    const { data: updatedEmployee, error: empQueryError } = await supabase
      .from('employees')
      .select('id, email, status, email_verified')
      .eq('user_id', userId)
      .single();

    res.status(200).json({
      status: 'success',
      message: 'Email verification updated manually',
      data: {
        user: updatedUser,
        employee: updatedEmployee || null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('❌ [DEBUG] Manual email verification failed', { error: (error as Error).message });
    res.status(500).json({
      status: 'error',
      message: 'Manual verification failed',
      error: (error as Error).message
    });
  }
});

export default router;
