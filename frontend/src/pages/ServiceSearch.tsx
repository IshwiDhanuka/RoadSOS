import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Phone, Navigation, ShieldCheck, Filter } from 'lucide-react';
import { searchServices, getNearbyServices, type ServiceRecord } from '../api/apiService';
import { useSos } from '../context/SosContext';

const CATEGORIES = ['all', 'hospital', 'ambulance', 'police', 'towing', 'puncture', 'fire'] as const;
const RADIUS_OPTIONS = [1000, 5000, 10000, 20000];

export const ServiceSearch: React.FC = () => {
  const { location } = useSos();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [radius, setRadius] = useState(5000);
  const [results, setResults] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load initial nearby services on mount
  useEffect(() => {
    const loadInitial = async () => {
      if (location) {
        setLoading(true);
        try {
          const res = await getNearbyServices(location.lat, location.lng, radius);
          setResults(res.data.services || []);
        } catch {
          // fallback handled by apiService
        } finally {
          setLoading(false);
        }
      }
    };
    loadInitial();
  }, [location]);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setHasSearched(true);

    try {
      let res;
      if (query.trim()) {
        res = await searchServices(query, location?.lat, location?.lng);
      } else {
        res = await getNearbyServices(location?.lat || 0, location?.lng || 0, radius);
      }

      let services: ServiceRecord[] = res.data.services || [];

      // Client-side category filter
      if (selectedCategory !== 'all') {
        services = services.filter(s => s.category === selectedCategory);
      }

      // Client-side radius filter
      if (location) {
        services = services.filter(s => s.distanceMeters <= radius);
      }

      setResults(services);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [query, selectedCategory, radius, location]);

  // Re-search when category or radius changes
  useEffect(() => {
    if (hasSearched || results.length > 0) {
      handleSearch();
    }
  }, [selectedCategory, radius]);

  const callNumber = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const navigateTo = (lat: number, lng: number) => {
    window.open(`https://maps.google.com/maps?daddr=${lat},${lng}`, '_blank');
  };

  return (
    <div className="page-container">
      <header style={{ marginBottom: '1.5rem' }}>
        <h1>Find Services</h1>
        <p style={{ margin: 0 }}>Search for hospitals, police, ambulances, towing, and more nearby.</p>
      </header>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="search-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search hospitals, police, towing..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-accent" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Filters */}
      <div className="filter-row">
        <div className="category-chips">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
        <div className="radius-select">
          <Filter size={14} />
          <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            {RADIUS_OPTIONS.map(r => (
              <option key={r} value={r}>{r >= 1000 ? `${r / 1000} km` : `${r} m`}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="services-list">
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            Finding services near you...
          </div>
        ) : results.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            {hasSearched
              ? 'No services found. Try a different search or expand the radius.'
              : 'Enter a search term or select a category to find services.'}
          </div>
        ) : (
          results.map(svc => (
            <div key={svc.id} className="service-card">
              <div className="service-card-info">
                <div className="service-card-name">
                  {svc.name}
                  {svc.isVerified && <span className="badge badge-success"><ShieldCheck size={12} /> Verified</span>}
                </div>
                <div className="service-card-meta">
                  <span className="badge badge-category">{svc.category}</span>
                  <span>
                    <MapPin size={12} />
                    {svc.distanceMeters < 1000
                      ? `${Math.round(svc.distanceMeters)}m`
                      : `${(svc.distanceMeters / 1000).toFixed(1)}km`}
                  </span>
                  {svc.openNow !== undefined && (
                    <span className={svc.openNow ? 'text-success' : 'text-danger'}>
                      {svc.openNow ? 'Open now' : 'Closed'}
                    </span>
                  )}
                </div>
                {svc.address && <div className="service-card-address">{svc.address}</div>}
              </div>
              <div className="service-card-actions">
                <button className="btn btn-accent btn-sm" onClick={() => callNumber(svc.phone[0] || '112')}>
                  <Phone size={14} /> Call
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => navigateTo(svc.lat, svc.lng)}>
                  <Navigation size={14} /> Nav
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
