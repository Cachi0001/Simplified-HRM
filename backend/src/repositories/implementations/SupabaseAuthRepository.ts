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
        logger.warn('❌ [SupabaseAuthRepository] Email already registered', { email: userData.email });

        if (existing.email_confirmed_at) {
          throw new Error('Email already registered and active. Please try signing in instead.');
        } else {
          throw new Error('Email already registered but not confirmed. Please check your email for the confirmation link.');
        }
      }

      // 2. Create Supabase auth user (no metadata yet)
      logger.info('🆕 [SupabaseAuthRepository] Creating new Supabase auth user...');
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: `${process.env.FRONTEND_URL}/confirm`,
          // Do NOT send metadata yet
        }
      });

      if (authError) {
        logger.error('❌ [SupabaseAuthRepository] Supabase auth signup failed', { error: authError.message });
        throw authError;
      }

      if (!authData.user) {
        logger.error('❌ [SupabaseAuthRepository] No user returned from Supabase signup');
        throw new Error('Signup failed - no user created');
      }

      logger.info('✅ [SupabaseAuthRepository] Supabase auth user created successfully', {
        userId: authData.user.id,
        email: authData.user.email
      });

      // Check if user needs email confirmation
      const emailConfirmed = authData.session && authData.session.access_token;
      logger.info('📧 [SupabaseAuthRepository] Email confirmation status', {
        hasSession: !!authData.session,
        emailConfirmed: !!emailConfirmed,
        userId: authData.user.id
      });

      // 3. Create user object for response
      const user: User = {
        id: authData.user.id,
        email: authData.user.email!,
        fullName: userData.fullName,
        role: userData.role || 'employee',
        emailVerified: !!emailConfirmed,
        createdAt: new Date(authData.user.created_at!),
        updatedAt: new Date(authData.user.updated_at || authData.user.created_at!),
      };

      // 4. Create employee record using service role (bypasses RLS)
      if (userData.role === 'employee' || !userData.role) {
        logger.info('👤 [SupabaseAuthRepository] Creating employee record with service role...');

        const { data: employee, error: empError } = await this.supabaseAdmin
          .from('employees')
          .insert({
            user_id: authData.user.id,
            email: userData.email,
            full_name: userData.fullName,
            role: userData.role || 'employee',
            status: 'pending'
          })
          .select()
          .single();

        if (empError) {
          logger.error('❌ [SupabaseAuthRepository] Failed to create employee record', {
            error: empError.message,
            details: empError.details,
            hint: empError.hint,
            code: empError.code
          });

          // Log but don't fail signup - user is created in auth
          logger.warn('⚠️ [SupabaseAuthRepository] Employee record creation failed, but auth user created', {
            userId: authData.user.id,
            email: userData.email
          });
        } else {
          logger.info('✅ [SupabaseAuthRepository] Employee record created successfully', {
            employeeId: employee?.id,
            userId: authData.user.id
          });

          // 5. Send admin notification email
          logger.info('📧 [SupabaseAuthRepository] Sending admin notification email...');
          try {
            const emailService = new EmailService();
            await emailService.sendApprovalNotification(userData.email, userData.fullName);
            logger.info('✅ [SupabaseAuthRepository] Admin approval notification sent', { email: userData.email });
          } catch (emailError) {
            logger.warn('⚠️ [SupabaseAuthRepository] Admin notification email failed (non-critical)', { error: (emailError as Error).message });
          }
        }
      }

      // 6. Update auth user metadata (optional cleanup)
      try {
        await this.supabase.auth.updateUser({
          data: {
            full_name: userData.fullName,
            role: userData.role || 'employee'
          }
        });
        logger.info('✅ [SupabaseAuthRepository] Auth user metadata updated');
      } catch (metadataError) {
        logger.warn('⚠️ [SupabaseAuthRepository] Failed to update auth metadata (non-critical)', {
          error: (metadataError as Error).message
        });
      }

      // 7. Return appropriate response based on confirmation status
      if (!emailConfirmed) {
        // User needs to confirm email - this is normal, not an error
        logger.info('📧 [SupabaseAuthRepository] User needs email confirmation - returning success with message', {
          userId: authData.user.id,
          email: userData.email
        });

        return {
          user,
          accessToken: '', // No session yet until email confirmed
          refreshToken: '',
          requiresConfirmation: true,
          message: 'Check your inbox – we sent you a new confirmation email'
        };
      }

      // User is confirmed and can sign in immediately
      logger.info('🎉 [SupabaseAuthRepository] User confirmed - returning full auth response', {
        userId: authData.user.id,
        email: userData.email
      });

      return {
        user,
        accessToken: authData.session?.access_token || '',
        refreshToken: authData.session?.refresh_token || '',
        requiresConfirmation: false,
        message: 'Account created successfully'
      };
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