import { useState, useEffect } from 'react';

/**
 * Hook to listen to online and offline connection state changes in real time.
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastSyncTime(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, lastSyncTime };
};

export default useNetworkStatus;
