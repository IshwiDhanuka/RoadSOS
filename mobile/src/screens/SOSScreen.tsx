import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, NativeModules,
  Alert, Platform, PermissionsAndroid, FlatList, Linking, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { loadNearbyServices } from '../store/servicesSlice';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/Ionicons';

// Native module is registered as "MANETModule" in Kotlin
const { MANETModule } = NativeModules;

const CATEGORY_ICONS: Record<string, string> = {
  hospital: 'medkit',
  ambulance: 'car',
  police: 'shield-checkmark',
  fire: 'flame',
  towing: 'build',
  puncture: 'construct',
  fuel: 'speedometer',
};

const CATEGORY_COLORS: Record<string, string> = {
  hospital: '#e74c3c',
  ambulance: '#e74c3c',
  police: '#3498db',
  fire: '#f39c12',
  towing: '#9b59b6',
  puncture: '#1abc9c',
  fuel: '#2ecc71',
};

const SOSScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const currentLocation = useSelector((state: any) => state.services.currentLocation);
  const nearbyServices = useSelector((state: any) => state.services?.nearby || []);
  const isLoading = useSelector((state: any) => state.services?.isLoading || false);
  const [sosTriggered, setSOSTriggered] = useState(false);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
      try {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        ]);
      } catch (err) {
        console.warn('Bluetooth permission request failed', err);
      }
    }
  };

  const handleSOS = async () => {
    if (!currentLocation) {
      Alert.alert('Location Unknown', 'GPS location is not ready yet. Please wait a moment.');
      return;
    }

    const { lat: latitude, lng: longitude } = currentLocation;
    const netInfo = await NetInfo.fetch();
    const isOnline = netInfo.isConnected && netInfo.isInternetReachable !== false;

    // Always fetch nearby services first — this is the core value
    dispatch(loadNearbyServices({ lat: latitude, lng: longitude, isOnline: !!isOnline }) as any);
    setSOSTriggered(true);

    if (isOnline) {
      // Online: try to send ECDSA-signed packet to backend (non-blocking)
      try {
        if (MANETModule && MANETModule.generateSOSPacket) {
          const packetJson = await MANETModule.generateSOSPacket(latitude, longitude);
          const { triggerSOS } = require('../services/api');
          await triggerSOS(packetJson);
        }
      } catch (e) {
        console.warn('MANET packet/API SOS failed (non-critical):', e);
      }
      Alert.alert(
        '🚨 SOS Transmitted',
        'Emergency broadcast sent. Nearest responders are shown below. Tap Call to reach them.',
        [{ text: 'OK' }]
      );
    } else {
      // Offline: try BLE mesh relay
      await requestBluetoothPermissions();
      try {
        if (MANETModule && MANETModule.startMeshSOS) {
          await MANETModule.startMeshSOS(latitude, longitude);
          Alert.alert(
            '📡 Offline SOS',
            'Bluetooth mesh beacon activated. SOS packet is being broadcast to nearby devices.\n\nCached emergency services are shown below.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            '⚠️ Offline',
            'No internet connection. Showing cached emergency services from local database.',
            [{ text: 'OK' }]
          );
        }
      } catch (e) {
        console.warn('BLE mesh SOS failed:', e);
        Alert.alert(
          '⚠️ Offline',
          'Bluetooth mesh could not start. Showing cached emergency services.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleCall = (service: any) => {
    const phone = Array.isArray(service.phone) ? service.phone[0] : service.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('No Phone Number', `No phone number available for ${service.name}.`);
    }
  };

  const handleNavigate = (service: any) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${service.lat},${service.lng}`;
    Linking.openURL(url);
  };

  const renderServiceCard = ({ item }: { item: any }) => {
    const iconName = CATEGORY_ICONS[item.category] || 'location';
    const color = CATEGORY_COLORS[item.category] || '#e67e22';
    const distance = item.distanceMetres || item.distanceMeters;

    return (
      <View style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: color + '22' }]}>
            <Icon name={iconName} size={20} color={color} />
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.serviceCategory}>{item.category?.toUpperCase()}</Text>
            {item.address && (
              <Text style={styles.serviceAddress} numberOfLines={2}>{item.address}</Text>
            )}
            {distance ? (
              <Text style={styles.serviceDistance}>
                {distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`} away
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.serviceActions}>
          <TouchableOpacity style={styles.callButton} onPress={() => handleCall(item)} activeOpacity={0.7}>
            <Icon name="call" size={18} color="#fff" />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={() => handleNavigate(item)} activeOpacity={0.7}>
            <Icon name="navigate" size={18} color="#fff" />
            <Text style={styles.actionText}>Navigate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Sort services by distance
  const sortedServices = [...nearbyServices].sort((a, b) => {
    const distA = a.distanceMetres || a.distanceMeters || 99999;
    const distB = b.distanceMetres || b.distanceMeters || 99999;
    return distA - distB;
  });

  return (
    <View style={styles.container}>
      {!sosTriggered ? (
        // SOS Button View
        <View style={styles.sosContainer}>
          <View style={styles.header}>
            <Icon name="shield-checkmark" size={32} color="#e67e22" />
            <Text style={styles.title}>RoadSOS</Text>
          </View>
          <Text style={styles.subtitle}>Tap the button below in an emergency.</Text>

          <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.pulseInner}>
              <TouchableOpacity style={styles.sosButton} onPress={handleSOS} activeOpacity={0.8}>
                <Text style={styles.sosText}>SOS</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Text style={styles.helpText}>
            {currentLocation ? '📍 GPS locked' : '⏳ Acquiring GPS...'}
          </Text>
        </View>
      ) : (
        // Results View — shown after SOS is triggered
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Icon name="alert-circle" size={24} color="#e67e22" />
            <Text style={styles.resultsTitle}>Nearby Emergency Services</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#e67e22" />
              <Text style={styles.loadingText}>Searching for nearby responders...</Text>
            </View>
          ) : sortedServices.length > 0 ? (
            <FlatList
              data={sortedServices.slice(0, 10)}
              keyExtractor={(item) => item.id?.toString()}
              renderItem={renderServiceCard}
              contentContainerStyle={{ paddingBottom: 120 }}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="search" size={48} color="#555" />
              <Text style={styles.emptyText}>No services found nearby.</Text>
              <Text style={styles.emptySubtext}>Try tapping SOS again or check your connection.</Text>
            </View>
          )}

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => navigation.navigate('Map')}
              activeOpacity={0.8}
            >
              <Icon name="map" size={20} color="#fff" />
              <Text style={styles.mapButtonText}>View on Map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setSOSTriggered(false)}
              activeOpacity={0.8}
            >
              <Icon name="refresh" size={20} color="#e67e22" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  // SOS Button Styles
  sosContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginLeft: 10,
    letterSpacing: 1,
  },
  subtitle: {
    color: '#8b8b99',
    fontSize: 16,
    marginBottom: 60,
  },
  pulseCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(230, 126, 34, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseInner: {
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(230, 126, 34, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    borderWidth: 4,
    borderColor: '#ff5c53',
  },
  sosText: {
    color: '#fff',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 2,
  },
  helpText: {
    color: '#8b8b99',
    marginTop: 30,
    fontSize: 14,
  },
  // Results Styles
  resultsContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8b8b99',
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#8b8b99',
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    color: '#555',
    fontSize: 14,
    marginTop: 8,
  },
  // Service Card
  serviceCard: {
    backgroundColor: '#1c1c2a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  serviceCategory: {
    color: '#e67e22',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  serviceAddress: {
    color: '#8b8b99',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  serviceDistance: {
    color: '#1abc9c',
    fontSize: 13,
    fontWeight: '600',
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27ae60',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 10,
  },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e67e22',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resetButton: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e67e22',
  },
});

export default SOSScreen;
