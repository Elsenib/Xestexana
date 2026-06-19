import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL, CLINIC_ID } from '../config';
import { useAuth } from '../contexts/AuthContext';

export const RegisterScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('FEMALE');
  const [birthDate, setBirthDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const { login } = useAuth();

  const handleRegister = async () => {
    if (!email || !password || !identityNumber || !firstName || !lastName || !phone || !birthDate) {
      Alert.alert('Xəta', 'Bütün sahələri doldurun');
      return;
    }

    if (!CLINIC_ID) {
      Alert.alert('Xəta', 'Klinika məlumatı tapılmadı');
      return;
    }

    // YYYY-MM-DD formatını backend-in tələb etdiyi datetime formatına çeviririk
    const formattedBirthDate = birthDate.includes('T')
      ? birthDate
      : `${birthDate}T00:00:00.000Z`;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register-patient`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clinicId: CLINIC_ID,
          email,
          password,
          identityNumber,
          firstName,
          lastName,
          phone,
          gender,
          birthDate: formattedBirthDate,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.token);
        navigation.navigate('Profile' as never);
      } else {
        Alert.alert('Xəta', data.message || 'Qeydiyyat uğursuz');
      }
    } catch (error) {
      Alert.alert('Xəta', 'Şəbəkə xətası');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Qeydiyyat</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#050505"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Şifrə"
        placeholderTextColor="#050505"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Şəxsiyyət nömrəsi"
        placeholderTextColor="#050505"
        value={identityNumber}
        onChangeText={setIdentityNumber}
      />

      <TextInput
        style={styles.input}
        placeholder="Ad"
        placeholderTextColor="#050505"
        value={firstName}
        onChangeText={setFirstName}
      />

      <TextInput
        style={styles.input}
        placeholder="Soyad"
        placeholderTextColor="#050505"
        value={lastName}
        onChangeText={setLastName}
      />

      <TextInput
        style={styles.input}
        placeholder="Telefon"
        placeholderTextColor="#050505"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Doğum tarixi (YYYY-MM-DD)"
        placeholderTextColor="#050505"
        value={birthDate}
        onChangeText={setBirthDate}
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
        <Text style={styles.buttonText}>{isLoading ? 'Qeydiyyat...' : 'Qeydiyyat'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
        <Text style={styles.link}>Artıq hesabınız var? Giriş</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#2d878c',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 20,
  },
});