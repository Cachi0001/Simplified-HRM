import axios from 'axios';

const SESSION_MESSAGE_KEY = 'authMessage';

const setSessionMessage = (message: string) => {
  try {
    sessionStorage.setItem(SESSION_MESSAGE_KEY, message);
  } catch {
    localStorage.setItem(SESSION_MESSAGE_KEY, message);
  }
};

export const consumeAuthMessage = () => {
  let message: string | null = null;
  try {
    message = sessionStorage.getItem(SESSION_MESSAGE_KEY);
    if (message) {
      sessionStorage.removeItem(SESSION_MESSAGE_KEY);
      return message;
    }
  } catch {
    message = null;
  }

  if (!message) {
    try {
      message = localStorage.getItem(SESSION_MESSAGE_KEY);
      if (message) {
        localStorage.removeItem(SESSION_MESSAGE_KEY);
      }
    } catch {
      message = null;
    }
  }

  return message;
};

const hasStatusCodeText = (value?: string) => {
  if (!value) {
    return false;
  }
  return /status\s*(code|error)/i.test(value);
};

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

const handleAuthFailure = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('emailConfirmed');
  localStorage.removeItem('pendingConfirmationEmail');
  try {
    sessionStorage.removeItem('confirmExecuted');
  } catch {
    /* noop */
  }
  setSessionMessage('Session expired. Please log in again.');
  window.location.href = '/auth';
};

const applyFriendlyMessage = (error: any, fallback: string) => {
  const data = error.response?.data;
  if (data) {
    if (!data.message || hasStatusCodeText(data.message)) {
      data.message = fallback;
    }
    error.message = data.message;
    return;
  }

  if (!error.message || hasStatusCodeText(error.message)) {
    error.message = fallback;
  }
};

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle pending approval errors first - don't treat as auth failure
    if (error.response?.status === 403 && error.response?.data?.message?.includes('pending approval')) {
      // Don't redirect or show session expired for pending approval
      return Promise.reject(error);
    }

    // Only redirect on 401 errors for auth failures
    // Don't redirect on 403 (account not approved) or other auth-related errors
    if (error.response?.status === 401) {
      if (error.response?.data?.errorType === 'email_not_confirmed') {
        return Promise.reject(error);
      }

      if (error.response?.data?.message?.includes('pending approval')) {
        return Promise.reject(error);
      }

      const message = 'Session expired. Please log in again.';
      if (error.response?.data) {
        error.response.data.message = message;
      }
      error.message = message;
      handleAuthFailure();
      return Promise.reject(error);
    }

    if (error.response?.status === 403) {
      // Special handling for pending approval - don't show generic auth error
      if (error.response?.data?.message?.includes('pending approval')) {
        return Promise.reject(error);
      }
      applyFriendlyMessage(error, 'You are not authorized to perform this action.');
    } else if (error.response?.status === 404) {
      applyFriendlyMessage(error, 'We could not find what you were looking for.');
    } else {
      const message = error.response?.data?.message;
      if (hasStatusCodeText(message)) {
        if (error.response?.data) {
          error.response.data.message = 'Something went wrong. Please try again.';
        }
        error.message = 'Something went wrong. Please try again.';
      } else if (hasStatusCodeText(error.message)) {
        error.message = 'Something went wrong. Please try again.';
      }
    }

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
