import axios from 'axios';

// Backend API base URL - Update this when you deploy
const API_BASE_URL = (() => {
  const baseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';

  // If the base URL already includes /api, don't add it again
  if (baseUrl.endsWith('/api')) {
    return baseUrl;
  }

  // Otherwise, add /api for the API endpoints
  return `${baseUrl}/api`;
})();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Only redirect on 401 errors for auth failures
    // Don't redirect on 403 (account not approved) or other auth-related errors
    if (error.response?.status === 401) {
      // Don't redirect for email confirmation errors
      if (error.response?.data?.errorType === 'email_not_confirmed') {
        return Promise.reject(error);
      }
      
      // Don't redirect for account approval errors
      if (error.response?.data?.message?.includes('pending approval')) {
        return Promise.reject(error);
      }

      // Clear auth data and redirect only for true 401 auth failures
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
    
    // For 403 errors (account not approved, etc), just reject without redirect
    // The component will handle the error appropriately
    return Promise.reject(error);
  }
);

export default api;

// Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'employee';
  status?: 'active' | 'inactive' | 'pending';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  status: string;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    requiresConfirmation?: boolean;
    requiresEmailVerification?: boolean;
    message?: string;
  };
}

export interface LoginRequest {
  email: string;
  password?: string; // Optional for passwordless magic link login
}

export interface SignupRequest {
  email: string;
  password?: string; // Optional for passwordless magic link signup
  fullName: string;
  role?: 'admin' | 'employee';
}

export interface Employee {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'employee';
  department?: string;
  position?: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'pending';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeQuery {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  status?: 'active' | 'inactive' | 'pending';
  role?: 'admin' | 'employee';
}
