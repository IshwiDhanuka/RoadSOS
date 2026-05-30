import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import SOSScreen from './screens/SOSScreen';
import MapScreen from './screens/MapScreen';
import SearchScreen from './screens/SearchScreen';
import FirstAidScreen from './screens/FirstAidScreen';
import ReportScreen from './screens/ReportScreen';
import Icon from 'react-native-vector-icons/Ionicons';
import { View, StyleSheet, Platform, PermissionsAndroid, NativeModules, NativeEventEmitter, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { useDispatch } from 'react-redux';
import { setCurrentLocation } from './store/servicesSlice';
import LocalDB from './db/LocalDB';
import { Buffer } from 'buffer';

const { MANETModule } = NativeModules;
const manetEmitter = new NativeEventEmitter(MANETModule);

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#e67e22',
        tabBarInactiveTintColor: '#555b6e',
        tabBarStyle: {
          backgroundColor: '#161625',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          height: Platform.OS === 'ios' ? 80 : 65,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="SOS" 
        component={SOSScreen} 
        options={{ tabBarIcon: ({color, size}) => <Icon name="warning" size={size} color={color} /> }} 
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen} 
        options={{ tabBarIcon: ({color, size}) => <Icon name="map" size={size} color={color} /> }} 
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen} 
        options={{ tabBarIcon: ({color, size}) => <Icon name="search" size={size} color={color} /> }} 
      />
      <Tab.Screen 
        name="FirstAid" 
        component={FirstAidScreen} 
        options={{ title: 'First Aid', tabBarIcon: ({color, size}) => <Icon name="medkit" size={size} color={color} /> }} 
      />
      <Tab.Screen 
        name="Report" 
        component={ReportScreen} 
        options={{ tabBarIcon: ({color, size}) => <Icon name="document-text" size={size} color={color} /> }} 
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const dispatch = useDispatch();

  React.useEffect(() => {
    let watchId: number | null = null;
    const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return;
        }
      }
      
      Geolocation.getCurrentPosition(
        (position) => {
          dispatch(setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude }));
        },
        (error) => console.log('AppNav GPS Init error:', error),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );

      watchId = Geolocation.watchPosition(
        (position) => {
          dispatch(setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude }));
        },
        (error) => console.log('AppNav GPS Watch error:', error),
        { enableHighAccuracy: true, distanceFilter: 10 }
      );
    };

    // Initialize SQLite for offline fallback
    LocalDB.initDB().catch(err => console.warn('LocalDB init failed:', err));

    requestLocationPermission().then(() => {
      // Start active BLE listening after permissions are granted
      if (MANETModule && MANETModule.startListening) {
        MANETModule.startListening()
          .then(() => console.log('MANET Listening Started'))
          .catch((e: any) => console.warn('Failed to start MANET listening', e));
      }
    });

    const meshListener = manetEmitter.addListener('onMeshSOSReceived', (packetJson: string) => {
      try {
        const packet = JSON.parse(packetJson);
        const locationBase64 = packet.locationEnc?.ciphertext || '';
        let latLngStr = 'Unknown Location';
        if (locationBase64) {
           const buffer = Buffer.from(locationBase64, 'base64');
           latLngStr = buffer.toString('utf8');
        } else if (packet.lat && packet.lng) {
           latLngStr = `${packet.lat}, ${packet.lng}`;
        }

        Alert.alert(
          '🚨 EMERGENCY SOS RECEIVED 🚨',
          `Device ID: ${packet.userId?.substring(0, 8)}... is requesting SOS.\n\nCoordinates: ${latLngStr}\n\nThis alert was relayed via Bluetooth Mesh.`,
          [{ text: 'Dismiss' }]
        );
      } catch (e) {
        console.warn('Failed to parse incoming mesh SOS', e);
      }
    });

    return () => {
      if (watchId !== null) Geolocation.clearWatch(watchId);
      meshListener.remove();
    };
  }, [dispatch]);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
