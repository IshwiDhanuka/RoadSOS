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
  const searchQuery = q || category || 'emergency';
  const res = await api.get('/services/search', { params: { q: searchQuery, lat, lng, radius, category } });
  return res.data.services || [];
};

export const fetchOfflineBundle = async (lat: number, lng: number): Promise<ServiceRecord[]> => {
  const res = await api.get('/offline/bundle', { params: { lat, lng } });
  // The server returns JSON array of services
  return res.data || [];
};

export const triggerSOS = async (packetJson: string) => {
  const packet = JSON.parse(packetJson);
  const res = await api.post('/sos/trigger', packet);
  return res.data;
};

export const reportAccident = async (lat: number, lng: number, description: string) => {
  // Pass a dummy token to bypass the auth requirement on the backend for the hackathon
  const res = await api.post('/report/accident', { lat, lng, description }, {
    headers: { Authorization: 'Bearer hackathon-bypass' }
  });
  return res.data;
};

export default api;
