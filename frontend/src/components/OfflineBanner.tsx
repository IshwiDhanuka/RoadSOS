import React from 'react';
import { WifiOff, Clock } from 'lucide-react';
import { useSos } from '../context/SosContext';

export const OfflineBanner: React.FC = () => {
  const { isOnline, lastSyncTime } = useSos();

  if (isOnline) return null;

  return (
    <div className="offline-banner">
      <WifiOff size={16} />
      <span>No internet — using cached data</span>
      {lastSyncTime && (
        <span className="offline-banner-time">
          <Clock size={12} />
          Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};
