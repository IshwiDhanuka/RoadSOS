import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldAlert, LayoutDashboard, Map, Search, AlertTriangle, Settings, HeartPulse, WifiOff } from 'lucide-react';
import { useSos } from '../context/SosContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'SOS', end: true },
  { to: '/map', icon: Map, label: 'Map' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/first-aid', icon: HeartPulse, label: 'First Aid' },
  { to: '/report', icon: AlertTriangle, label: 'Report' },
];

export const Sidebar: React.FC = () => {
  const { isActive, isOnline } = useSos();

  return (
    <>
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <aside className="desktop-sidebar">
        <div className="sidebar-brand">
          <ShieldAlert size={24} />
          <span className="sidebar-brand-text">RoadSOS</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: '1.5rem' }}>System</div>
          <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          {!isOnline && (
            <div className="sidebar-offline-badge">
              <WifiOff size={14} /> Offline
            </div>
          )}
          <div className={`sidebar-status ${isActive ? 'critical' : ''}`}>
            <span className={`status-dot ${isActive ? 'active' : 'safe'}`}></span>
            {isActive ? 'SOS ACTIVE' : 'Standby'}
          </div>
        </div>
      </aside>

      {/* Mobile bottom navigation — visible only on mobile via CSS */}
      <nav className="bottom-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
};
