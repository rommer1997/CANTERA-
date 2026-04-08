import { create } from 'zustand';

interface User {
  name: string;
  email: string;
  role: 'PLAYER' | 'SCOUT' | 'REFEREE' | 'GUARDIAN';
  bio: string;
  avatar: string;
  plan: string;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));