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
