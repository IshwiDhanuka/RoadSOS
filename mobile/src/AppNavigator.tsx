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
import { View, StyleSheet, Platform } from 'react-native';

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
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
