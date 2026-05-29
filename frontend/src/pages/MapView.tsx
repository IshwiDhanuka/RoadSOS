import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useSos } from '../context/SosContext';
import { getNearbyServices, type ServiceRecord } from '../api/apiService';
import { Phone, Navigation } from 'lucide-react';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ICON_COLORS: Record<string, string> = {
  hospital: '#dc2626',
  ambulance: '#ea580c',
  police: '#2563eb',
  towing: '#7c3aed',
  puncture: '#059669',
  fire: '#dc2626',
};

const makeIcon = (color: string, size: number = 14) =>
  new L.DivIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:2px solid #fff;
      border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [size + 4, size + 4],
    iconAnchor: [(size + 4) / 2, (size + 4) / 2],
  });

const userIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width:16px;height:16px;
    background:#e67e22;
    border:3px solid #fff;
    border-radius:50%;
    box-shadow:0 0 0 4px rgba(230,126,34,0.3), 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const SetView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center, zoom]);
  return null;
};

export const MapView: React.FC = () => {
  const { location } = useSos();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!location) return;
      try {
        const res = await getNearbyServices(location.lat, location.lng, 5000);
        setServices(res.data.services || []);
      } catch { /* handled by apiService */ }
    };
    load();
  }, [location]);

  if (!location) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p>Getting your location...</p>
      </div>
    );
  }

  const center: [number, number] = [location.lat, location.lng];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
          <SetView center={center} zoom={14} />
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* 5km radius */}
          <Circle
            center={center}
            radius={5000}
            pathOptions={{ color: '#e67e22', fillColor: '#e67e22', fillOpacity: 0.05, weight: 1 }}
          />

          {/* User marker */}
          <Marker position={center} icon={userIcon}>
            <Popup>
              <strong>You are here</strong>
            </Popup>
          </Marker>

          {/* Service markers */}
          {services.map(svc => (
            <Marker
              key={svc.id}
              position={[svc.lat, svc.lng]}
              icon={makeIcon(ICON_COLORS[svc.category] || '#666')}
              eventHandlers={{ click: () => setSelectedService(svc) }}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <strong>{svc.name}</strong><br />
                  <span style={{ textTransform: 'capitalize' }}>{svc.category}</span>
                  {svc.distanceMeters && <> · {(svc.distanceMeters / 1000).toFixed(1)}km</>}<br />
                  {svc.phone[0] && (
                    <a href={`tel:${svc.phone[0]}`} style={{ color: '#e67e22', fontWeight: 500 }}>
                      📞 {svc.phone[0]}
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Bottom service info panel (mobile-friendly) */}
      {selectedService && (
        <div className="map-bottom-panel">
          <div className="service-card" style={{ margin: 0 }}>
            <div className="service-card-info">
              <div className="service-card-name">{selectedService.name}</div>
              <div className="service-card-meta">
                <span className="badge badge-category">{selectedService.category}</span>
                <span>{(selectedService.distanceMeters / 1000).toFixed(1)}km away</span>
              </div>
            </div>
            <div className="service-card-actions">
              <button className="btn btn-accent btn-sm" onClick={() => window.location.href = `tel:${selectedService.phone[0] || '112'}`}>
                <Phone size={14} /> Call
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => window.open(`https://maps.google.com/maps?daddr=${selectedService.lat},${selectedService.lng}`, '_blank')}>
                <Navigation size={14} /> Navigate
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedService(null)}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="map-legend">
        <div className="map-legend-item"><div className="map-legend-dot" style={{ background: '#e67e22' }}></div> You</div>
        <div className="map-legend-item"><div className="map-legend-dot" style={{ background: '#dc2626' }}></div> Hospital</div>
        <div className="map-legend-item"><div className="map-legend-dot" style={{ background: '#2563eb' }}></div> Police</div>
        <div className="map-legend-item"><div className="map-legend-dot" style={{ background: '#ea580c' }}></div> Ambulance</div>
      </div>
    </div>
  );
};
