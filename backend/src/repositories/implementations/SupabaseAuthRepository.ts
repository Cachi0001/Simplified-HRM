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

    // Configuration for extended token lifetime (7 days)
    const authConfig = {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce' as const
    };

    this._supabase = createClient(url, anonKey, {
      auth: authConfig
    });
    this._supabaseAdmin = createClient(url, serviceKey, {
      auth: {
        ...authConfig,
        // Admin client doesn't need persistence
        persistSession: false
      }
    });
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
      logger.info('🔍 [SupabaseAuthRepository] Starting passwordless signup process', {
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role || 'employee'
      });

      if (!userData.email || !userData.fullName) {
        logger.error('❌ [SupabaseAuthRepository] Missing required fields', {
          hasEmail: !!userData.email,
          hasFullName: !!userData.fullName
        });
        throw new Error('Email and full name are required');
      }

      // 1. Check if user already exists (using anon client, not service role)
      logger.info('🔍 [SupabaseAuthRepository] Checking if user already exists...');
      const { data: existing, error: existingError } = await this.supabase
        .from('employees')
        .select('user_id, status')
        .eq('email', userData.email)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        logger.error('❌ [SupabaseAuthRepository] Error checking existing user', {
          error: existingError.message,
          code: existingError.code
        });
        throw existingError;
      }

      if (existing) {
        logger.warn('❌ [SupabaseAuthRepository] Email already registered', { email: userData.email });

        // Check if there's a corresponding auth user
        const { data: authUser } = await this.supabase.auth.admin.getUserById(existing.user_id);
        if (authUser.user) {
          if (authUser.user.email_confirmed_at) {
            throw new Error('Email already registered and active. Please try signing in instead.');
          } else {
            throw new Error('Email already registered but not confirmed. Please check your email for the confirmation link.');
          }
        }
      }

      // 2. Send magic link using signInWithOtp (TRUE MAGIC LINK!)
      logger.info('🆕 [SupabaseAuthRepository] Sending magic link for signup...');
      const { data: authData, error: authError } = await this.supabase.auth.signInWithOtp({
        email: userData.email,
        options: {
          emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm`,
          data: {
            full_name: userData.fullName,
            role: userData.role || 'employee',
            signup: true // Mark as signup flow
          }
        }
      });

      if (authError) {
        logger.error('❌ [SupabaseAuthRepository] Magic link send failed', { error: authError.message });
        throw authError;
      }

      logger.info('✅ [SupabaseAuthRepository] Magic link sent successfully', {
        email: userData.email
      });

      // 3. Create temporary user object for response
      const user: User = {
        id: '', // Will be set via magic link
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role || 'employee',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 4. Return response - employee record will be created after email confirmation
      logger.info('📧 [SupabaseAuthRepository] Passwordless signup successful - magic link sent', {
        email: userData.email
      });

      return {
        user,
        accessToken: '',
        refreshToken: '',
        requiresConfirmation: true,
        message: 'Check your inbox – we sent you a confirmation email'
      };
    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Passwordless signup process failed', {
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
      logger.info('🔐 [SupabaseAuthRepository] Passwordless signin request', { email: credentials.email });

      if (!credentials.email) {
        throw new Error('Email is required');
      }

      // Send magic link for passwordless login
      logger.info('📧 [SupabaseAuthRepository] Sending magic link for login', { email: credentials.email });
      const { error: sendError } = await this.supabase.auth.signInWithOtp({
        email: credentials.email,
        options: {
          emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm`,
          data: {
            login: true // Mark as login flow
          }
        }
      });

      if (sendError) {
        logger.error('❌ [SupabaseAuthRepository] Magic link send failed', { error: sendError.message });
        throw new Error('EMAIL_NOT_CONFIRMED:Please confirm your email address before signing in. Check your inbox for the confirmation link.');
      }

      // Return user info without tokens (tokens come via magic link)
      const user: User = {
        id: '', // Will be set via magic link
        email: credentials.email,
        fullName: '',
        role: 'employee',
        emailVerified: false, // Will be verified via magic link
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('✅ [SupabaseAuthRepository] Magic link sent successfully', {
        email: credentials.email
      });

      return {
        user,
        accessToken: '',
        refreshToken: '',
        requiresConfirmation: true,
        message: 'Check your inbox – we sent you a magic link to sign in'
      };
    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Passwordless signin failed', {
        error: (error as Error).message,
        email: credentials.email
      });
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

  async resendConfirmationEmail(email: string): Promise<{ message: string }> {
    try {
      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm`,
        },
      });

      if (error) throw new Error(error.message);
      logger.info('Confirmation email resent', { email });

      return {
        message: 'Check your inbox – we sent you a new confirmation email. Please verify your account to continue.'
      };
    } catch (error) {
      logger.error('Resend confirmation failed', { error: (error as Error).message });
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