import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SosButton } from '../components/SosButton';
import { Dashboard } from '../pages/Dashboard';
import { SosProvider } from '../context/SosContext';

// Mock API
vi.mock('../api/apiService', () => ({
  triggerSos: vi.fn().mockResolvedValue({ data: { eventId: 'test-123' } }),
  getNearbyServices: vi.fn().mockResolvedValue({ data: { services: [] } }),
  getOfflineBundle: vi.fn().mockResolvedValue({ data: [] }),
}));

describe('SosButton', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders with initial state "SOS"', () => {
    render(
      <SosProvider>
        <SosButton />
      </SosProvider>
    );
    expect(screen.getByText('SOS')).toBeInTheDocument();
    expect(screen.getByText('Tap for emergency')).toBeInTheDocument();
  });

  it('triggers SOS and changes text when clicked', async () => {
    render(
      <SosProvider>
        <SosButton />
      </SosProvider>
    );
    const btn = screen.getByRole('button', { name: /trigger sos/i });
    fireEvent.click(btn);
    // After click, should show cancel
    expect(await screen.findByText('CANCEL SOS')).toBeInTheDocument();
  });
});

describe('Dashboard', () => {
  it('renders the dashboard header', () => {
    render(
      <SosProvider>
        <Dashboard />
      </SosProvider>
    );
    expect(screen.getByText('Emergency Response')).toBeInTheDocument();
  });
});
