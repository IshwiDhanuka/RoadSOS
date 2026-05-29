import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface Location {
  lat: number;
  lng: number;
}

interface SosContextType {
  isActive: boolean;
  setIsActive: (val: boolean) => void;
  location: Location | null;
  setLocation: (loc: Location | null) => void;
  isOnline: boolean;
  lastSyncTime: string | null;
  setLastSyncTime: (t: string | null) => void;
}

const SosContext = createContext<SosContextType | undefined>(undefined);

export const SosProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(
    localStorage.getItem('roadSosLastSync')
  );

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation({ lat: 28.6139, lng: 77.2090 }), // Default: New Delhi
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setLocation({ lat: 28.6139, lng: 77.2090 });
    }
  }, []);

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return (
    <SosContext.Provider value={{ isActive, setIsActive, location, setLocation, isOnline, lastSyncTime, setLastSyncTime }}>
      {children}
    </SosContext.Provider>
  );
};

export const useSos = () => {
  const context = useContext(SosContext);
  if (!context) {
    throw new Error('useSos must be used within a SosProvider');
  }
  return context;
};
