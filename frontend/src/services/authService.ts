import api, { AuthResponse, LoginRequest, SignupRequest, User } from '../lib/api';

export class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Login user (passwordless with magic links)
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);

      if (response.data.data.requiresConfirmation) {
        // Magic link sent - return the response as is
        return response.data;
      }

      // User is logged in immediately (fallback for direct login)
      if (response.data.data.accessToken && response.data.data.refreshToken) {
        // Store tokens and user data
        localStorage.setItem('accessToken', response.data.data.accessToken);
        localStorage.setItem('refreshToken', response.data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  // Signup user
  async signup(userData: SignupRequest): Promise<{ requiresConfirmation: boolean; message: string; user?: User }> {
    try {
      const response = await api.post<AuthResponse>('/auth/signup', userData);

      // Check if response indicates an error (user already exists)
      if (response.data.status === 'error') {
        throw new Error(response.data.message || 'Signup failed');
      }

      // Check if email confirmation is required
      if (response.data.data.requiresConfirmation || response.data.data.requiresEmailVerification) {
        return {
          requiresConfirmation: true,
          message: response.data.message,
          user: response.data.data.user
        };
      }

      // User is confirmed and logged in (fallback)
      if (response.data.data.accessToken && response.data.data.refreshToken) {
        // Store tokens and user data
        localStorage.setItem('accessToken', response.data.data.accessToken);
        localStorage.setItem('refreshToken', response.data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }

      return {
        requiresConfirmation: false,
        message: response.data.message,
        user: response.data.data.user
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Signup failed');
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<{ status: string; data: { user: User } }>('/auth/me');
      return response.data.data.user;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get user');
    }
  }

  // Refresh token
  async refreshToken(): Promise<AuthResponse> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post<AuthResponse>('/auth/refresh', {
        refreshToken
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Token refresh failed');
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await api.post('/auth/signout');
    } catch (error) {
      // Even if signout fails on server, clear local storage
      console.warn('Signout failed on server, clearing local storage');
    } finally {
      // Clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  // Update password
  async updatePassword(email: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.put('/auth/update-password', { email, newPassword });
      return {
        success: true,
        message: response.data.message || 'Password updated successfully'
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Password update failed');
    }
  }

  // Reset password (request)
  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Generate a unique request ID for tracking
      const requestId = `forgot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      console.log(`🔑 Requesting password reset for ${email} [Request ID: ${requestId}]`);

      // Ensure proper URL construction without double slashes
      const forgotUrl = `/auth/forgot-password`;
      console.log(`🔗 Password reset request URL: ${forgotUrl}`);

      const response = await api.post(forgotUrl, { email });

      console.log(`✅ Password reset email sent successfully [Request ID: ${requestId}]`);
      return {
        success: true,
        message: response.data.message || 'Password reset email sent successfully'
      };
    } catch (error: any) {
      console.error('❌ Failed to send password reset email', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }
  
  // Complete password reset (with token)
  async completePasswordReset(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // Generate a unique request ID for tracking
      const requestId = `reset_complete_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      console.log(`🔑 Completing password reset with token [Request ID: ${requestId}]`);

      // Ensure proper URL construction without double slashes
      const resetUrl = `/auth/reset-password/${token}`;
      console.log(`🔗 Password reset URL: ${resetUrl}`);

      const response = await api.post(resetUrl, { newPassword });

      console.log(`✅ Password reset completed successfully [Request ID: ${requestId}]`);
      return {
        success: true,
        message: response.data.message || 'Password reset successfully'
      };
    } catch (error: any) {
      console.error('❌ Failed to complete password reset', error);
      throw new Error(error.message || 'Failed to reset password');
    }
  }

  // Resend confirmation email
  async resendConfirmationEmail(email: string): Promise<{ message: string }> {
    try {
      const response = await api.post('/auth/resend-confirmation', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to resend confirmation email');
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  // Get stored user
  getCurrentUserFromStorage(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // Logout - clear all auth data and guards
  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('emailConfirmed');
    localStorage.removeItem('pendingConfirmationEmail'); // Clear pending email
    sessionStorage.removeItem('confirmExecuted');
    console.log('🔓 User logged out - all guards cleared');
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
