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
      const response = await api.post<AuthResponse>('/auth/login', credentials);
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

      // User is confirmed and logged in
      // Store tokens and user data
      localStorage.setItem('accessToken', response.data.data.accessToken);
      localStorage.setItem('refreshToken', response.data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));

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

  // Reset password
  async resetPassword(email: string): Promise<void> {
    try {
      await api.post('/auth/forgot-password', { email });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Password reset failed');
    }
  }

  // Update password
  async updatePassword(newPassword: string): Promise<void> {
    try {
      await api.post('/auth/update-password', { newPassword });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Password update failed');
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
