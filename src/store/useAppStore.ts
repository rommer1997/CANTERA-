import { create } from 'zustand';

interface User {
  uid?: string;
  name: string;
  email: string;
  role: 'PLAYER' | 'SCOUT' | 'REFEREE' | 'GUARDIAN';
  bio: string;
  avatar: string;
  plan: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface AppState {
  user: User | null;
  notifications: Notification[];
  setUser: (user: User | null) => void;
  logout: () => void;
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'time'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  notifications: [
    { id: '1', title: 'Bienvenido', message: 'Gracias por unirte a Cantera.', time: 'Hace 2 min', read: false, type: 'info' },
    { id: '2', title: 'Perfil Verificado', message: 'Tu identidad ha sido confirmada.', time: 'Hace 1 hora', read: false, type: 'success' },
  ],
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
  addNotification: (n) => set((state) => ({
    notifications: [
      { 
        ...n, 
        id: Math.random().toString(36).substring(7), 
        read: false, 
        time: 'Ahora' 
      }, 
      ...state.notifications
    ]
  })),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
  })),
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  })),
  clearNotifications: () => set({ notifications: [] }),
}));