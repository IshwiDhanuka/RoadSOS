import React, { useState } from 'react';
import { reportAccident } from '../api/apiService';
import { useSos } from '../context/SosContext';
import { AlertTriangle, MapPin, Send, CheckCircle, XCircle } from 'lucide-react';

export const ReportAccident: React.FC = () => {
  const { location, isOnline } = useSos();
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !location) return;

    try {
      setStatus('submitting');
      await reportAccident(location.lat, location.lng, `[${severity.toUpperCase()}] ${description}`);
      setStatus('success');
      setDescription('');
      // Auto-clear success after 5s
      setTimeout(() => setStatus('idle'), 5000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <div className="page-container">
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={24} color="var(--accent)" />
          Report Incident
        </h1>
        <p style={{ margin: 0 }}>Alert nearby drivers and emergency services about a road incident.</p>
      </header>

      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Location */}
          <div>
            <label className="form-label">Your Location</label>
            <div className="location-display">
              <MapPin size={16} />
              {location
                ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                : 'Detecting location...'}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="form-label">Severity</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['low', 'medium', 'high'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  className={`category-chip ${severity === s ? 'active' : ''}`}
                  onClick={() => setSeverity(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="form-label">What happened?</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="E.g., Two-car collision on NH-48, left lane blocked. One person injured."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Status Messages */}
          {status === 'success' && (
            <div className="alert alert-success">
              <CheckCircle size={16} /> Report submitted. Nearby users have been notified via FCM.
            </div>
          )}
          {status === 'error' && (
            <div className="alert alert-danger">
              <XCircle size={16} /> {isOnline ? 'Failed to submit. Try again.' : 'Report queued — will send when online.'}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-accent"
            disabled={!location || !description || status === 'submitting'}
            style={{ width: '100%' }}
          >
            <Send size={18} />
            {status === 'submitting' ? 'Sending...' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
};
