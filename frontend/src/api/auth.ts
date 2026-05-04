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
  data_retention_days: number | null;
  default_audio_retention_days: number;
  default_language: string;
  bonus_minutes: number;
  created_at: string | null;
}

export interface Consent {
  consent_type: string;
  granted: boolean;
  granted_at: string;
  revoked_at: string | null;
  policy_version: string;
}

export interface MessageResponse {
  message: string;
}

export const authApi = {
  register: (
    email: string,
    password: string,
    name: string,
    consents: {
      consent_pd_processing: boolean;
      consent_cross_border: boolean;
      consent_marketing: boolean;
    }
  ) =>
    api.post<TokenResponse>("/auth/register", {
      email,
      password,
      name,
      ...consents,
    }),

  login: (email: string, password: string) =>
    api.post<TokenResponse>("/auth/login", { email, password }),

  getMe: () => api.get<User>("/auth/me"),

  logout: () => api.post<MessageResponse>("/auth/logout"),

  updateProfile: (data: {
    name?: string;
    email?: string;
    data_retention_days?: number | null;
    default_audio_retention_days?: number | null;
    default_language?: string;
  }) => api.patch<User>("/auth/profile", data),

  // 152-ФЗ: согласия пользователя.
  getConsents: () => api.get<Consent[]>("/users/me/consents"),

  revokeConsent: (consentType: "marketing") =>
    api.post<MessageResponse>("/users/me/consents/revoke", { consent_type: consentType }),

  deleteAccount: () => api.delete<MessageResponse>("/users/me"),

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
