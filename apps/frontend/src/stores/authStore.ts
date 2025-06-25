import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { authAPI } from "@/services/api";

interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
  email_verified: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  immer((set, get) => ({
    // State
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    // Actions
    login: async (email: string, password: string) => {
      try {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        const response = await authAPI.login(email, password);
        if (response.success && response.data) {
          set((state) => {
            state.user = response.data!.user;
            state.isAuthenticated = true;
            state.isLoading = false;
          });
        } else {
          throw new Error(response.error || "Login failed");
        }
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : "Login failed";
          state.isLoading = false;
          state.isAuthenticated = false;
        });
        throw error;
      }
    },

    register: async (email: string, password: string, name: string) => {
      try {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        const response = await authAPI.register(email, password, name);
        if (response.success && response.data) {
          set((state) => {
            state.user = response.data!.user;
            state.isAuthenticated = true;
            state.isLoading = false;
          });
        } else {
          throw new Error(response.error || "Registration failed");
        }
      } catch (error) {
        set((state) => {
          state.error =
            error instanceof Error ? error.message : "Registration failed";
          state.isLoading = false;
          state.isAuthenticated = false;
        });
        throw error;
      }
    },

    logout: async () => {
      try {
        // Try to logout on server (which will clear the HTTP-only cookie)
        await authAPI.logout();
      } catch (error) {
        console.error("Server logout failed:", error);
      } finally {
        // Clear local state regardless of server response
        set((state) => {
          state.user = null;
          state.isAuthenticated = false;
          state.error = null;
        });
      }
    },
    checkAuth: async () => {
      // Prevent multiple simultaneous auth checks
      const currentState = get();
      if (currentState.isLoading) {
        return;
      }

      try {
        set((state) => {
          state.isLoading = true;
        });

        const response = await authAPI.verifyToken();
        if (response.success && response.data) {
          set((state) => {
            state.user = response.data!.user;
            state.isAuthenticated = true;
            state.isLoading = false;
          });
        } else {
          throw new Error("Token verification failed");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        // Clear auth state on any error - this will show login form
        set((state) => {
          state.user = null;
          state.isAuthenticated = false;
          state.isLoading = false;
          state.error = null; // Don't show error for auth check failures
        });
      }
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    setUser: (user: User) => {
      set((state) => {
        state.user = user;
        state.isAuthenticated = true;
      });
    },
  }))
);

// Simple individual selectors
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useIsLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);

export const useLogin = () => useAuthStore((state) => state.login);
export const useRegister = () => useAuthStore((state) => state.register);
export const useLogout = () => useAuthStore((state) => state.logout);
export const useCheckAuth = () => useAuthStore((state) => state.checkAuth);
export const useClearError = () => useAuthStore((state) => state.clearError);
export const useSetUser = () => useAuthStore((state) => state.setUser);

// Convenience compound hooks (use individual hooks above instead of these if issues persist)
export const useAuth = () => ({
  user: useUser(),
  isAuthenticated: useIsAuthenticated(),
  isLoading: useIsLoading(),
  error: useAuthError(),
});

export const useAuthActions = () => ({
  login: useLogin(),
  register: useRegister(),
  logout: useLogout(),
  checkAuth: useCheckAuth(),
  clearError: useClearError(),
  setUser: useSetUser(),
});
