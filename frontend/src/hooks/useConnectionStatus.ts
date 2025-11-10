import { useState, useEffect } from 'react';

interface ConnectionStatus {
  isOnline: boolean;
  isPoor: boolean;
  effectiveType?: string;
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: navigator.onLine,
    isPoor: false,
    effectiveType: undefined
  });

  useEffect(() => {
    const updateOnlineStatus = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine
      }));
    };

    const updateConnectionQuality = () => {
      // Check if Network Information API is available
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      if (connection) {
        const effectiveType = connection.effectiveType;
        const isPoor = effectiveType === 'slow-2g' || 
                      effectiveType === '2g' || 
                      connection.downlink < 1; // Less than 1 Mbps

        setStatus(prev => ({
          ...prev,
          isPoor,
          effectiveType
        }));
      }
    };

    // Initial check
    updateConnectionQuality();

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Listen for connection changes
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateConnectionQuality);
    }

    // Periodic check for connection quality (every 30 seconds)
    const interval = setInterval(updateConnectionQuality, 30000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      
      if (connection) {
        connection.removeEventListener('change', updateConnectionQuality);
      }
      
      clearInterval(interval);
    };
  }, []);

  return status;
}
