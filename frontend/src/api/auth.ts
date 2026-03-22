import api from "./client";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  minutes_used: number;
  minutes_limit: number;
}

export const authApi = {
  register: (email: string, password: string, name: string) =>
    api.post<TokenResponse>("/auth/register", { email, password, name }),

  login: (email: string, password: string) =>
    api.post<TokenResponse>("/auth/login", { email, password }),

  getMe: () => api.get<User>("/auth/me"),
};
