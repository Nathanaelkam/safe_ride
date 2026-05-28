import axios from 'axios';

export const authApi = axios.create({ baseURL: process.env.EXPO_PUBLIC_AUTH_SERVICE_URL });
export const emergencyApi = axios.create({ baseURL: process.env.EXPO_PUBLIC_EMERGENCY_SERVICE_URL });
export const routeApi = axios.create({ baseURL: process.env.EXPO_PUBLIC_ROUTE_SERVICE_URL });
export const notificationApi = axios.create({ baseURL: process.env.EXPO_PUBLIC_NOTIFICATION_SERVICE_URL });
