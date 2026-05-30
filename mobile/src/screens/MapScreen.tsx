import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const MapScreen = () => {
  const mapRef = useRef<MapView>(null);
  const currentLocation = useSelector((state: any) => state.services?.currentLocation);
  const location = currentLocation ? { latitude: currentLocation.lat, longitude: currentLocation.lng } : null;
  const nearbyServices = useSelector((state: any) => state.services?.nearby || []);

  // Force map to re-render when tab is focused — fixes the blank tile issue
  const [mapKey, setMapKey] = React.useState(0);
  useFocusEffect(
    useCallback(() => {
      // Bump the key to force a full remount of MapView when the tab gains focus
      setMapKey(prev => prev + 1);
    }, [])
  );

  const defaultRegion = {
    latitude: location?.latitude || 28.6139,
    longitude: location?.longitude || 77.2090,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      <MapView
        key={`map-${mapKey}`}
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={defaultRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={true}
        loadingEnabled={true}
        loadingIndicatorColor="#e67e22"
        loadingBackgroundColor="#0f0f1a"
      >
        {location && (
          <Circle
            center={location}
            radius={500}
            fillColor="rgba(79, 172, 254, 0.15)"
            strokeColor="rgba(79, 172, 254, 0.5)"
            strokeWidth={1}
          />
        )}

        {nearbyServices.map((service: any) => (
          <Marker
            key={service.id}
            coordinate={{ latitude: service.lat, longitude: service.lng }}
            title={service.name}
            description={`${service.category}${service.distanceMetres ? ' • ' + Math.round(service.distanceMetres) + 'm away' : ''}`}
            pinColor={
              service.category === 'hospital' ? '#e74c3c' :
              service.category === 'police' ? '#3498db' :
              service.category === 'fire' ? '#f39c12' :
              '#e67e22'
            }
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  map: {
    width: width,
    height: height,
  },
});

export default MapScreen;
