import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

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

export const MyAppointmentsScreen: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();

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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Mənim Randevularım</Text>
      
      {isLoading ? (
        <Text>Yüklənir...</Text>
      ) : appointments.length === 0 ? (
        <Text>Randevu yoxdur</Text>
      ) : (
        appointments.map((appointment) => (
          <View key={appointment.id} style={styles.appointmentCard}>
            <Text style={styles.doctorName}>{appointment.doctorName}</Text>
            <Text style={styles.branch}>{appointment.branch}</Text>
            <Text style={styles.date}>
              {new Date(appointment.startsAt).toLocaleString('az-AZ')}
            </Text>
            <Text style={styles.status}>Status: {appointment.status}</Text>
            {appointment.notes && (
              <Text style={styles.notes}>Qeydlər: {appointment.notes}</Text>
            )}
          </View>
        ))
      )}
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
  appointmentCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  branch: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  date: {
    fontSize: 16,
    marginBottom: 5,
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  notes: {
    fontSize: 14,
    marginTop: 5,
    fontStyle: 'italic',
  },
});