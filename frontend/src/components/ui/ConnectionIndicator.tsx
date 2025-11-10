import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';

export function ConnectionIndicator() {
  const { isOnline, isPoor } = useConnectionStatus();
  const [show, setShow] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show indicator when offline or connection is poor
    if (!isOnline || isPoor) {
      setShow(true);
      // Small delay for animation
      setTimeout(() => setIsVisible(true), 10);
    } else {
      // Hide with animation
      setIsVisible(false);
      setTimeout(() => setShow(false), 300);
    }
  }, [isOnline, isPoor]);

  if (!show) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div
        className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium shadow-md ${
          !isOnline
            ? 'bg-red-500 text-white'
            : 'bg-yellow-400 text-yellow-900'
        }`}
      >
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>No internet connection</span>
          </>
        ) : (
          <>
            <Wifi className="h-4 w-4" />
            <span>Poor connection - Some features may be slow</span>
          </>
        )}
      </div>
    </div>
  );
}
