import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store/store';
import AppNavigator from './src/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import LocalDB from './src/db/LocalDB';
import SplashScreen from 'react-native-splash-screen';
import { StatusBar } from 'react-native';

export default function App() {
  useEffect(() => {
    // Initialize Offline DB on launch
    LocalDB.initDB();
    SplashScreen.hide();

    // Listen to network state to dynamically alert users
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('Is connected?', state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
          <AppNavigator />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
