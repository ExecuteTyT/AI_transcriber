import api from "./client";

export interface TelegramLinkToken {
  deep_link: string;
  code: string;
  expires_in: number;
}

export const integrationsApi = {
  /** Одноразовый deep-link для привязки Telegram к текущему аккаунту. */
  async telegramLinkToken(): Promise<TelegramLinkToken> {
    const { data } = await api.post<TelegramLinkToken>("/integrations/telegram/link-token");
    return data;
  },
};
