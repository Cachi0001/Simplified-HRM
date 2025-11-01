import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IAuthRepository } from '../interfaces/IAuthRepository';
import { IUser, CreateUserRequest, LoginRequest, AuthResponse } from '../../models/SupabaseUser';
import logger from '../../utils/logger';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { EmailService } from '../../services/EmailService';

export class SupabaseAuthRepository implements IAuthRepository {
  private supabase: SupabaseClient;
  private jwtSecret: string;
  private jwtRefreshSecret: string;

  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key';

    if (!process.env.JWT_SECRET) {
      logger.warn('JWT_SECRET not set, using fallback secret');
    }
  }

  async signUp(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      logger.info('🔍 [SupabaseAuthRepository] Starting signup process', {
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role || 'employee'
      });

      // Check if user already exists
      const { data: existingUser, error: checkError } = await this.supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Database error: ${checkError.message}`);
      }

      if (existingUser) {
        logger.warn('❌ [SupabaseAuthRepository] User already exists', { email: userData.email });
        throw new Error('This email is already registered. Please try signing in instead.');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create user
      const { data: newUser, error: userError } = await this.supabase
        .from('users')
        .insert({
          email: userData.email,
          password_hash: passwordHash,
          full_name: userData.fullName,
          role: userData.role || 'employee',
          email_verified: false,
          email_verification_token: verificationToken,
          email_verification_expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
          refresh_tokens: [], // Initialize as empty array
        })
        .select()
        .single();

      if (userError) {
        logger.error('❌ [SupabaseAuthRepository] User creation failed:', userError);
        throw new Error(`Failed to create user: ${userError.message}`);
      }

      // Create employee record
      const employeeStatus = userData.role === 'admin' ? 'active' : 'pending';
      const { data: newEmployee, error: employeeError } = await this.supabase
        .from('employees')
        .insert({
          user_id: newUser.id,
          email: userData.email,
          full_name: userData.fullName,
          role: userData.role || 'employee',
          status: employeeStatus,
          email_verified: false,
          email_verification_token: verificationToken,
          email_verification_expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (employeeError) {
        logger.error('❌ [SupabaseAuthRepository] Employee creation failed:', employeeError);
        throw new Error(`Failed to create employee record: ${employeeError.message}`);
      }

      // Send confirmation email
      const confirmationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm?token=${verificationToken}`;
      await this.sendEmailConfirmation(userData.email, userData.fullName, confirmationUrl);

      logger.info('✅ [SupabaseAuthRepository] User created successfully', {
        userId: newUser.id,
        email: userData.email,
        role: userData.role,
        status: employeeStatus
      });

      return {
        user: this.mapSupabaseUserToInterface(newUser, newEmployee),
        accessToken: '',
        refreshToken: '',
        requiresEmailVerification: true,
        message: 'Please check your email to verify your account. You will be able to login after email verification and admin approval.',
      };

    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Signup failed:', error);
      throw error;
    }
  }

  async signIn(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      logger.info('🔍 [SupabaseAuthRepository] Starting signin process', {
        email: credentials.email
      });

      // Find user by email
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select(`
          *,
          employees!inner(*)
        `)
        .eq('email', credentials.email)
        .single();

      if (userError || !user) {
        logger.warn('❌ [SupabaseAuthRepository] User not found', { email: credentials.email });
        throw new Error('Invalid email or password');
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
      if (!isPasswordValid) {
        logger.warn('❌ [SupabaseAuthRepository] Invalid password', { email: credentials.email });
        throw new Error('Invalid email or password');
      }

      const employeeRecords = Array.isArray(user.employees) ? user.employees : [user.employees].filter(Boolean);
      const employee = employeeRecords[0];

      if (!employee) {
        logger.error('❌ [SupabaseAuthRepository] Employee record not found for user', {
          userId: user.id,
          email: user.email,
          role: user.role
        });
        throw new Error('Employee record not found. Please contact support.');
      }

      logger.info('🔍 [SupabaseAuthRepository] Signin validation check:', {
        userId: user.id,
        email: user.email,
        userEmailVerified: user.email_verified,
        employeeEmailVerified: employee.email_verified,
        employeeStatus: employee.status,
        role: user.role
      });

      if (user.role !== 'admin' && employee.status !== 'active') {
        logger.warn('❌ [SupabaseAuthRepository] Employee not approved', {
          email: credentials.email,
          status: employee.status,
          role: user.role,
          userId: user.id,
          employeeId: employee.id,
          userEmailVerified: user.email_verified,
          employeeEmailVerified: employee.email_verified
        });
        const error: any = new Error('Your account is pending approval. Please wait for admin approval before logging in.');
        error.code = 'PENDING_APPROVAL';
        error.status = employee.status;
        throw error;
      }

      logger.info('✅ [SupabaseAuthRepository] Employee approved - allowing login', {
        email: credentials.email,
        status: employee.status,
        role: user.role,
        userId: user.id,
        employeeId: employee.id
      });

      // Generate JWT tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Add refresh token to user
      await this.addRefreshToken(user.id, refreshToken);

      logger.info('✅ [SupabaseAuthRepository] User signed in successfully', {
        userId: user.id,
        email: user.email,
        role: user.role,
        employeeStatus: employee.status,
        bypassReason: user.role === 'admin' ? 'Admin user bypass' : 'Employee approved'
      });

      return {
        user: this.mapSupabaseUserToInterface(user, employee),
        accessToken,
        refreshToken,
        message: 'Sign in successful',
      };

    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Signin failed:', error);
      throw error;
    }
  }

  async signInWithOAuth(provider: string, idToken?: string): Promise<AuthResponse> {
    // Not implementing OAuth for now, will return error
    throw new Error('OAuth not implemented for Supabase');
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;

      // Find user and validate refresh token
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select(`
          *,
          employees!inner(*)
        `)
        .eq('id', decoded.sub)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      // Check if refresh token exists in user's tokens
      if (!user.refresh_tokens || !user.refresh_tokens.includes(refreshToken)) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // Replace old refresh token with new one
      await this.replaceRefreshToken(user.id, refreshToken, newRefreshToken);

      return {
        user: this.mapSupabaseUserToInterface(user, user.employees),
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };

    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Token refresh failed:', error);
      throw error;
    }
  }

  async getCurrentUser(accessToken: string): Promise<IUser> {
    try {
      // Verify access token
      const decoded = jwt.verify(accessToken, this.jwtSecret) as any;

      // Find user with employee data
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select(`
          *,
          employees!inner(*)
        `)
        .eq('id', decoded.sub)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      const employee = user.employees;

      logger.debug('✅ [SupabaseAuthRepository] Included employee status in user response', {
        userId: user.id,
        status: employee.status
      });

      return this.mapSupabaseUserToInterface(user, employee);

    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Get current user failed:', error);
      throw error;
    }
  }

  async signOut(accessToken: string): Promise<void> {
    try {
      // Verify access token
      const decoded = jwt.verify(accessToken, this.jwtSecret) as any;

      // Clear all refresh tokens for security
      await this.clearRefreshTokens(decoded.sub);

    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Sign out failed:', error);
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      // Check if user exists
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !user) {
        logger.warn('❌ [SupabaseAuthRepository] User not found for password reset', { email });
        return; // Don't reveal if email exists
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Update user with reset token
      const { error: updateError } = await this.supabase
        .from('users')
        .update({
          password_reset_token: resetToken,
          password_reset_expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Failed to set reset token: ${updateError.message}`);
      }

      // Update employee record
      const { error: empUpdateError } = await this.supabase
        .from('employees')
        .update({
          password_reset_token: resetToken,
          password_reset_expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .eq('user_id', user.id);

      if (empUpdateError) {
        logger.warn('⚠️ [SupabaseAuthRepository] Failed to update employee reset token:', empUpdateError);
      }

      // Send password reset email
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      await this.sendPasswordResetEmail(user.email, user.full_name, resetUrl);

      logger.info('✅ [SupabaseAuthRepository] Password reset email sent', {
        userId: user.id,
        email: user.email
      });

    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Password reset failed:', error);
      throw error;
    }
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    try {
      logger.info('🔑 [SupabaseAuthRepository] Resetting password with token', { token });

      // Find user by password reset token
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('password_reset_token', token)
        .gt('password_reset_expires', new Date().toISOString())
        .single();

      if (userError || !user) {
        logger.warn('❌ [SupabaseAuthRepository] User not found with reset token', { token });
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset token
      const { error: updateError } = await this.supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          password_reset_token: null,
          password_reset_expires: null,
          refresh_tokens: [], // Clear all refresh tokens for security
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }

      // Update employee record
      const { error: empUpdateError } = await this.supabase
        .from('employees')
        .update({
          password_reset_token: null,
          password_reset_expires: null,
        })
        .eq('user_id', user.id);

      if (empUpdateError) {
        logger.warn('⚠️ [SupabaseAuthRepository] Failed to update employee password reset:', empUpdateError);
      }

      logger.info('✅ [SupabaseAuthRepository] Password reset successfully', {
        userId: user.id,
        email: user.email
      });

    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Reset password with token failed:', error);
      throw error;
    }
  }

  async updatePassword(accessToken: string, newPassword: string): Promise<void> {
    try {
      // Verify access token
      const decoded = jwt.verify(accessToken, this.jwtSecret) as any;

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear refresh tokens
      await this.clearRefreshTokens(decoded.sub);

      const { error } = await this.supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', decoded.sub);

      if (error) {
        throw new Error(`Failed to update password: ${error.message}`);
      }

      logger.info('✅ [SupabaseAuthRepository] Password updated successfully', {
        userId: decoded.sub
      });

    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Update password failed:', error);
      throw error;
    }
  }

  async updatePasswordByEmail(email: string, newPassword: string): Promise<void> {
    try {
      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear refresh tokens
      await this.clearRefreshTokensByEmail(email);

      const { error } = await this.supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('email', email);

      if (error) {
        throw new Error(`Failed to update password: ${error.message}`);
      }

      logger.info('✅ [SupabaseAuthRepository] Password updated by email successfully', {
        email
      });

    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Update password by email failed:', error);
      throw error;
    }
  }

  async resendConfirmationEmail(email: string): Promise<{ message: string }> {
    try {
      logger.info('📧 [SupabaseAuthRepository] Resending confirmation email', { email });

      // Find user
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !user) {
        logger.warn('❌ [SupabaseAuthRepository] User not found', { email });
        throw new Error('User not found');
      }

      if (user.email_verified) {
        logger.info('✅ [SupabaseAuthRepository] Email already verified', { email });
        return {
          message: 'Email is already verified'
        };
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Update user with new token
      const { error: updateError } = await this.supabase
        .from('users')
        .update({
          email_verification_token: verificationToken,
          email_verification_expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Failed to update verification token: ${updateError.message}`);
      }

      // Update employee record
      const { error: empUpdateError } = await this.supabase
        .from('employees')
        .update({
          email_verification_token: verificationToken,
          email_verification_expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
        .eq('user_id', user.id);

      if (empUpdateError) {
        logger.warn('⚠️ [SupabaseAuthRepository] Failed to update employee verification token:', empUpdateError);
      }

      // Send confirmation email with new verification token
      const confirmationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm?token=${verificationToken}`;
      await this.sendEmailConfirmation(user.email, user.full_name, confirmationUrl);

      return {
        message: 'Confirmation email resent successfully. Please check your inbox.'
      };

    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Resend confirmation email failed:', error);
      throw error;
    }
  }

  async confirmEmailByToken(token: string): Promise<AuthResponse> {
    try {
      logger.info('🔗 [SupabaseAuthRepository] Confirming email by token', {
        token: token.substring(0, 20) + '...',
        fullToken: token,
        timestamp: new Date().toISOString()
      });

      // Find user by verification token using direct query instead of RPC
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('email_verification_token', token)
        .gt('email_verification_expires', new Date().toISOString())
        .single();

      if (userError || !user) {
        logger.warn('❌ [SupabaseAuthRepository] User not found with token', {
          token: token.substring(0, 20) + '...',
          error: userError?.message,
          code: userError?.code,
          currentTime: new Date().toISOString()
        });

        // Check if token exists but is expired
        const { data: expiredUser, error: expiredError } = await this.supabase
          .from('users')
          .select('id, email, email_verification_expires')
          .eq('email_verification_token', token)
          .single();

        if (expiredUser) {
          logger.warn('⚠️ [SupabaseAuthRepository] Token found but expired', {
            userId: expiredUser.id,
            email: expiredUser.email,
            expires: expiredUser.email_verification_expires,
            currentTime: new Date().toISOString()
          });
        }

        throw new Error('Invalid or expired verification token');
      }

      logger.info('✅ [SupabaseAuthRepository] User found with valid token', {
        userId: user.id,
        email: user.email,
        role: user.role,
        tokenExpires: user.email_verification_expires
      });

      // Get employee data if exists
      const { data: employee, error: empError } = await this.supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (empError && empError.code !== 'PGRST116') { // PGRST116 means no rows found, which is OK
        logger.warn('⚠️ [SupabaseAuthRepository] Employee record not found:', empError);
      }

      logger.info('✅ [SupabaseAuthRepository] Employee data retrieved', {
        userId: user.id,
        employeeExists: !!employee,
        employeeStatus: employee?.status
      });

      // Mark email as verified in both tables
      logger.info('🔄 [SupabaseAuthRepository] Updating email verification status', {
        userId: user.id,
        verified: true
      });

      await this.updateEmailVerification(user.id, true);

      logger.info('✅ [SupabaseAuthRepository] Email verification updated successfully');

      // Get updated user data with employee info
      const { data: updatedUser, error: updatedUserError } = await this.supabase
        .from('users')
        .select(`
          *,
          employees!inner(*)
        `)
        .eq('id', user.id)
        .single();

      if (updatedUserError || !updatedUser) {
        throw new Error('Failed to retrieve updated user data');
      }

      const employeeData = updatedUser.employees;

      // Generate JWT tokens (admin users bypass employee approval, others need active status)
      let accessToken = '';
      let refreshToken = '';

      if (employeeData.status === 'active' || updatedUser.role === 'admin') {
        accessToken = this.generateAccessToken(updatedUser);
        refreshToken = this.generateRefreshToken(updatedUser);
        await this.addRefreshToken(updatedUser.id, refreshToken);

        logger.info('✅ [SupabaseAuthRepository] Generated tokens for active user', {
          userId: updatedUser.id,
          employeeStatus: employeeData.status,
          role: updatedUser.role
        });
      }

      logger.info('✅ [SupabaseAuthRepository] Email confirmed successfully', {
        userId: updatedUser.id,
        email: updatedUser.email,
        employeeStatus: employeeData.status,
        hasTokens: !!(accessToken && refreshToken)
      });

      return {
        user: this.mapSupabaseUserToInterface(updatedUser, employeeData),
        accessToken,
        refreshToken,
        requiresEmailVerification: false,
        message: (employeeData.status === 'active' || updatedUser.role === 'admin')
          ? 'Email verified successfully! You can now log in.'
          : 'Email verified successfully! Please wait for admin approval before logging in.',
      };

    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Confirm email by token failed:', {
        error: (error as Error).message,
        token: token.substring(0, 20) + '...'
      });
      throw error;
    }
  }

  async setSession(accessToken: string, refreshToken: string): Promise<any> {
    // Not needed for Supabase implementation
    return { accessToken, refreshToken };
  }

  async getEmployeeByUserId(userId: string): Promise<any> {
    try {
      const { data: employee, error } = await this.supabase
        .from('employees')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !employee) {
        logger.error('❌ [SupabaseAuthRepository] Get employee by user ID failed:', error);
        return null;
      }

      return employee;
    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Get employee by user ID failed:', error);
      throw error;
    }
  }

  async createEmployeeRecord(employeeData: any): Promise<any> {
    try {
      logger.info('➕ [SupabaseAuthRepository] Creating employee record', {
        userId: employeeData.userId,
        email: employeeData.email,
        role: employeeData.role
      });

      const { data: employee, error } = await this.supabase
        .from('employees')
        .insert(employeeData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create employee record: ${error.message}`);
      }

      logger.info('✅ [SupabaseAuthRepository] Employee record created', {
        employeeId: employee.id,
        userId: employee.user_id,
        status: employee.status
      });

      return employee;
    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Create employee record failed:', error);
      throw error;
    }
  }

  // ======================================
  // PRIVATE HELPER METHODS
  // ======================================

  public async addRefreshToken(userId: string, token: string): Promise<void> {
    try {
      // First get current refresh tokens
      const { data: user, error: fetchError } = await this.supabase
        .from('users')
        .select('refresh_tokens')
        .eq('id', userId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch user tokens: ${fetchError.message}`);
      }

      // Get current tokens or initialize empty array (handle NULL case)
      const currentTokens = Array.isArray(user?.refresh_tokens) ? user.refresh_tokens : [];

      // Add new token to array
      const updatedTokens = [...currentTokens, token];

      // Update with new array
      const { error: updateError } = await this.supabase
        .from('users')
        .update({ refresh_tokens: updatedTokens })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Failed to add refresh token: ${updateError.message}`);
      }

      logger.info('✅ [SupabaseAuthRepository] Refresh token added successfully', {
        userId,
        tokenCount: updatedTokens.length
      });
    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Add refresh token failed:', error);
      throw error;
    }
  }

  private async replaceRefreshToken(userId: string, oldToken: string, newToken: string): Promise<void> {
    try {
      const { data: user, error: fetchError } = await this.supabase
        .from('users')
        .select('refresh_tokens')
        .eq('id', userId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch user tokens: ${fetchError.message}`);
      }

      if (user && Array.isArray(user.refresh_tokens)) {
        const updatedTokens = user.refresh_tokens.map((t: string) =>
          t === oldToken ? newToken : t
        );

        const { error: updateError } = await this.supabase
          .from('users')
          .update({ refresh_tokens: updatedTokens })
          .eq('id', userId);

        if (updateError) {
          throw new Error(`Failed to replace refresh token: ${updateError.message}`);
        }

        logger.info('✅ [SupabaseAuthRepository] Refresh token replaced successfully', {
          userId,
          tokenCount: updatedTokens.length
        });
      } else {
        logger.warn('⚠️ [SupabaseAuthRepository] No refresh tokens found to replace', { userId });
      }
    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Replace refresh token failed:', error);
      throw error;
    }
  }

  private async clearRefreshTokens(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ refresh_tokens: [] })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to clear refresh tokens: ${error.message}`);
    }
  }

  private async clearRefreshTokensByEmail(email: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ refresh_tokens: [] })
      .eq('email', email);

    if (error) {
      throw new Error(`Failed to clear refresh tokens: ${error.message}`);
    }
  }

  private async updateEmailVerification(userId: string, verified: boolean): Promise<void> {
    // Update both users and employees tables
    const { error: userError } = await this.supabase
      .from('users')
      .update({
        email_verified: verified,
        email_verification_token: verified ? null : undefined,
        email_verification_expires: verified ? null : undefined,
      })
      .eq('id', userId);

    if (userError) {
      throw new Error(`Failed to update user email verification: ${userError.message}`);
    }

    const { error: empError } = await this.supabase
      .from('employees')
      .update({
        email_verified: verified,
        email_verification_token: verified ? null : undefined,
        email_verification_expires: verified ? null : undefined,
      })
      .eq('user_id', userId);

    if (empError) {
      throw new Error(`Failed to update employee email verification: ${empError.message}`);
    }
  }

  private generateRefreshToken(user: any): string {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
      },
      this.jwtRefreshSecret,
      { expiresIn: '30d' } // Extended to 30 days
    );
  }

  private generateAccessToken(user: any): string {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      this.jwtSecret,
      { expiresIn: '14d' } // Extended to 14 days
    );
  }

  private mapSupabaseUserToInterface(user: any, employee: any): IUser {
    const employeeRecord = Array.isArray(employee) ? employee[0] : employee;

    return {
      _id: user.id,
      email: user.email,
      password: '',
      fullName: user.full_name,
      role: user.role,
      status: employeeRecord?.status || 'pending',
      emailVerified: user.email_verified ?? employeeRecord?.email_verified ?? false,
      passwordHash: user.password_hash,
      emailVerificationToken: user.email_verification_token,
      emailVerificationExpires: user.email_verification_expires ? new Date(user.email_verification_expires) : undefined,
      passwordResetToken: user.password_reset_token,
      passwordResetExpires: user.password_reset_expires ? new Date(user.password_reset_expires) : undefined,
      refreshTokens: user.refresh_tokens || [],
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at),

      comparePassword: async () => false,
      generateEmailVerificationToken: () => '',
      generatePasswordResetToken: () => '',
      isValidPasswordResetToken: () => false,
      isValidEmailVerificationToken: () => false,
      addRefreshToken: () => {},
      removeRefreshToken: () => {},
    } as any;
  }

  public getSupabaseClient(): SupabaseClient {
    return this.supabase;
  }

  // ======================================
  // EMAIL METHODS
  // ======================================

  private async sendEmailConfirmation(email: string, fullName: string, confirmationUrl: string): Promise<void> {
    try {
      const emailService = new EmailService();
      await emailService.sendEmailConfirmation(email, fullName, confirmationUrl);
      logger.info('📧 Email confirmation sent successfully', { email, fullName });
    } catch (error) {
      logger.error('❌ Failed to send email confirmation', {
        error: (error as Error).message,
        email,
        fullName
      });
      throw error;
    }
  }

  private async sendPasswordResetEmail(email: string, fullName: string, resetUrl: string): Promise<void> {
    try {
      const emailService = new EmailService();
      await emailService.sendPasswordResetEmail(email, fullName, resetUrl);
      logger.info('📧 Password reset email sent successfully', { email, fullName });
    } catch (error) {
      logger.error('❌ Failed to send password reset email', {
        error: (error as Error).message,
        email,
        fullName
      });
      throw error;
    }
  }
}
