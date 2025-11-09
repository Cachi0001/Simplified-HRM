import api, { AuthResponse, LoginRequest, SignupRequest, User } from '../lib/api';

export class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/login', credentials);

      // New backend returns: { success: true, data: { token, user } }
      if (response.data.success && response.data.data) {
        const { token, user } = response.data.data;
        
        // Store token and user data
        localStorage.setItem('accessToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Return in expected format
        return {
          status: 'success',
          message: 'Login successful',
          data: {
            user: {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              role: user.role,
              status: 'active',
              emailVerified: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            accessToken: token,
            refreshToken: token // Using same token for now
          }
        };
      }

      throw new Error('Invalid response from server');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.error || error.message || 'Login failed';
      throw new Error(errorMessage);
    }
  }

  // Signup user (register)
  async signup(userData: SignupRequest): Promise<{ requiresConfirmation: boolean; message: string; user?: User }> {
    try {
      const response = await api.post('/auth/register', {
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName
      });

      // New backend returns: { success: true, message: "..." }
      if (response.data.success) {
        return {
          requiresConfirmation: true,
          message: response.data.message || 'Registration successful. Please check your email for verification link.',
          user: undefined
        };
      }

      throw new Error('Invalid response from server');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.error || error.message || 'Signup failed';
      throw new Error(errorMessage);
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<{ success: boolean; data: User }>('/auth/me');
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response from server');
      }
      return response.data.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to get user';
      throw new Error(errorMessage);
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
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Token refresh failed';
      throw new Error(errorMessage);
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
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Password update failed';
      throw new Error(errorMessage);
    }
  }

  // Reset password (request)
  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const requestId = `forgot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      console.log(`🔑 Requesting password reset for ${email} [Request ID: ${requestId}]`);

      const response = await api.post('auth/forgot-password', { email });

      console.log(`✅ Password reset email sent successfully [Request ID: ${requestId}]`);
      return {
        success: response.data.success || true,
        message: response.data.message || 'Password reset email sent successfully'
      };
    } catch (error: any) {
      console.error('❌ Failed to send password reset email', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.error || error.message || 'Failed to send password reset email';
      throw new Error(errorMessage);
    }
  }

  // Complete password reset (with token)
  async completePasswordReset(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const requestId = `reset_complete_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      console.log(`🔑 Completing password reset with token [Request ID: ${requestId}]`);

      const response = await api.post('auth/reset-password', { 
        token, 
        newPassword 
      });

      console.log(`✅ Password reset completed successfully [Request ID: ${requestId}]`);
      return {
        success: response.data.success || true,
        message: response.data.message || 'Password reset successfully'
      };
    } catch (error: any) {
      console.error('❌ Failed to complete password reset', error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.error || error.message || 'Failed to reset password';
      throw new Error(errorMessage);
    }
  }

  // Resend confirmation email
  async resendConfirmationEmail(email: string): Promise<{ message: string }> {
    try {
      const response = await api.post('/auth/resend-confirmation', { email });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to resend confirmation email';
      throw new Error(errorMessage);
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
