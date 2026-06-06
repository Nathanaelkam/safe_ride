import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';
import { api } from '@/services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  // Registration states
  registrationSession: string | null;
  registrationStep: 'form' | 'otp' | 'complete';
  
  login: (phoneNumber: string, password: string) => Promise<void>;
  registerInit: (data: { full_name: string; phone_number: string; password: string; email: string }) => Promise<void>;
  registerVerify: (otp: string) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      refreshToken: null,
      registrationSession: null,
      registrationStep: 'form',
      _hasHydrated: false,
      
      login: async (phoneNumber: string, password: string) => {
        try {
          const response = await api.login(phoneNumber, password);
          api.setToken(response.access_token);
          set({ 
            user: response.user,
            token: response.access_token,
            refreshToken: response.refresh_token,
            isAuthenticated: true 
          });
        } catch (error) {
          console.error('Login failed:', error);
          throw error;
        }
      },

      registerInit: async (data: { full_name: string; phone_number: string; password: string; email: string }) => {
        try {
          const response = await api.registerInit(data);
          set({ 
            registrationSession: response.session_token,
            registrationStep: 'otp'
          });
        } catch (error) {
          console.error('Registration init failed:', error);
          throw error;
        }
      },

      registerVerify: async (otp: string) => {
        try {
          const { registrationSession } = get();
          if (!registrationSession) {
            throw new Error('No registration session found');
          }

          const response = await api.registerVerify({
            session_token: registrationSession,
            otp
          });

          api.setToken(response.access_token);
          set({ 
            user: response.user,
            token: response.access_token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
            registrationSession: null,
            registrationStep: 'complete'
          });
        } catch (error) {
          console.error('Registration verification failed:', error);
          throw error;
        }
      },

      setUser: (user: User) => set({ user, isAuthenticated: true }),
      
      logout: () => {
        api.setToken('');
        set({ 
          user: null, 
          isAuthenticated: false, 
          token: null, 
          refreshToken: null,
          registrationSession: null,
          registrationStep: 'form'
        });
      },
      
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
        // Set token on API service when rehydrating
        const { token, user } = get();
        console.log('=== AUTH STORE HYDRATION ===');
        console.log('Hydration state:', state);
        console.log('Token from storage:', token);
        console.log('User from storage:', user);
        console.log('Setting isAuthenticated:', !!(token && user));
        
        if (token) {
          api.setToken(token);
          // Fix: Set isAuthenticated based on having both user and token
          if (user) {
            set({ isAuthenticated: true });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);