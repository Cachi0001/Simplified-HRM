import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IAuthRepository } from '../interfaces/IAuthRepository';
import { User, CreateUserRequest, LoginRequest, AuthResponse } from '../../models/User';
import { EmailService } from '../../services/EmailService';
import logger from '../../utils/logger';
import crypto from 'crypto';

export class SupabaseAuthRepository implements IAuthRepository {
  private _supabase: SupabaseClient;
  private _supabaseAdmin: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      throw new Error('SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY must be set');
    }

    this._supabase = createClient(url, anonKey);
    this._supabaseAdmin = createClient(url, serviceKey);
  }

  private get supabase(): SupabaseClient {
    return this._supabase;
  }

  private get supabaseAdmin(): SupabaseClient {
    return this._supabaseAdmin;
  }

  // ———————————————————— SIGN UP ————————————————————
  async signUp(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      logger.info('🔍 [SupabaseAuthRepository] Starting signup process', {
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role || 'employee'
      });

      // 1. Check if email already exists
      logger.info('🔍 [SupabaseAuthRepository] Checking for existing users...');
      const { data: { users }, error: listError } = await this.supabaseAdmin.auth.admin.listUsers();

      if (listError) {
        logger.error('❌ [SupabaseAuthRepository] Failed to list users', { error: listError });
        throw new Error('Failed to check existing users');
      }

      const existing = users.find(u => u.email === userData.email);
      logger.info('🔍 [SupabaseAuthRepository] Existing user check', {
        email: userData.email,
        userExists: !!existing,
        confirmed: existing?.email_confirmed_at ? true : false
      });

      if (existing) {
        // 2. Already confirmed → block duplicate
        if (existing.email_confirmed_at) {
          logger.warn('❌ [SupabaseAuthRepository] Email already registered and confirmed', { email: userData.email });
          throw new Error('Email already registered');
        }

        // 3. Not confirmed → resend confirmation email
        logger.info('🔄 [SupabaseAuthRepository] Resending confirmation email', { email: userData.email });
        const { error } = await this.supabase.auth.resend({
          type: 'signup',
          email: userData.email,
          options: {
            emailRedirectTo: 'http://localhost:3000/confirm',
          },
        });

        if (error) {
          logger.error('❌ [SupabaseAuthRepository] Failed to resend confirmation', { error: error.message });
          throw error;
        }

        logger.info('✅ [SupabaseAuthRepository] Confirmation email resent successfully');
        throw new Error('Check your inbox – we sent you a new confirmation email');
      }

      // 4. New user – create Supabase auth user
      logger.info('🆕 [SupabaseAuthRepository] Creating new Supabase auth user...');
      const { data, error } = await this.supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: 'http://localhost:3000/confirm',
          data: {
            full_name: userData.fullName,
            role: userData.role || 'employee',
          },
        },
      });

      if (error) {
        logger.error('❌ [SupabaseAuthRepository] Supabase auth signup failed', { error: error.message });
        throw error;
      }

      if (!data.user) {
        logger.error('❌ [SupabaseAuthRepository] No user returned from Supabase signup');
        throw new Error('Signup failed - no user created');
      }

      logger.info('✅ [SupabaseAuthRepository] Supabase auth user created successfully', {
        userId: data.user.id,
        email: data.user.email
      });

      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        fullName: userData.fullName,
        role: userData.role || 'employee',
        emailVerified: false,
        createdAt: new Date(data.user.created_at!),
        updatedAt: new Date(data.user.updated_at || data.user.created_at!),
      };

      // 5. Create employee record in database if role is employee
      if (userData.role === 'employee' || !userData.role) {
        logger.info('👤 [SupabaseAuthRepository] Creating employee record in database...');
        try {
          logger.info('🔍 [SupabaseAuthRepository] Checking employees table structure...');

          // First check if employees table exists and its structure
          const { data: tableInfo, error: tableError } = await this.supabaseAdmin
            .from('employees')
            .select('*')
            .limit(1);

          if (tableError) {
            logger.error('❌ [SupabaseAuthRepository] Employees table error', {
              error: tableError.message,
              details: tableError.details,
              hint: tableError.hint,
              code: tableError.code
            });
            throw new Error(`Database schema error: ${tableError.message}`);
          }

          logger.info('✅ [SupabaseAuthRepository] Employees table exists, inserting record...');

          const { error: empError } = await this.supabaseAdmin
            .from('employees')
            .insert({
              user_id: data.user.id,
              full_name: userData.fullName,
              email: userData.email,
              role: userData.role || 'employee',
              status: 'pending', // Pending admin approval
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (empError) {
            logger.error('❌ [SupabaseAuthRepository] Failed to create employee record', {
              error: empError.message,
              details: empError.details,
              hint: empError.hint,
              code: empError.code
            });
            throw new Error(`Database error saving employee record: ${empError.message}`);
          }

          logger.info('✅ [SupabaseAuthRepository] Employee record created successfully', {
            userId: data.user.id,
            employeeData: {
              user_id: data.user.id,
              full_name: userData.fullName,
              email: userData.email,
              role: 'employee',
              status: 'pending'
            }
          });

          // 6. Send admin notification email
          logger.info('📧 [SupabaseAuthRepository] Sending admin notification email...');
          try {
            const emailService = new EmailService();
            await emailService.sendApprovalNotification(userData.email, userData.fullName);
            logger.info('✅ [SupabaseAuthRepository] Admin approval notification sent', { email: userData.email });
          } catch (emailError) {
            logger.warn('⚠️ [SupabaseAuthRepository] Admin notification email failed (non-critical)', { error: (emailError as Error).message });
          }
        } catch (empCreateError) {
          logger.error('❌ [SupabaseAuthRepository] Employee creation process failed', {
            error: (empCreateError as Error).message,
            stack: (empCreateError as Error).stack
          });
          throw new Error(`Employee record creation failed: ${(empCreateError as Error).message}`);
        }
      }

      logger.info('🎉 [SupabaseAuthRepository] Signup process completed successfully', {
        userId: data.user.id,
        email: userData.email
      });

      return { user, accessToken: '', refreshToken: '' };
    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Signup process failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        email: userData.email
      });
      throw error;
    }
  }

  // ———————————————————— SIGN IN ————————————————————
  async signIn(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      logger.info('Signing in user', { email: credentials.email });

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        // Handle specific Supabase errors with better messages
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
        }
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password');
        }
        throw new Error(error.message);
      }

      if (!data.user || !data.session) throw new Error('Authentication failed');

      const { data: employee, error: empError } = await this.supabaseAdmin
        .from('employees')
        .select('id, full_name, role, status')
        .eq('user_id', data.user.id)
        .single();

      if (empError || !employee) throw new Error('Employee record not found');
      if (employee.status !== 'active') throw new Error('Account pending admin approval');

      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        fullName: employee.full_name,
        role: employee.role,
        emailVerified: !!data.user.email_confirmed_at,
        createdAt: new Date(data.user.created_at!),
        updatedAt: new Date(data.user.updated_at || data.user.created_at!),
      };

      return {
        user,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error) {
      logger.error('Signin failed', { error: (error as Error).message });
      throw error;
    }
  }

  // ———————————————————— OAUTH ————————————————————
  async signInWithOAuth(provider: string, idToken?: string): Promise<AuthResponse> {
    try {
      logger.info('Signing in with OAuth', { provider });

      const { data, error } = await this.supabase.auth.signInWithIdToken({
        provider: provider as any,
        token: idToken || '',
      });

      if (error) throw new Error(error.message);
      if (!data.user || !data.session) throw new Error('OAuth authentication failed');

      const { data: employee, error: empError } = await this.supabaseAdmin
        .from('employees')
        .select('id, full_name, role, status')
        .eq('user_id', data.user.id)
        .single();

      if (empError || !employee) throw new Error('Employee record not found');
      if (employee.status !== 'active') throw new Error('Account pending admin approval');

      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        fullName: employee.full_name,
        role: employee.role,
        emailVerified: !!data.user.email_confirmed_at,
        createdAt: new Date(data.user.created_at!),
        updatedAt: new Date(data.user.updated_at || data.user.created_at!),
      };

      return {
        user,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error) {
      logger.error('OAuth signin failed', { error: (error as Error).message });
      throw error;
    }
  }

  // ———————————————————— REFRESH TOKEN ————————————————————
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (error) throw new Error(error.message);
      if (!data.user || !data.session) throw new Error('Token refresh failed');

      const { data: employee } = await this.supabaseAdmin
        .from('employees')
        .select('id, full_name, role, status')
        .eq('user_id', data.user.id)
        .single();

      if (!employee) throw new Error('Employee record not found');

      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        fullName: employee.full_name,
        role: employee.role,
        emailVerified: !!data.user.email_confirmed_at,
        createdAt: new Date(data.user.created_at!),
        updatedAt: new Date(data.user.updated_at || data.user.created_at!),
      };

      return {
        user,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error) {
      logger.error('Token refresh failed', { error: (error as Error).message });
      throw error;
    }
  }

  // ———————————————————— GET CURRENT USER ————————————————————
  async getCurrentUser(accessToken: string): Promise<User> {
    try {
      const { data, error } = await this.supabase.auth.getUser(accessToken);
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('User not found');

      const { data: employee } = await this.supabaseAdmin
        .from('employees')
        .select('id, full_name, role, status')
        .eq('user_id', data.user.id)
        .single();

      if (!employee) throw new Error('Employee record not found');

      return {
        id: data.user.id,
        email: data.user.email!,
        fullName: employee.full_name,
        role: employee.role,
        emailVerified: !!data.user.email_confirmed_at,
        createdAt: new Date(data.user.created_at!),
        updatedAt: new Date(data.user.updated_at || data.user.created_at!),
      };
    } catch (error) {
      logger.error('Get current user failed', { error: (error as Error).message });
      throw error;
    }
  }

  // ———————————————————— SIGN OUT ————————————————————
  async signOut(accessToken: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut({ scope: 'local' });
      if (error) throw new Error(error.message);
    } catch (error) {
      logger.error('Signout failed', { error: (error as Error).message });
      throw error;
    }
  }

  // ———————————————————— PASSWORD RESET ————————————————————
  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
      });
      if (error) throw new Error(error.message);
    } catch (error) {
      logger.error('Password reset failed', { error: (error as Error).message });
      throw error;
    }
  }

  async updatePassword(accessToken: string, newPassword: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    } catch (error) {
      logger.error('Password update failed', { error: (error as Error).message });
      throw error;
    }
  }
}