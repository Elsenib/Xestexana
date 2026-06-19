import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { BookAppointmentScreen } from './src/screens/BookAppointmentScreen';
import { MyAppointmentsScreen } from './src/screens/MyAppointmentsScreen';
import { HomeScreen } from './src/screens/home-screen';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { logout } = useAuth();

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContainer}>
      {/* Profil bölməsi */}
      <View style={styles.profileSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>P</Text>
        </View>
        <Text style={styles.profileName}>Pasiyent</Text>
        <Text style={styles.profileEmail}>Xoş gəlmisiniz</Text>
      </View>

      {/* Menyu itemləri */}
      <DrawerItemList {...props} />

      {/* Çıxış düyməsi */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          logout();
        }}
      >
        <Text style={styles.logoutText}>🚪 Çıxış</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#165f57' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        drawerStyle: { backgroundColor: '#fff9f1', width: 280 },
        drawerActiveTintColor: '#165f57',
        drawerInactiveTintColor: '#675f57',
        drawerActiveBackgroundColor: '#daeae5',
        drawerLabelStyle: { fontSize: 15, fontWeight: '600' },
      }}
    >
      <Drawer.Screen
        name="Ana Səhifə"
        component={HomeScreen}
        options={{ drawerLabel: '🏠 Ana Səhifə' }}
      />
      <Drawer.Screen
        name="Profil"
        component={ProfileScreen}
        options={{ drawerLabel: '👤 Profil' }}
      />
      <Drawer.Screen
        name="Randevu Al"
        component={BookAppointmentScreen}
        options={{ drawerLabel: '📅 Randevu Al' }}
      />
      <Drawer.Screen
        name="Randevularım"
        component={MyAppointmentsScreen}
        options={{ drawerLabel: '📋 Randevularım' }}
      />
    </Drawer.Navigator>
  );
}

function AppNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      {token ? (
        <DrawerNavigator />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#165f57',
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#daeae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#165f57',
  },
  profileName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  profileEmail: {
    color: '#d4efe7',
    fontSize: 13,
    marginTop: 2,
  },
  logoutButton: {
    margin: 20,
    marginTop: 'auto',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fde8e8',
    alignItems: 'center',
  },
  logoutText: {
    color: '#c0392b',
    fontWeight: '700',
    fontSize: 15,
  },
});
