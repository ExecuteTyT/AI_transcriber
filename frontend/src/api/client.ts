import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: добавляем JWT access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: auto-refresh при 401.
//
// Конкурентные 401 (dashboard polling + DELETE/upload одновременно) делят один
// in-flight refresh — иначе каждый параллельный запрос дёргал /auth/refresh
// независимо, и хотя бэкенд не инвалидирует старый refresh_token, мы получали
// гонки записи в localStorage и неконсистентный Authorization у retry.
let refreshInFlight: Promise<string> | null = null;

async function refreshTokens(): Promise<string> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) throw new Error("no refresh token");
  const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
    refresh_token: refreshToken,
  });
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  return data.access_token as string;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    if (!refreshInFlight) {
      refreshInFlight = refreshTokens().finally(() => {
        refreshInFlight = null;
      });
    }

    try {
      const newToken = await refreshInFlight;
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      // Не редиректим со страниц авторизации — там 401 это нормальный ответ
      // на неверный пароль, а не expired session.
      const path = window.location.pathname;
      if (!path.startsWith("/login") && !path.startsWith("/register")) {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  }
);

export default api;
