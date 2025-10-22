import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

// Auth helpers
export class SupabaseAuth {
  // Handle email confirmation
  async handleEmailConfirmation(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        return false;
      }

      if (data.session) {
        // User is confirmed and logged in
        return true;
      }

      return false;
    } catch (error) {
      console.error('Email confirmation error:', error);
      return false;
    }
  }

  // Sign in with magic link (passwordless)
  async signIn(email: string): Promise<any> {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            login: true
          },
          emailRedirectTo: `${(import.meta as any).env.VITE_FRONTEND_URL || window.location.origin}/confirm`,
        },
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Sign in failed');
    }
  }

  // Sign up with email only (passwordless)
  async signUp(email: string, fullName: string, role: string = 'employee'): Promise<any> {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            full_name: fullName,
            role: role,
            signup: true
          },
          emailRedirectTo: `${(import.meta as any).env.VITE_FRONTEND_URL || window.location.origin}/confirm`,
        },
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Sign up failed');
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message || 'Sign out failed');
    }
  }

  // Get current session
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get session');
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get user');
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

// Export singleton instance
export const supabaseAuth = new SupabaseAuth();
