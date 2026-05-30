import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { ServiceRecord } from '../types';
import { fetchNearbyServices, searchServices as apiSearchServices } from '../services/api';
import LocalDB from '../db/LocalDB';

export const loadNearbyServices = createAsyncThunk(
  'services/loadNearby',
  async ({ lat, lng, isOnline }: { lat: number; lng: number; isOnline: boolean }) => {
    if (isOnline) {
      try {
        const services = await fetchNearbyServices(lat, lng);
        return { services, source: 'live' as const };
      } catch (err) {
        // fallback to offline
        const offlineServices = await LocalDB.getNearbyServices(lat, lng);
        return { services: offlineServices, source: 'offline' as const };
      }
    } else {
      const offlineServices = await LocalDB.getNearbyServices(lat, lng);
      return { services: offlineServices, source: 'offline' as const };
    }
  }
);

export const searchServices = createAsyncThunk(
  'services/search',
  async ({ q, lat, lng, category }: { q: string; lat: number; lng: number; category?: string }) => {
    try {
      const services = await apiSearchServices(q, lat, lng, category);
      return services;
    } catch (err) {
      // Return empty array on failure for now to avoid crash
      return [];
    }
  }
);

interface ServicesState {
  nearby: ServiceRecord[];
  searchResults: ServiceRecord[];
  source: 'live' | 'cache' | 'offline';
  isLoading: boolean;
  error: string | null;
}

const initialState: ServicesState = {
  nearby: [],
  searchResults: [],
  source: 'live',
  isLoading: false,
  error: null,
};

const servicesSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    clearServices: (state) => {
      state.nearby = [];
      state.searchResults = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadNearbyServices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadNearbyServices.fulfilled, (state, action) => {
        state.isLoading = false;
        state.nearby = action.payload.services;
        state.source = action.payload.source;
      })
      .addCase(loadNearbyServices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch services';
      })
      .addCase(searchServices.fulfilled, (state, action) => {
        state.searchResults = action.payload;
        // Optionally update the map with search results
        if (action.payload.length > 0) {
          state.nearby = action.payload;
        }
      });
  }
});

export const { clearServices } = servicesSlice.actions;
export default servicesSlice.reducer;
