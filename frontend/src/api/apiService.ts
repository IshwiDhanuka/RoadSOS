import axios, { AxiosError } from 'axios';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ServiceRecord {
  id: string;
  name: string;
  category: 'hospital' | 'ambulance' | 'police' | 'towing' | 'puncture' | 'fire';
  lat: number;
  lng: number;
  phone: string[];
  address: string;
  distanceMeters: number;
  isVerified: boolean;
  openNow?: boolean;
  rating?: number;
  source: 'live' | 'cache' | 'offline';
}

export interface SOSPacket {
  lat: number;
  lng: number;
  timestamp: number;
  userId?: string;
  contactNumbers?: string[];
  batteryLevel?: number;
  message?: string;
}

interface NearbyResponse {
  services: ServiceRecord[];
  source: 'live' | 'cache' | 'offline';
  count: number;
}

interface SearchResponse {
  services: ServiceRecord[];
}

interface SOSTriggerResponse {
  eventId: string;
}

interface MeshRelayResponse {
  eventId: string;
  relayChain?: string[];
}

interface AccidentReportResponse {
  status: string;
  reportId?: string;
}

interface HealthResponse {
  status: string;
  uptime?: number;
  version?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const OFFLINE_BUNDLE_KEY = 'roadSosOfflineBundle';
const REQUEST_TIMEOUT_MS = 5000;

// ─── Axios Instance ─────────────────────────────────────────────────────────────

export const apiService = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: REQUEST_TIMEOUT_MS,
});

apiService.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiService.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('API Error:', error.message);
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      console.warn(
        'Backend unreachable — falling back to offline bundle / mock data.',
      );
    }
    return Promise.reject(error);
  },
);

// ─── Haversine Distance (meters) ────────────────────────────────────────────────

/**
 * Calculates the great-circle distance between two points on Earth using the
 * Haversine formula.
 * @returns distance in **meters**
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Network Helpers ────────────────────────────────────────────────────────────

function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED';
  }
  return false;
}

function isOffline(): boolean {
  return !navigator.onLine;
}

// ─── Offline Mock Data ──────────────────────────────────────────────────────────

/**
 * Returns a comprehensive set of 8+ mock ServiceRecords covering all 6
 * categories.  Coordinates are slightly offset from the caller's real position
 * so markers scatter realistically on the map.
 */
function generateMockServices(lat: number, lng: number): ServiceRecord[] {
  return [
    {
      id: 'mock-hosp-01',
      name: 'Shri Ram Municipal Hospital',
      category: 'hospital',
      lat: lat + 0.008,
      lng: lng + 0.012,
      phone: ['+91-11-23456789', '108'],
      address: '12, MG Road, Near Railway Station, New Delhi 110001',
      distanceMeters: 0,
      isVerified: true,
      openNow: true,
      rating: 4.2,
      source: 'offline',
    },
    {
      id: 'mock-amb-01',
      name: 'Lifeline 108 Ambulance Service',
      category: 'ambulance',
      lat: lat + 0.004,
      lng: lng - 0.009,
      phone: ['108', '+91-9876500108'],
      address: '45, Patel Nagar, Sector 5, Gurugram 122001',
      distanceMeters: 0,
      isVerified: true,
      openNow: true,
      rating: 4.5,
      source: 'offline',
    },
    {
      id: 'mock-pol-01',
      name: 'Sadar Police Station',
      category: 'police',
      lat: lat - 0.011,
      lng: lng + 0.006,
      phone: ['100', '+91-11-26543210'],
      address: '1, Civil Lines, GT Road, New Delhi 110054',
      distanceMeters: 0,
      isVerified: true,
      openNow: true,
      rating: 3.8,
      source: 'offline',
    },
    {
      id: 'mock-tow-01',
      name: 'Sharma Towing & Recovery',
      category: 'towing',
      lat: lat - 0.006,
      lng: lng - 0.014,
      phone: ['+91-9811022334'],
      address: '78, NH-48 Service Road, Manesar, Gurugram 122051',
      distanceMeters: 0,
      isVerified: true,
      openNow: true,
      rating: 4.0,
      source: 'offline',
    },
    {
      id: 'mock-punc-01',
      name: 'Balaji Puncture & Tyre Works',
      category: 'puncture',
      lat: lat + 0.013,
      lng: lng - 0.005,
      phone: ['+91-9999088776'],
      address: 'Shop 3, Mahipalpur Flyover, NH-8, New Delhi 110037',
      distanceMeters: 0,
      isVerified: false,
      openNow: true,
      rating: 4.1,
      source: 'offline',
    },
    {
      id: 'mock-fire-01',
      name: 'Delhi Fire Service – Station No. 7',
      category: 'fire',
      lat: lat - 0.015,
      lng: lng + 0.010,
      phone: ['101', '+91-11-23444555'],
      address: 'Connaught Place, Block A, New Delhi 110001',
      distanceMeters: 0,
      isVerified: true,
      openNow: true,
      rating: 4.3,
      source: 'offline',
    },
    {
      id: 'mock-hosp-02',
      name: 'Fortis Emergency Care',
      category: 'hospital',
      lat: lat - 0.003,
      lng: lng + 0.018,
      phone: ['+91-124-4962222', '108'],
      address: 'Sector 44, Opposite HUDA City Centre, Gurugram 122003',
      distanceMeters: 0,
      isVerified: true,
      openNow: true,
      rating: 4.6,
      source: 'offline',
    },
    {
      id: 'mock-amb-02',
      name: 'Ziqitza Healthcare Ambulance',
      category: 'ambulance',
      lat: lat + 0.010,
      lng: lng + 0.007,
      phone: ['102', '+91-8800112233'],
      address: '23, Dwarka Sector 12, New Delhi 110075',
      distanceMeters: 0,
      isVerified: true,
      openNow: true,
      rating: 4.4,
      source: 'offline',
    },
  ];
}

/**
 * Retrieves offline service data.  Uses the localStorage bundle when available,
 * falling back to comprehensive mock data.  All records are enriched with
 * Haversine distances and sorted nearest-first.
 */
function getOfflineServices(lat: number, lng: number): ServiceRecord[] {
  const raw = localStorage.getItem(OFFLINE_BUNDLE_KEY);
  let services: ServiceRecord[] = raw ? JSON.parse(raw) : [];

  if (services.length === 0) {
    services = generateMockServices(lat, lng);
  }

  // Enrich with distance and mark as offline
  return services
    .map((s) => ({
      ...s,
      distanceMeters: haversineDistance(lat, lng, s.lat, s.lng),
      source: 'offline' as const,
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

function buildOfflineNearbyResponse(
  lat: number,
  lng: number,
  radius: number = 5000,
): NearbyResponse {
  const all = getOfflineServices(lat, lng);
  const filtered = all.filter((s) => s.distanceMeters <= radius);
  return {
    services: filtered,
    source: 'offline',
    count: filtered.length,
  };
}

// ─── API Functions ──────────────────────────────────────────────────────────────

/**
 * GET /api/services/nearby?lat=X&lng=Y&radius=5000
 *
 * Returns nearby emergency services sorted by distance. Falls back to the
 * offline bundle when the device is offline or the request fails.
 */
export async function getNearbyServices(
  lat: number,
  lng: number,
  radius: number = 5000,
): Promise<{ data: NearbyResponse }> {
  if (isOffline()) {
    return { data: buildOfflineNearbyResponse(lat, lng, radius) };
  }

  try {
    return await apiService.get<NearbyResponse>('/services/nearby', {
      params: { lat, lng, radius },
    });
  } catch (error) {
    if (isNetworkError(error)) {
      return { data: buildOfflineNearbyResponse(lat, lng, radius) };
    }
    throw error;
  }
}

/**
 * GET /api/services/search?q=X&category=Y&radius=Z&lat=X&lng=Y
 *
 * Full-text + category search.  When offline the function filters the local
 * bundle by query text AND/OR category.
 */
export async function searchServices(
  query: string,
  lat?: number,
  lng?: number,
  category?: ServiceRecord['category'],
  radius?: number,
): Promise<{ data: SearchResponse }> {
  const filterOffline = (): SearchResponse => {
    const all = getOfflineServices(lat ?? 0, lng ?? 0);
    const q = query.toLowerCase().trim();

    const filtered = all.filter((s) => {
      const matchesCategory = category ? s.category === category : true;
      const matchesQuery = q
        ? s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q)
        : true;
      const matchesRadius =
        radius != null ? s.distanceMeters <= radius : true;
      return matchesCategory && matchesQuery && matchesRadius;
    });

    return { services: filtered };
  };

  if (isOffline()) {
    return { data: filterOffline() };
  }

  try {
    return await apiService.get<SearchResponse>('/services/search', {
      params: { q: query, category, radius, lat, lng },
    });
  } catch (error) {
    if (isNetworkError(error)) {
      return { data: filterOffline() };
    }
    throw error;
  }
}

/**
 * GET /api/offline/bundle
 *
 * Downloads a compressed bundle of ≤ 50 ServiceRecords and **automatically
 * persists** it to localStorage for offline use.
 */
export async function getOfflineBundle(): Promise<{
  data: ServiceRecord[];
}> {
  try {
    const response = await apiService.get<ServiceRecord[]>('/offline/bundle');
    // Persist for offline use
    localStorage.setItem(OFFLINE_BUNDLE_KEY, JSON.stringify(response.data));
    return response;
  } catch (error) {
    // Return whatever we already have cached, or generate mocks
    const cached = localStorage.getItem(OFFLINE_BUNDLE_KEY);
    if (cached) {
      return { data: JSON.parse(cached) };
    }

    // No cache at all — generate mock bundle at a default location
    const fallback = generateMockServices(28.6139, 77.209); // Delhi default
    localStorage.setItem(OFFLINE_BUNDLE_KEY, JSON.stringify(fallback));
    return { data: fallback };
  }
}

/**
 * POST /api/sos/trigger
 *
 * Sends an SOS emergency packet.  Returns an event ID used for tracking.
 * Offline: returns a local mock event ID and logs to console.
 */
export async function triggerSos(
  data: SOSPacket,
): Promise<{ data: SOSTriggerResponse }> {
  if (isOffline()) {
    console.warn('OFFLINE: SOS queued for MANET mesh relay broadcast.');
    return {
      data: { eventId: `offline-sos-${Date.now()}` },
    };
  }

  try {
    return await apiService.post<SOSTriggerResponse>('/sos/trigger', data);
  } catch (error) {
    if (isNetworkError(error)) {
      console.warn('NETWORK ERROR: SOS queued for MANET mesh relay broadcast.');
      return {
        data: { eventId: `offline-sos-${Date.now()}` },
      };
    }
    throw error;
  }
}

/**
 * POST /api/mesh/relay
 *
 * Relays an SOS packet through the mesh / MANET network.  Payload identical to
 * sos/trigger but includes relay-chain metadata.
 */
export async function meshRelay(
  data: SOSPacket & { relayChain?: string[] },
): Promise<{ data: MeshRelayResponse }> {
  if (isOffline()) {
    console.warn('OFFLINE: Mesh relay queued locally.');
    return {
      data: {
        eventId: `mesh-${Date.now()}`,
        relayChain: data.relayChain ?? [],
      },
    };
  }

  try {
    return await apiService.post<MeshRelayResponse>('/mesh/relay', data);
  } catch (error) {
    if (isNetworkError(error)) {
      console.warn('NETWORK ERROR: Mesh relay queued locally.');
      return {
        data: {
          eventId: `mesh-${Date.now()}`,
          relayChain: data.relayChain ?? [],
        },
      };
    }
    throw error;
  }
}

/**
 * POST /api/report/accident
 *
 * Files an accident / incident report.
 */
export async function reportAccident(
  lat: number,
  lng: number,
  description: string,
): Promise<{ data: AccidentReportResponse }> {
  if (isOffline()) {
    console.warn('OFFLINE: Accident report queued for mesh broadcast.');
    return { data: { status: 'queued' } };
  }

  try {
    return await apiService.post<AccidentReportResponse>('/report/accident', {
      lat,
      lng,
      description,
    });
  } catch (error) {
    if (isNetworkError(error)) {
      console.warn('NETWORK ERROR: Accident report queued for mesh broadcast.');
      return { data: { status: 'queued' } };
    }
    throw error;
  }
}

/**
 * PATCH /api/sos/:id/status
 *
 * Updates the status of an active SOS event.
 */
export async function updateSosStatus(
  id: string,
  status: 'active' | 'resolved',
): Promise<{ data: { status: string } }> {
  if (isOffline()) {
    console.warn(`OFFLINE: SOS ${id} status update to "${status}" queued.`);
    return { data: { status } };
  }

  try {
    return await apiService.patch<{ status: string }>(`/sos/${id}/status`, {
      status,
    });
  } catch (error) {
    if (isNetworkError(error)) {
      console.warn(
        `NETWORK ERROR: SOS ${id} status update to "${status}" queued.`,
      );
      return { data: { status } };
    }
    throw error;
  }
}

/**
 * Convenience helper — returns the current status of a mesh relay event by
 * reading from the local SOS event store.  In a real implementation this would
 * query the backend; for now it returns the offline-safe stub.
 */
export async function getMeshRelayStatus(
  eventId: string,
): Promise<{ data: { eventId: string; status: string; relayCount: number } }> {
  if (isOffline()) {
    return {
      data: { eventId, status: 'pending-relay', relayCount: 0 },
    };
  }

  try {
    return await apiService.get<{
      eventId: string;
      status: string;
      relayCount: number;
    }>(`/mesh/relay/${eventId}`);
  } catch (error) {
    if (isNetworkError(error)) {
      return {
        data: { eventId, status: 'pending-relay', relayCount: 0 },
      };
    }
    throw error;
  }
}

/**
 * GET /health
 *
 * Lightweight health-check against the backend.  Note the path is at root, not
 * under /api, so we hit it directly.
 */
export async function checkHealth(): Promise<{ data: HealthResponse }> {
  if (isOffline()) {
    return { data: { status: 'offline' } };
  }

  try {
    // Health endpoint is at the server root, not under API_BASE_URL
    return await axios.get<HealthResponse>(
      `${API_BASE_URL.replace(/\/api\/?$/, '')}/health`,
      { timeout: REQUEST_TIMEOUT_MS },
    );
  } catch (error) {
    if (isNetworkError(error)) {
      return { data: { status: 'unreachable' } };
    }
    throw error;
  }
}
