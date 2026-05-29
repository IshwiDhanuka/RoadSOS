import React, { useState } from 'react';
import { Save, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useSos } from '../context/SosContext';

export const ConfigurationForm: React.FC = () => {
  const { isOnline, lastSyncTime } = useSos();
  const [config, setConfig] = useState({
    serverUrl: import.meta.env.VITE_API_BASE_URL || 'https://roadsos-api.onrender.com',
    meshEnabled: true,
    autoLocation: true,
    emergencyContacts: '108, 112, 100',
  });
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('roadSosConfig', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clearCache = () => {
    localStorage.removeItem('roadSosOfflineBundle');
    localStorage.removeItem('roadSosLastSync');
    alert('Offline cache cleared. Tap "Sync Offline" on the dashboard to re-download.');
  };

  return (
    <div className="page-container">
      <header style={{ marginBottom: '1.5rem' }}>
        <h1>Settings</h1>
        <p style={{ margin: 0 }}>Configure your RoadSOS node.</p>
      </header>

      {/* Network status card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isOnline ? <Wifi size={20} color="var(--success)" /> : <WifiOff size={20} color="var(--danger)" />}
            <div>
              <strong>{isOnline ? 'Connected' : 'Offline'}</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {lastSyncTime ? `Last sync: ${new Date(lastSyncTime).toLocaleString()}` : 'Never synced'}
              </div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={clearCache}>
            <RefreshCw size={14} /> Clear Cache
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label className="form-label">Dispatch Server URL</label>
          <input
            type="text"
            className="form-input"
            value={config.serverUrl}
            onChange={e => setConfig({ ...config, serverUrl: e.target.value })}
          />
        </div>

        <div>
          <label className="form-label">Emergency Contacts (comma separated)</label>
          <input
            type="text"
            className="form-input"
            value={config.emergencyContacts}
            onChange={e => setConfig({ ...config, emergencyContacts: e.target.value })}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            These numbers are shown as fallback when no services are found.
          </span>
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={config.meshEnabled}
            onChange={e => setConfig({ ...config, meshEnabled: e.target.checked })}
          />
          <span>Enable background mesh relay forwarding</span>
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={config.autoLocation}
            onChange={e => setConfig({ ...config, autoLocation: e.target.checked })}
          />
          <span>Auto-detect high accuracy GPS on launch</span>
        </label>

        {saved && (
          <div className="alert alert-success">Settings saved successfully.</div>
        )}

        <button type="submit" className="btn btn-accent" style={{ alignSelf: 'flex-start' }}>
          <Save size={16} /> Save Settings
        </button>
      </form>
    </div>
  );
};
