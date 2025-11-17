import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authService } from '../services/authService';
import api from '../lib/api';

interface UseTokenValidationOptions {
  checkInterval?: number; // in milliseconds, default 15 minutes
  onTokenExpired?: () => void;
}

export function useTokenValidation(options: UseTokenValidationOptions = {}) {
  const { checkInterval = 15 * 60 * 1000, onTokenExpired } = options; // Changed from 5 to 15 minutes

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

        // Only logout on 401 if it's explicitly a token expiration error
        // Don't logout on network errors or other issues
        if (error.response?.status === 401 && 
            (error.response?.data?.message?.includes('Token expired') ||
             error.response?.data?.message?.includes('Invalid token'))) {
          console.log('[TokenValidation] Token expired, logging out user');
          authService.logout();

          if (onTokenExpired) {
            onTokenExpired();
          } else {
            // Default behavior: redirect to login
            window.location.href = '/auth';
          }
        } else {
          // For other errors, just log and don't logout
          console.log('[TokenValidation] Non-critical error, keeping session');
        }

        return false;
      }
    },
    enabled: authService.isAuthenticated(),
    refetchInterval: checkInterval,
    retry: false, // Don't retry failed requests
    refetchOnWindowFocus: false, // Don't check on window focus - causes issues
    staleTime: checkInterval, // Consider data fresh for the check interval
    refetchOnMount: false, // Don't check on mount - prevents logout on page refresh
    refetchOnReconnect: false // Don't check on reconnect
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
