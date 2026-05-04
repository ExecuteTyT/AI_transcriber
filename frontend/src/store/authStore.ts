import { create } from "zustand";
import { authApi, type User } from "@/api/auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    consents: { consent_pd_processing: boolean; consent_cross_border: boolean; consent_marketing: boolean },
  ) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem("access_token"),
  isLoading: false,

  login: async (email, password) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    set({ isAuthenticated: true });

    const { data: user } = await authApi.getMe();
    set({ user });
  },

  register: async (email, password, name, consents) => {
    const { data } = await authApi.register(email, password, name, consents);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    set({ isAuthenticated: true });

    const { data: user } = await authApi.getMe();
    set({ user });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch { /* ignore — tokens cleared locally anyway */ }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.getMe();
      set({ user: data, isAuthenticated: true });
    } catch (err) {
      // Очищаем сессию ТОЛЬКО на явный 401/403. На сетевой сбой / 500 / таймаут
      // токены оставляем — сервер пусть сам решит, валидны они или нет на
      // следующем запросе. Раньше любой сбой /auth/me выбивал в /login.
      const axiosErr = err as { response?: { status?: number } };
      const status = axiosErr.response?.status;
      if (status === 401 || status === 403) {
        set({ user: null, isAuthenticated: false });
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      }
      // Транзиентные ошибки (offline, 5xx) — оставляем isAuthenticated как есть.
    } finally {
      set({ isLoading: false });
    }
  },
}));
