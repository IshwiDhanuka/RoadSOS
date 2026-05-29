import React, { useEffect, useState } from 'react';
import { MapPin, Phone, Navigation, Download, Shield, Activity, Zap } from 'lucide-react';
import { SosButton } from '../components/SosButton';
import { useSos } from '../context/SosContext';
import { getNearbyServices, getOfflineBundle, type ServiceRecord } from '../api/apiService';

export const Dashboard: React.FC = () => {
  const { isActive, location, isOnline, setLastSyncTime } = useSos();
  const [nearbyServices, setNearbyServices] = useState<ServiceRecord[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle');
  const [loadingServices, setLoadingServices] = useState(false);

  // Fetch nearby services when SOS is triggered
  useEffect(() => {
    const fetch = async () => {
      if (isActive && location) {
        setLoadingServices(true);
        try {
          const res = await getNearbyServices(location.lat, location.lng, 5000);
          setNearbyServices(res.data.services?.slice(0, 5) || []);
        } catch {
          setNearbyServices([]);
        } finally {
          setLoadingServices(false);
        }
      }
      if (!isActive) setNearbyServices([]);
    };
    fetch();
  }, [isActive, location]);

  const handleOfflineSync = async () => {
    setSyncStatus('syncing');
    try {
      await getOfflineBundle();
      const now = new Date().toISOString();
      localStorage.setItem('roadSosLastSync', now);
      setLastSyncTime(now);
      setSyncStatus('done');
    } catch {
      setSyncStatus('done');
    }
  };

  const callNumber = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const navigateTo = (lat: number, lng: number) => {
    window.open(`https://maps.google.com/maps?daddr=${lat},${lng}`, '_blank');
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Emergency Response</h1>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            {isOnline ? 'Connected to dispatch network' : 'Operating via local cache'}
          </p>
        </div>
        <button
          onClick={handleOfflineSync}
          className={`btn ${syncStatus === 'done' ? 'btn-success' : 'btn-outline'}`}
          disabled={syncStatus === 'syncing'}
        >
          <Download size={16} />
          <span className="hide-mobile">
            {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'done' ? 'Synced ✓' : 'Sync Offline'}
          </span>
        </button>
      </div>

      {/* SOS Section */}
      <div className="sos-section">
        <SosButton />
        {!isActive && (
          <p className="sos-hint">
            Press the SOS button to broadcast your location to the nearest hospitals, police, and ambulances.
          </p>
        )}
      </div>

      {/* Nearby Services — shown when SOS is active */}
      {isActive && (
        <div className="services-list" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <Zap size={20} color="var(--accent)" /> Nearest Responders
          </h2>
          {loadingServices ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              Finding nearest services...
            </div>
          ) : nearbyServices.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              No cached services available. Tap "Sync Offline" first.
            </div>
          ) : (
            nearbyServices.map(svc => (
              <div key={svc.id} className="service-card">
                <div className="service-card-info">
                  <div className="service-card-name">
                    {svc.name}
                    {svc.isVerified && <span className="badge badge-success">Verified</span>}
                  </div>
                  <div className="service-card-meta">
                    <span className="badge badge-category">{svc.category}</span>
                    <span><MapPin size={12} /> {svc.distanceMeters < 1000 ? `${Math.round(svc.distanceMeters)}m` : `${(svc.distanceMeters / 1000).toFixed(1)}km`}</span>
                  </div>
                  {svc.address && <div className="service-card-address">{svc.address}</div>}
                </div>
                <div className="service-card-actions">
                  <button className="btn btn-accent" onClick={() => callNumber(svc.phone[0] || '112')}>
                    <Phone size={16} /> Call
                  </button>
                  <button className="btn btn-outline" onClick={() => navigateTo(svc.lat, svc.lng)}>
                    <Navigation size={16} /> Navigate
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Stats cards — shown when SOS is NOT active */}
      {!isActive && (
        <div className="stats-grid">
          <div className="card stat-card">
            <Shield size={20} color="var(--accent)" />
            <div className="stat-value">AES-256</div>
            <div className="stat-label">Encryption</div>
          </div>
          <div className="card stat-card">
            <Activity size={20} color="var(--success)" />
            <div className="stat-value">{isOnline ? 'Online' : 'Offline'}</div>
            <div className="stat-label">Network</div>
          </div>
          <div className="card stat-card">
            <MapPin size={20} color="var(--accent)" />
            <div className="stat-value">±5m</div>
            <div className="stat-label">GPS Accuracy</div>
          </div>
        </div>
      )}
    </div>
  );
};
