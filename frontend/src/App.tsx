import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { OfflineBanner } from './components/OfflineBanner';
import { Dashboard } from './pages/Dashboard';
import { MapView } from './pages/MapView';
import { ServiceSearch } from './pages/ServiceSearch';
import { FirstAid } from './pages/FirstAid';
import { ReportAccident } from './pages/ReportAccident';
import { ConfigurationForm } from './components/ConfigurationForm';

const App: React.FC = () => {
  return (
    <Router>
      <OfflineBanner />
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/search" element={<ServiceSearch />} />
            <Route path="/first-aid" element={<FirstAid />} />
            <Route path="/report" element={<ReportAccident />} />
            <Route path="/settings" element={<ConfigurationForm />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
