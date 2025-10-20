import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IAuthRepository } from '../interfaces/IAuthRepository';
import { User, CreateUserRequest, LoginRequest, AuthResponse } from '../../models/User';
import { EmailService } from '../../services/EmailService';
import logger from '../../utils/logger';
import crypto from 'crypto';

export class SupabaseAuthRepository implements IAuthRepository {
  private _supabase: SupabaseClient | null = null;

  private get supabase(): SupabaseClient {
    if (!this._supabase) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_ANON_KEY;

      if (!url || !key) {
        throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
      }

      this._supabase = createClient(url, key);
    }
    return this._supabase;
  }

  async signUp(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      logger.info('Signing up user', { email: userData.email });

      // Check if email already exists in employees table
      const { data: existingEmployee } = await this.supabase
        .from('employees')
        .select('id')
        .eq('email', userData.email)
        .single();

      if (existingEmployee) {
        throw new Error('Email already registered');
      }

      const { data, error } = await this.supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: undefined, // Disable default email confirmation
          data: {
            full_name: userData.fullName,
            role: userData.role || 'employee'
          }
        }
      });

      if (error) {
        logger.error('Signup error', { error: error.message });
        // If email already exists, throw duplicate error
        if (error.message.includes('already registered') || error.message.includes('email')) {
          throw new Error('Email already registered');
        }
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('Signup failed - no user created');
      }

      // If no session was created (because email confirmation is disabled),
      // try to create one by signing in
      let session = data.session;
      if (!session) {
        try {
          const { data: signInData } = await this.supabase.auth.signInWithPassword({
            email: userData.email,
            password: userData.password,
          });
          session = signInData.session;
        } catch (signInError) {
          logger.warn('Could not create session after signup', { error: (signInError as Error).message });
          // Continue without session - user will need to verify email first
        }
      }

      // Create employee record with verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      const { data: employeeData, error: employeeError } = await this.supabase
        .from('employees')
        .insert({
          user_id: data.user.id,
          email: userData.email,
          full_name: userData.fullName,
          role: userData.role || 'employee',
          status: 'pending',
          email_verification_token: verificationToken,
          email_verified: false
        })
        .select()
        .single();

      if (employeeError) {
        logger.error('Employee creation error', { error: employeeError.message });
        throw new Error('Failed to create employee record');
      }

      // Send custom confirmation email
      const emailService = new EmailService();
      const confirmationUrl = `http://localhost:3000/auth/verify-email?token=${verificationToken}`;
      await emailService.sendEmailConfirmation(userData.email, userData.fullName, confirmationUrl);

      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        fullName: employeeData.full_name,
        role: employeeData.role,
        emailVerified: false, // Custom verification
        createdAt: new Date(data.user.created_at),
        updatedAt: new Date(data.user.updated_at || data.user.created_at)
      };

      return {
        user,
        accessToken: session?.access_token || '',
        refreshToken: session?.refresh_token || ''
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

      if (error) {
        logger.error('Signin error', { error: error.message });
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        throw new Error('Authentication failed');
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

      // Update employee to verified
      const { error: updateError } = await this.supabase
        .from('employees')
        .update({
          email_verified: true,
          email_verification_token: null
        })
        .eq('id', employee.id);

      if (updateError) {
        logger.error('Email verification update error', { error: updateError.message });
        throw new Error('Failed to verify email');
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
