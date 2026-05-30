import React from 'react';
import { ScrollView, View, Text, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const INSTRUCTIONS = [
  {
    icon: 'heart-half',
    title: 'CPR (Cardiopulmonary Resuscitation)',
    content: '1. Check the scene for safety.\n2. Tap the person and shout to check responsiveness.\n3. Call emergency services.\n4. Open the airway.\n5. Check for breathing.\n6. Push hard and fast in the center of the chest (100-120 compressions/min).\n7. Deliver rescue breaths if trained.',
  },
  {
    icon: 'flame',
    title: 'Burns',
    content: '1. Cool the burn with cool (not cold) running water for at least 10 minutes.\n2. Remove rings or other tight items from the burned area.\n3. Do not break blisters.\n4. Apply lotion (like aloe vera).\n5. Bandage the burn loosely.',
  },
  {
    icon: 'medical',
    title: 'Choking',
    content: '1. Stand behind the person.\n2. Give 5 back blows between the shoulder blades.\n3. Give 5 abdominal thrusts (Heimlich maneuver).\n4. Alternate between 5 blows and 5 thrusts until the blockage is dislodged.',
  },
];

const FirstAidScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Icon name="medkit" size={32} color="#e67e22" />
        <Text style={styles.headerTitle}>First Aid Guide</Text>
      </View>
      <Text style={styles.subtitle}>Crucial instructions during emergencies.</Text>
      
      {INSTRUCTIONS.map((item, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Icon name={item.icon} size={24} color="#e67e22" />
            </View>
            <Text style={styles.title}>{item.title}</Text>
          </View>
          <Text style={styles.content}>{item.content}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  contentContainer: {
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
  },
  card: {
    backgroundColor: '#1c1c2a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    backgroundColor: 'rgba(230, 126, 34, 0.1)',
    padding: 10,
    borderRadius: 12,
    marginRight: 15,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  content: {
    color: '#a0a0b0',
    fontSize: 15,
    lineHeight: 24,
    paddingLeft: 5,
  },
});

export default FirstAidScreen;
