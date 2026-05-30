import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, NativeModules, Alert, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { useDispatch } from 'react-redux';
import { loadNearbyServices } from '../store/servicesSlice';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/Ionicons';

const { VANETModule } = NativeModules;

const requestPermissions = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      ]);
      return granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
};

const SOSScreen = () => {
  const dispatch = useDispatch();
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  const handleSOS = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'RoadSOS requires Location permissions to send an SOS.');
      return;
    }

    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const netInfo = await NetInfo.fetch();
        const isOnline = netInfo.isConnected && netInfo.isInternetReachable !== false;
        
        if (isOnline) {
          dispatch(loadNearbyServices({ lat: latitude, lng: longitude, isOnline }) as any);
          Alert.alert('SOS Transmitted', 'Live Emergency broadcast sent. Searching for nearby responders...', [{ text: 'OK' }]);
        } else {
          if (VANETModule && VANETModule.startMeshSOS) {
            VANETModule.startMeshSOS(latitude, longitude);
            dispatch(loadNearbyServices({ lat: latitude, lng: longitude, isOnline: false }) as any);
            Alert.alert('Offline SOS', 'Triggered offline Mesh broadcast via Bluetooth MANET.', [{ text: 'OK' }]);
          } else {
            Alert.alert('Offline Error', 'Cannot reach network and MANET module not configured.', [{ text: 'OK' }]);
          }
        }
      },
      (error) => {
        Alert.alert('Location Error', error.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  return (
    <View style={styles.container}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
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
    marginBottom: 80,
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
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
});

export default SOSScreen;
