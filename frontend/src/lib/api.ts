import axios from 'axios';
import { InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Extend Axios types to include our custom properties
declare module 'axios' {
  export interface InternalAxiosRequestConfig<D = any> {
    requestId?: string;
  }
  
  export interface AxiosResponse<T = any, D = any> {
    config: InternalAxiosRequestConfig<D>;
  }
}

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

// Backend API base URL with enhanced logging and fallback handling
const API_BASE_URL = (() => {
  // Check if we're in production mode
  const isProduction = import.meta.env.PROD;
  
  // Get environment variables with fallbacks - use direct URLs without relying on proxy
  const devApiUrl = 'http://localhost:3000/api';
  const prodApiUrl = 'https://go3nethrm-backend.vercel.app/api';

  // Log API configuration for debugging
  console.log(`API Configuration:
    - Environment: ${isProduction ? 'Production' : 'Development'}
    - Dev API URL: ${devApiUrl}
    - Prod API URL: ${prodApiUrl}
  `);

  // Use production URL in production, localhost URL in development
  let baseUrl = isProduction ? prodApiUrl : devApiUrl;

  // If running in a browser, check if we need to override based on hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Automatic environment detection based on hostname
    const isVercelDeployment = hostname.includes('vercel.app');
    const isCustomDomain = hostname.includes('go3nethrm.com');
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // If we're on Vercel or custom domain but using localhost API, switch to production API
    if ((isVercelDeployment || isCustomDomain) && baseUrl.includes('localhost')) {
      console.log('Detected production deployment but using localhost API - switching to production API');
      baseUrl = prodApiUrl;
    }

    // If we're on localhost but using production API in dev mode, switch to localhost API
    if (isLocalhost && !isProduction && baseUrl.includes('vercel.app')) {
      console.log('Detected localhost in development mode but using production API - switching to localhost API');
      baseUrl = devApiUrl;
    }

    // Special case for preview deployments
    if (isVercelDeployment && hostname !== 'go3nethrm.vercel.app') {
      console.log('Detected Vercel preview deployment');
      // We still use the production API for preview deployments
      baseUrl = prodApiUrl;
    }

    console.log(`Final API URL: ${baseUrl} (Host: ${hostname})`);
  }

  // Ensure no trailing slash to prevent double slash issues
  return baseUrl.replace(/\/$/, '');
})();

// Create axios instance with explicit CORS headers
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased timeout to 15 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Set to true only if you need to send cookies
});

// Request interceptor to add auth token and debug information
api.interceptors.request.use(
  (config) => {
    // Generate a unique request ID for tracking
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    config.requestId = requestId;

    // Ensure URL doesn't have double slashes by normalizing the path
    if (config.url) {
      // Remove leading slash from the URL path to prevent double slashes
      config.url = config.url.replace(/^\//, '');

      // Only log chat-related API requests
      if (config.url?.includes('chat') || config.url?.includes('message')) {
        const fullUrl = `${config.baseURL}/${config.url}`;
        console.log(`💬 Chat API [${requestId}]: ${config.method?.toUpperCase()} ${fullUrl}`);
      }
    }

    // Add auth token if available
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Special handling for password reset endpoints
    if (config.url?.includes('auth/reset-password/') ||
        config.url?.includes('auth/forgot-password')) {
      console.log(`🔑 Password reset request detected [${requestId}]`);

      // Set a longer timeout for password reset requests
      config.timeout = 15000; // 15 seconds

      // Add specific Accept header to handle potential non-JSON responses
      config.headers.Accept = 'application/json, text/plain, */*';
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

const handleAuthFailure = () => {
  // Check if we've already shown a session expired message recently
  // to prevent multiple redirects and messages
  const hasShownExpiredMessage = sessionStorage.getItem('shown_session_expired');
  if (hasShownExpiredMessage) {
    console.log('Suppressing duplicate auth failure handling - already shown');
    return;
  }
  
  // Mark that we've shown the message to prevent duplicates
  try {
    sessionStorage.setItem('shown_session_expired', 'true');
    
    // Clear the flag after a delay
    setTimeout(() => {
      sessionStorage.removeItem('shown_session_expired');
    }, 3000);
  } catch {
    /* noop - sessionStorage might not be available */
  }
  
  // Clear all auth-related data
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
  
  // Set a friendly message that will be shown on the login page
  setSessionMessage('Your session has expired. Please log in again.');
  
  // Generate a unique ID for this auth failure event
  const authFailureId = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  console.log(`🔐 Auth failure handled [ID: ${authFailureId}] - redirecting to login`);
  
  // Redirect to the login page
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

// Response interceptor to handle token refresh and provide better error handling
api.interceptors.response.use(
  (response) => {
    // Get the request ID from the config or generate a new one
    const requestId = response.config.requestId || `resp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Only log chat-related successful responses
    if (response.config.url?.includes('chat') || response.config.url?.includes('message')) {
    }
    
    // Special handling for password reset endpoints
    if (response.config.url?.includes('auth/reset-password/') ||
        response.config.url?.includes('auth/forgot-password')) {
      console.log(`🔑 Password reset response received [${requestId}]`);
    }
    
    return response;
  },
  async (error) => {
    // Get the request ID from the config or generate a new one
    const requestId = error.config?.requestId || `req_unknown`;
    
    // Create a unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Add error ID and request ID to the error object for reference
    error.errorId = errorId;
    error.requestId = requestId;
    
    // Special handling for password reset endpoints
    if (error.config?.url?.includes('auth/reset-password/') ||
        error.config?.url?.includes('auth/forgot-password')) {
      console.log(`🔑 Password reset request failed [${requestId}] [${errorId}]`);
    }

    // CASE 1: Network errors (no response from server)
    if (!error.response) {
      // Prevent duplicate network error messages
      const networkErrorKey = `network-error-${Date.now()}`;
      const recentNetworkError = sessionStorage.getItem('recent-network-error');
      
      if (recentNetworkError && (Date.now() - parseInt(recentNetworkError)) < 5000) {
        // Don't show duplicate network error within 5 seconds
        return Promise.reject(error);
      }
      
      sessionStorage.setItem('recent-network-error', Date.now().toString());
      
      // Check for specific network error types
      if (error.message.includes('Network Error') || error.message.includes('ERR_NETWORK')) {
        error.message = `🌐 No internet connection detected. Please check your network and try again. (Error ID: ${errorId})`;
      } else if (error.message.includes('timeout') || error.code === 'ECONNABORTED') {
        error.message = `⏰ Request timed out. The server is taking too long to respond. Please check your connection and try again. (Error ID: ${errorId})`;
      } else if (error.message.includes('CORS')) {
        error.message = `🔒 Cross-origin request blocked. This is a technical issue. Please contact support with Error ID: ${errorId}`;
      } else {
        error.message = `🌐 Network error occurred. Please check your internet connection and try again. (Error ID: ${errorId})`;
      }
      return Promise.reject(error);
    }

    // CASE 2: Parse errors (invalid JSON)
    if (error.message.includes('Unexpected token') || error.message.includes('JSON.parse')) {
      console.error(`❌ JSON parse error detected [${errorId}]:`, error.message);
      
      // Check if this is the common "Unexpected token 'T', 'The page c'" error
      // which happens when HTML is returned instead of JSON
      if (error.message.includes("Unexpected token 'T', 'The page c'")) {
        console.log(`🔍 Detected HTML response instead of JSON [${errorId}]`);
        error.message = `The server returned an HTML page instead of JSON data. This usually means the server is not running correctly or the API endpoint is incorrect. Please try again later or contact support with Error ID: ${errorId}`;
      } else {
        // For other JSON parse errors
        error.message = `The server returned an invalid response format. Please try again or contact support with Error ID: ${errorId}`;
      }
      
      // Log additional information about the response if available
      if (error.response) {
        console.log(`📄 Response content type: ${error.response.headers?.['content-type']}`);
        
        // Try to log the first 200 characters of the response to help debugging
        try {
          const responseText = error.response.data ? 
            (typeof error.response.data === 'string' ? 
              error.response.data.substring(0, 200) : 
              JSON.stringify(error.response.data).substring(0, 200)) : 
            'No response data';
          console.log(`📄 Response preview: ${responseText}...`);
        } catch (e) {
          console.log('📄 Could not preview response data');
        }
      }
      
      return Promise.reject(error);
    }

    // CASE 3: Authentication errors (401)
    if (error.response?.status === 401) {
      // Check if this is a login attempt with unverified email
      const isLoginAttempt = error.config?.url?.includes('auth/login') ||
                            error.config?.url?.includes('auth/signin');

      // Check for email verification error
      if (error.response?.data?.message?.includes('verify your email') ||
          error.response?.data?.errorType === 'email_not_confirmed') {
        console.log(`🔑 Login attempt with unverified email [${requestId}]`);
        error.message = 'Please verify your email address before logging in.';
        return Promise.reject(error);
      }

      // Check for pending approval
      if (error.response?.data?.message?.includes('pending approval')) {
        console.log(`🔑 Login attempt with pending approval [${requestId}]`);
        error.message = 'Your account is pending admin approval. Please wait for approval email.';
        return Promise.reject(error);
      }

      // Check if this is a login attempt (we don't want to show session expired for login attempts)
      if (isLoginAttempt) {
        console.log(`🔑 Login attempt failed with 401 [${requestId}]`);
        // Use the original error message or a generic one
        error.message = error.response?.data?.message || 'Invalid email or password. Please try again.';
        return Promise.reject(error);
      }

      // For actual session expiration (not during login)
      const message = `Your session has expired. Please log in again. (Error ID: ${errorId})`;

      // Check if we've already shown this message to prevent duplicates
      const hasShownExpiredMessage = sessionStorage.getItem('shown_session_expired');
      if (!hasShownExpiredMessage) {
        sessionStorage.setItem('shown_session_expired', 'true');

        if (error.response?.data) {
          error.response.data.message = message;
        }
        error.message = message;

        // Clear the flag after a delay
        setTimeout(() => {
          sessionStorage.removeItem('shown_session_expired');
        }, 3000);

        handleAuthFailure();
      } else {
        // Suppress duplicate message
        console.log('Suppressing duplicate session expired message');
      }

      return Promise.reject(error);
    }

    // CASE 4: Authorization errors (403)
    if (error.response?.status === 403) {
      // Special handling for pending approval - don't show generic auth error
      if (error.response?.data?.message?.includes('pending approval')) {
        error.message = 'Your account is pending admin approval. You will receive an email once approved.';
      } else {
        applyFriendlyMessage(error, `You don't have permission to perform this action. Please contact your administrator. (Error ID: ${errorId})`);
      }
    } 
    // CASE 5: Not found errors (404)
    else if (error.response?.status === 404) {
      // Check if this is an API endpoint not found or a resource not found
      if (error.config?.url?.includes('api/')) {
        applyFriendlyMessage(error, `The requested resource could not be found. Please check your input and try again. (Error ID: ${errorId})`);
      } else {
        applyFriendlyMessage(error, `We couldn't find what you were looking for. Please check the URL and try again. (Error ID: ${errorId})`);
      }
    } 
    // CASE 6: Validation errors (400)
    else if (error.response?.status === 400) {
      // Check for specific validation error messages
      if (error.response?.data?.message?.includes('already exists')) {
        // Don't modify existing message for "already exists" errors
      } else if (error.response?.data?.message?.includes('required')) {
        // Don't modify existing message for "required field" errors
      } else if (hasStatusCodeText(error.response?.data?.message)) {
        applyFriendlyMessage(error, `Invalid request. Please check your input and try again. (Error ID: ${errorId})`);
      }
    }
    // CASE 7: Server errors (500)
    else if (error.response?.status >= 500) {
      applyFriendlyMessage(error, `Server error. Our team has been notified. Please try again later. (Error ID: ${errorId})`);
    }
    // CASE 8: Connection refused
    else if (error.response?.status === 0 || error.response?.status === 'ECONNREFUSED') {
      error.message = `Cannot connect to the server. Please check if the server is running and try again. (Error ID: ${errorId})`;
    } 
    // CASE 9: Other errors
    else {
      const message = error.response?.data?.message;
      if (hasStatusCodeText(message)) {
        if (error.response?.data) {
          error.response.data.message = `Something went wrong. Please try again or contact support with Error ID: ${errorId}`;
        }
        error.message = `Something went wrong. Please try again or contact support with Error ID: ${errorId}`;
      } else if (hasStatusCodeText(error.message)) {
        error.message = `Something went wrong. Please try again or contact support with Error ID: ${errorId}`;
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
  role: 'superadmin' | 'admin' | 'employee' | 'hr' | 'teamlead';
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
  role?: 'admin' | 'employee' | 'hr';
}

export interface Employee {
  id: string;
  userId: string;
  email: string;
  fullName: string; // Backend maps full_name to fullName
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
