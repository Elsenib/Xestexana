import Constants from 'expo-constants';
 
// app.config.js-dəki extra sahələrindən oxuyur
export const API_BASE_URL: string =
  Constants.expoConfig?.extra?.apiUrl ?? 'https://api-production-e6391.up.railway.app/api';
 
export const CLINIC_ID: string =
  Constants.expoConfig?.extra?.clinicId ?? '';
