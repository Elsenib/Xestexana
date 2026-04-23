import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

interface Doctor {
  id: string;
  fullName: string;
  title: string;
  branch: string;
  roomNumber: string | null;
}

interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  branch: string;
  startsAt: string;
  endsAt: string;
  status: string;
  channel: string;
  notes: string | null;
}

export const BookAppointmentScreen: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const { token } = useAuth();

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/doctors');
      if (response.ok) {
        const data = await response.json();
        setDoctors(data);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      alert('Həkim, tarix və vaxt seçin');
      return;
    }

    setIsLoading(true);
    try {
      const startsAt = new Date(`${selectedDate}T${selectedTime}`);
      const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000); // 30 minutes

      const response = await fetch('http://localhost:4000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          channel: 'MOBILE',
          notes,
        }),
      });

      if (response.ok) {
        alert('Randevu uğurla bronlandı');
        navigation.goBack();
      } else {
        const error = await response.json();
        alert(error.message || 'Randevu bronlama uğursuz');
      }
    } catch (error) {
      alert('Şəbəkə xətası');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Randevu Al</Text>
      
      <Text style={styles.label}>Həkim seçin:</Text>
      {doctors.map((doctor) => (
        <TouchableOpacity
          key={doctor.id}
          style={[
            styles.doctorCard,
            selectedDoctor?.id === doctor.id && styles.selectedDoctor,
          ]}
          onPress={() => setSelectedDoctor(doctor)}
        >
          <Text style={styles.doctorName}>{doctor.title} {doctor.fullName}</Text>
          <Text>{doctor.branch}</Text>
          {doctor.roomNumber && <Text>Otaq: {doctor.roomNumber}</Text>}
        </TouchableOpacity>
      ))}
      
      <Text style={styles.label}>Tarix:</Text>
      <TouchableOpacity style={styles.input} onPress={() => {/* Date picker */}}>
        <Text>{selectedDate || 'Tarix seçin'}</Text>
      </TouchableOpacity>
      
      <Text style={styles.label}>Vaxt:</Text>
      <TouchableOpacity style={styles.input} onPress={() => {/* Time picker */}}>
        <Text>{selectedTime || 'Vaxt seçin'}</Text>
      </TouchableOpacity>
      
      <Text style={styles.label}>Qeydlər:</Text>
      <TouchableOpacity style={styles.input} onPress={() => {/* Notes input */}}>
        <Text>{notes || 'Qeydlər yazın'}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleBookAppointment} disabled={isLoading}>
        <Text style={styles.buttonText}>{isLoading ? 'Bronlanır...' : 'Randevu Al'}</Text>
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
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  doctorCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedDoctor: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});