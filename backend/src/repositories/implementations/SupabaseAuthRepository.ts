import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IAuthRepository } from '../interfaces/IAuthRepository';
import { User, CreateUserRequest, LoginRequest, AuthResponse } from '../../models/User';
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

    this._supabase = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce' as const
      }
    });

    this._supabaseAdmin = createClient(url, serviceKey, {
      auth: {
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

  async signUp(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      logger.info('🔍 [SupabaseAuthRepository] Starting signup process', {
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role || 'employee'
      });

      if (!userData.email || !userData.fullName) {
        throw new Error('Email and full name are required');
      }

      // Use Supabase's built-in auth with magic link
      const { data, error } = await this.supabase.auth.signUp({
        email: userData.email,
        password: crypto.randomBytes(32).toString('hex'), // dummy password for magic link auth
        options: {
          emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm`,
          data: {
            full_name: userData.fullName,
            role: userData.role || 'employee',
            signup: true
          },
          captchaToken: undefined // Enable PKCE flow
        }
      });

      if (error) {
        logger.error('❌ [SupabaseAuthRepository] Signup failed', { error: error.message });
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('Failed to create user account');
      }

      logger.info('✅ [SupabaseAuthRepository] Magic link sent successfully', { email: userData.email });

      const user: User = {
        id: data.user.id,
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role || 'employee',
        emailVerified: false,
        createdAt: new Date(data.user.created_at!),
        updatedAt: new Date(data.user.updated_at || data.user.created_at!),
      };

      return {
        user,
        accessToken: '',
        refreshToken: '',
        requiresConfirmation: true,
        message: 'Check your inbox – we sent you a confirmation email'
      };
    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Signup failed', {
        error: (error as Error).message,
        email: userData.email
      });
      throw error;
    }
  }

  async signIn(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      logger.info('🔐 [SupabaseAuthRepository] Signin request', { email: credentials.email });

      if (!credentials.email) {
        throw new Error('Email is required');
      }

      // Use signUp for magic link (same flow as signup)
      const { data, error } = await this.supabase.auth.signUp({
        email: credentials.email,
        password: crypto.randomBytes(32).toString('hex'), // dummy password for magic link auth
        options: {
          emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm`,
          data: {
            login: true,
            full_name: 'Login User',
            role: 'employee'
          },
          captchaToken: undefined // Enable PKCE flow
        }
      });

      if (error) {
        logger.error('❌ [SupabaseAuthRepository] Magic link send failed', { error: error.message });
        throw new Error(`Please confirm your email address before signing in: ${error.message}`);
      }

      if (!data.user) {
        throw new Error('Failed to send magic link');
      }

      const user: User = {
        id: data.user.id,
        email: credentials.email,
        fullName: 'Login User',
        role: 'employee',
        emailVerified: false,
        createdAt: new Date(data.user.created_at!),
        updatedAt: new Date(data.user.updated_at || data.user.created_at!),
      };

      logger.info('✅ [SupabaseAuthRepository] Magic link sent successfully', { email: credentials.email });

      return {
        user,
        accessToken: '',
        refreshToken: '',
        requiresConfirmation: true,
        message: 'Check your inbox – we sent you a magic link to sign in'
      };
    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Signin failed', { error: (error as Error).message });
      throw error;
    }
  }

  async setSession(accessToken: string, refreshToken: string): Promise<any> {
    try {
      logger.info('🔗 [SupabaseAuthRepository] Setting session with tokens');

      const { data, error } = await this.supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) {
        logger.error('❌ [SupabaseAuthRepository] Set session failed', { error: error.message });
        throw new Error(error.message);
      }

      logger.info('✅ [SupabaseAuthRepository] Session set successfully');
      return { data, error: null };
    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Set session error', { error: (error as Error).message });
      throw error;
    }
  }

  async getEmployeeByUserId(userId: string): Promise<any> {
    try {
      logger.info('👤 [SupabaseAuthRepository] Getting employee by user ID', { userId });

      const { data, error } = await this.supabaseAdmin
        .from('employees')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        logger.warn('⚠️ [SupabaseAuthRepository] Employee not found', { userId, error: error.message });
        return { data: null, error };
      }

      logger.info('✅ [SupabaseAuthRepository] Employee found', { employeeId: data.id, status: data.status });
      return { data, error: null };
    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Get employee by user ID failed', { error: (error as Error).message });
      throw error;
    }
  }

  async createEmployeeRecord(employeeData: any): Promise<any> {
    try {
      logger.info('➕ [SupabaseAuthRepository] Creating employee record', {
        userId: employeeData.user_id,
        email: employeeData.email,
        role: employeeData.role
      });

      const { data, error } = await this.supabaseAdmin
        .from('employees')
        .insert(employeeData)
        .select()
        .single();

      if (error) {
        logger.error('❌ [SupabaseAuthRepository] Create employee record failed', { error: error.message });
        throw new Error(error.message);
      }

      logger.info('✅ [SupabaseAuthRepository] Employee record created', { employeeId: data.id });
      return data;
    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Create employee record error', { error: (error as Error).message });
      throw error;
    }
  }

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

  async signOut(accessToken: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut({ scope: 'local' });
      if (error) throw new Error(error.message);
    } catch (error) {
      logger.error('Signout failed', { error: (error as Error).message });
      throw error;
    }
  }

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

  async resendConfirmationEmail(email: string): Promise<{ message: string }> {
    try {
      logger.info('📧 [SupabaseAuthRepository] Resending magic link confirmation', { email });

      const { data, error } = await this.supabase.auth.signUp({
        email: email,
        password: crypto.randomBytes(32).toString('hex'), // dummy password for magic link auth
        options: {
          emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm`,
          data: {
            resend: true,
            full_name: 'Resend User',
            role: 'employee'
          },
          captchaToken: undefined // Enable PKCE flow
        }
      });

      if (error) throw new Error(error.message);
      logger.info('✅ [SupabaseAuthRepository] Magic link resent successfully', { email });

      return {
        message: 'Check your inbox – we sent you a new confirmation email. Please verify your account to continue.'
      };
    } catch (error) {
      logger.error('❌ [SupabaseAuthRepository] Resend confirmation failed', { error: (error as Error).message });
      throw error;
    }
  }
}