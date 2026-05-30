import { store } from '../src/store/store';
import { clearServices } from '../src/store/servicesSlice';

describe('Redux Services Slice', () => {
  beforeEach(() => {
    store.dispatch(clearServices());
  });

  it('should have initial state', () => {
    const state = store.getState().services;
    expect(state.nearby).toEqual([]);
    expect(state.source).toEqual('live');
    expect(state.isLoading).toBe(false);
  });

  it('should clear services correctly', () => {
    store.dispatch({
      type: 'services/loadNearby/fulfilled',
      payload: {
        services: [{ id: '1', name: 'Test Hospital', category: 'hospital', lat: 1, lng: 1, phone: [], address: '', distanceMeters: 100, isVerified: true, source: 'live' }],
        source: 'live'
      }
    });

    let state = store.getState().services;
    expect(state.nearby.length).toBe(1);

    store.dispatch(clearServices());
    state = store.getState().services;
    expect(state.nearby.length).toBe(0);
  });
});
