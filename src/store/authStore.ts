import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User } from '@/types/auth';
import { clearCachedOrgId } from '@/lib/jwtUtils';

interface AuthState {
  user: User | null;
  sidebarCollapsed: boolean;
  token: string | null;
  orgSettings: any | null;
  orgDetails: any | null;
  isAuthenticated: boolean;
  activeAccount: "account1" | "account2";
  login: (user: User, token: string) => void;
  logout: () => void;
  setOrgSettings: (data: any) => void;
  setOrgDetails: (data: any) => void;
  setSidebarCollapsed: (data: boolean) => void;
  setActiveAccount: (account: "account1" | "account2") => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        orgSettings: null,
        sidebarCollapsed: false,
        orgDetails: null,
        token: null,
        isAuthenticated: false,
        activeAccount: (() => {
          if (typeof window !== "undefined") {
            const saved = localStorage.getItem("activeAccount");
            return (saved === "account2" ? "account2" : "account1") as "account1" | "account2";
          }
          return "account1";
        })(),
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
        },
        setOrgDetails: (data) => {
          set({orgDetails: data})
        },
        setSidebarCollapsed: (data) => {
          set({ sidebarCollapsed: data })
        },
        setActiveAccount: (account: "account1" | "account2") => {
          set({ activeAccount: account });
          if (typeof window !== "undefined") {
            localStorage.setItem("activeAccount", account);
          }
        }
      }),
      {
        name: 'auth-storage',
      }
    )
  )
);