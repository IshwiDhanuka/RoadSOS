import axios from 'axios';
import { ServiceRecord } from '../types';

// The Render backend URL provided by the user
const API_BASE_URL = 'https://roadsos-t1f1.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000, // 5s timeout to quickly fallback to offline
});

export const fetchNearbyServices = async (lat: number, lng: number, radius = 5000): Promise<ServiceRecord[]> => {
  const res = await api.get('/services/nearby', { params: { lat, lng, radius } });
  return res.data.services || [];
};

export const searchServices = async (q: string, lat: number, lng: number, category?: string, radius = 5000): Promise<ServiceRecord[]> => {
  const res = await api.get('/services/search', { params: { q, lat, lng, radius, category } });
  return res.data.services || [];
};

export const fetchOfflineBundle = async (lat: number, lng: number): Promise<ServiceRecord[]> => {
  const res = await api.get('/offline/bundle', { params: { lat, lng } });
  // The server returns JSON array of services
  return res.data || [];
};

export const reportAccident = async (lat: number, lng: number, description: string) => {
  const res = await api.post('/report/accident', { lat, lng, description });
  return res.data;
};

export default api;
