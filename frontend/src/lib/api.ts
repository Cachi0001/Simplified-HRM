import axios from 'axios';

// Backend API base URL - Update this when you deploy
const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api';

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
    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage and redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/auth';
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
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
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
