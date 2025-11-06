import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User } from '@/types/auth';
import { clearCachedOrgId } from '@/lib/jwtUtils';

interface AuthState {
  user: User | null;
  token: string | null;
  orgSettings: any | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setOrgSettings: (data: any) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        orgSettings: null,
        token: null,
        isAuthenticated: false,
        login: (user: User, token: string) => {
          set({ user, token, isAuthenticated: true });
        },
        logout: () => {
          set({ user: null, token: null, isAuthenticated: false });
          localStorage.removeItem('auth-storage');
          clearCachedOrgId(); // Clear cached org_id on logout
        },
        setOrgSettings: (data) => {
          set({orgSettings: data})
        }
      }),
      {
        name: 'auth-storage',
      }
    )
  )
);