import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';
import { api } from '@/services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  login: (phoneNumber: string, password: string) => Promise<void>;
  register: (data: { full_name: string; phone_number: string; password: string }) => Promise<void>;
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

      register: async (data: { full_name: string; phone_number: string; password: string }) => {
        try {
          const response = await api.register(data);
          api.setToken(response.access_token);
          set({ 
            user: response.user,
            token: response.access_token,
            refreshToken: response.refresh_token,
            isAuthenticated: true 
          });
        } catch (error) {
          console.error('Registration failed:', error);
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
          refreshToken: null 
        });
      },
      
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
        // Set token on API service when rehydrating
        const { token } = get();
        if (token) {
          api.setToken(token);
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