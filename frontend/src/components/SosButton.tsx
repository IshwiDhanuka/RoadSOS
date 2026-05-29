import React from 'react';
import { ShieldAlert, Phone } from 'lucide-react';
import { useSos } from '../context/SosContext';
import { triggerSos } from '../api/apiService';

export const SosButton: React.FC = () => {
  const { isActive, setIsActive, location } = useSos();

  const handleToggle = async () => {
    try {
      if (!isActive) {
        await triggerSos({
          lat: location?.lat || 0,
          lng: location?.lng || 0,
          timestamp: Date.now(),
        });
        setIsActive(true);
        // Vibrate on mobile if supported
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      } else {
        setIsActive(false);
      }
    } catch (error) {
      console.error('Failed to toggle SOS:', error);
      setIsActive(!isActive);
    }
  };

  return (
    <div className="sos-button-wrapper">
      {isActive && <div className="pulse-ring"></div>}
      {isActive && <div className="pulse-ring" style={{ animationDelay: '0.4s' }}></div>}
      <button
        onClick={handleToggle}
        className={`sos-button ${isActive ? 'active' : ''}`}
        aria-label={isActive ? 'Cancel SOS' : 'Trigger SOS'}
      >
        {isActive ? (
          <>
            <Phone size={48} />
            <span className="sos-button-label">CANCEL SOS</span>
            <span className="sos-button-sub">Tap to deactivate</span>
          </>
        ) : (
          <>
            <ShieldAlert size={48} />
            <span className="sos-button-label">SOS</span>
            <span className="sos-button-sub">Tap for emergency</span>
          </>
        )}
      </button>
    </div>
  );
};
