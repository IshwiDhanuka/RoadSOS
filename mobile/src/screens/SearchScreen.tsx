import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, FlatList, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { searchServices } from '../store/servicesSlice';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const CHIPS = [
  { label: 'Hospital', icon: 'medical' },
  { label: 'Police', icon: 'shield-checkmark' },
  { label: 'Fire', icon: 'flame' },
  { label: 'Ambulance', icon: 'car-sport' }
];

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState('');
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const searchResults = useSelector((state: any) => state.services?.searchResults || []);
  const currentLocation = useSelector((state: any) => state.services?.currentLocation);

  const handleSearch = (text: string, category?: string) => {
    setQuery(text);
    if (currentLocation) {
      const { lat: latitude, lng: longitude } = currentLocation;
      dispatch(searchServices({ q: text, lat: latitude, lng: longitude, category }) as any);
    } else {
      // Fallback to default if location isn't ready
      dispatch(searchServices({ q: text, lat: 28.6139, lng: 77.209, category }) as any);
    }
  };

  const handleChipPress = (chip: string) => {
    const newChip = activeChip === chip ? '' : chip;
    setActiveChip(newChip);
    handleSearch(query, newChip);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Services</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#8b8b99" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search hospitals, police..."
          placeholderTextColor="#8b8b99"
          value={query}
          onChangeText={(text) => handleSearch(text, activeChip)}
          onSubmitEditing={() => navigation.navigate('Map')}
          returnKeyType="search"
        />
      </View>

      <View style={styles.chipsContainer}>
        {CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip.label}
            style={[styles.chip, activeChip === chip.label && styles.activeChip]}
            onPress={() => handleChipPress(chip.label)}
            activeOpacity={0.7}
          >
            <Icon name={chip.icon} size={16} color={activeChip === chip.label ? '#fff' : '#8b8b99'} style={styles.chipIcon} />
            <Text style={[styles.chipText, activeChip === chip.label && styles.activeChipText]}>{chip.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <FlatList
        data={[...searchResults].sort((a, b) => {
          const distA = a.distanceMetres || a.distanceMeters || 0;
          const distB = b.distanceMetres || b.distanceMeters || 0;
          return distA - distB;
        })}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultItem} activeOpacity={0.7} onPress={() => navigation.navigate('Map')}>
            <View style={styles.resultIconContainer}>
              <Icon name="location" size={24} color="#e67e22" />
            </View>
            <View style={styles.resultDetails}>
              <Text style={styles.resultTitle}>{item.name}</Text>
              <Text style={styles.resultSubtitle}>{item.category || item.type}</Text>
              {item.address && (
                <Text style={styles.resultAddress} numberOfLines={2}>{item.address}</Text>
              )}
              {(item.distanceMetres || item.distanceMeters) ? (
                <Text style={styles.resultDistance}>{Math.round(item.distanceMetres || item.distanceMeters)}m away</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="search-outline" size={64} color="#2a2a40" />
            <Text style={styles.emptyText}>No services found nearby.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c2a',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 15,
    fontSize: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c2a',
    borderWidth: 1,
    borderColor: '#2a2a40',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    marginBottom: 10,
  },
  activeChip: {
    backgroundColor: '#e67e22',
    borderColor: '#e67e22',
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    color: '#8b8b99',
    fontSize: 14,
    fontWeight: '600',
  },
  activeChipText: {
    color: '#fff',
  },
  resultItem: {
    flexDirection: 'row',
    backgroundColor: '#1c1c2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a40',
    alignItems: 'center',
  },
  resultIconContainer: {
    backgroundColor: 'rgba(230, 126, 34, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginRight: 15,
  },
  resultDetails: {
    flex: 1,
  },
  resultTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  resultSubtitle: {
    color: '#8b8b99',
    fontSize: 12,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  resultAddress: {
    color: '#a0a0b0',
    fontSize: 12,
    marginBottom: 6,
  },
  resultDistance: {
    color: '#8b8b99',
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#8b8b99',
    fontSize: 16,
    marginTop: 15,
  },
});

export default SearchScreen;
