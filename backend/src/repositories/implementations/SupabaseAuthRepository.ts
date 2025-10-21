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
    // Initialize both clients immediately
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      throw new Error('SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY must be set');
    }

    this._supabase = createClient(url, anonKey);
    this._supabaseAdmin = createClient(url, serviceKey); // Initialize here
  }

  private get supabase(): SupabaseClient {
    return this._supabase;
  }

  private get supabaseAdmin(): SupabaseClient {
    return this._supabaseAdmin;
  }

  async signUp(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      logger.info('Signing up user', { email: userData.email });

      // Check for duplicate in auth.users using admin client
      const { data: { users } } = await this.supabaseAdmin.auth.admin.listUsers();
      const emailExists = users.some(u => u.email === userData.email);
      if (emailExists) {
        throw new Error('Email already registered');
      }

      const { data, error } = await this.supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
            role: userData.role || 'employee',
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Signup failed');

      // Trigger creates employee with status='pending' → no session
      // Send welcome email
      try {
        const emailService = new EmailService();
        const approvalToken = crypto.randomBytes(32).toString('hex');
        await emailService.sendWelcomeEmail(userData.email, userData.fullName, approvalToken);
        logger.info('Welcome email sent', { email: userData.email });
      } catch (emailError) {
        logger.error('Welcome email failed', { error: (emailError as Error).message });
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        fullName: userData.fullName,
        role: userData.role || 'employee',
        emailVerified: false, // Will be true after confirmation
        createdAt: new Date(data.user.created_at!),
        updatedAt: new Date(data.user.updated_at || data.user.created_at!),
      };

      return {
        user,
        accessToken: '',
        refreshToken: '',
      };
    } catch (error) {
      logger.error('Signup failed', { error: (error as Error).message });
      throw error;
    }
  }

  async signIn(credentials: LoginRequest): Promise<AuthResponse> {
  try {
    logger.info('Signing in user', { email: credentials.email });

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw error;
    if (!data.user || !data.session) throw new Error('Authentication failed');

    // Use ADMIN client to bypass RLS
    const { data: employee, error: empError } = await this.supabaseAdmin
      .from('employees')
      .select('id, full_name, role, status')
      .eq('user_id', data.user.id)
      .single();

    if (empError || !employee) {
      throw new Error('Employee record not found');
    }

    if (employee.status !== 'active') {
      throw new Error('Account pending admin approval');
    }

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

  async signInWithOAuth(provider: string, idToken?: string): Promise<AuthResponse> {
    try {
      logger.info('Signing in with OAuth', { provider });

      const { data, error } = await this.supabase.auth.signInWithIdToken({
        provider: provider as any,
        token: idToken || '',
      });

      if (error) {
        logger.error('OAuth signin error', { error: error.message });
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        throw new Error('OAuth authentication failed');
      }

      // Get user metadata from employees table
      const { data: userData } = await this.supabase
        .from('employees')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (!userData) {
        throw new Error('Employee record not found');
      }

      // Check if employee is approved by admin
      if (userData.status !== 'active') {
        throw new Error('Account pending admin approval');
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        fullName: userData.full_name,
        role: userData.role,
        emailVerified: data.user.email_confirmed_at ? true : false,
        createdAt: new Date(data.user.created_at),
        updatedAt: new Date(data.user.updated_at || data.user.created_at)
      };

      return {
        user,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token
      };
    } catch (error) {
      logger.error('OAuth signin failed', { error: (error as Error).message });
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error) {
        logger.error('Token refresh error', { error: error.message });
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        throw new Error('Token refresh failed');
      }

      // Get user metadata from employees table
      const { data: userData } = await this.supabase
        .from('employees')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (!userData) {
        throw new Error('Employee record not found');
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        fullName: userData.full_name,
        role: userData.role,
        emailVerified: data.user.email_confirmed_at ? true : false,
        createdAt: new Date(data.user.created_at),
        updatedAt: new Date(data.user.updated_at || data.user.created_at)
      };

      return {
        user,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token
      };
    } catch (error) {
      logger.error('Token refresh failed', { error: (error as Error).message });
      throw error;
    }
  }

  async getCurrentUser(accessToken: string): Promise<User> {
    try {
      const { data, error } = await this.supabase.auth.getUser(accessToken);

      if (error) {
        logger.error('Get current user error', { error: error.message });
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('User not found');
      }

      // Get user metadata from employees table
      const { data: userData } = await this.supabase
        .from('employees')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (!userData) {
        throw new Error('Employee record not found');
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        fullName: userData.full_name,
        role: userData.role,
        emailVerified: data.user.email_confirmed_at ? true : false,
        createdAt: new Date(data.user.created_at),
        updatedAt: new Date(data.user.updated_at || data.user.created_at)
      };

      return user;
    } catch (error) {
      logger.error('Get current user failed', { error: (error as Error).message });
      throw error;
    }
  }

  async signOut(accessToken: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut({
        scope: 'local'
      });

      if (error) {
        logger.error('Signout error', { error: error.message });
        throw new Error(error.message);
      }
    } catch (error) {
      logger.error('Signout failed', { error: (error as Error).message });
      throw error;
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      // Find employee by verification token
      const { data: employee, error } = await this.supabase
        .from('employees')
        .select('*')
        .eq('email_verification_token', token)
        .single();

      if (error || !employee) {
        throw new Error('Invalid verification token');
      }

      // Update employee to verified - handle columns gracefully
      const updateData: any = {};

      try {
        updateData.email_verified = true;
        updateData.email_verification_token = null;
      } catch (schemaError) {
        // If columns don't exist, we'll skip this update
        logger.warn('Email verification columns not available for update', {
          error: (schemaError as Error).message
        });
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await this.supabase
          .from('employees')
          .update(updateData)
          .eq('id', employee.id);

        if (updateError) {
          logger.error('Email verification update error', { error: updateError.message });
          throw new Error('Failed to verify email');
        }
      }
    } catch (error) {
      logger.error('Email verification failed', { error: (error as Error).message });
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:3000/auth/reset-password'
      });

      if (error) {
        logger.error('Password reset error', { error: error.message });
        throw new Error(error.message);
      }
    } catch (error) {
      logger.error('Password reset failed', { error: (error as Error).message });
      throw error;
    }
  }

  async updatePassword(accessToken: string, newPassword: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        logger.error('Password update error', { error: error.message });
        throw new Error(error.message);
      }
    } catch (error) {
      logger.error('Password update failed', { error: (error as Error).message });
      throw error;
    }
  }
}
