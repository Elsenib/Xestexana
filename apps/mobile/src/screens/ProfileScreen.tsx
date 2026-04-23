import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/Card';

interface Appointment {
  id: string;
  doctorName: string;
  branch: string;
  startsAt: string;
  endsAt: string;
  status: string;
  channel: string;
  notes: string | null;
}

export const ProfileScreen: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();
  const { token, logout } = useAuth();

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/appointments/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigation.navigate('Login' as never);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Profil</Text>
      
      <Card
        title="Randevu Al"
        description="Yeni randevu bronlamaq üçün klikləyin"
        onPress={() => navigation.navigate('BookAppointment' as never)}
      />
      
      <Card
        title="Mənim Randevularım"
        description="Keçmiş və gələcək randevularınızı görün"
        onPress={() => navigation.navigate('MyAppointments' as never)}
      />
      
      <Text style={styles.sectionTitle}>Yaxın Randevular</Text>
      {isLoading ? (
        <Text>Yüklənir...</Text>
      ) : appointments.length === 0 ? (
        <Text>Randevu yoxdur</Text>
      ) : (
        appointments.slice(0, 3).map((appointment) => (
          <View key={appointment.id} style={styles.appointmentCard}>
            <Text style={styles.doctorName}>{appointment.doctorName}</Text>
            <Text>{appointment.branch}</Text>
            <Text>{new Date(appointment.startsAt).toLocaleString('az-AZ')}</Text>
            <Text>Status: {appointment.status}</Text>
          </View>
        ))
      )}
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Çıxış</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});