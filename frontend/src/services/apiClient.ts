interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Determine API URL based on environment
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else if (import.meta.env.VITE_API_URL) {
      // Use environment variable if set
      this.baseUrl = import.meta.env.VITE_API_URL;
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Local development - connect to local backend
      this.baseUrl = 'http://localhost:3000/api';
    } else {
      // Production - use relative path (monorepo setup, same domain)
      // This works for go3nethrm.vercel.app and any custom domains
      this.baseUrl = '/api';
    }
    
    console.log('🔗 API Client initialized with baseUrl:', this.baseUrl);
    console.log('🌍 Current hostname:', window.location.hostname);
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    
    // Log response for debugging
    console.log('📥 API Response:', {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      contentType,
      ok: response.ok
    });
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API Error:', data);
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    } else {
      if (!response.ok) {
        const text = await response.text();
        console.error('❌ Non-JSON Error:', text);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return {
        status: 'success',
        data: null as T,
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('📤 GET Request:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include'
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('📤 POST Request:', url, data ? '(with data)' : '(no data)');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include'
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('📤 PUT Request:', url);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include'
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('📤 DELETE Request:', url);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include'
    });

    return this.handleResponse<T>(response);
  }
}

// Singleton instance
export const apiClient = new ApiClient();
export default apiClient;