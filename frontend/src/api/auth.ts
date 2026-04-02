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
  is_email_verified: boolean;
  is_admin: boolean;
  created_at: string | null;
}

export interface MessageResponse {
  message: string;
}

export const authApi = {
  register: (email: string, password: string, name: string) =>
    api.post<TokenResponse>("/auth/register", { email, password, name }),

  login: (email: string, password: string) =>
    api.post<TokenResponse>("/auth/login", { email, password }),

  getMe: () => api.get<User>("/auth/me"),

  logout: () => api.post<MessageResponse>("/auth/logout"),

  updateProfile: (data: { name?: string; email?: string }) =>
    api.patch<User>("/auth/profile", data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<MessageResponse>("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  requestPasswordReset: (email: string) =>
    api.post<MessageResponse>("/auth/request-password-reset", { email }),

  resetPassword: (token: string, email: string, newPassword: string) =>
    api.post<MessageResponse>("/auth/reset-password", {
      token,
      email,
      new_password: newPassword,
    }),
};
