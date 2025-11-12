import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { authService } from '../services/authService';

export function usePurchaseRequestCount() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPendingCount = useCallback(async () => {
    try {
      setIsLoading(true);
      const user = authService.getCurrentUserFromStorage();
      
      if (!user) {
        setPendingCount(0);
        return;
      }

      // Only fetch for admin roles
      if (!['admin', 'hr', 'superadmin'].includes(user.role)) {
        setPendingCount(0);
        return;
      }

      const response = await api.get('/purchase/requests?status=pending');
      
      if (response.data.success) {
        const requests = response.data.data?.requests || response.data.data || [];
        setPendingCount(Array.isArray(requests) ? requests.length : 0);
      }
    } catch (error) {
      console.error('Failed to fetch purchase request count:', error);
      setPendingCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();

    // Poll every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);

    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  return {
    pendingCount,
    isLoading,
    refresh: fetchPendingCount
  };
}
