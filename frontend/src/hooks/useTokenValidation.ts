import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authService } from '../services/authService';
import api from '../lib/api';

interface UseTokenValidationOptions {
  checkInterval?: number; // in milliseconds, default 5 minutes
  onTokenExpired?: () => void;
}

export function useTokenValidation(options: UseTokenValidationOptions = {}) {
  const { checkInterval = 5 * 60 * 1000, onTokenExpired } = options;

  // Check token validity by making a simple API call
  const { error } = useQuery({
    queryKey: ['token-validation'],
    queryFn: async () => {
      try {
        // Make a simple request to check if token is still valid
        await api.get('/auth/me');
        return true;
      } catch (error: any) {
        console.log('Token validation failed:', error.response?.status);

        // If it's a 401 (unauthorized) error, the token has expired
        if (error.response?.status === 401) {
          console.log('Token expired, logging out user');
          authService.logout();

          if (onTokenExpired) {
            onTokenExpired();
          } else {
            // Default behavior: redirect to login
            window.location.href = '/auth';
          }
        }

        return false;
      }
    },
    enabled: authService.isAuthenticated(),
    refetchInterval: checkInterval,
    retry: 1,
    refetchOnWindowFocus: true
  });

  // Also check token validity on component mount
  useEffect(() => {
    if (authService.isAuthenticated()) {
      // Check immediately on mount
      api.get('/auth/me').catch((error: any) => {
        if (error.response?.status === 401) {
          console.log('Token expired on mount, logging out user');
          authService.logout();
          window.location.href = '/auth';
        }
      });
    }
  }, []);
}
