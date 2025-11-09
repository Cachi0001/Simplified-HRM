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
        // Use profile endpoint instead of /auth/me
        await api.get('/employees/my-profile');
        return true;
      } catch (error: any) {
        console.log('[TokenValidation] Token check failed:', error.response?.status);

        // If it's a 401 (unauthorized) error, the token has expired
        if (error.response?.status === 401) {
          console.log('[TokenValidation] Token expired (401), logging out user');
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
    retry: false, // Don't retry failed requests
    refetchOnWindowFocus: false, // Don't check on window focus - causes issues
    staleTime: checkInterval // Consider data fresh for the check interval
  });

  // Don't check immediately on mount - causes logout on refresh
  // The refetchInterval will handle periodic checks
  useEffect(() => {
    // Only log that validation is enabled
    if (authService.isAuthenticated()) {
      console.log('[TokenValidation] Token validation enabled with interval:', checkInterval);
    }
  }, [checkInterval]);
}
