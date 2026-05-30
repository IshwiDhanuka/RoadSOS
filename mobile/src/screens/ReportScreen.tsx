import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { reportAccident } from '../services/api';
import Icon from 'react-native-vector-icons/Ionicons';
import Geolocation from 'react-native-geolocation-service';

const ReportScreen = () => {
  const [description, setDescription] = useState('');
  const [locationStr, setLocationStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description || !locationStr) {
      Alert.alert('Missing Details', 'Please provide both a description and a landmark/location.');
      return;
    }

    setIsSubmitting(true);

    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const finalDesc = `${description} | Landmark: ${locationStr}`;
          await reportAccident(latitude, longitude, finalDesc);
          Alert.alert('Report Submitted', 'Emergency services have been notified of the hazard.');
          setDescription('');
          setLocationStr('');
        } catch (error) {
          Alert.alert('Error', 'Failed to submit report. Ensure network connectivity.');
        } finally {
          setIsSubmitting(false);
        }
      },
      (error) => {
        setIsSubmitting(false);
        Alert.alert('Location Error', 'Could not get your exact location. Please try again or check permissions.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        <View style={styles.header}>
          <Icon name="warning" size={32} color="#e67e22" />
          <Text style={styles.headerTitle}>Report Hazard</Text>
        </View>
        <Text style={styles.subtitle}>Help others by reporting accidents or road blockages anonymously.</Text>
        
        <View style={styles.card}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Landmark / Street</Text>
            <View style={styles.inputContainer}>
              <Icon name="location-outline" size={20} color="#8b8b99" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E.g., Near Main St bridge"
                placeholderTextColor="#8b8b99"
                value={locationStr}
                onChangeText={setLocationStr}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Incident Details</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the incident (e.g., 2 car collision, lane blocked)..."
                placeholderTextColor="#8b8b99"
                multiline
                numberOfLines={5}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="paper-plane" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginLeft: 10,
    letterSpacing: 1,
  },
  subtitle: {
    color: '#8b8b99',
    fontSize: 15,
    marginBottom: 30,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#1c1c2a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a2a40',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#d5d5df',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a40',
    paddingHorizontal: 15,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 15,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingVertical: 0,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#e67e22',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#8c5019',
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default ReportScreen;
