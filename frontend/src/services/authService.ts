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

      if (response.data.data.requiresConfirmation) {
        // Email confirmation required
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
      const response = await api.get<{ user: User }>('/auth/me');
      return response.data.user;
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

  // Resend confirmation email
  async resendConfirmationEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post('/auth/resend-confirmation', { email });
      return {
        success: true,
        message: response.data.message || 'Confirmation email resent successfully'
      };
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
}

// Export singleton instance
export const authService = AuthService.getInstance();
