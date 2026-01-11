import { create } from 'zustand';
import { api, getToken, setToken, clearToken as clearStoredToken, Profile } from '@/lib/api';

interface AuthState {
    // State
    user: Profile | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    // Actions
    fetchUser: () => Promise<void>;
    setUser: (user: Profile | null) => void;
    login: (token: string) => void;
    logout: () => void;
    reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    // Initial state
    user: null,
    isLoading: true,
    isAuthenticated: false,

    // Fetch user from API
    fetchUser: async () => {
        const token = getToken();
        if (!token) {
            set({ isLoading: false, isAuthenticated: false, user: null });
            return;
        }

        try {
            const profile = await api.getProfile();
            set({
                user: profile,
                isAuthenticated: true,
                isLoading: false
            });
        } catch {
            // Token invalid, clear it
            clearStoredToken();
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false
            });
        }
    },

    // Set user directly (useful after profile update)
    setUser: (user) => {
        set({ user, isAuthenticated: !!user });
    },

    // Login with token
    login: (token) => {
        setToken(token);
        get().fetchUser();
    },

    // Logout
    logout: () => {
        clearStoredToken();
        set({ user: null, isAuthenticated: false, isLoading: false });
    },

    // Reset to initial state
    reset: () => {
        set({ user: null, isAuthenticated: false, isLoading: true });
    },
}));

// Selector hooks for optimized re-renders
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
