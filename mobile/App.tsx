import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, NativeModules, ScrollView, TextInput, PermissionsAndroid, Platform, Switch
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapView, { Marker, Circle } from 'react-native-maps';
import axios from 'axios';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const { MANETModule } = NativeModules;

const MOCK_LOCATION = { lat: 28.7041, lng: 77.1025 };
const API_BASE = 'https://roadsos-api.onrender.com/api'; 

// Comprehensive offline mock services representing what the API should return
const MOCK_SERVICES = [
  { id: 'hosp-01', name: 'Shri Ram Municipal Hospital', category: 'hospital', lat: MOCK_LOCATION.lat + 0.008, lng: MOCK_LOCATION.lng + 0.012, phone: '108', distanceMeters: 800 },
  { id: 'amb-01', name: 'Lifeline 108 Ambulance', category: 'ambulance', lat: MOCK_LOCATION.lat + 0.004, lng: MOCK_LOCATION.lng - 0.009, phone: '108', distanceMeters: 400 },
  { id: 'pol-01', name: 'Sadar Police Station', category: 'police', lat: MOCK_LOCATION.lat - 0.011, lng: MOCK_LOCATION.lng + 0.006, phone: '100', distanceMeters: 1100 },
  { id: 'tow-01', name: 'Sharma Towing & Recovery', category: 'towing', lat: MOCK_LOCATION.lat - 0.006, lng: MOCK_LOCATION.lng - 0.014, phone: '9811022334', distanceMeters: 600 },
  { id: 'punc-01', name: 'Balaji Puncture Works', category: 'puncture', lat: MOCK_LOCATION.lat + 0.013, lng: MOCK_LOCATION.lng - 0.005, phone: '9999088776', distanceMeters: 1300 },
  { id: 'fire-01', name: 'Delhi Fire Service', category: 'fire', lat: MOCK_LOCATION.lat - 0.015, lng: MOCK_LOCATION.lng + 0.010, phone: '101', distanceMeters: 1500 },
  { id: 'hosp-02', name: 'Fortis Emergency Care', category: 'hospital', lat: MOCK_LOCATION.lat - 0.003, lng: MOCK_LOCATION.lng + 0.018, phone: '108', distanceMeters: 300 },
  { id: 'amb-02', name: 'Ziqitza Healthcare Ambulance', category: 'ambulance', lat: MOCK_LOCATION.lat + 0.010, lng: MOCK_LOCATION.lng + 0.007, phone: '102', distanceMeters: 1000 },
];

const getPinColor = (category: string) => {
  switch(category) {
    case 'hospital': return 'red';
    case 'ambulance': return 'orange';
    case 'police': return 'blue';
    case 'towing': return 'yellow';
    default: return 'green';
  }
};

const requestPermissions = async () => {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 31) {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
    } else {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }
  }
};

function SOSScreen({ navigation }: any) {
  const [isSending, setIsSending] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [simulateOffline, setSimulateOffline] = useState(false);

  useEffect(() => {
    requestPermissions(); // Request permissions on startup
    fetch('https://google.com', { method: 'HEAD', mode: 'no-cors' })
      .then(() => setIsOffline(false))
      .catch(() => setIsOffline(true));
  }, []);

  const triggerSOS = async () => {
    setIsSending(true);
    const payload = {
      lat: MOCK_LOCATION.lat,
      lng: MOCK_LOCATION.lng,
      timestamp: Date.now(),
      message: "Emergency SOS Triggered from Mobile",
    };

    if (simulateOffline || isOffline) {
      console.log('Using MANET BLE Mesh for SOS...');
      try {
        if (MANETModule && MANETModule.startMeshSOS) {
          await MANETModule.startMeshSOS(MOCK_LOCATION.lat, MOCK_LOCATION.lng);
          Alert.alert('SOS Queued', 'Broadcasting SOS via BLE MANET Mesh.');
        } else {
          Alert.alert('Error', 'MANETModule not found. Bridge not connected.');
        }
      } catch (err) {
        Alert.alert('Mesh Error', String(err));
      }
    } else {
      try {
        await axios.post(`${API_BASE}/sos/trigger`, payload, { timeout: 3000 });
        Alert.alert('Success', 'SOS Sent to backend.');
      } catch (err) {
        Alert.alert('API Offline', 'Failed to reach API. Turn on Simulate Offline Mode to use Mesh.');
      }
    }
    
    setIsSending(false);
    navigation.navigate('Map');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RoadSOS</Text>
      
      <View style={styles.toggleRow}>
        <Text style={styles.toggleText}>Simulate Offline Mesh</Text>
        <Switch 
          value={simulateOffline} 
          onValueChange={setSimulateOffline} 
          trackColor={{ false: '#767577', true: '#e67e22' }}
          thumbColor={simulateOffline ? '#f5dd4b' : '#f4f3f4'}
        />
      </View>
      <Text style={styles.subtitle}>{simulateOffline ? 'MANET MESH ENABLED' : (isOffline ? 'OFFLINE (Will use Mesh)' : 'ONLINE')}</Text>
      
      <TouchableOpacity 
        style={[styles.sosBtn, isSending && styles.sosBtnDisabled]}
        onPress={triggerSOS}
        disabled={isSending}
      >
        {isSending ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <Text style={styles.sosText}>SOS</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navBtn}
        onPress={() => navigation.navigate('Map')}
      >
        <Text style={styles.navText}>View Map</Text>
      </TouchableOpacity>
    </View>
  );
}

function MapScreen() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.get(`${API_BASE}/services/nearby`, {
          params: { lat: MOCK_LOCATION.lat, lng: MOCK_LOCATION.lng, radius: 5000 },
          timeout: 2000
        });
        setServices(res.data.services || MOCK_SERVICES);
      } catch (err) {
        console.warn('Failed to fetch services online, using MOCK offline data');
        setServices(MOCK_SERVICES); // Fallback to offline mock data
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.mapBanner}>
        <Text style={styles.mapBannerText}>ℹ️ Map tiles missing? Add Google Maps API Key in AndroidManifest.xml (See README)</Text>
      </View>
      {loading ? <ActivityIndicator size="large" color="#e67e22" /> : (
        <MapView 
          style={styles.map}
          initialRegion={{
            latitude: MOCK_LOCATION.lat,
            longitude: MOCK_LOCATION.lng,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          <Marker coordinate={{ latitude: MOCK_LOCATION.lat, longitude: MOCK_LOCATION.lng }} title="You" pinColor="orange" />
          <Circle center={{ latitude: MOCK_LOCATION.lat, longitude: MOCK_LOCATION.lng }} radius={5000} fillColor="rgba(230, 126, 34, 0.1)" strokeColor="rgba(230, 126, 34, 0.5)" />
          {services.map(svc => (
            <Marker 
              key={svc.id}
              coordinate={{ latitude: svc.lat, longitude: svc.lng }}
              title={svc.name}
              description={`${svc.category} - ${(svc.distanceMeters/1000).toFixed(1)}km`}
              pinColor={getPinColor(svc.category)}
            />
          ))}
        </MapView>
      )}
    </View>
  );
}

function SearchScreen() {
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState<string | null>(null);
  
  const filtered = MOCK_SERVICES.filter(s => {
    if (activeChip && s.category.toLowerCase() !== activeChip.toLowerCase()) return false;
    if (query && !s.name.toLowerCase().includes(query.toLowerCase()) && !s.category.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <View style={styles.containerTop}>
      <Text style={styles.header}>Search Services</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Search hospital, towing..." 
        placeholderTextColor="#888"
        value={query}
        onChangeText={setQuery}
      />
      <View style={styles.chipsRow}>
        {['Hospital', 'Ambulance', 'Police', 'Towing', 'Puncture'].map(c => (
          <TouchableOpacity 
            key={c} 
            style={[styles.chip, activeChip === c && styles.chipActive]}
            onPress={() => setActiveChip(activeChip === c ? null : c)}
          >
            <Text style={styles.chipText}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={{width: '100%'}}>
        {filtered.map(s => (
          <View key={s.id} style={styles.card}>
            <Text style={styles.cardTitle}>{s.name}</Text>
            <Text style={styles.cardDesc}>{s.category.toUpperCase()} • {(s.distanceMeters/1000).toFixed(1)}km</Text>
            <TouchableOpacity style={styles.callBtn}>
              <Text style={styles.callText}>Call {s.phone}</Text>
            </TouchableOpacity>
          </View>
        ))}
        {filtered.length === 0 && (
          <Text style={styles.placeholderText}>No services found.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function FirstAidScreen() {
  const sections = [
    { title: 'CPR', content: '1. Check responsiveness.\n2. Call emergency.\n3. Push hard and fast in center of chest (100-120 bpm).' },
    { title: 'Severe Bleeding', content: '1. Apply direct pressure.\n2. Use sterile bandage.\n3. Do not remove original bandage if it soaks through.' },
    { title: 'Spinal Injury', content: '1. Do not move the victim unless in immediate danger.\n2. Keep head and neck perfectly still.' },
    { title: 'Burns', content: '1. Cool the burn under running water.\n2. Do not apply ice or ointments.\n3. Cover with clean cloth.' }
  ];

  return (
    <ScrollView style={styles.scrollContainer}>
      <Text style={styles.header}>First Aid Guide</Text>
      {sections.map((s, i) => (
        <View key={i} style={styles.accordion}>
          <Text style={styles.accordionTitle}>{s.title}</Text>
          <Text style={styles.accordionContent}>{s.content}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function ReportScreen() {
  const [desc, setDesc] = useState('');
  return (
    <View style={styles.containerTop}>
      <Text style={styles.header}>Report Accident</Text>
      <Text style={styles.subtitle}>Alert nearby users anonymously</Text>
      <TextInput 
        style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
        placeholder="Describe the incident..." 
        placeholderTextColor="#888"
        multiline
        value={desc}
        onChangeText={setDesc}
      />
      <TouchableOpacity style={styles.submitBtn} onPress={() => Alert.alert('Reported', 'Incident broadcasted.')}>
        <Text style={styles.submitText}>Submit Report</Text>
      </TouchableOpacity>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{
      headerStyle: { backgroundColor: '#1a1a2e' },
      headerTintColor: '#fff',
      tabBarStyle: { backgroundColor: '#1a1a2e', borderTopColor: '#333' },
      tabBarActiveTintColor: '#e67e22',
      tabBarInactiveTintColor: '#888'
    }}>
      <Tab.Screen name="SOS" component={SOSScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="First Aid" component={FirstAidScreen} />
      <Tab.Screen name="Report" component={ReportScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12121e', alignItems: 'center', justifyContent: 'center' },
  containerTop: { flex: 1, backgroundColor: '#12121e', alignItems: 'center', paddingTop: 20, paddingHorizontal: 16 },
  scrollContainer: { flex: 1, backgroundColor: '#12121e', padding: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#e67e22', marginBottom: 40 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 16, alignSelf: 'flex-start' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  toggleText: { color: '#fff', marginRight: 10, fontSize: 16 },
  sosBtn: { width: 200, height: 200, borderRadius: 100, backgroundColor: '#e74c3c', alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#e74c3c', shadowOpacity: 0.6, shadowRadius: 20, marginBottom: 40 },
  sosBtnDisabled: { backgroundColor: '#c0392b', opacity: 0.8 },
  sosText: { color: '#fff', fontSize: 48, fontWeight: 'bold', letterSpacing: 2 },
  navBtn: { paddingVertical: 12, paddingHorizontal: 24, borderWidth: 1, borderColor: '#e67e22', borderRadius: 8 },
  navText: { color: '#e67e22', fontSize: 16, fontWeight: '600' },
  mapBanner: { position: 'absolute', top: 20, left: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, borderRadius: 8, zIndex: 10 },
  mapBannerText: { color: '#e67e22', fontSize: 12, textAlign: 'center' },
  map: { width: '100%', height: '100%' },
  input: { width: '100%', backgroundColor: '#1a1a2e', color: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333', marginBottom: 16 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, width: '100%' },
  chip: { backgroundColor: '#333', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: '#e67e22' },
  chipText: { color: '#fff', fontSize: 12 },
  placeholderText: { color: '#555', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#1a1a2e', padding: 16, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#333', width: '100%' },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  cardDesc: { color: '#aaa', fontSize: 14, marginBottom: 12 },
  callBtn: { backgroundColor: '#2ecc71', padding: 10, borderRadius: 8, alignItems: 'center' },
  callText: { color: '#fff', fontWeight: 'bold' },
  accordion: { backgroundColor: '#1a1a2e', padding: 16, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  accordionTitle: { color: '#e67e22', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  accordionContent: { color: '#ccc', fontSize: 14, lineHeight: 22 },
  submitBtn: { backgroundColor: '#e67e22', padding: 16, borderRadius: 8, width: '100%', alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
